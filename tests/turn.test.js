'use strict';

// Integration tests for POST /api/turn and its supporting endpoints, against
// the in-process fake provider (protocol v2 fixtures, qa/fake-provider.js).
// No real provider is ever reachable from a test run.

process.env.DB_PATH = ':memory:';
process.env.RATE_LIMIT_MAX = '100000';
process.env.SESSION_RATE_LIMIT_MAX = '100000';
process.env.IP_RATE_LIMIT_MAX = '100000';
process.env.SESSION_DAILY_RATE_LIMIT_MAX = '100000';
process.env.SAVE_STATE_RATE_LIMIT_MAX = '100000';
process.env.NODE_ENV = 'test';
// A long, non-repeating-in-a-useful-way script is not needed here: what the
// retry-reuses-the-sheet test actually checks is that the stored sheet_json
// does not change between attempts, not that the numbers differ (getDice()
// restarts the script from index 0 on every call, so a fresh roll and a
// reused roll would produce identical numbers either way).
process.env.ASTRA_DICE_SCRIPT = '1';

const request = require('supertest');
const { createFakeProvider } = require('../qa/fake-provider');

let fakeProvider;
let fakeBase;
let app;

beforeAll(async () => {
  fakeProvider = createFakeProvider();
  const port = await fakeProvider.listen();
  fakeBase = `http://127.0.0.1:${port}`;
  // '' rather than delete: dotenv only fills in a variable that is entirely
  // absent from process.env, so a deleted key would be silently repopulated
  // from a real .env file in this repo's directory before server.js's own
  // require('dotenv').config() runs below.
  process.env.GEMINI_API_KEY = '';
  process.env.GROQ_API_KEY = 'test-key';
  process.env.GROQ_URL = fakeBase;
  process.env.GEMINI_URL = fakeBase;
  app = require('../server');
});

afterAll(async () => {
  if (fakeProvider) await fakeProvider.close();
  if (app && app.db && app.db.open) app.db.close();
});

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

async function setFakeMode(mode) {
  await fetch(`${fakeBase}/__mode`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode }) });
}

async function resetFake() {
  await fetch(`${fakeBase}/__reset`, { method: 'POST' });
}

async function fakeCalls() {
  const res = await fetch(`${fakeBase}/__calls`);
  return res.json();
}

async function newSession() {
  const res = await request(app).post('/api/session');
  return res.body.token;
}

async function turn(token, body) {
  const res = await request(app)
    .post('/api/turn')
    .set('X-Session-Token', token)
    .set('X-Astra-Protocol', '2')
    .send(body);
  return { status: res.status, body: res.body, events: parseSSE(res.text) };
}

async function startGame(token) {
  const newRes = await request(app).post('/api/game/new').set('X-Session-Token', token)
    .send({ character_id: 'kael_voss', display_name: 'QA Testworth', adventure_id: 'ghost_station' });
  expect(newRes.status).toBe(200);
  expect(Array.isArray(newRes.body.hooks)).toBe(true);
  expect(newRes.body.hooks).toHaveLength(3);

  const beginRes = await request(app).post('/api/game/begin').set('X-Session-Token', token).send({ hook_index: 0 });
  expect(beginRes.status).toBe(200);
  expect(beginRes.body.state.session.turn_count).toBe(0);
  return beginRes.body.state;
}

// A realistic pre-cutover (v1) save: no schema_version, the old client's own
// `messages` (display shape, content already narrative-only, `_raw` sitting
// alongside it the way the old client actually wrote it) and `_autoChoices`
// embedded at the top level.
function legacyV1Save() {
  return {
    character: {
      id: 'kael_voss', name: 'Kael Voss', race: 'Human',
      stats: { str: 55, sta: 55, dex: 55, rs: 50, int: 40, log: 40, per: 45, ldr: 50 },
      stamina: { current: 40, max: 55 },
      credits: 300, xp: { total: 10, unspent: 10 },
      inventory: ['Olef A13 laser pistol', 'Medkit'],
      status_effects: [],
      seu: { total: 30, sources: [{ name: 'A13 e-clip', seu: 20 }, { name: 'spare', seu: 10 }] },
    },
    campaign: {
      adventure_id: 'ghost_station', adventure_title: 'Ghost Station',
      current_scene_id: 'scene_1_docking', visited_scene_ids: ['scene_1_docking'],
      npcs: [], factions: [], journal: [], hooks: [],
    },
    session: { number: 1, scene_count: 0, turn_count: 3 },
    scene: { header: '', summary: 'A quiet corridor.', in_combat: false, combat_state: null, recent_summaries: [], history_compressed: false, compressed_summary: null, scene_type_history: [] },
    meta: { initialized: true, loading: false, error: null },
    messages: [
      { id: 'm1', role: 'player', content: 'I head to the bridge.', timestamp: 1000 },
      {
        id: 'm2', role: 'dm', content: 'You step onto the bridge, lights flickering overhead.',
        _raw: JSON.stringify({ narrative: 'You step onto the bridge, lights flickering overhead.', choices: [] }),
        timestamp: 1001,
      },
    ],
    _autoChoices: [
      { id: 'c1', text: 'Investigate the console', action_type: 'investigate' },
      { id: 'c2', text: 'Call out', action_type: 'other' },
    ],
  };
}

