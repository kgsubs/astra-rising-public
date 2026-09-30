'use strict';

// ─── Prompt builder (server-side) ──────────────────────────────────────────────
// Ports app.js's buildSystemPrompt / buildCompressedSystemPrompt /
// buildSessionZeroPrompt (SECTION 26/26a/26b) to the server, for protocol v2.
// Fixes applied while porting:
//   - the old rules-engine header is renamed to ASTRA RISING RULES ENGINE;
//   - the numeric rules lines (percentile math, initiative math) are
//     dropped, because the model no longer enforces them — it reads the
//     outcome sheet instead;
//   - buildRulesContext is called with { includeComputed: false } so its
//     [COMPUTED STATE] block (now redundant with the sheet) is left out;
//     the default stays true so promptRulesInjector's own tests are
//     unaffected.

const { buildRulesContext } = require('./promptRulesInjector');
const { getAdventureModule } = require('./gameData');
const houseRules = require('../data/house_rules.json');

// The valid xp_awards keys are whatever house_rules.json's experience table
// lists (its "source" label is metadata, not an award key).
const XP_AWARD_KEYS = Object.keys(houseRules.xp_awards).filter(k => k !== 'source');

const V2_SCHEMA_BLOCK = `OUTPUT: respond with ONLY a single JSON object, no prose, no markdown fences.
{"narrative":"string","checks":[{"row":"S2","tier":"standard","target_id":null,"outcome_seen":"PASS"}],"hostile_actions":[{"id":"h1","action":"attack|hold|flee|surrender|finish"}],"hazard":null,"healing":null,"xp_awards":["discovery"],"credits":null,"combat":null,"story_updates":{"status_add":[],"status_remove":[],"inventory_add":[],"inventory_remove":[],"npc_updates":[{"name":"","role":"","attitude":""}],"faction_updates":[{"name":"","standing":"up|down"}],"journal_entry":null,"scene_id":null},"choices":[{"id":"c1","text":"string","action_type":"string","check":{"kind":"skill|ability|attack|none","key":"beam_weapons","tier":"easy|standard|hard","target_id":"h1"}}],"scene_change":false,"scene_header":null,"scene_summary":"string","ooc_note":null,"tooltip_terms":[]}
Your entire response must be this JSON object and nothing else. Never output dice_rolls, roll, target, success, state_updates, or any *_delta field: those are ignored, and only the server's own rolls are ever applied.
Enum fields:
- hazard: {"severity":"minor|moderate|severe"} or null.
- healing: "stimdose|first_aid|rest_day" or null.
- xp_awards: an array drawn only from these keys: ${XP_AWARD_KEYS.join(', ')}. Any other key is dropped.
- credits: {"kind":"reward|purchase|payment|sale","tier":"token|small|medium|large|fortune","item":null} or null. "item" names what was bought or sold.
- combat: {"start":[{"name":"Pod Sleeper","threat":"minion|soldier|elite|boss"}]} to start a fight, {"end":"victory|fled|surrender"} to end one, or null.
- When no combat is active and the player attacks, or hostiles attack, set combat.start with every hostile present and narrate the fight breaking out; the first exchange of blows resolves on the next turn from the sheet. Never invent a weapon malfunction, misfire or empty charge unless the sheet says the weapon cannot fire.
- If you introduce a hostile creature or person, set combat.start listing it; never harm the player through hazard for a creature's attack. If the player attacks and no hostile is present, narrate that there is no target and leave combat null.
A choice's "check.key" must be one of the weapon, skill or enemy ids listed on the outcome sheet's IDS line: an attack uses a weapon key or a skill key naming a weapons category, a skill check uses a skill key, and target_id (when the check is an attack) must be one of the listed enemy ids.`;

