'use strict';

// What the player sees when the AI misbehaves. Each mode is driven through the
// real UI, and the bar is the same every time: a visible, specific message and
// a way forward. An endless spinner is a failure, however correct the server's
// own logging was.

// Order matters. A 429 blocks the provider for five minutes (a daily limit
// blocks it until the quota day rolls over), and that block outlives the probe
// that caused it, so every later probe would come back "busy" whatever the fake
// provider was told to do. The quota modes therefore run last, after recovery
// has been proven.
const MODE_EXPECTATIONS = [
  { mode: 'server_error',  label: 'provider outage',           expect: /not accepting requests|error|try again/i },
  { mode: 'bad_request',   label: 'provider rejects the body', expect: /not accepting requests|rejected|error/i },
  { mode: 'malformed',     label: 'unparseable answer',        expect: /could not parse|error|try again/i },
  { mode: 'stall',         label: 'provider goes silent',      expect: /not answer|error|try again|not accepting/i },
];

// Run only after the recovery check, for the reason above.
const QUOTA_EXPECTATIONS = [
  { mode: 'busy',        label: 'burst rate limit',  expect: /busy|too many turns|try again/i },
  { mode: 'daily_limit', label: 'daily budget gone', expect: /limit|used up|play again|busy/i },
];

async function setMode(fakeBase, mode) {
  const res = await fetch(fakeBase + '/__mode', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) throw new Error(`could not set fake provider mode ${mode}`);
}

// Take one turn and report what the player was left with. Never throws on a
// slow answer: a turn that never resolves is exactly the failure being hunted.
// Settling is what is waited on, not text, because the page still holds every
// previous turn and matching on that would pass without the app doing anything.
async function takeTurn(b, text, { timeout }) {
  b.dismissError();
  b.type('textarea', text);
  await b.clickSend({ timeout: 30000 });
  const deadline = Date.now() + timeout;
  for (;;) {
    if (!b.isBusy()) return { settled: true, error: b.errorBanner(), tail: tailAfter(b, text) };
    if (Date.now() > deadline) return { settled: false, timedOut: true, error: b.errorBanner(), tail: tailAfter(b, text) };
    await new Promise(r => setTimeout(r, 500));
  }
}

// Everything the page gained after this probe's own message, so a check cannot
// be satisfied by narration from an earlier turn.
function tailAfter(b, marker) {
  const all = b.text().replace(/\s+/g, ' ');
  const at = all.lastIndexOf(marker);
  return at === -1 ? all.slice(-300) : all.slice(at + marker.length).trim();
}

async function probe(r, b, fakeBase, patience, { mode, label, expect }) {
  await setMode(fakeBase, mode);
  const ticker = r.ticker(`driving a turn with the AI in "${label}" mode`);
  let result;
  try {
    result = await takeTurn(b, `QA probe: ${mode}`, { timeout: mode.startsWith('stall') ? patience : 45000 });
  } finally {
    ticker.stop();
  }
  r.check(`${label}: the turn ends instead of hanging`, result.settled === true,
    result.timedOut ? 'still spinning when the budget ran out' : '');
  r.check(`${label}: an error is put in front of the player`, !!result.error,
    result.error ? result.error.text.slice(0, 90) : `no error banner; page ended "${result.tail.slice(0, 80)}"`);
  r.check(`${label}: the message says what went wrong`,
    !!result.error && expect.test(result.error.text), result.error ? result.error.text.slice(0, 90) : 'no banner');
  r.check(`${label}: the player is offered a way forward`,
    !!result.error && (result.error.retry === true || /limit|play again/i.test(result.error.text)),
    result.error ? `retry=${result.error.retry}` : 'no banner');
}

async function run(r, ctx) {
  const { browser: b, fakeBase, turnTimeoutMs } = ctx;
  // A stalled provider is only detectable after the server's own silence
  // budget, plus a margin for the fallback provider to fail the same way.
  const patience = Math.max(20000, turnTimeoutMs * 2 + 15000);

  for (const spec of MODE_EXPECTATIONS) await probe(r, b, fakeBase, patience, spec);

  // Back to normal, and the game must still play.
  await setMode(fakeBase, 'ok');
  const recovery = await takeTurn(b, 'QA probe: recovery', { timeout: 60000 });
  r.check('the game recovers once the provider is healthy again',
    recovery.settled === true && !recovery.error, recovery.error ? recovery.error.text.slice(0, 90) : 'no error');
  r.check('the recovered turn actually narrates something',
    recovery.tail.length > 40, recovery.tail.slice(0, 90));

  // A truncated answer is not an error case: modelSchema.js repairs it
  // server-side (narrative kept, no mechanics applied), so the turn is
  // expected to complete normally with no error banner, same as `ok`.
  await setMode(fakeBase, 'truncated');
  const truncated = await takeTurn(b, 'QA probe: truncated', { timeout: 60000 });
  r.check('a truncated answer completes the turn instead of showing an error',
    truncated.settled === true && !truncated.error,
    truncated.error ? truncated.error.text.slice(0, 90) : (truncated.timedOut ? 'still spinning' : 'no error'));
  r.check('the repaired turn still narrates something',
    truncated.tail.length > 20, truncated.tail.slice(0, 90));

  // A provider that starts streaming and then goes quiet mid-answer (rather
  // than never speaking at all) behaves the same way as `truncated` here:
  // POST /api/turn's own stall timer cuts the stream once the silence
  // budget runs out, and whatever partial JSON arrived goes through the
  // same repair path — usually successfully, since "narrative" is one of
  // the first fields in the v2 schema. This is a deliberate property (a
  // stall does not have to cost the player their turn), not a bug.
  await setMode(fakeBase, 'stall_mid');
  const stallMid = await takeTurn(b, 'QA probe: stall_mid', { timeout: patience });
  r.check('a provider that goes quiet mid-answer still completes the turn (repaired, not an error)',
    stallMid.settled === true && !stallMid.error,
    stallMid.error ? stallMid.error.text.slice(0, 90) : (stallMid.timedOut ? 'still spinning' : 'no error'));

  // One unreadable answer: the server asks the other provider once, and the
  // player gets a normal turn.
  const before = (await (await fetch(fakeBase + '/__calls')).json()).calls.length;
  await setMode(fakeBase, 'malformed_once');
  const once = await takeTurn(b, 'QA probe: malformed_once', { timeout: 60000 });
  const calls = (await (await fetch(fakeBase + '/__calls')).json()).calls.slice(before);
  r.check('one unreadable answer is retried and the turn completes',
    once.settled === true && !once.error, once.error ? once.error.text.slice(0, 90) : 'no error');
  r.check('the retry goes to the other provider',
    calls.length === 2 && calls[0].body.model !== calls[1].body.model,
    calls.map(c => c.body.model).join(' then '));

  await setMode(fakeBase, 'ok');

  // These leave the providers blocked behind them, so they go last.
  for (const spec of QUOTA_EXPECTATIONS) await probe(r, b, fakeBase, patience, spec);

  return ctx;
}

module.exports = { run, MODE_EXPECTATIONS, QUOTA_EXPECTATIONS };
