'use strict';

// Server-authoritative checkpoint save/restore: undo cannot be used to
// re-roll the dice. Driven straight against the
// API on its own fresh session — not through a UI button (the client's Save
// Checkpoint action, handleSaveSnapshot in app.js, is not wired to anything
// clickable today; that gap is separate from what this check tests and is
// not fixed here), and not through the browser session the journey/state/
// resilience checks share, so it neither depends on what they left behind
// nor leaves the shared browser's in-page turn counter out of sync with the
// server for whatever runs after it.
//
// One checkpoint/restore/replay proves two things: a fired shot spends SEU,
// and replaying the same turn after a restore reproduces the same dice
// instead of rolling again.

function parseSSE(text) {
  const events = [];
  for (const line of String(text || '').split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const payload = line.slice(6);
    if (payload === '[DONE]') continue;
    try { events.push(JSON.parse(payload)); } catch (_) { /* ignore */ }
  }
  return events;
}

async function run(r, ctx) {
  const { base, fakeBase } = ctx;
  // A predictable fixture rotation: opening, state-heavy, scene-change,
  // combat — the same order the journey depends on.
  if (fakeBase) await fetch(`${fakeBase}/__reset`, { method: 'POST' });

  const sessionRes = await fetch(`${base}/api/session`, { method: 'POST' });
  const session = await sessionRes.json().catch(() => null);
  const token = session && session.token;
  r.check('a fresh session can be created for the checkpoint check', !!token, `status ${sessionRes.status}`);
  if (!token) return ctx;

  const headers = { 'X-Session-Token': token };
  const jsonHeaders = { ...headers, 'Content-Type': 'application/json' };
  const turnHeaders = { ...jsonHeaders, 'X-Astra-Protocol': '2' };

  const newRes = await fetch(`${base}/api/game/new`, {
    method: 'POST', headers: jsonHeaders,
    body: JSON.stringify({ character_id: 'kael_voss', display_name: 'QA Checkpoint', adventure_id: 'ghost_station' }),
  });
  r.check('session zero can be started', newRes.status === 200, `status ${newRes.status}`);
  if (newRes.status !== 200) return ctx;

  const beginRes = await fetch(`${base}/api/game/begin`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ hook_index: 0 }) });
  const beginBody = await beginRes.json().catch(() => null);
  r.check('the adventure can begin', beginRes.status === 200 && !!(beginBody && beginBody.state), `status ${beginRes.status}`);
  if (!beginBody || !beginBody.state) return ctx;

  async function postTurn(body) {
    const res = await fetch(`${base}/api/turn`, { method: 'POST', headers: turnHeaders, body: JSON.stringify(body) });
    const text = await res.text();
    const events = parseSSE(text);
    return { status: res.status, turn: events.find(e => e.type === 'astra_turn'), error: events.find(e => e.type === 'astra_error') };
  }

  // Drive to combat the same way the journey does (opening, state-heavy,
  // scene-change, combat), stopping as soon as an attack choice is offered.
  let fireChoice = null;
  let lastTurn = null;
  for (let t = 1; t <= 4 && !fireChoice; t += 1) {
    const res = await postTurn({ turn: t, text: `QA checkpoint probe turn ${t}` });
    r.check(`turn ${t} toward combat resolves`, res.status === 200 && !!res.turn, `status ${res.status}`);
    if (!res.turn) return ctx;
    lastTurn = res.turn;
    fireChoice = (res.turn.choices || []).find(c => /fire on/i.test(c.text));
  }
  r.check('combat starts and offers an attack choice', !!fireChoice, JSON.stringify(lastTurn && lastTurn.choices));
  if (!fireChoice) return ctx;

  const turnNumber = lastTurn.state.session.turn_count + 1;
  const seuBefore = lastTurn.state.character.seu.total;

  // Only the pinned attack row's roll is what "no reroll" is actually about:
  // an unrelated declared check (or a hazard) the model happens to mention
  // varies with whichever fixture answers each call, and comparing the
  // whole dice_rolls array would fail on that variation even though the
  // sheet itself was never re-rolled.
  const attackRoll = rolls => (rolls || []).find(d => /vs pod sleeper/i.test(d.description));

  // Save a checkpoint right here, before the shot is fired.
  const snapRes = await fetch(`${base}/api/game/snapshot`, { method: 'POST', headers });
  const snapBody = await snapRes.json().catch(() => null);
  r.check('a checkpoint can be saved', snapRes.status === 200 && Array.isArray(snapBody?.snapshots) && snapBody.snapshots.length > 0,
    `status ${snapRes.status} ${JSON.stringify(snapBody)}`.slice(0, 200));
  const snapshotId = snapBody && snapBody.snapshots[0] && snapBody.snapshots[0].id;
  if (!snapshotId) return ctx;

  // Fire the weapon.
  const first = await postTurn({ turn: turnNumber, choice_id: fireChoice.id });
  r.check('the attack turn resolves', first.status === 200 && !!first.turn,
    `status ${first.status} ${JSON.stringify(first.error || {})}`);
  if (!first.turn) return ctx;
  const seuAfterShot = first.turn.state.character.seu.total;
  const attackAfterShot = attackRoll(first.turn.dice_rolls);
  r.check('the attack turn reports the weapon\'s roll', !!attackAfterShot, JSON.stringify(first.turn.dice_rolls));
  r.check('firing the weapon decreases SEU', seuAfterShot < seuBefore, `${seuBefore} -> ${seuAfterShot}`);

  // Restore the checkpoint: back to just before the shot.
  const restoreRes = await fetch(`${base}/api/game/restore`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ snapshot_id: snapshotId }) });
  const restoreBody = await restoreRes.json().catch(() => null);
  r.check('the checkpoint can be restored', restoreRes.status === 200 && !!(restoreBody && restoreBody.state),
    `status ${restoreRes.status}`);
  if (!restoreBody || !restoreBody.state) return ctx;
  r.check('restoring undoes the shot — SEU is back to its pre-shot value',
    restoreBody.state.character.seu.total === seuBefore,
    `${restoreBody.state.character.seu.total} vs ${seuBefore}`);
  r.check('restoring rewinds the turn counter to before the shot',
    restoreBody.state.session.turn_count === turnNumber - 1,
    `${restoreBody.state.session.turn_count} vs ${turnNumber - 1}`);

  // Replay the same turn after restore: same dice, same SEU spent, no re-roll.
  const replay = await postTurn({ turn: turnNumber, choice_id: fireChoice.id });
  r.check('the replayed turn resolves', replay.status === 200 && !!replay.turn, `status ${replay.status}`);
  if (!replay.turn) return ctx;
  r.check('the replayed turn spends the same SEU as the first attempt (no re-roll)',
    replay.turn.state.character.seu.total === seuAfterShot,
    `${replay.turn.state.character.seu.total} vs ${seuAfterShot}`);
  const attackAfterReplay = attackRoll(replay.turn.dice_rolls);
  r.check('the replayed turn\'s weapon roll is identical to the first attempt (no re-roll)',
    !!attackAfterReplay && !!attackAfterShot
      && attackAfterReplay.roll === attackAfterShot.roll
      && attackAfterReplay.target === attackAfterShot.target
      && attackAfterReplay.success === attackAfterShot.success,
    `${JSON.stringify(attackAfterReplay)} vs ${JSON.stringify(attackAfterShot)}`);

  return ctx;
}

module.exports = { run };