function layer1(isAskGM) {
  if (isAskGM) {
    return `ASTRA RISING RULES ENGINE:
The server rolls and resolves every check, attack, enemy action and hazard; you never invent a roll, a target, or a success or failure of your own. This is an out-of-character question, so no outcome sheet is given: answer it directly, with no mechanics.`;
  }
  return `ASTRA RISING RULES ENGINE:
The server rolls and resolves every check, attack, enemy action and hazard before you write, and shows you the results only as words (PASS/FAIL, HIT/MISS, DOWN/HURT), never as numbers. You never invent a roll, a target, or a success or failure of your own. Narrate to match the outcome sheet below exactly as given, and declare in "checks" which sheet rows your narration used.`;
}

function layer2() {
  return `DM PERSONA:
You are a cinematic, genre-blending AI Game Master for Astra Rising.
Narrative style: 2nd person present tense ("You step into the airlock...").
Tone: serious but pulpy, with moments of dark humor. Match the adventure's genre.
Always describe sensory details: sights, sounds, smells of the frontier.
Never railroad. Present meaningful choices. Consequences are real.
Keep narrative responses under 300 words unless a major scene transition demands more.
Always end with 2-4 player choices (the choices array). Each choice that requires a
check names its kind, key and tier in "check" so the server can pin the roll before
your next reply is written.
PARAGRAPH FORMAT: Write the narrative as 2-3 short paragraphs separated by \n\n. Never write a single monolithic block. Typical flow: (1) immediate action and environment, (2) NPC reaction or consequence, (3) tension or hook into the choices. Each paragraph should be 2-4 sentences.
SIGNATURE TRAIT: The character's SIGNATURE TRAIT defines their unique edge. Actively create openings for it every scene; surface choices in the choices array that only this character can take, have NPCs react to them differently, let situations arise that this trait can resolve in ways unavailable to others. Do not wait for the player to invoke it; proactively shape narrative and choices around it.
STYLE: Never use em dashes in any output. Use commas, colons, semicolons, or restructured sentences instead.
CRITICAL: NEVER mention dice, rolls, numbers, stats, targets, mechanics, or rule checks inside the narrative field. The narrative is pure immersive fiction only.
ASK GM: If the player's message starts with "Ask GM:", answer their question in the ooc_note field. Set narrative to "" and provide 2 sensible in-fiction choices. No outcome sheet is given for this kind of turn.`;
}

