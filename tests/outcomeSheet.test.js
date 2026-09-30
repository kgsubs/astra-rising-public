'use strict';

const { createScriptedDice } = require('../server/services/dice');
const { buildSheet, buildEmptySheet, dropMismatchedPinnedRow, renderSheet, resolveAgainstTarget } = require('../server/services/outcomeSheet');
const { ensureRulesLoaded, makeCharacter, makeState, makeCombatState, houseRules } = require('./helpers/astraFixtures');

describe('outcomeSheet.js', () => {
  const rules = ensureRulesLoaded();

  test('resolveAgainstTarget: 01-05 is always a success, 96-00 is always a failure', () => {
    expect(resolveAgainstTarget(1, -50)).toBe(true);
    expect(resolveAgainstTarget(5, -50)).toBe(true);
    expect(resolveAgainstTarget(96, 150)).toBe(false);
    expect(resolveAgainstTarget(100, 150)).toBe(false);
    expect(resolveAgainstTarget(50, 60)).toBe(true);
    expect(resolveAgainstTarget(61, 60)).toBe(false);
  });

  test('a skill row rolls once and evaluates three tiers off that one roll', () => {
    const state = makeState();
    const dice = createScriptedDice([50]);
    const sheet = buildSheet(state, null, dice, rules, houseRules);
    const s1 = sheet.rows.S1; // Beam Weapons, DEX 55 L2 -> standard target 47
    expect(s1.roll).toBe(50);
    expect(s1.tiers.easy.target).toBe(67);
    expect(s1.tiers.standard.target).toBe(47);
    expect(s1.tiers.hard.target).toBe(27);
    expect(s1.tiers.easy.success).toBe(true);
    expect(s1.tiers.standard.success).toBe(false);
    expect(s1.tiers.hard.success).toBe(false);
  });

  test('a pinned skill check honors the tier picked at choice time', () => {
    const state = makeState();
    const dice = createScriptedDice([50]);
    const sheet = buildSheet(state, { kind: 'skill', key: 'beam_weapons', tier: 'easy' }, dice, rules, houseRules);
    expect(sheet.rows.P1.kind).toBe('skill');
    expect(sheet.rows.P1.target).toBe(67);
    expect(sheet.rows.P1.success).toBe(true);
  });

  test('ability rows have no tiers — a single roll against the raw stat', () => {
    const state = makeState();
    const dice = createScriptedDice([10]);
    const sheet = buildSheet(state, null, dice, rules, houseRules);
    expect(sheet.rows.B1.key).toBe('str');
    expect(sheet.rows.B1.target).toBe(55);
    expect(sheet.rows.B1.success).toBe(true);
  });

  test('weapon-vs-enemy rows only appear when there is an active enemy', () => {
    const noCombat = buildSheet(makeState(), null, createScriptedDice([50]), rules, houseRules);
    expect(Object.keys(noCombat.rows).some(k => k.startsWith('A'))).toBe(false);
    expect(Object.keys(noCombat.rows).some(k => k.startsWith('E'))).toBe(false);

    const combat = buildSheet(makeState({ scene: makeCombatState() }), null, createScriptedDice([50]), rules, houseRules);
    expect(combat.rows.A1.kind).toBe('attack');
    expect(combat.rows.A1.targetId).toBe('h1');
    expect(combat.rows.E1.kind).toBe('enemy_attack');
    expect(combat.rows.E1.targetId).toBe('h1');
  });

  test('attack tiers map to point blank / short / long range modifiers', () => {
    const dice = createScriptedDice([50]);
    const sheet = buildSheet(makeState({ scene: makeCombatState() }), null, dice, rules, houseRules);
    const a1 = sheet.rows.A1;
    // Beam Weapons L2, DEX 55 -> base target 47; point_blank +20, short +0, long -20
    expect(a1.tiers.easy.target).toBe(67);
    expect(a1.tiers.standard.target).toBe(47);
    expect(a1.tiers.hard.target).toBe(27);
  });

  test('initiative is rolled once per active enemy plus the player, highest first', () => {
    const dice = createScriptedDice([9, 3]); // player d10=9, enemy d10=3 (both +IM)
    const sheet = buildSheet(makeState({ scene: makeCombatState() }), null, dice, rules, houseRules);
    expect(sheet.initiative).toHaveLength(2);
    expect(sheet.initiative[0].initiative_roll).toBeGreaterThanOrEqual(sheet.initiative[1].initiative_roll);
  });

  test('the hazard row pre-rolls all three severities', () => {
    const dice = createScriptedDice([50]);
    const sheet = buildSheet(makeState(), null, dice, rules, houseRules);
    expect(sheet.hazard.minor.damage).toBeGreaterThan(0);
    expect(sheet.hazard.moderate.damage).toBeGreaterThan(0);
    expect(sheet.hazard.severe.damage).toBeGreaterThan(0);
    expect(['HURT', 'DROP UNCONSCIOUS', 'DEAD']).toContain(sheet.hazard.minor.word);
  });

  test('renderSheet output has no multi-digit numbers', () => {
    const dice = createScriptedDice([50, 3, 7, 12, 88, 45, 21]);
    const sheet = buildSheet(makeState({ scene: makeCombatState() }), { kind: 'attack', key: 'laser_pistol', tier: 'standard', target_id: 'h1' }, dice, rules, houseRules);
    const text = renderSheet(sheet);
    expect(text).not.toMatch(/\d{2,}/);
  });

  test('renderSheet includes a PINNED line when a check is pinned', () => {
    const dice = createScriptedDice([50]);
    const sheet = buildSheet(makeState(), { kind: 'ability', key: 'dex', tier: 'standard' }, dice, rules, houseRules);
    const text = renderSheet(sheet);
    expect(text).toMatch(/^OUTCOME SHEET/);
    expect(text).toContain('P1 PINNED');
  });

  describe('a pinned attack check whose key is a category, not a specific weapon', () => {
    test('resolves to the player\'s owned weapon of that category, not unarmed', () => {
      // makeCharacter's default inventory carries "Olef A13 laser pistol",
      // which matches the beam_weapons category.
      const dice = createScriptedDice([50]);
      const sheet = buildSheet(makeState({ scene: makeCombatState() }), { kind: 'attack', key: 'beam_weapons', tier: 'standard', target_id: 'h1' }, dice, rules, houseRules);
      expect(sheet.rows.P1.weaponId).toBe('laser_pistol');
      expect(sheet.rows.P1.usesSeu).toBe(true);
    });

    test('falls back to unarmed only when the player owns nothing in that category', () => {
      const dice = createScriptedDice([50]);
      const character = makeCharacter({ inventory: ['Medkit', 'Stimdose x2'] }); // no weapons at all
      const state = makeState({ character, scene: makeCombatState() });
      const sheet = buildSheet(state, { kind: 'attack', key: 'beam_weapons', tier: 'standard', target_id: 'h1' }, dice, rules, houseRules);
      expect(sheet.rows.P1.weaponId).toBe('unarmed');
      expect(sheet.rows.P1.usesSeu).toBe(false);
    });

    test('an unrecognized key with no owned match also falls back to unarmed, not a wrong category', () => {
      const dice = createScriptedDice([50]);
      const sheet = buildSheet(makeState({ scene: makeCombatState() }), { kind: 'attack', key: 'plasma_cannon', tier: 'standard', target_id: 'h1' }, dice, rules, houseRules);
      expect(sheet.rows.P1.weaponId).toBe('unarmed');
    });
  });

  describe('dropMismatchedPinnedRow', () => {
    test('leaves the sheet untouched when the choice_id matches (a genuine retry)', () => {
      const dice = createScriptedDice([50]);
      const sheet = buildSheet(makeState(), { kind: 'ability', key: 'dex', tier: 'standard' }, dice, rules, houseRules);
      const result = dropMismatchedPinnedRow(sheet, 'c1', 'c1');
      expect(result).toBe(sheet);
      expect(result.rows.P1).toBeDefined();
    });

    test('drops P1 when the current choice_id differs from the one the sheet was pinned for', () => {
      const dice = createScriptedDice([50]);
      const sheet = buildSheet(makeState(), { kind: 'ability', key: 'dex', tier: 'standard' }, dice, rules, houseRules);
      const result = dropMismatchedPinnedRow(sheet, 'c1', 'c2');
      expect(result.rows.P1).toBeUndefined();
      expect(result.order).not.toContain('P1');
      // every other row survives — only the mismatched pin is dropped
      expect(result.order.length).toBe(sheet.order.length - 1);
    });

    test('a sheet with no pinned row is returned unchanged regardless of choice_id', () => {
      const dice = createScriptedDice([50]);
      const sheet = buildSheet(makeState(), null, dice, rules, houseRules);
      const result = dropMismatchedPinnedRow(sheet, 'c1', 'c2');
      expect(result).toBe(sheet);
    });
  });

  describe('buildEmptySheet', () => {
    test('has no rows and no initiative, even mid-combat, and rolls no dice', () => {
      const state = makeState({ scene: makeCombatState() });
      const sheet = buildEmptySheet(state);
      expect(sheet.rows).toEqual({});
      expect(sheet.order).toEqual([]);
      expect(sheet.initiative).toBeNull();
      expect(sheet.hazard).toBeNull();
      expect(sheet.enemyIds).toEqual([]);
      expect(sheet.turn).toBe(1);
    });
  });

  describe('buildSheet fails closed on missing rules', () => {
    test('throws rather than building a sheet from an empty ruleset', () => {
      const state = makeState();
      const dice = createScriptedDice([50]);
      expect(() => buildSheet(state, null, dice, {}, houseRules)).toThrow(/core_basic/);
      expect(() => buildSheet(state, null, dice, null, houseRules)).toThrow(/core_basic/);
    });
  });
});
