'use strict';
// Smoke tests for server/services/promptRulesInjector.js
// Run with: node server/tests/promptRulesInjector.test.js
// Exits 0 on all pass, 1 on any failure.

const assert = require('assert');
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

// Test state: Krix Techex, Beam Weapons 2, laser_pistol, combatActive=true

const TEST_STATE = {
  character: {
    name: 'Skrix',
    race: 'Krix',
    archetype: 'Techex',
    stats: { str: 40, sta: 40, dex: 50, rs: 50, int: 55, log: 55, per: 45, ldr: 45 },
    stamina: { current: 40, max: 40 },
    skills: [
      { name: 'Beam Weapons', level: 2 },
      { name: 'Technician', level: 1 },
    ],
    inventory: ['laser_pistol', 'Civilian skeinsuit', 'Techkit'],
    racial_abilities: ['Ambidexterity', 'Comprehension 15%'],
  },
  campaign: null,
  scene: { in_combat: true },
  meta: { initialized: true },
};

const result = buildRulesContext(TEST_STATE, []);
const wordCount = result.split(/\s+/).filter(Boolean).length;

// ── Structural checks ──────────────────────────────────────────────────────────

test('output contains [COMPUTED STATE] header', () => {
  assert.ok(result.includes('[COMPUTED STATE]'), 'missing [COMPUTED STATE]');
});

test('output contains [RULES CONTEXT] header', () => {
  assert.ok(result.includes('[RULES CONTEXT]'), 'missing [RULES CONTEXT]');
});

// ── P1: Computed state checks ──────────────────────────────────────────────────

test('output contains IM: line', () => {
  assert.ok(result.includes('IM:'), 'missing IM: line');
});

test('IM value is correct for RS=50 (should be 5)', () => {
  assert.ok(result.includes('IM: 5'), `IM: 5 not found — got: ${result.match(/IM:.*/)?.[0]}`);
});

test('output contains skill check target for Beam Weapons', () => {
  assert.ok(result.includes('skill check target'), 'missing "skill check target"');
});

test('Beam Weapons L2 target is 45% (floor(50/2) + 2*10 = 45)', () => {
  assert.ok(result.includes('Beam Weapons L2 skill check target: 45%'),
    'Beam Weapons target not 45%');
});

test('output contains laser_pistol weapon entry', () => {
  assert.ok(result.includes('laser_pistol'), 'laser_pistol not found in output');
});

test('laser_pistol entry includes dmg formula', () => {
  // laser_pistol is SEU-based — should show formula and avgPerSEU
  assert.ok(result.match(/laser_pistol:.*dmg/), 'laser_pistol damage line not found');
});

test('STA thresholds line present', () => {
  assert.ok(result.includes('STA thresholds:'), 'STA thresholds line not found');
});

test('STA dying threshold = -70 for maxSTA=40 (-(40+30))', () => {
  assert.ok(result.includes('dying=-70'), `dying=-70 not found — got: ${result.match(/dying=.*/)?.[0]}`);
});

// ── P3: Racial abilities ───────────────────────────────────────────────────────

test('output contains Ambidexterity (Krix racial ability)', () => {
  assert.ok(result.includes('Ambidexterity'), 'Ambidexterity not found');
});

test('output contains Comprehension (Krix racial ability)', () => {
  assert.ok(result.includes('Comprehension'), 'Comprehension not found');
});

// ── P6: Combat block (in_combat=true) ─────────────────────────────────────────

test('combat sequence injected when in_combat=true', () => {
  assert.ok(result.includes('COMBAT SEQUENCE:'), 'COMBAT SEQUENCE not found');
});

test('to-hit modifiers injected when in_combat=true', () => {
  assert.ok(result.includes('TO-HIT MODS:'), 'TO-HIT MODS not found');
});

// ── No combat block when in_combat=false ──────────────────────────────────────

test('no combat block when in_combat=false', () => {
  const stateNoCombat = { ...TEST_STATE, scene: { in_combat: false } };
  const out = buildRulesContext(stateNoCombat, []);
  assert.ok(!out.includes('COMBAT SEQUENCE:'), 'COMBAT SEQUENCE should not appear when in_combat=false');
});

// ── P7: Gamma Dawn module injection ──────────────────────────────────────────

test('psionics module injected when activeModules includes psionics', () => {
  const out = buildRulesContext(TEST_STATE, ['psionics']);
  assert.ok(out.includes('MODULE [PSIONICS]'), 'psionics module block not found');
});

test('no module blocks when activeModules is empty', () => {
  assert.ok(!result.includes('MODULE ['), 'unexpected MODULE block with empty activeModules');
});

// ── Null / missing input guards ────────────────────────────────────────────────

test('returns empty string for null gameState', () => {
  assert.strictEqual(buildRulesContext(null, []), '');
});

test('returns empty string for gameState with null character', () => {
  assert.strictEqual(buildRulesContext({ character: null }, []), '');
});

// ── Token budget: under 700 words ────────────────────────────────────────────

test(`output under 700 words (got ${wordCount})`, () => {
  assert.ok(wordCount < 700, `output is ${wordCount} words (limit 700)`);
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('');
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('ALL TESTS PASSED');
  process.exit(0);
} else {
  console.log(failed + ' FAILURE(S)');
  process.exit(1);
}
