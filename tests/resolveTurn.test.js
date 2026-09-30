'use strict';

const { createScriptedDice } = require('../server/services/dice');
const { buildSheet } = require('../server/services/outcomeSheet');
const { resolveTurn } = require('../server/services/resolveTurn');
const { ensureRulesLoaded, makeCharacter, makeEnemy, makeState, makeCombatState, emptyOut, makeCtx, houseRules } = require('./helpers/astraFixtures');

const rules = ensureRulesLoaded();

// Convenience: build a sheet + ctx for a state in one call.
function sheetFor(state, pinnedCheck, script) {
  return buildSheet(state, pinnedCheck, createScriptedDice(script), rules, houseRules);
}

describe('resolveTurn.js', () => {
  // A single-value script wraps on every draw, so every d100/d10/roll() in
  // the whole sheet comes back as 1: every check auto-succeeds (01-05), every
  // attack auto-hits, and every damage/heal roll (which the scripted dice
  // returns regardless of the formula asked for) is exactly 1. That makes
  // the sheet's long, order-sensitive draw sequence irrelevant to the test.
  function allOnes() { return [1]; }

  test('a declared hit takes the target\'s STA and drops it to DOWN when it reaches 0', () => {
    const state = makeState({ scene: makeCombatState({ combat_state: { round: 1, phase: 'player_turn', initiative_order: [], combatants: [makeEnemy({ sta_current: 1, sta_max: 15 })] } }) });
    const sheet = sheetFor(state, { kind: 'attack', key: 'laser_pistol', tier: 'standard', target_id: 'h1' }, allOnes());
    const out = emptyOut({ checks: [{ row: 'P1', tier: 'standard', target_id: 'h1', outcome_seen: 'HIT' }] });

    const result = resolveTurn(state, sheet, out, makeCtx());
    const enemy = result.state.scene.combat_state
      ? result.state.scene.combat_state.combatants.find(c => c.id === 'h1')
      : null;
    // Combat auto-ends once every enemy is down, so combat_state may already be null.
    if (enemy) {
      expect(enemy.status).toBe('down');
    } else {
      expect(result.log.some(l => l.includes('is down'))).toBe(true);
    }
  });

  test('an enemy hit takes the player\'s STA', () => {
    const state = makeState({ scene: makeCombatState() });
    const sheet = sheetFor(state, null, allOnes());
    const before = state.character.stamina.current;

    const result = resolveTurn(state, sheet, emptyOut(), makeCtx());
    expect(result.state.character.stamina.current).toBe(before - 1); // one auto-hit, damage 1
  });

  test('stamina at 0 sets Unconscious; -30 sets Dead and game_over', () => {
    const atOne = makeCharacter({ stamina: { current: 1, max: 55 } });
    const state = makeState({ character: atOne, scene: makeCombatState() });
    const sheet = sheetFor(state, null, allOnes());
    const result = resolveTurn(state, sheet, emptyOut(), makeCtx());
    expect(result.state.character.stamina.current).toBe(0);
    expect(result.state.character.status_effects).toContain('Unconscious');
    expect(result.state.session.game_over).not.toBe(true);

    const atNegative29 = makeCharacter({ stamina: { current: -29, max: 55 } });
    const state2 = makeState({ character: atNegative29, scene: makeCombatState() });
    const sheet2 = sheetFor(state2, null, allOnes());
    const result2 = resolveTurn(state2, sheet2, emptyOut(), makeCtx());
    expect(result2.state.character.stamina.current).toBe(-30);
    expect(result2.state.character.status_effects).toContain('Dead');
    expect(result2.state.session.game_over).toBe(true);
  });

  test('enemies hold instead of attacking an unconscious player unless the action is finish', () => {
    const unconscious = makeCharacter({ stamina: { current: 0, max: 55 }, status_effects: ['Unconscious'] });
    const state = makeState({ character: unconscious, scene: makeCombatState() });
    const sheet = sheetFor(state, null, [1, 9, 1, 10]); // enemy would hit for 10 if it attacked
    const result = resolveTurn(state, sheet, emptyOut(), makeCtx());
    expect(result.state.character.stamina.current).toBe(0); // untouched — enemy held
    expect(result.log.some(l => l.includes('holds'))).toBe(true);

    const finishOut = emptyOut({ hostile_actions: [{ id: 'h1', action: 'finish' }] });
    const sheet2 = sheetFor(state, null, [1, 9, 1, 10]);
    const result2 = resolveTurn(state, sheet2, finishOut, makeCtx());
    expect(result2.state.character.stamina.current).toBeLessThan(0);
  });

  test('a stimdose heals and is consumed from inventory; refused with none available', () => {
    const state = makeState({ character: makeCharacter({ stamina: { current: 30, max: 55 }, inventory: ['Stimdose x2'] }) });
    const sheet = sheetFor(state, null, [50]);
    const result = resolveTurn(state, sheet, emptyOut({ healing: 'stimdose' }), makeCtx());
    expect(result.state.character.stamina.current).toBe(40); // house stimdose_heal = 10
    expect(result.state.character.inventory).toContain('Stimdose x1');

    const noStim = makeState({ character: makeCharacter({ stamina: { current: 30, max: 55 }, inventory: [] }) });
    const sheet2 = sheetFor(noStim, null, [50]);
    const result2 = resolveTurn(noStim, sheet2, emptyOut({ healing: 'stimdose' }), makeCtx());
    expect(result2.state.character.stamina.current).toBe(30);
  });

  test('first aid needs a Medkit and a passed Medical row', () => {
    const withKit = makeState({ character: makeCharacter({ stamina: { current: 30, max: 55 }, inventory: ['Medkit'], skills: [{ name: 'Medical', level: 5 }] }) });
    // Medical target = floor(40/2) + 50 = 70, standard tier -20 = 50. Roll 10 passes.
    const sheet = sheetFor(withKit, { kind: 'skill', key: 'medical', tier: 'standard' }, [10, 6]);
    const out = emptyOut({ healing: 'first_aid', checks: [{ row: 'P1', tier: 'standard', outcome_seen: 'PASS' }] });
    const result = resolveTurn(withKit, sheet, out, makeCtx());
    expect(result.state.character.stamina.current).toBeGreaterThan(30);

    const noKit = makeState({ character: makeCharacter({ stamina: { current: 30, max: 55 }, inventory: [], skills: [{ name: 'Medical', level: 5 }] }) });
    const sheet2 = sheetFor(noKit, { kind: 'skill', key: 'medical', tier: 'standard' }, [10, 6]);
    const result2 = resolveTurn(noKit, sheet2, out, makeCtx());
    expect(result2.state.character.stamina.current).toBe(30);
  });

  test('XP awards sum distinct keys and cap at the house per-turn ceiling', () => {
    const state = makeState();
    const sheet = sheetFor(state, null, [50]);
    // victory(3) + mission_success(5) + discovery(2) + discovery(2, deduped) = 10, under the cap of 15
    const out = emptyOut({ xp_awards: ['victory', 'mission_success', 'discovery', 'discovery'] });
    const result = resolveTurn(state, sheet, out, makeCtx());
    expect(result.state.character.xp.total).toBe(10);

    const bigOut = emptyOut({ xp_awards: ['victory', 'mission_success', 'discovery', 'roleplaying', 'innovation', 'survival', 'skill_checks', 'ability_checks'] });
    const sheet2 = sheetFor(state, null, [50]);
    const result2 = resolveTurn(state, sheet2, bigOut, makeCtx());
    expect(result2.state.character.xp.total).toBeLessThanOrEqual(15);
  });

  test('credit tiers apply, and an unaffordable purchase is refused and patched', () => {
    const state = makeState({ character: makeCharacter({ credits: 100 }) });
    const sheet = sheetFor(state, null, [50]);
    const reward = resolveTurn(state, sheet, emptyOut({ credits: { kind: 'reward', tier: 'small', item: null } }), makeCtx());
    expect(reward.state.character.credits).toBe(150); // house small band = 50

    const sheet2 = sheetFor(state, null, [50]);
    const tooExpensive = resolveTurn(state, sheet2, emptyOut({ credits: { kind: 'purchase', tier: 'fortune', item: 'a starship' } }), makeCtx());
    expect(tooExpensive.state.character.credits).toBe(100); // unchanged, refused
    expect(tooExpensive.patched).toBe(true);
  });

  test('a purchased item is actually added to inventory, not just the applied log', () => {
    const state = makeState({ character: makeCharacter({ credits: 500, inventory: ['Medkit'] }) });
    const sheet = sheetFor(state, null, [50]);
    const result = resolveTurn(state, sheet, emptyOut({ credits: { kind: 'purchase', tier: 'small', item: 'A frayed data chip' } }), makeCtx());
    expect(result.state.character.inventory).toContain('A frayed data chip');
    expect(result.applied.inventory_add).toContain('A frayed data chip');
  });

  test('"payment" is a cost like purchase, not a gain', () => {
    const state = makeState({ character: makeCharacter({ credits: 100 }) });
    const sheet = sheetFor(state, null, [50]);
    const paid = resolveTurn(state, sheet, emptyOut({ credits: { kind: 'payment', tier: 'small', item: null } }), makeCtx());
    expect(paid.state.character.credits).toBe(50); // house small band = 50, subtracted not added
    expect(paid.applied.credits_delta).toBe(-50);

    const sheet2 = sheetFor(state, null, [50]);
    const refused = resolveTurn(state, sheet2, emptyOut({ credits: { kind: 'payment', tier: 'fortune', item: null } }), makeCtx());
    expect(refused.state.character.credits).toBe(100); // unaffordable payment refused, not paid anyway
    expect(refused.patched).toBe(true);
  });

  test('credits are clamped to the 0..50000 range the migration also enforces', () => {
    const state = makeState({ character: makeCharacter({ credits: 49900 }) });
    const sheet = sheetFor(state, null, [50]);
    const result = resolveTurn(state, sheet, emptyOut({ credits: { kind: 'reward', tier: 'fortune', item: null } }), makeCtx());
    expect(result.state.character.credits).toBe(50000); // clamped, not 52400
    expect(result.applied.credits_delta).toBe(100); // reflects the actual (clamped) change
  });

  test('a model-written inventory item with a count suffix is refused entirely', () => {
    const state = makeState();
    const sheet = sheetFor(state, null, [50]);
    const out = emptyOut({ story_updates: { ...emptyOut().story_updates, inventory_add: ['Grenades x50', 'A dusty logbook'] } });
    const result = resolveTurn(state, sheet, out, makeCtx());
    expect(result.state.character.inventory).not.toContain('Grenades x50');
    expect(result.state.character.inventory).toContain('A dusty logbook');
    expect(result.log.some(l => l.includes('count suffix'))).toBe(true);
  });

  test('combat does not end just because the model declares combat.end while an enemy is still active', () => {
    const state = makeState({ scene: makeCombatState({ combat_state: { round: 1, phase: 'player_turn', initiative_order: [], combatants: [makeEnemy({ status: 'active' })] } }) });
    const sheet = sheetFor(state, null, [50]);
    const result = resolveTurn(state, sheet, emptyOut({ combat: { end: 'victory' } }), makeCtx());
    expect(result.state.scene.in_combat).toBe(true);
    expect(result.state.scene.combat_state).not.toBeNull();
    expect(result.log.some(l => l.includes('combat.end') && l.includes('still active'))).toBe(true);
  });

  test('checks that name an unknown row id are dropped, not applied', () => {
    const state = makeState();
    const sheet = sheetFor(state, null, [50]);
    const out = emptyOut({ checks: [{ row: 'Z99', tier: 'standard', outcome_seen: 'PASS' }] });
    const result = resolveTurn(state, sheet, out, makeCtx());
    expect(result.log.some(l => l.includes('unknown declared row Z99'))).toBe(true);
  });

  test('an invalid scene_id is dropped; a valid one changes the scene', () => {
    const state = makeState();
    const sheet = sheetFor(state, null, [50]);
    const bad = resolveTurn(state, sheet, emptyOut({ story_updates: { ...emptyOut().story_updates, scene_id: 'scene_does_not_exist' } }), makeCtx());
    expect(bad.state.campaign.current_scene_id).toBe('scene_1_docking');
    expect(bad.log.some(l => l.includes('invalid scene_id'))).toBe(true);

    const sheet2 = sheetFor(state, null, [50]);
    const good = resolveTurn(state, sheet2, emptyOut({ story_updates: { ...emptyOut().story_updates, scene_id: 'scene_2_command' } }), makeCtx());
    expect(good.state.campaign.current_scene_id).toBe('scene_2_command');
    expect(good.state.campaign.visited_scene_ids).toContain('scene_2_command');
  });

  test('inventory, status and journal updates are clamped to the house per-turn caps', () => {
    const state = makeState();
    const sheet = sheetFor(state, null, [50]);
    const bigInventory = Array.from({ length: 10 }, (_, i) => `Item ${i}`);
    const out = emptyOut({
      story_updates: {
        ...emptyOut().story_updates,
        inventory_add: bigInventory,
        status_add: ['Bleeding', 'Poisoned', 'Nauseous', 'Confused'],
        journal_entry: 'x'.repeat(1000),
      },
    });
    const result = resolveTurn(state, sheet, out, makeCtx());
    expect(result.state.character.inventory.length).toBeLessThanOrEqual(state.character.inventory.length + houseRules.per_turn_caps.inventory_add_max);
    expect(result.applied.status_add.length).toBeLessThanOrEqual(houseRules.per_turn_caps.status_add_max);
    expect(result.state.campaign.journal[0].entry.length).toBeLessThanOrEqual(houseRules.per_turn_caps.journal_chars_max);
  });

  test('the model cannot set the reserved Unconscious/Dead statuses directly', () => {
    const state = makeState();
    const sheet = sheetFor(state, null, [50]);
    const out = emptyOut({ story_updates: { ...emptyOut().story_updates, status_add: ['Unconscious'] } });
    const result = resolveTurn(state, sheet, out, makeCtx());
    expect(result.state.character.status_effects).not.toContain('Unconscious');
  });

  test('combat.start creates up to the house cap of enemies and turns combat on', () => {
    const state = makeState();
    const sheet = sheetFor(state, null, [50]);
    const out = emptyOut({ combat: { start: [{ name: 'Pod Sleeper', threat: 'minion' }, { name: 'Pod Sleeper 2', threat: 'soldier' }] } });
    const result = resolveTurn(state, sheet, out, makeCtx());
    expect(result.state.scene.in_combat).toBe(true);
    expect(result.state.scene.combat_state.combatants).toHaveLength(2);
    expect(result.state.scene.combat_state.combatants[0].sta_current).toBe(houseRules.enemy_threat_tiers.minion.sta);
  });

  test('combat ends automatically once every enemy is down, fled or surrendered', () => {
    const state = makeState({ scene: makeCombatState({ combat_state: { round: 1, phase: 'player_turn', initiative_order: [], combatants: [makeEnemy({ status: 'fled' })] } }) });
    const sheet = sheetFor(state, null, [50]);
    const result = resolveTurn(state, sheet, emptyOut(), makeCtx());
    expect(result.state.scene.in_combat).toBe(false);
    expect(result.state.scene.combat_state).toBeNull();
  });

  test('a contradicted declared outcome sets patched and appends a template line', () => {
    const state = makeState();
    // ability roll of 90 against DEX 55 fails; declare PASS, which is a lie.
    const sheet = sheetFor(state, { kind: 'ability', key: 'dex', tier: 'standard' }, [90]);
    const out = emptyOut({ checks: [{ row: 'P1', outcome_seen: 'PASS' }] });
    const result = resolveTurn(state, sheet, out, makeCtx());
    expect(result.patched).toBe(true);
    expect(result.narrative).not.toBe(out.narrative);
  });

  test('the same (state, sheet, out) resolves to the same result every time', () => {
    const state = makeState({ scene: makeCombatState() });
    const sheet = sheetFor(state, { kind: 'attack', key: 'laser_pistol', tier: 'standard', target_id: 'h1' }, [1, 9, 1, 10, 50, 50, 3]);
    const out = emptyOut({ checks: [{ row: 'P1', tier: 'standard', target_id: 'h1', outcome_seen: 'HIT' }], xp_awards: ['victory'] });
    const ctx = makeCtx();
    const a = resolveTurn(state, sheet, out, ctx);
    const b = resolveTurn(state, sheet, out, ctx);
    expect(a.state).toEqual(b.state);
    expect(a.dice_rolls).toEqual(b.dice_rolls);
    expect(a.applied).toEqual(b.applied);
  });

  test('a game_over session refuses further resolution', () => {
    const state = makeState({ session: { number: 1, scene_count: 0, turn_count: 5, game_over: true } });
    const sheet = sheetFor(state, null, [50]);
    const result = resolveTurn(state, sheet, emptyOut(), makeCtx());
    expect(result.refused).toBe(true);
  });

  describe('a reused sheet whose combat no longer matches the current state', () => {
    test('initiative is ignored entirely when the state is not in combat', () => {
      // A sheet rolled while combat_state existed, reused against a state
      // where in_combat has since gone false (e.g. a turn replayed after a
      // checkpoint restore landed outside that fight).
      const state = makeState({ scene: makeCombatState({ in_combat: false }) });
      const sheet = sheetFor(state, { kind: 'attack', key: 'laser_pistol', tier: 'standard', target_id: 'h1' }, allOnes());
      const out = emptyOut({ checks: [{ row: 'P1', tier: 'standard', target_id: 'h1', outcome_seen: 'HIT' }] });

      const result = resolveTurn(state, sheet, out, makeCtx());
      expect(result.state.character.seu.total).toBe(state.character.seu.total); // no SEU spent
      expect(result.state.scene.combat_state.round).toBe(1); // no round advance
      expect(result.state.scene.combat_state.combatants[0].sta_current).toBe(15); // enemy untouched
    });

    test('an initiative entry with no matching combatant is skipped, not treated as an attacker', () => {
      const built = makeState({ scene: makeCombatState() }); // sheet rolled with h1 active
      const sheet = sheetFor(built, null, allOnes());
      // Resolve against a state whose combat_state no longer lists h1 at all
      // (in_combat stays true so only the phantom-combatant guard is exercised).
      const state = makeState({
        character: makeCharacter({ stamina: { current: 55, max: 55 } }),
        scene: makeCombatState({ combat_state: { round: 1, phase: 'player_turn', initiative_order: [], combatants: [] } }),
      });
      const out = emptyOut();

      const result = resolveTurn(state, sheet, out, makeCtx());
      expect(result.state.character.stamina.current).toBe(55); // no phantom enemy attack landed
      expect(result.log.some(l => l.includes('not an active combatant'))).toBe(true);
    });
  });

  describe('the model-supplied roll/delta regression', () => {
    test('a model-supplied roll, target and delta are ignored entirely', () => {
      const state = makeState({ character: makeCharacter({ credits: 500, xp: { total: 0, unspent: 0 }, stamina: { current: 40, max: 55 } }) });
      // scripted server roll is 99 — a near-guaranteed failure against any real target.
      const sheet = sheetFor(state, { kind: 'ability', key: 'dex', tier: 'standard' }, [99]);
      const out = emptyOut({
        checks: [{ row: 'P1', outcome_seen: 'PASS' }],
        xp_awards: ['victory'],
      });
      // The model also tried to smuggle in state_updates/deltas; modelSchema
      // would already strip these before resolveTurn ever sees them, but this
      // proves resolveTurn itself never reads anything but the sheet.
      out.state_updates = { stamina_delta: 999 };
      out.credits_delta = 1000000;

      const result = resolveTurn(state, sheet, out, makeCtx());
      expect(result.dice_rolls[0].roll).toBe(99);
      expect(result.dice_rolls[0].success).toBe(false);
      expect(result.patched).toBe(true);
      expect(result.state.character.credits).toBe(500); // unchanged — no credits event was declared
      expect(result.state.character.stamina.current).toBe(40); // unchanged — the fake delta is not a real field resolveTurn reads
      expect(result.state.character.xp.total).toBeLessThanOrEqual(houseRules.xp_cap_per_turn.value);
    });
  });
});
