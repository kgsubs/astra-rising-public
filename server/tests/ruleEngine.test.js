'use strict';
// Unit tests for server/services/ruleEngine.js
// Uses Node.js built-in assert module only — no test framework required.
// Run with: node server/tests/ruleEngine.test.js
// Exits 0 on all pass, 1 on any failure.

const assert = require('assert');

// Bootstrap rule loader so rulesCache is populated before importing ruleEngine
const { loadRules } = require('../../server/ruleLoader');
loadRules();

const {
  computeIM,
  computeSkillTarget,
  parseWeaponDamage,
  parseDamageString,
  computeSTAThresholds,
  computeRacialTriggerChance,
  computeAbilityModifier,
} = require('../../server/services/ruleEngine');

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

// ── computeIM ─────────────────────────────────────────────────────────────────

test('computeIM(45) === 5', () => {
  assert.strictEqual(computeIM(45), 5);
});

test('computeIM(50) === 5', () => {
  assert.strictEqual(computeIM(50), 5);
});

test('computeIM(55) === 6', () => {
  assert.strictEqual(computeIM(55), 6);
});

test('computeIM(10) === 1', () => {
  assert.strictEqual(computeIM(10), 1);
});

test('computeIM(100) === 10', () => {
  assert.strictEqual(computeIM(100), 10);
});

test('computeIM(1) === 1 (ceil of 0.1)', () => {
  assert.strictEqual(computeIM(1), 1);
});

// ── computeSkillTarget ────────────────────────────────────────────────────────

test('computeSkillTarget(60, 3) === 60', () => {
  // floor(60/2) + (3*10) = 30 + 30 = 60
  assert.strictEqual(computeSkillTarget(60, 3), 60);
});

test('computeSkillTarget(50, 2) === 45', () => {
  // floor(50/2) + (2*10) = 25 + 20 = 45
  assert.strictEqual(computeSkillTarget(50, 2), 45);
});

test('computeSkillTarget(40, 0) === 20', () => {
  // floor(40/2) + 0 = 20
  assert.strictEqual(computeSkillTarget(40, 0), 20);
});

test('computeSkillTarget(55, 1) === 37', () => {
  // floor(55/2) + 10 = 27 + 10 = 37
  assert.strictEqual(computeSkillTarget(55, 1), 37);
});

// ── parseDamageString (internal helper) ───────────────────────────────────────

test('parseDamageString("1d10 per SEU") returns correct fields', () => {
  const r = parseDamageString('1d10 per SEU');
  assert.ok(r, 'should not be null');
  assert.strictEqual(r.formula, '1d10');
  assert.strictEqual(r.min, 1);
  assert.strictEqual(r.max, 10);
  assert.ok(r.avgPerSEU !== null, 'avgPerSEU should be set for per-SEU weapon');
});

test('parseDamageString("2d10") returns correct fields', () => {
  const r = parseDamageString('2d10');
  assert.ok(r, 'should not be null');
  assert.strictEqual(r.formula, '2d10');
  assert.strictEqual(r.min, 2);
  assert.strictEqual(r.max, 20);
  assert.strictEqual(r.avgPerSEU, null);
});

test('parseDamageString("1d10 + 2") returns correct fields', () => {
  const r = parseDamageString('1d10 + 2');
  assert.ok(r, 'should not be null');
  assert.strictEqual(r.formula, '1d10+2');
  assert.strictEqual(r.min, 3);
  assert.strictEqual(r.max, 12);
});

test('parseDamageString("4d10") returns correct fields', () => {
  const r = parseDamageString('4d10');
  assert.ok(r, 'should not be null');
  assert.strictEqual(r.min, 4);
  assert.strictEqual(r.max, 40);
});

// ── parseWeaponDamage ─────────────────────────────────────────────────────────

test('parseWeaponDamage("laser_pistol", "beam_weapons") returns non-null', () => {
  const r = parseWeaponDamage('laser_pistol', 'beam_weapons');
  assert.ok(r, 'laser_pistol should be found in beam_weapons');
  assert.ok(r.formula, 'formula should be present');
  assert.ok(r.avgPerSEU !== null, 'laser pistol is SEU-based');
});

test('parseWeaponDamage("jyro_pistol", "projectile_weapons") returns non-null', () => {
  const r = parseWeaponDamage('jyro_pistol', 'projectile_weapons');
  assert.ok(r, 'jyro_pistol should be found');
  assert.strictEqual(r.formula, '2d10');
  assert.strictEqual(r.avgPerSEU, null);
});

test('parseWeaponDamage("nonexistent_weapon", null) returns null', () => {
  const r = parseWeaponDamage('nonexistent_weapon_xyz', null);
  assert.strictEqual(r, null);
});

// ── computeSTAThresholds ──────────────────────────────────────────────────────

test('computeSTAThresholds(50) deep equals { unconscious: 0, dying: -80 }', () => {
  const r = computeSTAThresholds(50);
  assert.deepStrictEqual(r, { unconscious: 0, dying: -80 });
});

test('computeSTAThresholds(55) → dying = -85', () => {
  const r = computeSTAThresholds(55);
  assert.strictEqual(r.dying, -85);
});

test('computeSTAThresholds(30) → dying = -60', () => {
  const r = computeSTAThresholds(30);
  assert.strictEqual(r.dying, -60);
});

test('computeSTAThresholds always has unconscious = 0', () => {
  assert.strictEqual(computeSTAThresholds(40).unconscious, 0);
  assert.strictEqual(computeSTAThresholds(100).unconscious, 0);
});

// ── computeRacialTriggerChance ────────────────────────────────────────────────

test('computeRacialTriggerChance("yazirian", "Battle Rage") === 5', () => {
  const r = computeRacialTriggerChance('yazirian', 'Battle Rage');
  assert.strictEqual(r, 5);
});

test('computeRacialTriggerChance("dralasite", "Lie Detection") === 5', () => {
  const r = computeRacialTriggerChance('dralasite', 'Lie Detection');
  assert.strictEqual(r, 5);
});

test('computeRacialTriggerChance("vrusk", "Comprehension") === 15', () => {
  const r = computeRacialTriggerChance('vrusk', 'Comprehension');
  assert.strictEqual(r, 15);
});

test('computeRacialTriggerChance("human", "Versatility") === null (no % in description)', () => {
  const r = computeRacialTriggerChance('human', 'Versatility');
  assert.strictEqual(r, null);
});

test('computeRacialTriggerChance("bogusrace", "anything") === null', () => {
  const r = computeRacialTriggerChance('bogusrace', 'anything');
  assert.strictEqual(r, null);
});

// ── computeAbilityModifier ────────────────────────────────────────────────────

test('computeAbilityModifier(65) === "+10%"', () => {
  assert.strictEqual(computeAbilityModifier(65), '+10%');
});

test('computeAbilityModifier(50) === "0%"', () => {
  assert.strictEqual(computeAbilityModifier(50), '0%');
});

test('computeAbilityModifier(45) === "0%"', () => {
  assert.strictEqual(computeAbilityModifier(45), '0%');
});

test('computeAbilityModifier(55) === "+5%"', () => {
  assert.strictEqual(computeAbilityModifier(55), '+5%');
});

test('computeAbilityModifier(10) === "-20%"', () => {
  assert.strictEqual(computeAbilityModifier(10), '-20%');
});

test('computeAbilityModifier(75) === "+15%"', () => {
  assert.strictEqual(computeAbilityModifier(75), '+15%');
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
