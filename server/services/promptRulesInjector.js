'use strict';

// ─── Prompt Rules Injector ─────────────────────────────────────────────────────
// Builds a compact rules-context string for injection into AI system prompts.
// Called by /api/chat after parsing game_state from the request body.
//
// Output structure:
//   [COMPUTED STATE]   — P1, never truncated: IM, skill targets, STA thresholds, weapon dmg
//   [RULES CONTEXT]    — dice basics (P5), STA text (P2), racial abilities (P3),
//                        skill defs (P4), weapon formulas, combat table (P6 if active),
//                        active Gamma Dawn modules (P7)
//
// Token budget: ~800 tokens (~600 words). P1 and P5 are always emitted.

const { getRulesCache } = require('../ruleLoader');
const {
  computeIM,
  computeSkillTarget,
  parseWeaponDamage,
  computeSTAThresholds,
} = require('./ruleEngine');

// Maps character skill display names (title-cased) to rule keys and base ability stat.
const SKILL_NAME_MAP = {
  'Beam Weapons':       { key: 'beam_weapons',       stat: 'dex' },
  'Projectile Weapons': { key: 'projectile_weapons', stat: 'dex' },
  'Melee Weapons':      { key: 'melee_weapons',      stat: 'str' },
  'Martial Arts':       { key: 'martial_arts',       stat: 'str' },
  'Grenades':           { key: 'grenades',           stat: 'dex' },
  'Computers':          { key: 'computers',          stat: 'log' },
  'Robotics':           { key: 'robotics',           stat: 'log' },
  'Technician':         { key: 'technician',         stat: 'log' },
  'Environmental':      { key: 'environmental',      stat: 'log' },
  'Medical':            { key: 'medical',            stat: 'log' },
  'Psycho-Social':      { key: 'psychosocial',       stat: 'per' },
};

// All weapon IDs loadable from alpha_dawn_expanded, mapped to their category.
const WEAPON_ID_CATEGORY = {
  laser_pistol:    'beam_weapons',
  laser_rifle:     'beam_weapons',
  heavy_laser:     'beam_weapons',
  auto_pistol:     'projectile_weapons',
  auto_rifle:      'projectile_weapons',
  jyro_pistol:  'projectile_weapons',
  jyro_rifle:   'projectile_weapons',
  machine_gun:     'projectile_weapons',
  vibe_knife:      'melee_weapons',
  vibrosword:      'melee_weapons',
  sonic_knife:     'melee_weapons',
  sonic_sword:     'melee_weapons',
  shock_gloves:    'melee_weapons',
  doze:            'grenades',
  frag:            'grenades',
  poison:          'grenades',
  smoke:           'grenades',
  tanglers:        'grenades',
};

/**
 * matchWeaponId(inventoryItem) → string|null
 * Attempts to resolve a human-readable inventory string to a weapon ID.
 * Tries exact match first, then substring match.
 */
function matchWeaponId(inventoryItem) {
  const norm = inventoryItem
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  if (WEAPON_ID_CATEGORY[norm]) return norm;
  for (const id of Object.keys(WEAPON_ID_CATEGORY)) {
    if (norm.includes(id)) return id;
  }
  return null;
}

/**
 * buildRulesContext(gameState, activeModules) → string
 *
 * @param {object}   gameState     — parsed game state from the frontend
 * @param {string[]} activeModules — active Gamma Dawn module IDs (e.g. ['psionics'])
 * @returns {string}
 */
