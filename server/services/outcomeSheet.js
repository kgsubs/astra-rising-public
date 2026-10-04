'use strict';

// ─── Outcome sheet ─────────────────────────────────────────────────────────────
// Rolls everything a turn could need before the model is ever called, and
// renders the result as outcome words only ("standard PASS", "HIT, target
// DOWN"), never as numbers. The model narrates to match and declares which
// rows it used; resolveTurn.js applies the server's own rolls, never the
// model's.

const { computeIM, computeSkillTarget, parseWeaponDamage, computeSTAThresholds } = require('./ruleEngine');
const { matchWeaponId, WEAPON_ID_CATEGORY } = require('./promptRulesInjector');

const SKILL_KEY_TO_STAT = {
  beam_weapons: 'dex', projectile_weapons: 'dex', melee_weapons: 'melee', martial_arts: 'melee',
  grenades: 'dex', computers: 'log', robotics: 'log', technician: 'log',
  environmental: 'int', medical: 'int', psychosocial: 'per',
};

const SKILL_NAME_TO_KEY = {
  'Beam Weapons': 'beam_weapons', 'Projectile Weapons': 'projectile_weapons',
  'Melee Weapons': 'melee_weapons', 'Martial Arts': 'martial_arts', 'Grenades': 'grenades',
  'Computers': 'computers', 'Robotics': 'robotics', 'Technician': 'technician',
  'Environmental': 'environmental', 'Medical': 'medical', 'Psycho-Social': 'psychosocial',
};

const ABILITY_KEYS = ['str', 'sta', 'dex', 'rs', 'int', 'log', 'per', 'ldr'];

// Tiers apply a flat swing to a skill/ability target — easy is more
// forgiving, hard is less. Attack tiers instead map onto the rules' own
// range modifiers (below), because "easy" for a gun is standing close.
const TIER_MODIFIER = { easy: 20, standard: 0, hard: -20 };

// Attack tiers map to range bands: easy = point blank, standard = short,
// hard = long.
const ATTACK_TIER_RANGE_KEY = {
  easy: 'point_blank', standard: 'short_range', hard: 'long_range',
};