function layer3(state) {
  const char = state.character;
  const camp = state.campaign;
  const scene = state.scene;
  let out = 'CURRENT CAMPAIGN STATE:\n';

  if (char) {
    const skillList = (char.skills || []).map(s => `${s.name}(${s.level})`).join(', ');
    const st = char.stats || {};
    const statStr = `${st.str}/${st.sta}/${st.dex}/${st.rs}/${st.int}/${st.log}/${st.per}/${st.ldr}`;
    out += `CHAR: ${char.name} | ${char.race} | ${char.archetype}\n`;
    out += `STATS(str/sta/dex/rs/int/log/per/ldr): ${statStr}\n`;
    out += `STA: ${char.stamina.current}/${char.stamina.max}\n`;
    out += `SKILLS: ${skillList}\n`;
    if (char.signature_trait) out += `SIGNATURE TRAIT: ${char.signature_trait}\n`;
    out += `INV: ${(char.inventory || []).join(', ')}\n`;
    out += `SEU: ${char.seu ? char.seu.total : 0} total\n`;
    out += `XP: ${char.xp ? char.xp.total : 0} total / ${char.xp ? char.xp.unspent : 0} unspent\n`;
    if (char.status_effects && char.status_effects.length > 0) out += `STATUS: ${char.status_effects.join(', ')}\n`;
  } else {
    out += 'CHAR: none selected\n';
  }

  if (camp) {
    out += `CAMPAIGN: ${camp.adventure_title} | device: ${camp.story_device}\n`;
    if (camp.npcs && camp.npcs.length > 0) out += `NPCS: ${camp.npcs.map(n => `${n.name}(${n.role})`).join(', ')}\n`;
    if (camp.factions && camp.factions.length > 0) out += `FACTIONS: ${camp.factions.map(f => f.name).join(', ')}\n`;
    if (camp.journal && camp.journal.length > 0) out += `JOURNAL_LAST: ${camp.journal[camp.journal.length - 1].entry}\n`;
    if (camp.adventure_id) {
      const mod = getAdventureModule(camp.adventure_id);
      if (mod) {
        out += `ADVENTURE_TONE: ${mod.ai_instructions.tone}\n`;
        out += `THEMES: ${mod.ai_instructions.themes.join(', ')}\n`;
        out += `PACING: ${mod.ai_instructions.pacing}\n`;
        const modScene = (mod.scenes || []).find(s => s.id === camp.current_scene_id);
        if (modScene) {
          out += `CURRENT_SCENE: ${modScene.title} [${modScene.type}]\n`;
          out += `SCENE_DESC: ${modScene.description}\n`;
          if (modScene.objective) out += `SCENE_OBJ: ${modScene.objective}\n`;
          if (modScene.npcs_present && modScene.npcs_present.length > 0) {
            out += `SCENE_NPCS: ${modScene.npcs_present.map(n => `${n.name}(${n.role}, ${n.attitude})`).join('; ')}\n`;
          }
          if (modScene.exits && modScene.exits.length > 0) {
            out += `EXITS: ${modScene.exits.map(e => `${e.to}: ${e.description}`).join(' | ')}\n`;
          }
        }
      }
    }
  }

  // A compressed campaign (POST /api/game/compress) replaces the turn-by-turn
  // history with this prose summary; without it here, the compression call
  // the player paid a provider request for would never reach a prompt again.
  if (scene && scene.history_compressed && scene.compressed_summary) {
    out += `COMPRESSED_HISTORY: ${scene.compressed_summary}\n`;
  }
  if (scene && scene.summary) out += `SCENE_SUMMARY: ${scene.summary}\n`;
  if (scene && scene.in_combat && scene.combat_state) {
    out += `COMBAT: round ${scene.combat_state.round}, phase ${scene.combat_state.phase}\n`;
  }

  return out;
}

/**
 * buildTurnPrompt({ state, sheetText, isAskGM, activeModules })
 * Returns the system prompt string for POST /api/turn. `sheetText` is
 * outcomeSheet.renderSheet()'s output; omitted (or isAskGM true) for an
 * "Ask GM:" turn, which gets no sheet and no mechanics.
 */
function buildTurnPrompt({ state, sheetText, isAskGM = false, activeModules = [] }) {
  const rules = buildRulesContext(state, activeModules, { includeComputed: false });
  const parts = [layer1(isAskGM), layer2(), layer3(state)];
  if (rules) parts.push(rules);
  if (isAskGM || !sheetText) {
    return parts.join('\n\n');
  }
  parts.push(sheetText, V2_SCHEMA_BLOCK);
  return parts.join('\n\n');
}

/**
 * buildSessionZeroPrompt(character, adventure) — server port of app.js
 * SECTION 26b. Keeps the literal "SessionZeroResponse" wording because the
 * QA harness's fake-provider.js routes on it.
 */
function buildSessionZeroPrompt(character, adventure) {
  const persona = `You are a cinematic AI Game Master setting up an Astra Rising campaign.
Your job is to generate a SessionZeroResponse JSON that seeds the opening of the adventure.`;
  const context = `CHARACTER: ${character.name}, ${character.race} ${character.archetype}
ADVENTURE: ${adventure.title}
GENRE: ${adventure.genre}
TONE: ${adventure.tone.join(', ')}`;
  const schema = `OUTPUT: respond with ONLY a single JSON object, no prose, no markdown fences.
{"story_device":"string","hooks":[{"id":"string","title":"string","opening":"string","hook_type":"string"}],"campaign_spine":{"act1_goal":"string","act2_complication":"string","act3_convergence":"string"},"key_npcs":[{"name":"string","role":"string","attitude":"string","description":"string"}]}
Your entire response must be this JSON object and nothing else.`;
  return `${persona}\n\n${context}\n\n${schema}`;
}

