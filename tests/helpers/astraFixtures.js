'use strict';

// Shared fixtures for the dice/rules/resolution test suites (dice.test.js,
// outcomeSheet.test.js, resolveTurn.test.js). Kept here once because all
// three otherwise reconstruct the same character/state shape.

const { loadRules, getRulesCache } = require('../../server/ruleLoader');
const houseRules = require('../../server/data/house_rules.json');
const outcomeLines = require('../../server/data/outcome_lines.json');

let _loaded = false;
function ensureRulesLoaded() {
  if (!_loaded) { loadRules(); _loaded = true; }
  return getRulesCache();
}

function makeCharacter(overrides = {}) {
  return {
    id: 'kael_voss', name: 'Kael Voss', race: 'Human', psa: 'Military', archetype: 'Soldier/Enforcer',
    stats: { str: 55, sta: 55, dex: 55, rs: 50, int: 40, log: 40, per: 45, ldr: 50 },
    stamina: { current: 55, max: 55 },
    skills: [{ name: 'Beam Weapons', level: 2 }, { name: 'Medical', level: 2 }],
    inventory: ['Olef A13 laser pistol', 'Medkit', 'Stimdose x2'],
    seu: { total: 30, sources: [{ name: 'A13 e-clip', seu: 20 }, { name: 'spare', seu: 10 }] },
    ammo: {}, status_effects: [], credits: 500,
    xp: { total: 0, unspent: 0 }, racial_abilities: [],
    ...overrides,
  };
}

function makeEnemy(overrides = {}) {
  return { id: 'h1', name: 'Pod Sleeper', threat: 'minion', rs: 30, sta_current: 15, sta_max: 15, status: 'active', is_player: false, ...overrides };
}

function makeState(overrides = {}) {
  const character = overrides.character || makeCharacter();
  return {
    character,
    campaign: {
      adventure_id: 'ghost_station', adventure_title: 'Ghost Station',
      current_scene_id: 'scene_1_docking', visited_scene_ids: ['scene_1_docking'],
      journal: [], npcs: [], factions: [], hooks: [],
    },
    session: { number: 1, scene_count: 0, turn_count: 0 },
    scene: {
      header: '', summary: '', in_combat: false, combat_state: null,
      recent_summaries: [], history_compressed: false, compressed_summary: null, scene_type_history: [],
    },
    ...overrides,
  };
}

function makeCombatState(overrides = {}) {
  return {
    header: '', summary: '', in_combat: true,
    combat_state: { round: 1, phase: 'player_turn', initiative_order: [], combatants: [makeEnemy()] },
    recent_summaries: [], history_compressed: false, compressed_summary: null, scene_type_history: [],
    ...overrides,
  };
}

function emptyOut(overrides = {}) {
  return {
    narrative: 'Something happens.',
    checks: [], hostile_actions: [], hazard: null, healing: null, xp_awards: [], credits: null, combat: null,
    story_updates: { status_add: [], status_remove: [], inventory_add: [], inventory_remove: [], npc_updates: [], faction_updates: [], journal_entry: null, scene_id: null },
    choices: [], scene_change: false, scene_header: null, scene_summary: '', ooc_note: null, tooltip_terms: [],
    ...overrides,
  };
}

function makeCtx(overrides = {}) {
  return {
    rules: ensureRulesLoaded(), house: houseRules, outcomeLines,
    getScene: (adventureId, sceneId) => (sceneId === 'scene_2_command' || sceneId === 'scene_1_docking' ? { id: sceneId } : null),
    ...overrides,
  };
}

module.exports = { ensureRulesLoaded, makeCharacter, makeEnemy, makeState, makeCombatState, emptyOut, makeCtx, houseRules, outcomeLines };