function parsePercent(text) {
  if (typeof text !== 'string') return 0;
  const n = parseInt(text.replace('%', '').trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

// Optional automatic results (rules dice_system.automatic_success/failure):
// 01-05 always succeeds, 96-00 (i.e. 96-100 on a d100) always fails. This
// keeps every check winnable and losable even when a tier pushes the target
// past 100 or below 1.
function resolveAgainstTarget(roll, target) {
  if (roll <= 5) return true;
  if (roll >= 96) return false;
  return roll <= target;
}

function findSkillLevel(character, key) {
  const skill = (character.skills || []).find(s => SKILL_NAME_TO_KEY[s.name] === key);
  return skill ? (skill.level || 0) : 0;
}

function abilityScoreFor(character, stat) {
  if (stat === 'melee') return Math.max(character.stats?.str || 0, character.stats?.dex || 0);
  return character.stats?.[stat] || 0;
}

function rollSkillTiers(dice, abilityScore, level) {
  const base = computeSkillTarget(abilityScore, level);
  const roll = dice.d100();
  const tiers = {};
  for (const tier of ['easy', 'standard', 'hard']) {
    const target = base + TIER_MODIFIER[tier];
    tiers[tier] = { target, success: resolveAgainstTarget(roll, target) };
  }
  return { roll, tiers };
}

function rollAbilityRow(dice, abilityScore) {
  const roll = dice.d100();
  const success = resolveAgainstTarget(roll, abilityScore);
  return { roll, target: abilityScore, success };
}

// Every inventory item that resolves to a known weapon id, deduplicated.
function resolveCharacterWeapons(character) {
  const seen = new Set();
  const weapons = [];
  for (const item of character.inventory || []) {
    if (typeof item !== 'string') continue;
    const id = matchWeaponId(item);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const category = WEAPON_ID_CATEGORY[id];
    weapons.push({ id, category, label: item, usesSeu: category === 'beam_weapons' });
  }
  return weapons;
}

function weaponDamageFormula(weapon, house) {
  if (weapon.id === 'unarmed') return house.unarmed_damage.formula;
  const dmg = parseWeaponDamage(weapon.id, weapon.category);
  return dmg ? dmg.formula : house.unarmed_damage.formula;
}

function computeAttackBaseTarget(character, category) {
  const stat = SKILL_KEY_TO_STAT[category] || 'dex';
  const abilityScore = abilityScoreFor(character, stat);
  const level = findSkillLevel(character, category);
  return computeSkillTarget(abilityScore, level);
}

function rollAttackTiers(dice, baseTarget, rangeModifiers) {
  const roll = dice.d100();
  const tiers = {};
  for (const tier of ['easy', 'standard', 'hard']) {
    const modKey = ATTACK_TIER_RANGE_KEY[tier];
    const mod = parsePercent(rangeModifiers[modKey]);
    const target = baseTarget + mod;
    tiers[tier] = { target, hit: resolveAgainstTarget(roll, target) };
  }
  return { roll, tiers };
}

function rollEnemyRow(dice, enemy, threatTier) {
  const roll = dice.d100();
  const target = threatTier.to_hit;
  const hit = resolveAgainstTarget(roll, target);
  const damage = hit ? dice.roll(threatTier.damage) : 0;
  return { roll, target, hit, damage };
}

function rollHazardRow(dice, currentSta, hazardDice, thresholds) {
  const severities = {};
  for (const sev of ['minor', 'moderate', 'severe']) {
    const damage = dice.roll(hazardDice[sev]);
    const resulting = currentSta - damage;
    let word;
    if (resulting <= thresholds.dying) word = 'DEAD';
    else if (resulting <= thresholds.unconscious) word = 'DROP UNCONSCIOUS';
    else word = 'HURT';
    severities[sev] = { damage, resulting, word };
  }
  return severities;
}

function rollInitiative(dice, character, activeEnemies) {
  const im = computeIM(character.stats?.rs || 0);
  const entries = [{
    id: 'player', name: character.display_name || character.name, is_player: true,
    initiative_roll: dice.d(10) + im, rs: character.stats?.rs || 0, has_acted: false,
  }];
  for (const enemy of activeEnemies) {
    const eIm = computeIM(enemy.rs || 0);
    entries.push({
      id: enemy.id, name: enemy.name, is_player: false,
      initiative_roll: dice.d(10) + eIm, rs: enemy.rs || 0, has_acted: false,
    });
  }
  // Highest first (core_basic.combat.initiative.order). Ties: higher
  // RS wins, then the player.
  entries.sort((a, b) => {
    if (b.initiative_roll !== a.initiative_roll) return b.initiative_roll - a.initiative_roll;
    if (b.rs !== a.rs) return b.rs - a.rs;
    return a.is_player ? -1 : 1;
  });
  return entries;
}

function activeEnemiesOf(state) {
  const combatants = state.scene?.combat_state?.combatants;
  if (!Array.isArray(combatants)) return [];
  return combatants.filter(c => !c.is_player && !['down', 'fled', 'surrendered'].includes(c.status));
}

function buildPricesHint(credits, bands) {
  const affordable = Object.entries(bands)
    .filter(([k]) => k !== 'source')
    .filter(([, price]) => price <= credits)
    .map(([tier]) => tier);
  const highest = affordable[affordable.length - 1] || 'none';
  return `the player has enough for up to "${highest}"`;
}

function buildPinnedRow(dice, character, pinnedCheck, rules, house, rangeModifiers, activeEnemies) {
  const kind = pinnedCheck.kind;
  const tier = pinnedCheck.tier || 'standard';
  if (kind === 'skill') {
    const abilityScore = abilityScoreFor(character, SKILL_KEY_TO_STAT[pinnedCheck.key] || 'log');
    const level = findSkillLevel(character, pinnedCheck.key);
    const base = computeSkillTarget(abilityScore, level);
    const roll = dice.d100();
    const target = base + TIER_MODIFIER[tier];
    const success = resolveAgainstTarget(roll, target);
    return { kind, key: pinnedCheck.key, tier, roll, target, success };
  }
  if (kind === 'ability') {
    const abilityScore = abilityScoreFor(character, pinnedCheck.key);
    const { roll, target, success } = rollAbilityRow(dice, abilityScore);
    return { kind, key: pinnedCheck.key, tier: null, roll, target, success };
  }
  if (kind === 'attack') {
    // pinnedCheck.key may be a specific owned weapon id ("laser_pistol") or
    // a weapons category ("beam_weapons" — the schema's own example uses
    // one), since the model is never shown which exact weapon it is holding.
    // Resolve to an actually-owned weapon of that category; only an
    // unarmed character falls back to unarmed (an unknown/category weapon
    // key maps to the player's first owned weapon of that category).
    const weapons = resolveCharacterWeapons(character);
    let weapon = weapons.find(w => w.id === pinnedCheck.key);
    if (!weapon) {
      const category = WEAPON_ID_CATEGORY[pinnedCheck.key] || pinnedCheck.key;
      weapon = weapons.find(w => w.category === category);
    }
    if (!weapon) {
      weapon = { id: 'unarmed', category: 'martial_arts', label: 'Unarmed strike', usesSeu: false };
    }
    const baseTarget = computeAttackBaseTarget(character, weapon.category);
    const roll = dice.d100();
    const modKey = ATTACK_TIER_RANGE_KEY[tier] || ATTACK_TIER_RANGE_KEY.standard;
    const target = baseTarget + parsePercent(rangeModifiers[modKey]);
    const hit = resolveAgainstTarget(roll, target);
    const damage = hit ? dice.roll(weaponDamageFormula(weapon, house)) : 0;
    const enemy = activeEnemies.find(e => e.id === pinnedCheck.target_id) || null;
    return {
      kind, key: pinnedCheck.key, weaponId: weapon.id, weaponLabel: weapon.label || weapon.id,
      tier, roll, target, hit, damage,
      targetId: pinnedCheck.target_id || null, targetLabel: enemy ? enemy.name : null,
      usesSeu: weapon.usesSeu, seuCost: weapon.usesSeu ? house.seu_per_shot.value : 0,
    };
  }
  return { kind: 'none' };
}

/**
 * dropMismatchedPinnedRow(sheet, originalChoiceId, currentChoiceId) — a
 * reused sheet (a retry of a pending turn, or a turn replayed after a
 * checkpoint restore) was rolled with its P1 row pinned to whichever choice
 * the original request named. If the request being resolved now names a
 * different choice, that pin no longer describes it: drop P1 rather than
 * either misapplying its result to the new choice or rolling a fresh one
 * (which would let switching choices buy a re-roll).
 */
function dropMismatchedPinnedRow(sheet, originalChoiceId, currentChoiceId) {
  if (!sheet.rows || !sheet.rows.P1) return sheet;
  if ((originalChoiceId || null) === (currentChoiceId || null)) return sheet;
  const { P1, ...restRows } = sheet.rows;
  void P1;
  return { ...sheet, rows: restRows, order: (sheet.order || []).filter(id => id !== 'P1') };
}

/**
 * buildEmptySheet(state) — an inert sheet for a turn that must change no
 * mechanical state: "Ask GM:" turns (no outcome sheet and no mechanics) and
 * truncated/repaired replies (resolveTurn already treats an empty
 * `checks`/no-initiative sheet as nothing to apply; this makes that true
 * structurally, not just by convention). No rows, no initiative, no dice
 * touched, so an enemy cannot attack and combat cannot advance a round
 * against a sheet that has nothing to walk.
 */
function buildEmptySheet(state) {
  const character = state.character;
  const thresholds = computeSTAThresholds(character.stamina.max);
  return {
    turn: (state.session && Number.isFinite(state.session.turn_count)) ? state.session.turn_count + 1 : 1,
    order: [],
    rows: {},
    hazard: null,
    initiative: null,
    pricesHint: '',
    thresholds,
    firstAidHeal: 0,
    weaponIds: [],
    skillKeys: [],
    enemyIds: [],
  };
}

/**
 * buildSheet(state, pinnedCheck, dice, rules, house)
 *
 * @param {object} state       — current game state (character, campaign, scene, session)
 * @param {object|null} pinnedCheck — {kind, key, tier, target_id} from the choice the
 *                              player clicked, or null on a typed turn
 * @param {object} dice        — from dice.js: getDice() or createScriptedDice()
 * @param {object} rules       — getRulesCache()
 * @param {object} house       — house_rules.json
 */
function buildSheet(state, pinnedCheck, dice, rules, house) {
  const character = state.character;
  // Never fall back to {} here: an empty core ruleset would build a sheet
  // with no combat modifiers and no thresholds, silently, rather than
  // failing loudly. Callers (server.js) are expected to check the rules
  // loaded at startup before ever reaching this, but this is the backstop.
  if (!rules || !rules['core_basic']) {
    throw new Error('core_basic rules are not loaded; cannot build an outcome sheet.');
  }
  const basic = rules['core_basic'];
  const rangeModifiers = basic.combat?.to_hit?.modifiers || {};
  const thresholds = computeSTAThresholds(character.stamina.max);
  const activeEnemies = activeEnemiesOf(state);

  const rows = {};
  const order = [];
  let n = { S: 0, B: 0, A: 0, E: 0 };

  if (pinnedCheck && pinnedCheck.kind && pinnedCheck.kind !== 'none') {
    rows.P1 = buildPinnedRow(dice, character, pinnedCheck, rules, house, rangeModifiers, activeEnemies);
    order.push('P1');
  }

  for (const skill of character.skills || []) {
    const key = SKILL_NAME_TO_KEY[skill.name];
    if (!key) continue;
    n.S += 1;
    const id = `S${n.S}`;
    const abilityScore = abilityScoreFor(character, SKILL_KEY_TO_STAT[key] || 'log');
    const { roll, tiers } = rollSkillTiers(dice, abilityScore, skill.level || 0);
    rows[id] = { kind: 'skill', key, label: skill.name, roll, tiers };
    order.push(id);
  }

  for (const stat of ABILITY_KEYS) {
    n.B += 1;
    const id = `B${n.B}`;
    const abilityScore = character.stats?.[stat] || 0;
    const { roll, target, success } = rollAbilityRow(dice, abilityScore);
    rows[id] = { kind: 'ability', key: stat, label: `${stat.toUpperCase()} check`, roll, target, success };
    order.push(id);
  }

  if (activeEnemies.length) {
    const weapons = resolveCharacterWeapons(character);
    const usable = weapons.length ? weapons : [{ id: 'unarmed', category: 'martial_arts', label: 'Unarmed strike', usesSeu: false }];
    for (const weapon of usable) {
      for (const enemy of activeEnemies) {
        n.A += 1;
        const id = `A${n.A}`;
        const baseTarget = computeAttackBaseTarget(character, weapon.category);
        const { roll, tiers } = rollAttackTiers(dice, baseTarget, rangeModifiers);
        const damage = dice.roll(weaponDamageFormula(weapon, house));
        rows[id] = {
          kind: 'attack', weaponId: weapon.id, weaponLabel: weapon.label, targetId: enemy.id,
          targetLabel: enemy.name, roll, tiers, damage, usesSeu: weapon.usesSeu,
          seuCost: weapon.usesSeu ? house.seu_per_shot.value : 0,
        };
        order.push(id);
      }
    }

    for (const enemy of activeEnemies) {
      n.E += 1;
      const id = `E${n.E}`;
      const tierDef = house.enemy_threat_tiers[enemy.threat] || house.enemy_threat_tiers.minion;
      const { roll, target, hit, damage } = rollEnemyRow(dice, enemy, tierDef);
      rows[id] = { kind: 'enemy_attack', targetId: enemy.id, targetLabel: enemy.name, roll, target, hit, damage };
      order.push(id);
    }
  }

  const hazard = rollHazardRow(dice, character.stamina.current, house.hazard_dice, thresholds);
  const initiative = activeEnemies.length ? rollInitiative(dice, character, activeEnemies) : null;
  const pricesHint = buildPricesHint(character.credits, house.credit_bands);
  // Pre-rolled so resolveTurn.js never has to touch the dice itself; harmless
  // to roll even when the turn does not end up using first aid.
  const firstAidHeal = dice.roll(house.first_aid_healing.formula);

  // Ids the model may legally reference in a choice's "check" tag: the
  // player's own owned weapons, the skills on their sheet, and every enemy
  // currently active in combat. Shown on the sheet itself so the model
  // never has to invent or guess one.
  const weaponIds = resolveCharacterWeapons(character).map(w => w.id);
  const skillKeys = (character.skills || []).map(s => SKILL_NAME_TO_KEY[s.name]).filter(Boolean);
  const enemyIds = activeEnemies.map(e => e.id);

  return {
    turn: (state.session && Number.isFinite(state.session.turn_count)) ? state.session.turn_count + 1 : 1,
    order,
    rows,
    hazard,
    initiative,
    pricesHint,
    thresholds,
    firstAidHeal,
    weaponIds,
    skillKeys,
    enemyIds,
  };
}

function renderTierLine(label, tiers, wordFor) {
  return `${label}: ` + ['easy', 'standard', 'hard'].map(t => `${t} ${wordFor(tiers[t])}`).join(' | ');
}

// Some inventory labels carry a model number ("Olef A13 laser pistol"),
// which is not a mechanical number but would still trip a "no digits on the
// sheet" check. The sheet shown to the model names the weapon by its
// canonical id instead, e.g. "laser pistol".
function sheetWeaponName(row) {
  const id = row.weaponId || row.key || 'weapon';
  return id.replace(/_/g, ' ');
}

/**
 * renderSheet(sheet) — outcome words only, no multi-digit numbers.
 */
function renderSheet(sheet) {
  const lines = [`OUTCOME SHEET (turn ${sheet.turn}). These results are final. Declare the rows you narrate in "checks".`];

  if (sheet.rows.P1) {
    const p = sheet.rows.P1;
    if (p.kind === 'skill') {
      lines.push(`P1 PINNED: ${p.tier} ${p.success ? 'PASS' : 'FAIL'}`);
    } else if (p.kind === 'ability') {
      lines.push(`P1 PINNED: ${p.success ? 'PASS' : 'FAIL'}`);
    } else if (p.kind === 'attack') {
      const hitWord = p.hit ? `HIT${p.targetLabel ? `, ${p.targetLabel} hurt` : ''}` : 'MISS';
      lines.push(`P1 PINNED: ${p.tier} ${hitWord}`);
    }
  }

  for (const id of sheet.order) {
    if (id === 'P1') continue;
    const row = sheet.rows[id];
    if (row.kind === 'skill') {
      lines.push(renderTierLine(`${id} ${row.label}`, row.tiers, t => (t.success ? 'PASS' : 'FAIL')));
    } else if (row.kind === 'ability') {
      lines.push(`${id} ${row.label}: ${row.success ? 'PASS' : 'FAIL'}`);
    } else if (row.kind === 'attack') {
      lines.push(renderTierLine(`${id} ${sheetWeaponName(row)} vs ${row.targetLabel} (${row.targetId})`, row.tiers,
        t => (t.hit ? 'HIT, target DOWN or HURT' : 'MISS')));
    } else if (row.kind === 'enemy_attack') {
      lines.push(`${id} ${row.targetLabel} (${row.targetId}) acts after you, skipped if DOWN: ${row.hit ? 'HIT, you are HURT' : 'MISS'}`);
    }
  }

  lines.push(`H minor: ${sheet.hazard.minor.word} | moderate: ${sheet.hazard.moderate.word} | severe: ${sheet.hazard.severe.word}`);
  lines.push(`PRICES token/small/medium/large/fortune are given in credits here; ${sheet.pricesHint}.`);

  const weaponList = sheet.weaponIds && sheet.weaponIds.length ? sheet.weaponIds.join(', ') : 'none (unarmed only)';
  const skillList = sheet.skillKeys && sheet.skillKeys.length ? sheet.skillKeys.join(', ') : 'none';
  const enemyList = sheet.enemyIds && sheet.enemyIds.length ? sheet.enemyIds.join(', ') : 'none';
  lines.push(`IDS for a choice's "check": weapon key ${weaponList} | skill key ${skillList} | enemy target_id ${enemyList}.`);

  return lines.join('\n');
}

module.exports = {
  buildSheet,
  buildEmptySheet,
  dropMismatchedPinnedRow,
  renderSheet,
  resolveAgainstTarget,
  activeEnemiesOf,
  resolveCharacterWeapons,
  computeAttackBaseTarget,
  SKILL_NAME_TO_KEY,
  SKILL_KEY_TO_STAT,
};
