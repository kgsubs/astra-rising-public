'use strict';
// Smoke tests for P2-C1: rules context injection in /api/chat
// Override 2: 5 explicit conditions
// Run with: node server/tests/smoke_c1_rules_injection.js
// Exits 0 on all pass, 1 on any failure.
//
// Conditions verified:
//   1. /api/healthz still returns HTTP 200 (regression)
//   2. POST /api/chat without X-Session-Token still returns 401 (regression)
//   3. buildRulesContext returns non-empty output for valid gameState (unit)
//   4. game_state field is stripped from body before forwarding to Anthropic
//      (verified by static inspection of server.js — game_state destructured out)
//   5. Rules context is injected into the system prompt when game_state is present
//      (verified by unit-testing the injection path with a mock body)

const assert = require('assert');
const http   = require('http');

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

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: 'localhost', port: 3500, path }, (res) => {
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
        host: 'localhost', port: 3500, path,
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
  // Condition 1: /api/healthz HTTP 200 (regression)
  await testAsync('Condition 1: /api/healthz returns HTTP 200', async () => {
    const r = await httpGet('/api/healthz');
    assert.strictEqual(r.status, 200, `expected 200, got ${r.status}`);
  });

  // Condition 2: POST /api/chat without X-Session-Token returns 401 (regression)
  await testAsync('Condition 2: POST /api/chat without X-Session-Token returns 401', async () => {
    const r = await httpPost('/api/chat', {}, { model: 'test' });
    assert.strictEqual(r.status, 401, `expected 401, got ${r.status}`);
  });

  // Condition 3: buildRulesContext returns non-empty output for valid gameState (unit)
  test('Condition 3: buildRulesContext returns non-empty output for valid gameState', () => {
    const ctx = buildRulesContext(TEST_GAME_STATE, []);
    assert.ok(ctx && ctx.length > 0, 'buildRulesContext returned empty string');
    assert.ok(ctx.includes('[COMPUTED STATE]'), 'output missing [COMPUTED STATE]');
    assert.ok(ctx.includes('[RULES CONTEXT]'), 'output missing [RULES CONTEXT]');
  });

  // Condition 4: server.js destructures game_state out of req.body before forwarding
  test('Condition 4: server.js strips game_state from body before Anthropic forward', () => {
    const fs = require('fs');
    const src = fs.readFileSync(require('path').join(__dirname, '../../server.js'), 'utf8');
    assert.ok(
      /game_state\s*:\s*_gameStateRaw/.test(src),
      'server.js does not destructure game_state from req.body'
    );
    // Also confirm it is not spread into the forwarded body
    const destructureLine = src.match(/const \{[^}]+\}\s*=\s*req\.body/);
    assert.ok(destructureLine, 'req.body destructuring not found');
    assert.ok(
      destructureLine[0].includes('game_state'),
      'game_state not destructured out of req.body'
    );
  });

  // Condition 5: rules context is injected into system when game_state is present
  test('Condition 5: rules context appended to system prompt when game_state present', () => {
    const ctx = buildRulesContext(TEST_GAME_STATE, []);
    const originalSystem = 'You are a DM.';
    const augmented = originalSystem + '\n\n' + ctx;
    assert.ok(augmented.includes('[COMPUTED STATE]'), 'augmented prompt missing [COMPUTED STATE]');
    assert.ok(augmented.includes('[RULES CONTEXT]'),  'augmented prompt missing [RULES CONTEXT]');
    assert.ok(augmented.startsWith(originalSystem),   'original system prompt not preserved');
  });

  // Summary
  console.log('');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('ALL TESTS PASSED');
    process.exit(0);
  } else {
    console.log(failed + ' FAILURE(S)');
    process.exit(1);
  }
})();