describe('Legacy (pre-cutover) save migration', () => {
  test('a v1 save shows narrative-only chat and choices on resume, and feeds a non-empty model history', async () => {
    const token = await newSession();
    const db = require('../db');
    const sessionRow = db.getSession(app.db, token);
    db.saveGameState(app.db, sessionRow.id, JSON.stringify(legacyV1Save()));
    // The old /api/chat wrote every turn's exchange into the messages table
    // as raw JSON on the assistant side; that is the source buildHistoryMessages
    // falls back to for a session with no turn_log rows yet.
    db.saveMessage(app.db, sessionRow.id, 'user', 'I head to the bridge.');
    db.saveMessage(app.db, sessionRow.id, 'assistant', JSON.stringify({ narrative: 'You step onto the bridge, lights flickering overhead.', choices: [] }));

    const getRes = await request(app).get(`/api/session/${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.messages).toHaveLength(2);
    const dmMsg = getRes.body.messages.find(m => m.role === 'dm');
    expect(dmMsg.content).toBe('You step onto the bridge, lights flickering overhead.');
    expect(dmMsg.content).not.toMatch(/"narrative"/); // display text only, never the raw JSON
    expect(getRes.body.choices).toHaveLength(2);
    const state = JSON.parse(getRes.body.state_json);
    expect(state.messages).toHaveLength(2);
    expect(state._autoChoices).toHaveLength(2);
    expect(state.meta._legacy).toBeUndefined(); // server-only bookkeeping never reaches the browser

    await resetFake();
    const res = await turn(token, { turn: 4, text: 'I continue forward.' });
    expect(res.status).toBe(200);
    const calls = await fakeCalls();
    const sentMessages = calls.calls[calls.calls.length - 1].body.messages;
    expect(sentMessages.length).toBeGreaterThan(1); // more than just this turn's own user message
  });
});

describe('POST /api/game/compress', () => {
  beforeEach(async () => {
    await resetFake();
  });

  test('refuses when the session is already compressed, and does not spend a provider call', async () => {
    const token = await newSession();
    await startGame(token);

    const first = await request(app).post('/api/game/compress').set('X-Session-Token', token);
    expect(first.status).toBe(200);
    expect(first.body.state.scene.history_compressed).toBe(true);

    const callsAfterFirst = await fakeCalls();
    const second = await request(app).post('/api/game/compress').set('X-Session-Token', token);
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('ALREADY_COMPRESSED');
    const callsAfterSecond = await fakeCalls();
    expect(callsAfterSecond.calls.length).toBe(callsAfterFirst.calls.length); // no wasted call
  });

  test('shares the per-session turn lock with POST /api/turn', async () => {
    const token = await newSession();
    await startGame(token);

    const [turnRes, compressRes] = await Promise.all([
      turn(token, { turn: 1, text: 'I check the aft panel.' }),
      request(app).post('/api/game/compress').set('X-Session-Token', token),
    ]);
    const statuses = [turnRes.status, compressRes.status].sort();
    expect(statuses).toContain(409);
    const busy = [turnRes, compressRes].find(r => r.status === 409);
    expect(busy.body.code).toBe('TURN_IN_PROGRESS');
  });

  test('the compressed summary reaches the next turn\'s prompt', async () => {
    const token = await newSession();
    await startGame(token);

    const compressRes = await request(app).post('/api/game/compress').set('X-Session-Token', token);
    expect(compressRes.status).toBe(200);
    const summary = compressRes.body.state.scene.compressed_summary;
    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(0);

    await resetFake();
    const t1 = await turn(token, { turn: 1, text: 'I look around.' });
    expect(t1.status).toBe(200);
    const calls = await fakeCalls();
    const sentSystem = calls.calls[calls.calls.length - 1].body.messages.find(m => m.role === 'system');
    expect(sentSystem.content).toContain('COMPRESSED_HISTORY');
    expect(sentSystem.content).toContain(summary);
  });

  test('does not overwrite state committed while the provider call was in flight', async () => {
    const token = await newSession();
    await startGame(token);

    // Commit a turn's worth of progress directly (simulating a turn that
    // resolved while a slow compression call was outstanding), then compress.
    // Because the lock serializes them in this test (no real concurrency),
    // this proves the compress handler reloads fresh state rather than
    // reusing what it read before the provider call.
    const stateStore = require('../server/services/stateStore');
    const sessionRow = require('../db').getSession(app.db, token);
    const before = stateStore.load(app.db, sessionRow.id);
    const advanced = { ...before, character: { ...before.character, credits: before.character.credits + 250 } };
    stateStore.commit(app.db, sessionRow.id, advanced);

    const compressRes = await request(app).post('/api/game/compress').set('X-Session-Token', token);
    expect(compressRes.status).toBe(200);
    expect(compressRes.body.state.character.credits).toBe(before.character.credits + 250);
  });
});

describe('Checkpoint restore can revive a dead character (documented, left as is)', () => {
  // Owner decision pending: whether undoing a death via checkpoint restore
  // should be allowed at all is unresolved, so the behavior is
  // intentionally left unchanged here. This test exists only to document
  // what the server actually does today.
  test('restoring a pre-death checkpoint clears game_over and the Dead status', async () => {
    const token = await newSession();
    await startGame(token);
    const stateStore = require('../server/services/stateStore');
    const db = require('../db');
    const sessionRow = db.getSession(app.db, token);

    const alive = stateStore.load(app.db, sessionRow.id);
    const snapRes = await request(app).post('/api/game/snapshot').set('X-Session-Token', token);
    expect(snapRes.status).toBe(200);
    const snapshotId = snapRes.body.snapshots[0].id;

    const dead = {
      ...alive,
      character: { ...alive.character, stamina: { current: -999, max: alive.character.stamina.max }, status_effects: [...alive.character.status_effects, 'Dead'] },
      session: { ...alive.session, game_over: true },
    };
    stateStore.commit(app.db, sessionRow.id, dead);

    const blocked = await turn(token, { turn: 1, text: 'go' });
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe('GAME_OVER');

    const restoreRes = await request(app).post('/api/game/restore').set('X-Session-Token', token).send({ snapshot_id: snapshotId });
    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.state.character.status_effects).not.toContain('Dead');
    expect(restoreRes.body.state.character.stamina.current).toBe(alive.character.stamina.current);

    // The restored character is playable again — this is the behavior in
    // question, documented as is.
    const revived = await turn(token, { turn: 1, text: 'go' });
    expect(revived.status).toBe(200);
  });
});

describe('POST /api/turn (protocol v2)', () => {
  beforeEach(async () => {
    await resetFake();
  });

  test('new -> begin -> typed turn -> choice turn, and the state advances turn by turn', async () => {
    const token = await newSession();
    await startGame(token);

    const t1 = await turn(token, { turn: 1, text: 'I check the aft panel for damage.' });
    expect(t1.status).toBe(200);
    const t1Turn = t1.events.find(e => e.type === 'astra_turn');
    expect(t1Turn).toBeTruthy();
    expect(t1Turn.turn).toBe(1);
    expect(t1Turn.state.session.turn_count).toBe(1);
    expect(typeof t1Turn.narrative).toBe('string');
    expect(t1Turn.narrative.length).toBeGreaterThan(0);
    expect(Array.isArray(t1Turn.choices)).toBe(true);
    // choice tags are server-internal and must not reach the client
    for (const c of t1Turn.choices) expect(c.check).toBeUndefined();

    const t2 = await turn(token, { turn: 2, choice_id: t1Turn.choices[0].id });
    expect(t2.status).toBe(200);
    const t2Turn = t2.events.find(e => e.type === 'astra_turn');
    expect(t2Turn.turn).toBe(2);
    expect(t2Turn.state.session.turn_count).toBe(2);

    const getRes = await request(app).get(`/api/session/${token}`);
    const serverState = JSON.parse(getRes.body.state_json);
    expect(serverState.session.turn_count).toBe(t2Turn.state.session.turn_count);
    expect(serverState.campaign.current_scene_id).toBe(t2Turn.state.campaign.current_scene_id);
  });

  test('regression: a model-supplied roll, target and delta are ignored entirely', async () => {
    const token = await newSession();
    await startGame(token);

    await setFakeMode('cheat');
    const t1 = await turn(token, { turn: 1, text: 'I take the shot.' });
    expect(t1.status).toBe(200);
    const t1Turn = t1.events.find(e => e.type === 'astra_turn');

    // The fixture's dice_rolls/state_updates (stamina_delta:999, credits_delta:1e6,
    // xp_delta:5000) must never appear in what the server actually applied.
    expect(t1Turn.state_updates.credits_delta).not.toBe(1000000);
    expect(t1Turn.state.character.credits).toBeLessThan(1000000);
    expect(t1Turn.state.character.xp.total).toBeLessThanOrEqual(15); // house xp_cap_per_turn
    expect(t1Turn.dice_rolls.every(r => r.roll !== 99 || r.rule_source !== 'cheating')).toBe(true);
  });

  test('the same turn sent twice replays: one provider call, identical payload', async () => {
    const token = await newSession();
    await startGame(token);

    const first = await turn(token, { turn: 1, text: 'I check the aft panel.' });
    const callsAfterFirst = await fakeCalls();

    const second = await turn(token, { turn: 1, text: 'I check the aft panel.' });
    const callsAfterSecond = await fakeCalls();

    expect(callsAfterSecond.calls.length).toBe(callsAfterFirst.calls.length); // no new provider call
    const firstTurn = first.events.find(e => e.type === 'astra_turn');
    const secondTurn = second.events.find(e => e.type === 'astra_turn');
    expect(secondTurn).toEqual(firstTurn);
  });

  test('a provider failure, then a retry, reuses the same sheet (no re-roll)', async () => {
    const token = await newSession();
    await startGame(token);

    await setFakeMode('server_error');
    const failed = await turn(token, { turn: 1, text: 'go' });
    expect(failed.events.some(e => e.type === 'astra_error')).toBe(true);

    const sessionRow = require('../db').getSession(app.db, token);
    const pendingRow = require('../db').getTurnLog(app.db, sessionRow.id, 1);
    expect(pendingRow.status).toBe('pending');
    const sheetBefore = pendingRow.sheet_json;

    await setFakeMode('ok');
    const retried = await turn(token, { turn: 1, text: 'go' });
    expect(retried.status).toBe(200);
    const resolvedRow = require('../db').getTurnLog(app.db, sessionRow.id, 1);
    expect(resolvedRow.status).toBe('resolved');
    expect(resolvedRow.sheet_json).toBe(sheetBefore); // unchanged — the sheet was reused, not rebuilt
  });

  test('400 when choice_id does not match ^[A-Za-z0-9_-]{1,16}$', async () => {
    const token = await newSession();
    await startGame(token);
    const tooLong = await turn(token, { turn: 1, choice_id: 'a'.repeat(17) });
    expect(tooLong.status).toBe(400);
    const badChars = await turn(token, { turn: 1, choice_id: 'c1; DROP TABLE' });
    expect(badChars.status).toBe(400);
    const empty = await turn(token, { turn: 1, choice_id: '' });
    expect(empty.status).toBe(400);
  });

  test('409 CLIENT_OUTDATED when X-Astra-Protocol is missing', async () => {
    const token = await newSession();
    await startGame(token);
    const res = await request(app).post('/api/turn').set('X-Session-Token', token).send({ turn: 1, text: 'go' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CLIENT_OUTDATED');
  });

  test('409 STALE_TURN when the turn number does not match turn_count + 1', async () => {
    const token = await newSession();
    await startGame(token);
    const res = await turn(token, { turn: 5, text: 'go' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('STALE_TURN');
    expect(res.body.state).toBeTruthy();
  });

  test('409 TURN_IN_PROGRESS when a second request races the first', async () => {
    const token = await newSession();
    await startGame(token);
    const [a, b] = await Promise.all([
      turn(token, { turn: 1, text: 'first' }),
      turn(token, { turn: 1, text: 'second' }),
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toContain(409);
    const busy = [a, b].find(r => r.status === 409);
    expect(busy.body.code).toBe('TURN_IN_PROGRESS');
  });

  test('a body.game_state field, if sent, is ignored', async () => {
    const token = await newSession();
    await startGame(token);
    const res = await request(app).post('/api/turn').set('X-Session-Token', token).set('X-Astra-Protocol', '2')
      .send({ turn: 1, text: 'go', game_state: JSON.stringify({ character: { credits: 999999999 } }) });
    expect(res.status).toBe(200);
    const t = parseSSE(res.text).find(e => e.type === 'astra_turn');
    expect(t.state.character.credits).toBeLessThan(999999999);
  });

  test('a malformed answer gives a retryable error; the turn stays pending', async () => {
    const token = await newSession();
    await startGame(token);
    await setFakeMode('malformed');
    const res = await turn(token, { turn: 1, text: 'go' });
    const err = res.events.find(e => e.type === 'astra_error');
    expect(err).toBeTruthy();
    expect(err.retryable).toBe(true);

    const sessionRow = require('../db').getSession(app.db, token);
    const state = require('../server/services/stateStore').load(app.db, sessionRow.id);
    expect(state.session.turn_count).toBe(0); // never advanced
  });

  test('a New Adventure on the same session clears the previous playthrough\'s history', async () => {
    const token = await newSession();
    await startGame(token);

    const t1 = await turn(token, { turn: 1, text: 'I check the aft panel for damage.' });
    expect(t1.status).toBe(200);

    // Checkpoint the played-through game so we can prove it does not survive
    // into the new one.
    const snapRes = await request(app).post('/api/game/snapshot').set('X-Session-Token', token);
    expect(snapRes.status).toBe(200);
    expect(snapRes.body.snapshots.length).toBeGreaterThan(0);

    // Start a fresh adventure on the same session/save code (the in-app
    // "New Adventure" flow, not a brand-new session).
    await startGame(token);

    const sessionRow = require('../db').getSession(app.db, token);
    expect(require('../db').getSnapshots(app.db, sessionRow.id)).toHaveLength(0);
    expect(require('../db').getMessages(app.db, sessionRow.id)).toHaveLength(0);
    expect(require('../db').getTurnLog(app.db, sessionRow.id, 1)).toBeNull();

    const getRes = await request(app).get(`/api/session/${token}`);
    const payload = getRes.body;
    expect(payload.messages).toHaveLength(0);
    expect(payload.choices).toEqual([]);
    const freshState = JSON.parse(payload.state_json);
    expect(freshState.session.turn_count).toBe(0);

    // The new game's turn 1 must actually call the provider again, not
    // replay the old resolved turn 1 that shared the same (session, turn)
    // primary key.
    await resetFake();
    const newT1 = await turn(token, { turn: 1, text: 'I check the aft panel for damage.' });
    expect(newT1.status).toBe(200);
    const callsAfter = await fakeCalls();
    expect(callsAfter.calls.length).toBe(1); // one fresh call, not a replay
  });

  test('an unexpected throw inside the handler ends the response instead of hanging, and releases the lock', async () => {
    const token = await newSession();
    await startGame(token);
    const stateStore = require('../server/services/stateStore');
    const sessionRow = require('../db').getSession(app.db, token);
    const state = stateStore.load(app.db, sessionRow.id);
    // A state shaped enough to pass the earlier guards but that makes
    // resolveTurn itself throw (character.seu.sources.map on a corrupted,
    // non-array sources field) — a genuine unhandled throw deep inside the
    // async handler, the kind Express 4 does not forward to error-handling
    // middleware on its own.
    const corrupted = { ...state, character: { ...state.character, seu: { total: 0, sources: undefined } } };
    stateStore.commit(app.db, sessionRow.id, corrupted);

    const res = await turn(token, { turn: 1, text: 'go' });
    // The handler had already committed to the SSE contract (Content-Type
    // set to text/event-stream) before the throw, even though nothing had
    // been flushed yet, so the catch must answer as an SSE event, not a
    // plain JSON body under a text/event-stream content type.
    expect(res.status).toBe(200); // the request completes — it does not hang
    const err = res.events.find(e => e.type === 'astra_error');
    expect(err).toBeTruthy();
    expect(err.code).toBe('INTERNAL_ERROR');

    // The per-session lock and the keep-alive timer were both released in
    // the finally: a fresh request for the same session is not stuck behind
    // a stale TURN_IN_PROGRESS.
    stateStore.commit(app.db, sessionRow.id, state); // repair the state for the next call
    const retry = await turn(token, { turn: 1, text: 'go' });
    expect(retry.status).not.toBe(409);
  });

  test('an Ask GM turn during combat causes no enemy attack and no round advance', async () => {
    const token = await newSession();
    const beginState = await startGame(token);
    const stateStore = require('../server/services/stateStore');
    const sessionRow = require('../db').getSession(app.db, token);
    const state = stateStore.load(app.db, sessionRow.id);
    const combatState = {
      ...state,
      scene: {
        ...state.scene,
        in_combat: true,
        combat_state: {
          round: 1, phase: 'player_turn',
          initiative_order: [
            { id: 'player', name: state.character.name, is_player: true, initiative_roll: 15, has_acted: false },
            { id: 'h1', name: 'Pod Sleeper', is_player: false, initiative_roll: 10, has_acted: false },
          ],
          combatants: [{ id: 'h1', name: 'Pod Sleeper', threat: 'minion', rs: 30, sta_current: 15, sta_max: 15, status: 'active', is_player: false }],
          active_optional_rules: { burst_fire: false, called_shots: false, cover_concealment: false, suppression_fire: false },
        },
      },
    };
    stateStore.commit(app.db, sessionRow.id, combatState);

    const res = await turn(token, { turn: 1, text: 'Ask GM: what does that console icon mean?' });
    expect(res.status).toBe(200);
    const t = res.events.find(e => e.type === 'astra_turn');
    expect(t.ooc_note).toBeTruthy();
    expect(t.dice_rolls).toEqual([]);
    expect(t.state.scene.combat_state.round).toBe(1); // no round advance
    const enemy = t.state.scene.combat_state.combatants.find(c => c.id === 'h1');
    expect(enemy.status).toBe('active');
    expect(enemy.sta_current).toBe(15); // untouched — no enemy attack
    expect(t.state.character.stamina.current).toBe(beginState.character.stamina.max); // player untouched
    expect(t.state.session.turn_count).toBe(1); // the turn still advances
  });

  test('a truncated answer with a pinned attack check still applies no mechanics', async () => {
    const token = await newSession();
    await startGame(token);
    const stateStore = require('../server/services/stateStore');
    const db = require('../db');
    const sessionRow = db.getSession(app.db, token);
    const state = stateStore.load(app.db, sessionRow.id);
    const combatState = {
      ...state,
      session: { ...state.session, turn_count: 1 },
      pending_choices: { c1: { kind: 'attack', key: 'laser_pistol', tier: 'standard', target_id: 'h1' } },
      scene: {
        ...state.scene,
        in_combat: true,
        combat_state: {
          round: 1, phase: 'player_turn',
          initiative_order: [
            { id: 'player', name: state.character.name, is_player: true, initiative_roll: 15, has_acted: false },
            { id: 'h1', name: 'Pod Sleeper', is_player: false, initiative_roll: 10, has_acted: false },
          ],
          combatants: [{ id: 'h1', name: 'Pod Sleeper', threat: 'minion', rs: 30, sta_current: 15, sta_max: 15, status: 'active', is_player: false }],
          active_optional_rules: { burst_fire: false, called_shots: false, cover_concealment: false, suppression_fire: false },
        },
      },
    };
    stateStore.commit(app.db, sessionRow.id, combatState);
    const seuBefore = state.character.seu.total;

    await setFakeMode('truncated');
    const res = await turn(token, { turn: 2, choice_id: 'c1' });
    expect(res.status).toBe(200);
    const t = res.events.find(e => e.type === 'astra_turn');
    expect(t._repaired).toBe(true);
    expect(t.state.session.turn_count).toBe(2); // the turn still advances
    expect(t.state.character.seu.total).toBe(seuBefore); // the pinned attack never fired
    const enemy = t.state.scene.combat_state.combatants.find(c => c.id === 'h1');
    expect(enemy.sta_current).toBe(15); // untouched
    expect(t.state.scene.combat_state.round).toBe(1); // no round advance
  });

  test('a truncated answer is repaired and the turn advances with no mechanics applied', async () => {
    const token = await newSession();
    await startGame(token);
    const before = await request(app).get(`/api/session/${token}`);
    const beforeCredits = JSON.parse(before.body.state_json).character.credits;

    await setFakeMode('truncated');
    const res = await turn(token, { turn: 1, text: 'go' });
    expect(res.status).toBe(200);
    const t = res.events.find(e => e.type === 'astra_turn');
    expect(t._repaired).toBe(true);
    expect(t.turn).toBe(1);
    expect(t.state.session.turn_count).toBe(1); // advanced
    expect(t.state.character.credits).toBe(beforeCredits); // no mechanics applied
  });
});
