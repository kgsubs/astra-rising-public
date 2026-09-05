'use strict';

// ─── Rule Computation Service ─────────────────────────────────────────────────
// Pure functions that compute mechanical values from cached rule data.
// All functions read from rulesCache (passed in or accessed via getRulesCache),
// never from HTTP. No side effects.
//
// Token estimate: ~40 tokens overhead; function bodies ~200 tokens total.
// These outputs are injected into AI prompts via promptRulesInjector (B2).

const { getRulesCache } = require('../ruleLoader');

/**
 * computeIM(RS)
 * Initiative Modifier = RS / 10, rounded up.
 * Source: alpha_dawn_basic.combat.initiative.im_calculation
 * Example: computeIM(45) → 5
 */
function computeIM(RS) {
  return Math.ceil(RS / 10);
}

/**
 * computeSkillTarget(abilityScore, skillLevel)
 * Target number = floor(abilityScore / 2) + (skillLevel * 10)
 * Source: alpha_dawn_basic.skills.core_skills.*.base_chance ("1/2 DEX") +
 *         alpha_dawn_basic.skills.core_skills.*.per_level ("+10%")
 * Example: computeSkillTarget(60, 3) → 30 + 30 = 60
 */
function computeSkillTarget(abilityScore, skillLevel) {
  return Math.floor(abilityScore / 2) + (skillLevel * 10);
}

/**
 * parseWeaponDamage(weaponId, category)
 * Resolves weapon from alpha_dawn_expanded.equipment.weapons and parses damage.
 * category: 'beam_weapons' | 'projectile_weapons' | 'melee_weapons' | 'grenades'
 * Returns { formula, min, max, avgPerSEU } or null if weapon not found.
 *
 * Damage string formats handled:
 *   "1d10 per SEU"  → min=1, max=10, formula="1d10", avgPerSEU=5.5
 *   "2d10 per SEU"  → min=2, max=20, formula="2d10", avgPerSEU=11
 *   "2d10"          → min=2, max=20, formula="2d10", avgPerSEU=null
 *   "1d10 + 2"      → min=3, max=12, formula="1d10+2", avgPerSEU=null
 *   "4d10"          → min=4, max=40, formula="4d10", avgPerSEU=null
 */
function parseWeaponDamage(weaponId, category) {
  const cache    = getRulesCache();
  const expanded = cache['alpha_dawn_expanded'];
  if (!expanded) return null;

  const weapons  = expanded.equipment && expanded.equipment.weapons;
  if (!weapons) return null;

  // Try specified category first, then search all categories
  const categoryNames = category
    ? [category, ...Object.keys(weapons).filter(c => c !== category)]
    : Object.keys(weapons);

  let weapon = null;
  for (const cat of categoryNames) {
    const catData = weapons[cat];
    if (catData && catData[weaponId]) {
      weapon = catData[weaponId];
      break;
    }
  }

  if (!weapon) return null;

  const damageStr = weapon.damage || '';
  return parseDamageString(damageStr);
}

/**
 * parseDamageString(damageStr)
 * Parses a raw damage string into { formula, min, max, avgPerSEU }.
 * Internal helper used by parseWeaponDamage.
 */
function parseDamageString(damageStr) {
  if (!damageStr) return null;

  const perSEU = /per\s*seu/i.test(damageStr);
  const str = damageStr.replace(/per\s*seu/i, '').trim();

  // Match NdM or NdM + K or NdM + K damage
  const m = str.match(/^(\d+)d(\d+)(?:\s*[+]\s*(\d+))?/i);
  if (!m) return null;

  const numDice = parseInt(m[1], 10);
  const sides   = parseInt(m[2], 10);
  const bonus   = m[3] ? parseInt(m[3], 10) : 0;

  const min = numDice + bonus;
  const max = (numDice * sides) + bonus;
  const avg = (numDice * (sides + 1) / 2) + bonus;

  return {
    formula:    `${numDice}d${sides}${bonus ? '+' + bonus : ''}`,
    min,
    max,
    avgPerSEU:  perSEU ? avg : null,
  };
}

/**
 * computeSTAThresholds(maxSTA)
 * Returns the two critical STA thresholds for a character.
 * Source: alpha_dawn_basic.combat.damage_and_healing
 *   - unconscious: 0 STA
 *   - dying: -(maxSTA + 30)  [confirmed by project spec Override 1]
 * Example: computeSTAThresholds(50) → { unconscious: 0, dying: -80 }
 */
function computeSTAThresholds(maxSTA) {
  return {
    unconscious: 0,
    dying: -(Math.abs(maxSTA) + 30),
  };
}

/**
 * computeRacialTriggerChance(race, abilityName)
 * Parses the numeric trigger chance from a race's special ability description.
 * Source: alpha_dawn_basic.character_creation.races.*.special_abilities[].description
 * Returns integer percentage (e.g. 5 for "5% chance") or null if not found.
 * Example: computeRacialTriggerChance('skrath', 'Battle Rage') → 5
 */
function computeRacialTriggerChance(race, abilityName) {
  const cache = getRulesCache();
  const basic = cache['alpha_dawn_basic'];
  if (!basic) return null;

  const raceData = basic.character_creation &&
                   basic.character_creation.races &&
                   basic.character_creation.races[race.toLowerCase()];
  if (!raceData) return null;

  const abilities = raceData.special_abilities;
  if (!Array.isArray(abilities)) return null;

  for (const ability of abilities) {
    const name = typeof ability === 'string' ? ability : ability.name;
    const desc = typeof ability === 'string' ? ability : ability.description || '';

    if (name && name.toLowerCase().includes(abilityName.toLowerCase())) {
      // Extract the first integer percentage from the description
      const pctMatch = desc.match(/(\d+)%/);
      if (pctMatch) return parseInt(pctMatch[1], 10);
    }
  }

  return null;
}

/**
 * computeAbilityModifier(abilityScore)
 * Returns the modifier string for an ability score using Zebulon's Guide table.
 * Source: zebulons_guide.ability_modifiers.modifiers
 * Example: computeAbilityModifier(65) → "+10%"
 */
function computeAbilityModifier(abilityScore) {
  const cache = getRulesCache();
  const zeb   = cache['zebulons_guide'];
  if (!zeb) return '0%';

  const modifiers = zeb.ability_modifiers && zeb.ability_modifiers.modifiers;
  if (!modifiers) return '0%';

  // Table entries are like "51-60": "+5%"
  for (const [range, mod] of Object.entries(modifiers)) {
    // Handle "100+" edge case
    if (range.endsWith('+')) {
      const min = parseInt(range, 10);
      if (abilityScore >= min) return mod;
      continue;
    }
    const parts = range.split('-');
    if (parts.length !== 2) continue;
    const lo = parseInt(parts[0], 10);
    const hi = parseInt(parts[1], 10);
    if (abilityScore >= lo && abilityScore <= hi) return mod;
  }

  return '0%';
}

module.exports = {
  computeIM,
  computeSkillTarget,
  parseWeaponDamage,
  parseDamageString,
  computeSTAThresholds,
  computeRacialTriggerChance,
  computeAbilityModifier,
};