/**
 * buildSessionZeroUserMessage(displayName, character, adventure) — the user
 * message that accompanies buildSessionZeroPrompt. Keeps the literal
 * "Begin Session Zero" wording fake-provider.js also routes on.
 */
function buildSessionZeroUserMessage(displayName, character, adventure) {
  return `Begin Session Zero for the adventure "${adventure.title}". My character is ${displayName}, a ${character.race} ${character.archetype}. Generate a SessionZeroResponse JSON as specified in the schema. The story device should fit the adventure's genre (${adventure.genre}) and tone (${adventure.tone.join(', ')}). Create 3 distinct hooks that each offer a different way into the story. Keep each hook opening under 35 words: punchy and cinematic, no padding.`;
}

/**
 * buildCompressPrompt(state) — server port of app.js SECTION 26c
 * (compressCampaignHistory). Returns { system, user }.
 */
function buildCompressPrompt(state) {
  const camp = state.campaign;
  const char = state.character;
  const scene = state.scene;

  const dataToCompress = {
    adventure: camp ? { title: camp.adventure_title, story_device: camp.story_device, spine: camp.spine } : null,
    character: char ? {
      name: char.name, race: char.race, archetype: char.archetype, stamina: char.stamina,
      status_effects: char.status_effects, skills: char.skills, credits: char.credits, xp: char.xp,
    } : null,
    npcs: camp ? camp.npcs : [],
    factions: camp ? camp.factions : [],
    journal: camp ? camp.journal : [],
    recent_summaries: (scene && scene.recent_summaries) || [],
    session: state.session,
  };

  const user = `Summarize the following Astra Rising campaign history in 300-500 tokens, preserving: active NPCs and their attitudes, faction standings, current campaign spine status, most important events, current character equipment and health status. Campaign data:\n\n${JSON.stringify(dataToCompress, null, 2)}`;
  const system = 'You are a campaign historian. Your task is to compress campaign history into a concise summary preserving all game-mechanically relevant information. Do not use JSON. Write flowing prose. Maximum 500 tokens.';
  return { system, user };
}

/**
 * buildHistoryMessages({ turnLogRows, legacyMessages }) — the last 6
 * resolved turns as {role, content} pairs. turn_log rows (protocol v2) are
 * rewritten as compact JSON (story text plus declared rows); a migrated
 * game with no turn_log falls back to `messages` rows, keeping only the
 * story text out of the old raw JSON so the model never copies the v1
 * roll/target schema back at the server.
 */
function buildHistoryMessages({ turnLogRows = [], legacyMessages = [] } = {}) {
  if (turnLogRows.length) {
    const resolved = turnLogRows.filter(r => r.status === 'resolved' && r.result_json).slice(-6);
    const out = [];
    for (const row of resolved) {
      let request = null;
      let result = null;
      try { request = JSON.parse(row.request_json || '{}'); } catch (_) { /* ignore */ }
      try { result = JSON.parse(row.result_json); } catch (_) { continue; }
      if (request && (request.text || request.choice_id)) {
        out.push({ role: 'user', content: request.text || `(chose ${request.choice_id})` });
      }
      out.push({ role: 'assistant', content: JSON.stringify({ narrative: result.narrative, checks: result.checks || [] }) });
    }
    return out;
  }

  const narratives = legacyMessages.filter(m => m.role === 'assistant').slice(-6);
  const out = [];
  for (const m of narratives) {
    let narrative = m.content;
    try {
      const parsed = JSON.parse(m.content);
      if (parsed && typeof parsed.narrative === 'string') narrative = parsed.narrative;
    } catch (_) { /* plain text already */ }
    out.push({ role: 'assistant', content: JSON.stringify({ narrative }) });
  }
  return out;
}

module.exports = {
  buildTurnPrompt,
  buildSessionZeroPrompt,
  buildSessionZeroUserMessage,
  buildCompressPrompt,
  buildHistoryMessages,
  V2_SCHEMA_BLOCK,
  XP_AWARD_KEYS,
};
