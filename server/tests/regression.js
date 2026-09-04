'use strict';
// ─── Phase 2 Full Regression Suite ───────────────────────────────────────────
// Runs all Phase 2 smoke/unit tests and reports a combined summary.
// Run with: node server/tests/regression.js
// Exits 0 on all pass, 1 on any failure.

const assert = require('assert');
const http   = require('http');
const fs     = require('fs');
const path   = require('path');

// ── Bootstrap rule loader ─────────────────────────────────────────────────────

const { loadRules } = require('../../server/ruleLoader');
loadRules();

const {
  computeIM, computeSkillTarget, parseWeaponDamage, parseDamageString,
  computeSTAThresholds, computeRacialTriggerChance, computeAbilityModifier,
} = require('../../server/services/ruleEngine');

const { buildRulesContext } = require('../../server/services/promptRulesInjector');

// ── Test harness ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function test(label, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    console.log('FAIL ' + label + ' — ' + err.message);
    failed++;
    failures.push(label);
  }
}

async function testAsync(label, fn) {
  try {
    await fn();
    passed++;
  } catch (err) {
    console.log('FAIL ' + label + ' — ' + err.message);
    failed++;
    failures.push(label);
  }
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function httpGet(urlPath) {
  return new Promise((resolve, reject) => {
    http.get({ host: 'localhost', port: 3500, path: urlPath }, (res) => {
      let body = '';
      res.on('data', d => (body += d));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

function httpPost(urlPath, headers, body) {
  return new Promise((resolve, reject) => {
    const str = JSON.stringify(body);
    const req = http.request(
      { host: 'localhost', port: 3500, path: urlPath, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(str), ...headers } },
      (res) => {
        let data = '';
        res.on('data', d => (data += d));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('error', reject);
    req.write(str); req.end();
  });
}

// ── Common test state ─────────────────────────────────────────────────────────

const SKRIX_STATE = {
  character: {
    name: 'Skrix', race: 'Krix', archetype: 'Techex', psa: 'Technical',
    stats: { str: 40, sta: 40, dex: 50, rs: 50, int: 55, log: 55, per: 45, ldr: 45 },
    stamina: { current: 40, max: 40 },
    skills: [{ name: 'Beam Weapons', level: 2 }, { name: 'Technician', level: 1 }],
    inventory: ['laser_pistol', 'Techkit'],
    racial_abilities: ['Ambidexterity', 'Comprehension 15%'],
  },
  scene: { in_combat: true },
};

// ─── Main async runner ────────────────────────────────────────────────────────

(async () => {

  // ── A1–A5: Rules API ────────────────────────────────────────────────────────

  console.log('\n── A1–A5: Rules API (HTTP) ──────────────────────────────────────');

  await testAsync('A1: /api/rules returns loaded_rulesets with 5 entries', async () => {
    const r = await httpGet('/api/rules');
    const d = JSON.parse(r.body);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(d.loaded_rulesets.length, 5);
  });

  await testAsync('A3: GET /api/rules/alpha_dawn_basic returns 200 with character_creation', async () => {
    const r = await httpGet('/api/rules/alpha_dawn_basic');
    assert.strictEqual(r.status, 200);
    assert.ok(JSON.parse(r.body).character_creation);
  });

  await testAsync('A3: GET /api/rules/knight_hawks returns 403', async () => {
    const r = await httpGet('/api/rules/knight_hawks');
    assert.strictEqual(r.status, 403);
  });

  await testAsync('A4: GET /api/rules/alpha_dawn_basic/combat returns 200', async () => {
    const r = await httpGet('/api/rules/alpha_dawn_basic/combat');
    assert.strictEqual(r.status, 200);
    assert.ok(JSON.parse(r.body).initiative);
  });

  await testAsync('A4: GET /api/rules/alpha_dawn_basic/nonexistent returns 404', async () => {
    const r = await httpGet('/api/rules/alpha_dawn_basic/nonexistent');
    assert.strictEqual(r.status, 404);
  });

  await testAsync('A5: GET /api/rules/skills returns 200 with beam_weapons', async () => {
    const r = await httpGet('/api/rules/skills');
    assert.strictEqual(r.status, 200);
    assert.ok(JSON.parse(r.body).beam_weapons);
  });

  await testAsync('A5: GET /api/rules/equipment/weapons returns 200', async () => {
    const r = await httpGet('/api/rules/equipment/weapons');
    assert.strictEqual(r.status, 200);
  });

  await testAsync('A5: GET /api/rules/combat/quick-ref returns 200', async () => {
    const r = await httpGet('/api/rules/combat/quick-ref');
    assert.strictEqual(r.status, 200);
  });

  // ── B1: Rule Engine ──────────────────────────────────────────────────────────

  console.log('\n── B1: Rule Engine (unit) ───────────────────────────────────────');

  test('computeIM(45) === 5', () => assert.strictEqual(computeIM(45), 5));
  test('computeIM(55) === 6', () => assert.strictEqual(computeIM(55), 6));
  test('computeSkillTarget(60,3) === 60', () => assert.strictEqual(computeSkillTarget(60, 3), 60));
  test('computeSkillTarget(50,2) === 45', () => assert.strictEqual(computeSkillTarget(50, 2), 45));
  test('computeSTAThresholds(50).dying === -80', () => assert.strictEqual(computeSTAThresholds(50).dying, -80));
  test('computeAbilityModifier(65) === "+10%"', () => assert.strictEqual(computeAbilityModifier(65), '+10%'));
  test('computeRacialTriggerChance(yazirian,Battle Rage) === 5', () =>
    assert.strictEqual(computeRacialTriggerChance('yazirian', 'Battle Rage'), 5));
  test('parseWeaponDamage(laser_pistol) non-null', () =>
    assert.ok(parseWeaponDamage('laser_pistol', 'beam_weapons')));
  test('parseDamageString(2d10).max === 20', () =>
    assert.strictEqual(parseDamageString('2d10').max, 20));

  // ── B2: Prompt Rules Injector ────────────────────────────────────────────────

  console.log('\n── B2: Prompt Rules Injector (unit) ─────────────────────────────');

  const ctxSkrix = buildRulesContext(SKRIX_STATE, []);

  test('B2: contains [COMPUTED STATE]', () => assert.ok(ctxSkrix.includes('[COMPUTED STATE]')));
  test('B2: contains [RULES CONTEXT]', () => assert.ok(ctxSkrix.includes('[RULES CONTEXT]')));
  test('B2: contains IM:', () => assert.ok(ctxSkrix.includes('IM:')));
  test('B2: contains skill check target', () => assert.ok(ctxSkrix.includes('skill check target')));
  test('B2: Ambidexterity present (Krix)', () => assert.ok(ctxSkrix.includes('Ambidexterity')));
  test('B2: laser_pistol present', () => assert.ok(ctxSkrix.includes('laser_pistol')));
  test('B2: COMBAT SEQUENCE when in_combat=true', () => assert.ok(ctxSkrix.includes('COMBAT SEQUENCE')));
  test('B2: under 700 words', () => {
    const wc = ctxSkrix.split(/\s+/).filter(Boolean).length;
    assert.ok(wc < 700, `${wc} words (limit 700)`);
  });

  // ── C1: Rules Wiring ────────────────────────────────────────────────────────

  console.log('\n── C1: Rules Wiring (static + HTTP) ────────────────────────────');

  test('C1: server.js strips game_state from req.body', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../server.js'), 'utf8');
    assert.ok(/game_state\s*:\s*_gameStateRaw/.test(src));
  });

  await testAsync('C1: POST /api/chat without token returns 401', async () => {
    const r = await httpPost('/api/chat', {}, {});
    assert.strictEqual(r.status, 401);
  });

  // ── C2: rule_source in schema ────────────────────────────────────────────────

  console.log('\n── C2: rule_source in schema (static) ───────────────────────────');

  test('C2: rule_source in dice_rolls schema (both locations)', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../public/index.html'), 'utf8');
    const matches = src.match(/"rule_source"/g) || [];
    assert.ok(matches.length >= 2, `Expected >=2 occurrences, got ${matches.length}`);
  });

  // ── D1: Character Roster ────────────────────────────────────────────────────

  console.log('\n── D1: Character Roster (static) ────────────────────────────────');

  test('D1: game-data.js has all 7 character IDs', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../public/data/game-data.js'), 'utf8');
    for (const id of ['kael_voss', 'skrix', 'bolg', 'rayla', 'grukk', 'pip', 'vael']) {
      assert.ok(src.includes(`id: '${id}'`), `Missing character: ${id}`);
    }
  });

  test('D1: game-data.js has Humma, Ifshnit, Osakar races', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../public/data/game-data.js'), 'utf8');
    for (const race of ["race: 'Humma'", "race: 'Ifshnit'", "race: 'Osakar'"]) {
      assert.ok(src.includes(race), `Missing: ${race}`);
    }
  });

  // ── D2: Zebulon Race/Profession Injection ────────────────────────────────────

  console.log('\n── D2: Zebulon Race/Profession Injection (unit) ─────────────────');

  const ctxHumma = buildRulesContext({
    character: {
      name: 'Grukk', race: 'Humma', archetype: 'Enforcer', psa: 'Military',
      stats: { str: 65, sta: 65, dex: 45, rs: 45, int: 40, log: 40, per: 35, ldr: 35 },
      stamina: { current: 65, max: 65 },
      skills: [{ name: 'Melee Weapons', level: 2 }], inventory: ['vibrosword'],
    },
    scene: { in_combat: false },
  }, []);

  test('D2: Humma RACE block present', () => assert.ok(ctxHumma.includes('RACE (Humma)')));
  test('D2: Spring Charge ability present', () => assert.ok(ctxHumma.includes('Spring Charge')));
  test('D2: PROFESSION (enforcer) present', () => assert.ok(ctxHumma.includes('PROFESSION (enforcer)')));

  // ── D3: Expanded Skills ──────────────────────────────────────────────────────

  console.log('\n── D3: Zebulon Expanded Skills (unit) ───────────────────────────');

  test('D3: Beam Weapons shows subskills', () => assert.ok(ctxSkrix.includes('[subs:')));
  test('D3: Technician shows PSA skill note', () => assert.ok(ctxSkrix.includes('(PSA skill)')));

  // ── E1: Modules Endpoint ────────────────────────────────────────────────────

  console.log('\n── E1: Modules Endpoint (HTTP) ──────────────────────────────────');

  await testAsync('E1: POST /api/session + POST /modules with psionics returns 200', async () => {
    const s = await httpPost('/api/session', {}, {});
    const token = JSON.parse(s.body).token;
    const r = await httpPost('/api/session/' + token + '/modules', {}, { modules: ['psionics'] });
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(JSON.parse(r.body).active_modules, ['psionics']);
  });

  await testAsync('E1: GET /api/session/token/modules returns active_modules', async () => {
    const s = await httpPost('/api/session', {}, {});
    const token = JSON.parse(s.body).token;
    await httpPost('/api/session/' + token + '/modules', {}, { modules: ['mutations'] });
    const r = await httpGet('/api/session/' + token + '/modules');
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(JSON.parse(r.body).active_modules, ['mutations']);
  });

  await testAsync('E1: POST /modules with invalid module returns 400', async () => {
    const s = await httpPost('/api/session', {}, {});
    const token = JSON.parse(s.body).token;
    const r = await httpPost('/api/session/' + token + '/modules', {}, { modules: ['knight_hawks'] });
    assert.strictEqual(r.status, 400);
  });

  // ── E2–E5: Module-Specific Injection ────────────────────────────────────────

  console.log('\n── E2–E5: Module-Specific Injection (unit) ──────────────────────');

  const baseChar = {
    character: {
      name: 'T', race: 'Human', archetype: 'Enforcer', psa: 'Military',
      stats: { str: 55, sta: 55, dex: 55, rs: 50, int: 40, log: 40, per: 45, ldr: 50 },
      stamina: { current: 55, max: 55 }, skills: [], inventory: [],
    },
    scene: { in_combat: false },
  };

  test('E2: psionics shows Disciplines + Power Points', () => {
    const ctx = buildRulesContext(baseChar, ['psionics']);
    assert.ok(ctx.includes('Disciplines:'), 'Disciplines missing');
    assert.ok(ctx.includes('Power Points:'), 'Power Points missing');
  });

  test('E3: cybernetics shows Cyber Points + Cyberpsychosis', () => {
    const ctx = buildRulesContext(baseChar, ['cybernetics']);
    assert.ok(ctx.includes('Cyber Points:'), 'Cyber Points missing');
    assert.ok(ctx.includes('Cyberpsychosis:'), 'Cyberpsychosis missing');
  });

  test('E4: reputation_system shows Reputation tracks', () => {
    const ctx = buildRulesContext(baseChar, ['reputation_system']);
    assert.ok(ctx.includes('Reputation tracks:'));
  });

  test('E5: mutations shows Mutation types + Beneficial examples', () => {
    const ctx = buildRulesContext(baseChar, ['mutations']);
    assert.ok(ctx.includes('Mutation types:'), 'Mutation types missing');
    assert.ok(ctx.includes('Beneficial examples:'), 'Beneficial examples missing');
  });

  // ── REGR: Core Regressions ───────────────────────────────────────────────────

  console.log('\n── REGR: Core Regressions (HTTP) ────────────────────────────────');

  await testAsync('REGR: /api/healthz returns 200 {status: ok}', async () => {
    const r = await httpGet('/api/healthz');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(JSON.parse(r.body).status, 'ok');
  });

  await testAsync('REGR: POST /api/session returns 201 with UUID token', async () => {
    const r = await httpPost('/api/session', {}, {});
    assert.strictEqual(r.status, 201);
    assert.ok(JSON.parse(r.body).token);
  });

  await testAsync('REGR: GET /api/rules/optional-modules returns modules array', async () => {
    const r = await httpGet('/api/rules/optional-modules');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(JSON.parse(r.body).modules));
  });

  await testAsync('REGR: GET /api/rules/character/vrusk returns 200', async () => {
    const r = await httpGet('/api/rules/character/vrusk');
    assert.strictEqual(r.status, 200);
  });

  // ── Summary ──────────────────────────────────────────────────────────────────

  console.log('\n─────────────────────────────────────────────────────────────────');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log('Failures:');
    failures.forEach(f => console.log('  \u2022 ' + f));
  }
  if (failed === 0) {
    console.log('ALL TESTS PASSED');
    process.exit(0);
  } else {
    console.log(failed + ' FAILURE(S)');
    process.exit(1);
  }

})();
