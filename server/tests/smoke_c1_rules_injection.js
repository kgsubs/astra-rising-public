'use strict';
// Smoke tests for P2-C1: rules context injection.
// /api/chat is retired and the browser never sends game_state to anything
// anymore. Conditions 2, 4 and 5 below were static/behavioral checks on
// that relay; they are now behavior checks against /api/turn, the endpoint
// that actually builds a prompt now (server/services/promptBuilder.js).
// Run with: node server/tests/smoke_c1_rules_injection.js
// Exits 0 on all pass, 1 on any failure.
//
// Conditions verified:
//   1. /api/healthz still returns HTTP 200 (regression)
//   2. POST /api/chat is retired: 410 regardless of token (regression)
//   3. buildRulesContext returns non-empty output for valid gameState (unit)
//   4. protocol v2's request body has no game_state field at all, so there is
//      nothing to strip; tests/turn.test.js's "a body.game_state field, if
//      sent, is ignored" is the live behavior guard against reintroducing it
//   5. Rules context reaches the provider inside the system message
//      POST /api/turn builds, driven end to end through the fake provider
//      (qa/fake-provider.js) rather than asserted on a hand-built copy

const assert = require('assert');
const http   = require('http');
const { createFakeProvider } = require('../../qa/fake-provider');

// ── Bootstrap rule loader (required for unit conditions) ─────────────────────

const { loadRules } = require('../../server/ruleLoader');
loadRules();

const { buildRulesContext } = require('../../server/services/promptRulesInjector');

let passed = 0;
let failed = 0;

function test(label, fn) {
  try {
    fn();
    console.log('PASS ' + label);
    passed++;
  } catch (err) {
    console.log('FAIL ' + label + ' — ' + err.message);
    failed++;
  }
}

async function testAsync(label, fn) {
  try {
    await fn();
    console.log('PASS ' + label);
    passed++;
  } catch (err) {
    console.log('FAIL ' + label + ' — ' + err.message);
    failed++;
  }
}

// A real provider must never be reachable from this suite, whether it is run
// standalone or spawned by tests/verification-suites.test.js. '' rather than
// delete: dotenv only fills in a variable that is entirely absent from
// process.env, so a deleted key would be silently repopulated from a real
// .env file in this repo's directory before the require('../../server')
// below runs its own require('dotenv').config(). The URL points at an
// address nothing listens on, so even a leaked real key can reach no
// provider; condition 5 below overrides GROQ_API_KEY/GROQ_URL for its own
// single call, against the in-process fake provider.
process.env.GEMINI_API_KEY = '';
process.env.GROQ_API_KEY = '';
process.env.GEMINI_URL = 'http://127.0.0.1:1/no-provider-here';
process.env.GROQ_URL = 'http://127.0.0.1:1/no-provider-here';

// Starts its own copy of the app on an ephemeral port rather than talking to
// the configured PORT, which may be a real deployment: a suite must not
// depend on, or disturb, a running server elsewhere.

const app = require('../../server');
let testServer = null;
let testPort   = 0;

function startServer() {
  return new Promise((resolve) => {
    testServer = http.createServer(app);
    testServer.listen(0, '127.0.0.1', () => {
      testPort = testServer.address().port;
      resolve();
    });
  });
}