function buildRulesContext(gameState, activeModules) {
  if (!gameState) return '';
  const char = gameState.character;
  if (!char) return '';

  const cache    = getRulesCache();
  const basic    = cache['alpha_dawn_basic'];
  const gammaDawn = cache['gamma_dawn'];

  const stats   = char.stats || {};
  const maxSTA  = char.stamina?.max || 0;
  const inCombat = gameState.scene?.in_combat === true;
  const skills   = Array.isArray(char.skills) ? char.skills : [];
  const inventory = Array.isArray(char.inventory) ? char.inventory : [];

  const lines = [];

  // Framing: make clear these numbers are for internal resolution only
  lines.push('GM MECHANICS (internal use only — NEVER mention these numbers, targets, dice, or checks in the narrative field):');
  lines.push('');

  // ── P1: [COMPUTED STATE] — always included ─────────────────────────────────

  lines.push('[COMPUTED STATE]');

  // Initiative Modifier
  const rsVal = stats.rs || 0;
  lines.push(`IM: ${computeIM(rsVal)} (RS=${rsVal})`);

  // Skill check targets
  for (const skill of skills) {
    const mapping = SKILL_NAME_MAP[skill.name];
    if (!mapping) continue;
    const abilityScore = stats[mapping.stat] || 0;
    const target = computeSkillTarget(abilityScore, skill.level || 0);
    lines.push(
      `${skill.name} L${skill.level} skill check target: ${target}%` +
      ` (${mapping.stat.toUpperCase()}=${abilityScore})`
    );
  }

  // STA thresholds
  const thresh = computeSTAThresholds(maxSTA);
  lines.push(
    `STA thresholds: unconscious=${thresh.unconscious}, dying=${thresh.dying}` +
    ` (maxSTA=${maxSTA})`
  );

  // Weapon damage for inventory items that resolve to known weapon IDs
  const seenWeapons = new Set();
  for (const item of inventory) {
    const weaponId = matchWeaponId(item);
    if (!weaponId || seenWeapons.has(weaponId)) continue;
    seenWeapons.add(weaponId);
    const dmg = parseWeaponDamage(weaponId, WEAPON_ID_CATEGORY[weaponId]);
    if (!dmg) continue;
    const seuNote = dmg.avgPerSEU !== null ? ` (avg ${dmg.avgPerSEU} dmg/SEU)` : '';
    lines.push(`${weaponId}: ${dmg.formula} dmg, range ${dmg.min}-${dmg.max}${seuNote}`);
  }

  lines.push('');

  // ── [RULES CONTEXT] section header ────────────────────────────────────────

  lines.push('[RULES CONTEXT]');

  // P5: Dice system basics — never truncated
  if (basic?.dice_system) {
    const ds = basic.dice_system;
    lines.push(`DICE: ${ds.primary}. Success: roll \u2264 target.`);
  }

  // P2: STA threshold rule text
  lines.push('STA: unconscious at 0; death at -(maxSTA + 30).');

  // P3: Racial abilities — check alpha_dawn_basic first, then zebulons_guide.new_races
  const race = (char.race || '').toLowerCase();
  const zeb = cache['zebulons_guide'];
  const raceData =
    (basic?.character_creation?.races?.[race]) ||
    (zeb?.new_races?.[race] && typeof zeb.new_races[race] === 'object' && !Array.isArray(zeb.new_races[race])
      ? zeb.new_races[race]
      : null);
  if (raceData) {
    const abilities = raceData.special_abilities || [];
    if (abilities.length) {
      lines.push(`RACE (${char.race}):`);
      for (const ab of abilities) {
        const name = typeof ab === 'string' ? ab : ab.name;
        const desc = typeof ab === 'string' ? '' : (ab.description || '');
        lines.push(`  ${name}${desc ? ': ' + desc : ''}`);
      }
    }
  }

  // P4: Skill definitions — core + Zebulon expanded subskills where available
  const coreSkills = basic?.skills?.core_skills || {};
  const zebEss = zeb?.expanded_skill_system || {};

  // Build a flat map of all Zebulon expanded skills: key → { description, subskills }
  const zebSkillFlat = {};
  for (const group of ['military_skills', 'technological_skills', 'biosocial_skills']) {
    const groupData = zebEss[group] || {};
    for (const [key, val] of Object.entries(groupData)) {
      zebSkillFlat[key] = val;
    }
  }

  // PSA determines in-profession XP cost; map character.psa to group name
  const PSA_TO_GROUP = {
    military: 'military_skills', technical: 'technological_skills', biosocial: 'biosocial_skills',
  };
  const charPsaGroup = PSA_TO_GROUP[(char.psa || '').toLowerCase()];

  const knownSkillDefs = skills
    .map(s => ({ skill: s, mapping: SKILL_NAME_MAP[s.name], def: coreSkills[SKILL_NAME_MAP[s.name]?.key] }))
    .filter(x => x.mapping && x.def);

  if (knownSkillDefs.length) {
    lines.push('SKILL DEFS:');
    for (const { skill, mapping, def } of knownSkillDefs) {
      const zebDef = zebSkillFlat[mapping.key];
      const subSkillNote = zebDef?.subskills?.length
        ? ` [subs: ${zebDef.subskills.join('/')}]`
        : '';
      // XP cost note: professional (in PSA) vs non-professional
      const inPsa = charPsaGroup && (zebEss[charPsaGroup] || {})[mapping.key] !== undefined;
      const xpNote = inPsa ? ' (PSA skill)' : '';
      lines.push(
        `  ${skill.name}: ${def.description}` +
        ` (base ${def.base_chance}, +${(skill.level || 0) * 10}% from levels)${subSkillNote}${xpNote}`
      );
    }
  }

  // P4b: Profession bonuses from Zebulon's Guide
  if (zeb?.professions && char.archetype) {
    const archLower = char.archetype.toLowerCase();
    const profKeys = Object.keys(zeb.professions).filter(k => k !== 'description');
    const matchedKey = profKeys.find(k => archLower.includes(k));
    if (matchedKey) {
      const prof = zeb.professions[matchedKey];
      lines.push(`PROFESSION (${matchedKey}):`);
      lines.push(`  Free skill: ${prof.free_skill}`);
      if (prof.typical_skills?.length) {
        lines.push(`  Typical skills: ${prof.typical_skills.join(', ')}`);
      }
    }
  }

  // P6: Combat sequence and to-hit modifiers — only when in_combat
  if (inCombat && basic?.combat) {
    lines.push('COMBAT SEQUENCE:');
    const seq = Array.isArray(basic.combat.combat_sequence)
      ? basic.combat.combat_sequence
      : [];
    seq.forEach((step, i) => lines.push(`  ${i + 1}. ${step}`));

    const toHitMods = basic.combat.to_hit?.modifiers || {};
    lines.push('TO-HIT MODS:');
    for (const [range, mod] of Object.entries(toHitMods)) {
      lines.push(`  ${range.replace(/_/g, ' ')}: ${mod}`);
    }
  }

  // P7: Active Gamma Dawn modules — module-specific rich injection (E2–E5)
  if (Array.isArray(activeModules) && activeModules.length && gammaDawn) {
    for (const modId of activeModules) {
      const modData = gammaDawn[modId];
      if (!modData) continue;
      lines.push(`MODULE [${modId.toUpperCase()}]:`);
      lines.push(`  ${modData.description || ''}`);

      if (modId === 'psionics') {
        // E2: Psionics — power points, disciplines
        if (modData.availability) lines.push(`  Availability: ${modData.availability}`);
        const pp = modData.power_points;
        if (pp) lines.push(`  Power Points: base=${pp.base}, recovery=${pp.recovery}`);
        const disciplines = modData.disciplines;
        if (disciplines) {
          lines.push(`  Disciplines: ${Object.keys(disciplines).join(', ')}`);
        }
        const pc = modData.psionic_combat;
        if (pc?.description) lines.push(`  Psionic combat: ${pc.description}`);

      } else if (modId === 'cybernetics') {
        // E3: Cybernetics — cyber points, cyberpsychosis
        const cp = modData.cyber_points;
        if (cp) lines.push(`  Cyber Points: base=${cp.base || 'STA/10'}, ${cp.cost_per_implant || 'cost varies'} per implant`);
        const implants = modData.implants;
        if (implants) {
          lines.push(`  Implant categories: ${Object.keys(implants).join(', ')}`);
        }
        const cpsy = modData.cyberpsychosis;
        if (cpsy) lines.push(`  Cyberpsychosis: ${cpsy.description} — trigger: ${cpsy.trigger}`);

      } else if (modId === 'reputation_system') {
        // E4: Reputation — categories and effects
        const cats = modData.categories;
        if (cats) {
          const catNames = Object.keys(cats).join(', ');
          lines.push(`  Reputation tracks: ${catNames}`);
        }
        const eff = modData.effects;
        if (eff?.positive) lines.push(`  Positive rep: ${eff.positive}`);
        if (eff?.negative) lines.push(`  Negative rep: ${eff.negative}`);

      } else if (modId === 'mutations') {
        // E5: Mutations — sources, table summary
        const sources = modData.sources;
        if (Array.isArray(sources)) lines.push(`  Sources: ${sources.join(', ')}`);
        const table = modData.mutation_table;
        if (table) {
          const types = Object.keys(table).join(', ');
          lines.push(`  Mutation types: ${types}`);
          if (Array.isArray(table.beneficial)) {
            lines.push(`  Beneficial examples: ${table.beneficial.slice(0,3).map(m => m.name).join(', ')}`);
          }
        }

      } else {
        // Generic fallback for other modules
        if (modData.availability) lines.push(`  Availability: ${modData.availability}`);
      }
    }
  }

  return lines.join('\n');
}

module.exports = { buildRulesContext };
