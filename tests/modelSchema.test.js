'use strict';

const { parseModelOutput, sanitizeNarrative, extractJSONText, repairTruncatedJSON, stripMechanics } = require('../server/services/modelSchema');

function validJSON(overrides = {}) {
  return JSON.stringify({
    narrative: 'You step through the airlock.',
    checks: [{ row: 'P1', tier: 'standard', target_id: null, outcome_seen: 'PASS' }],
    hostile_actions: [],
    hazard: null,
    healing: null,
    xp_awards: ['discovery'],
    credits: null,
    combat: null,
    story_updates: { status_add: [], status_remove: [], inventory_add: [], inventory_remove: [], npc_updates: [], faction_updates: [], journal_entry: null, scene_id: null },
    choices: [{ id: 'c1', text: 'Go north', action_type: 'explore', check: null }, { id: 'c2', text: 'Go south', action_type: 'explore', check: null }],
    scene_change: false, scene_header: null, scene_summary: 'Boarded the station.', ooc_note: null, tooltip_terms: [],
    ...overrides,
  });
}

describe('modelSchema.js', () => {
  test('parses a valid v2 reply', () => {
    const r = parseModelOutput(validJSON());
    expect(r.ok).toBe(true);
    expect(r.repaired).toBe(false);
    expect(r.data.narrative).toContain('airlock');
    expect(r.data.checks).toEqual([{ row: 'P1', tier: 'standard', target_id: null, outcome_seen: 'PASS' }]);
    expect(r.data.choices).toHaveLength(2);
  });

  test('strips code fences before parsing', () => {
    const r = parseModelOutput('```json\n' + validJSON() + '\n```');
    expect(r.ok).toBe(true);
  });

  test('drops model-supplied dice/target/success/state_updates/*_delta fields and reports them', () => {
    const raw = JSON.parse(validJSON());
    raw.dice_rolls = [{ roll: 1, target: 99, success: true }];
    raw.state_updates = { stamina_delta: 999 };
    raw.stamina_delta = 999;
    raw.combat_state_update = { combatants: [] };
    const r = parseModelOutput(JSON.stringify(raw));
    expect(r.ok).toBe(true);
    expect(r.ignoredFields.sort()).toEqual(['combat_state_update', 'dice_rolls', 'stamina_delta', 'state_updates']);
    expect(r.data.dice_rolls).toBeUndefined();
    expect(r.data.state_updates).toBeUndefined();
  });

  test('an unparseable, non-truncated reply fails cleanly', () => {
    const r = parseModelOutput('I cannot answer that in JSON.');
    expect(r.ok).toBe(false);
    expect(r.data).toBeNull();
    expect(r.error).toBeTruthy();
  });

  test('a truncated reply is repaired: narrative kept, checks empty, no mechanics implied', () => {
    const full = validJSON({ narrative: 'The corridor stretches on.' });
    const truncated = full.slice(0, Math.floor(full.length * 0.6));
    const r = parseModelOutput(truncated);
    expect(r.ok).toBe(true);
    expect(r.repaired).toBe(true);
    expect(r.data.narrative).toContain('corridor');
    expect(r.data.checks).toEqual([]);
  });

  test('a reply missing both narrative and ooc_note fails', () => {
    const raw = JSON.parse(validJSON());
    raw.narrative = '';
    const r = parseModelOutput(JSON.stringify(raw));
    expect(r.ok).toBe(false);
  });

  test('an ooc_note-only reply (Ask GM turn) is accepted with no narrative', () => {
    const raw = { narrative: '', ooc_note: 'The station predates the colony charter by six years.', checks: [], hostile_actions: [], hazard: null, healing: null, xp_awards: [], credits: null, combat: null, story_updates: {}, choices: [], scene_change: false, scene_header: null, scene_summary: '', tooltip_terms: [] };
    const r = parseModelOutput(JSON.stringify(raw));
    expect(r.ok).toBe(true);
    expect(r.data.ooc_note).toContain('charter');
  });

  test('unknown enum values are dropped rather than trusted', () => {
    const raw = JSON.parse(validJSON());
    raw.hazard = { severity: 'apocalyptic' };
    raw.healing = 'a nap';
    raw.credits = { kind: 'purchase', tier: 'a lot' };
    const r = parseModelOutput(JSON.stringify(raw));
    expect(r.data.hazard).toBeNull();
    expect(r.data.healing).toBeNull();
    expect(r.data.credits).toBeNull();
  });

  test('choices are capped at 4', () => {
    const raw = JSON.parse(validJSON());
    raw.choices = [1, 2, 3, 4, 5].map(i => ({ id: `c${i}`, text: `Option ${i}`, action_type: 'explore' }));
    const r = parseModelOutput(JSON.stringify(raw));
    expect(r.data.choices).toHaveLength(4);
  });

  describe('sanitizeNarrative', () => {
    test('strips a sentence naming dice mechanics', () => {
      const text = 'You duck behind cover. You rolled 45 against a target of 65. The shot misses.';
      const out = sanitizeNarrative(text);
      expect(out).not.toMatch(/rolled 45/);
      expect(out).toContain('duck behind cover');
    });

    test('leaves ordinary prose untouched', () => {
      const text = 'The airlock hisses open and frost crawls across the deck plates.';
      expect(sanitizeNarrative(text)).toBe(text);
    });
  });

  describe('extractJSONText', () => {
    test('takes the substring between the first { and the last }', () => {
      expect(extractJSONText('here is your answer: {"a":1} thanks')).toBe('{"a":1}');
    });
  });

  describe('repairTruncatedJSON', () => {
    test('returns null when no narrative field can be found at all', () => {
      expect(repairTruncatedJSON('{"choices": [')).toBeNull();
    });
  });

  describe('stripMechanics', () => {
    test('neuters every mechanical field but keeps narrative, ooc_note and choices', () => {
      const { data } = parseModelOutput(validJSON({
        ooc_note: 'The registry lists it as decommissioned.',
        hazard: { severity: 'severe' },
        healing: 'stimdose',
        xp_awards: ['discovery', 'victory'],
        credits: { kind: 'reward', tier: 'small', item: null },
        combat: { start: [{ name: 'Pod Sleeper', threat: 'minion' }] },
        story_updates: { status_add: ['Marked'], status_remove: [], inventory_add: ['Stray key'], inventory_remove: [], npc_updates: [], faction_updates: [], journal_entry: 'Found a key.', scene_id: 'scene_2_administration' },
        scene_change: true, scene_header: 'A New Room',
      }));
      const stripped = stripMechanics(data);
      expect(stripped.checks).toEqual([]);
      expect(stripped.hostile_actions).toEqual([]);
      expect(stripped.hazard).toBeNull();
      expect(stripped.healing).toBeNull();
      expect(stripped.xp_awards).toEqual([]);
      expect(stripped.credits).toBeNull();
      expect(stripped.combat).toBeNull();
      expect(stripped.story_updates).toEqual({ status_add: [], status_remove: [], inventory_add: [], inventory_remove: [], npc_updates: [], faction_updates: [], journal_entry: null, scene_id: null });
      expect(stripped.scene_change).toBe(false);
      expect(stripped.scene_header).toBeNull();
      // untouched — these are the whole point of an Ask GM reply
      expect(stripped.narrative).toBe(data.narrative);
      expect(stripped.ooc_note).toBe(data.ooc_note);
      expect(stripped.choices).toEqual(data.choices);
    });
  });
});