function stopServer() {
  return new Promise((resolve) => (testServer ? testServer.close(() => resolve()) : resolve()));
}

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: testPort, path }, (res) => {
      let body = '';
      res.on('data', d => (body += d));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

function httpPost(path, headers, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = http.request(
      {
        host: '127.0.0.1', port: testPort, path,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr), ...headers },
      },
      (res) => {
        let data = '';
        res.on('data', d => (data += d));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

// ── Test state used for unit conditions ───────────────────────────────────────

const TEST_GAME_STATE = {
  character: {
    name: 'Skrix', race: 'Krix', archetype: 'Techex',
    stats: { str: 40, sta: 40, dex: 50, rs: 50, int: 55, log: 55, per: 45, ldr: 45 },
    stamina: { current: 40, max: 40 },
    skills: [{ name: 'Beam Weapons', level: 2 }],
    inventory: ['laser_pistol'],
    racial_abilities: ['Ambidexterity'],
  },
  scene: { in_combat: false },
};

// ── Run tests ─────────────────────────────────────────────────────────────────

(async () => {

  await startServer();
  // Condition 1: /api/healthz HTTP 200 (regression)
  await testAsync('Condition 1: /api/healthz returns HTTP 200', async () => {
    const r = await httpGet('/api/healthz');
    assert.strictEqual(r.status, 200, `expected 200, got ${r.status}`);
  });

  // Condition 2: POST /api/chat is retired (regression against the cutover)
  await testAsync('Condition 2: POST /api/chat is retired, returns 410', async () => {
    const r = await httpPost('/api/chat', {}, { model: 'test' });
    assert.strictEqual(r.status, 410, `expected 410, got ${r.status}`);
  });

  // Condition 3: buildRulesContext returns non-empty output for valid gameState (unit)
  test('Condition 3: buildRulesContext returns non-empty output for valid gameState', () => {
    const ctx = buildRulesContext(TEST_GAME_STATE, []);
    assert.ok(ctx && ctx.length > 0, 'buildRulesContext returned empty string');
    assert.ok(ctx.includes('[COMPUTED STATE]'), 'output missing [COMPUTED STATE]');
    assert.ok(ctx.includes('[RULES CONTEXT]'), 'output missing [RULES CONTEXT]');
  });

  // Condition 4: protocol v2's request body ({turn, text, choice_id}) has no
  // game_state field to strip in the first place. tests/turn.test.js's "a
  // body.game_state field, if sent, is ignored" is the live regression guard
  // (proving a stray one is harmless even though the field is meaningless).
  test('Condition 4: POST /api/turn has no game_state field to strip (structural, not stripped)', () => {
    const fs = require('fs');
    const src = fs.readFileSync(require('path').join(__dirname, '../../server.js'), 'utf8');
    const turnHandler = src.match(/app\.post\('\/api\/turn'[\s\S]*?\n\}\);/);
    assert.ok(turnHandler, "could not find the POST '/api/turn' handler in server.js");
    assert.ok(
      !/req\.body\.game_state/.test(turnHandler[0]),
      'POST /api/turn reads req.body.game_state — the client should never be trusted for state again'
    );
  });

  // Condition 5: rules context reaches the provider inside the system
  // message POST /api/turn builds. Driven through the fake provider end to
  // end (new game -> begin -> one turn) rather than asserted on a hand-built
  // copy of the concatenation, so a regression in the real
  // promptBuilder.js/server.js wiring is what this actually catches.
  await testAsync('Condition 5: rules context reaches the provider via /api/turn', async () => {
    const fake = createFakeProvider({ port: 0 });
    const fakePort = await fake.listen();
    const priorKey = process.env.GROQ_API_KEY;
    const priorUrl = process.env.GROQ_URL;
    process.env.GROQ_API_KEY = 'test-key';
    process.env.GROQ_URL = `http://127.0.0.1:${fakePort}/v1/chat/completions`;
    try {
      const session = await httpPost('/api/session', {}, {});
      const { token } = JSON.parse(session.body);

      const newGame = await httpPost('/api/game/new', { 'X-Session-Token': token }, {
        character_id: 'kael_voss', display_name: 'QA Testworth', adventure_id: 'ghost_station',
      });
      assert.strictEqual(newGame.status, 200, `POST /api/game/new expected 200, got ${newGame.status}: ${newGame.body}`);

      const begin = await httpPost('/api/game/begin', { 'X-Session-Token': token }, { hook_index: 0 });
      assert.strictEqual(begin.status, 200, `POST /api/game/begin expected 200, got ${begin.status}: ${begin.body}`);

      const turn = await httpPost('/api/turn', { 'X-Session-Token': token, 'X-Astra-Protocol': '2' }, {
        turn: 1, text: 'I check the aft panel for damage.',
      });
      assert.strictEqual(turn.status, 200, `POST /api/turn expected 200, got ${turn.status}: ${turn.body}`);

      const callsRes = await new Promise((resolve, reject) => {
        http.get({ host: '127.0.0.1', port: fakePort, path: '/__calls' }, (res) => {
          let data = '';
          res.on('data', d => (data += d));
          res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
      });
      const lastCall = callsRes.calls[callsRes.calls.length - 1];
      const forwardedSystem = lastCall && lastCall.body && lastCall.body.messages
        && lastCall.body.messages.find(m => m.role === 'system');
      assert.ok(forwardedSystem, 'no system message reached the provider for the turn call');
      assert.ok(forwardedSystem.content.includes('[RULES CONTEXT]'), 'forwarded system missing [RULES CONTEXT]');
      assert.ok(forwardedSystem.content.includes('OUTCOME SHEET'), 'forwarded system missing the outcome sheet');
      assert.ok(!forwardedSystem.content.includes('[COMPUTED STATE]'), 'forwarded system should not carry the redundant [COMPUTED STATE] block once the sheet is present');
    } finally {
      if (priorKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = priorKey;
      if (priorUrl === undefined) delete process.env.GROQ_URL; else process.env.GROQ_URL = priorUrl;
      await fake.close();
    }
  });

  // Summary
  console.log('');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  await stopServer();

  if (failed === 0) {
    console.log('ALL TESTS PASSED');
    process.exit(0);
  } else {
    console.log(failed + ' FAILURE(S)');
    process.exit(1);
  }
})();
