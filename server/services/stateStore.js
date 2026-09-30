'use strict';

// ─── State store ────────────────────────────────────────────────────────────
// The server is the only writer of game state from here on. load() migrates
// old (pre-protocol-v2) saves lazily on read; commit()
// writes the new schema_version:2 shape back. stripServerFields() removes
// the fields the browser must never see (pending_choices, session.game_over
// — the client instead learns a game ended via the 409 GAME_OVER code on its
// next turn, not by reading this flag).

const fs = require('fs');
const path = require('path');
const dbApi = require('../../db');
const { getCharacter, getAdventureModule, getScene, loadGameData } = require('./gameData');

const SCHEMA_VERSION = 2;

// A rename of an adventure id, rules id, scene id or inventory item name
// (data/rules/*.json, public/data/game-data.js) must not orphan a save made
// before the rename: it stored the old value as a plain string, and
// schema_version alone does not change when an id is renamed, so a save
// already on the current schema is not routed through migrateLegacyState()
// below. Every value below is resolved through its map before anything else
// reads it, whether the save is legacy or already v2 (see load()).
//
// The maps themselves live in data/legacy-aliases.json, not here, so a
// public export of this repo can exclude the file (it is a list of the
// original game's renamed proper nouns paired with their replacements) and
// still ship a working app: an absent file means an empty alias set, which
// is exactly correct for an install that has never saved a game under an
// old id.
const ALIASES_PATH = path.join(__dirname, '..', '..', 'data', 'legacy-aliases.json');

function loadAliases() {
  try {
    if (fs.existsSync(ALIASES_PATH)) {
      const raw = JSON.parse(fs.readFileSync(ALIASES_PATH, 'utf8'));
      return {
        adventure_ids: raw.adventure_ids || {},
        rules_ids: raw.rules_ids || {},
        scene_ids: raw.scene_ids || {},
        item_names: raw.item_names || {},
      };
    }
  } catch (err) {
    console.error(`[stateStore] failed to load ${ALIASES_PATH}: ${err.message}`);
  }
  return { adventure_ids: {}, rules_ids: {}, scene_ids: {}, item_names: {} };
}

const ALIASES = loadAliases();
const ADVENTURE_ID_ALIASES = ALIASES.adventure_ids;
// No save currently stores a rules id (the character sheet and campaign
// object never persist one; the active-optional-modules list stores Gamma
// Rising sub-module names, which were not renamed). Kept alongside the
// adventure map for the one place a rules id ever arrives from outside the
// process, resolveRulesId() below, so a future field or an old bookmark to
// GET /api/rules/:id under a pre-rename id keeps working the same way.
const RULES_ID_ALIASES = ALIASES.rules_ids;
const SCENE_ID_ALIASES = ALIASES.scene_ids;
const ITEM_NAME_ALIASES = ALIASES.item_names;

function resolveAdventureId(id) {
  return (typeof id === 'string' && ADVENTURE_ID_ALIASES[id]) || id;
}

function resolveRulesId(id) {
  return (typeof id === 'string' && RULES_ID_ALIASES[id]) || id;
}

function resolveSceneId(id) {
  return (typeof id === 'string' && SCENE_ID_ALIASES[id]) || id;
}

function resolveItemName(name) {
  return (typeof name === 'string' && ITEM_NAME_ALIASES[name]) || name;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

// Roster ids are present in saves made after `initializeSession` started
// spreading the roster entry into character. Older saves are matched on
// name + race instead.
function findRosterCharacter(rawCharacter) {
  if (!rawCharacter) return null;
  if (rawCharacter.id) {
    const byId = getCharacter(rawCharacter.id);
    if (byId) return byId;
  }
  const roster = loadGameData().CHARACTER_ROSTER || [];
  return roster.find(c => c.name === rawCharacter.name && c.race === rawCharacter.race) || null;
}

// Re-derives stats, skills, stamina.max, racial_abilities and
// signature_trait from the roster; keeps display_name and whatever of the
// player's own progress (stamina.current, inventory, credits, xp, seu, ammo)
// survives clamping.
function migrateCharacter(raw) {
  const matched = findRosterCharacter(raw);
  if (!matched) {
    return { character: { ...raw, _unmatched: true }, unmatched: true };
  }

  const staMax = matched.stamina.max;
  const staCurrent = clamp(isFiniteNumber(raw.stamina && raw.stamina.current) ? raw.stamina.current : staMax, 0, staMax);

  const seuSources = (matched.seu.sources || []).map((capSrc) => {
    const rawSrc = (raw.seu && raw.seu.sources || []).find(s => s.name === capSrc.name);
    const seu = clamp(isFiniteNumber(rawSrc && rawSrc.seu) ? rawSrc.seu : capSrc.seu, 0, capSrc.seu);
    return { name: capSrc.name, seu };
  });
  const seuTotal = seuSources.reduce((sum, s) => sum + s.seu, 0);

  const inventory = (Array.isArray(raw.inventory) ? raw.inventory : matched.inventory)
    .slice(0, 40)
    .map(i => resolveItemName(String(i)).slice(0, 60));

  // Unconscious/Dead are server-computed from STA on every commit; a
  // migrated save never carries them in as fact.
  const statusEffects = (Array.isArray(raw.status_effects) ? raw.status_effects : [])
    .filter(s => s !== 'Unconscious' && s !== 'Dead');

  const character = {
    ...matched,
    id: matched.id,
    display_name: raw.display_name || raw.name || matched.name,
    stamina: { current: staCurrent, max: staMax },
    seu: { total: seuTotal, sources: seuSources },
    inventory,
    status_effects: statusEffects,
    credits: clamp(isFiniteNumber(raw.credits) ? raw.credits : matched.credits, 0, 50000),
    xp: {
      total: clamp(isFiniteNumber(raw.xp && raw.xp.total) ? raw.xp.total : 0, 0, 500),
      unspent: clamp(isFiniteNumber(raw.xp && raw.xp.unspent) ? raw.xp.unspent : 0, 0, 500),
    },
    ammo: (raw.ammo && typeof raw.ammo === 'object') ? raw.ammo : {},
  };

  return { character, unmatched: false };
}

// The pre-cutover client mirrored its whole chat history into the state it
// PUT to the server: `messages` (display shape, {id, role:'player'|'dm',
// content, timestamp} — content is already narrative-only text, never the
// `_raw` JSON blob the old client kept beside it) and `_autoChoices` (the
// last turn's choice buttons). Carried through here so a migrated save that
// has not yet played a protocol-v2 turn can still show its history and
// choices on GET/resume (server.js's buildSessionPayload) instead of coming
// back empty.
function extractLegacyMessages(raw) {
  if (!Array.isArray(raw.messages)) return [];
  return raw.messages
    .filter(m => m && typeof m.content === 'string')
    .map(m => ({
      id: m.id != null ? String(m.id) : undefined,
      role: m.role === 'dm' ? 'dm' : 'player',
      content: m.content,
      timestamp: isFiniteNumber(m.timestamp) ? m.timestamp : null,
    }));
}

function extractLegacyChoices(raw) {
  if (!Array.isArray(raw._autoChoices)) return [];
  return raw._autoChoices
    .filter(c => c && typeof c.id === 'string' && typeof c.text === 'string')
    .map(c => ({ id: c.id, text: c.text, action_type: typeof c.action_type === 'string' ? c.action_type : 'other' }));
}

function migrateCampaign(raw, adventureId) {
  adventureId = resolveAdventureId(adventureId);
  const module = getAdventureModule(adventureId);
  const firstSceneId = (module && module.scenes && module.scenes[0]) ? module.scenes[0].id : null;
  const resolvedSceneId = resolveSceneId(raw.current_scene_id);
  const sceneValid = module && resolvedSceneId && getScene(adventureId, resolvedSceneId);
  return {
    ...raw,
    adventure_id: adventureId,
    current_scene_id: sceneValid ? resolvedSceneId : firstSceneId,
    visited_scene_ids: Array.isArray(raw.visited_scene_ids) ? raw.visited_scene_ids.map(resolveSceneId) : (firstSceneId ? [firstSceneId] : []),
    npcs: Array.isArray(raw.npcs) ? raw.npcs : [],
    factions: Array.isArray(raw.factions) ? raw.factions : [],
    journal: Array.isArray(raw.journal) ? raw.journal : [],
    hooks: Array.isArray(raw.hooks) ? raw.hooks : [],
  };
}

/**
 * migrateLegacyState(raw) — converts a state with no schema_version (or an
 * older one) into the v2 shape. A save whose character cannot be matched to
 * the roster comes back with `_unmatched: true`; the caller (server.js)
 * treats that as read-only ("unsupported save").
 */
function migrateLegacyState(raw) {
  const { character, unmatched } = migrateCharacter(raw.character || {});
  const adventureId = raw.campaign && raw.campaign.adventure_id;
  const campaign = migrateCampaign(raw.campaign || {}, adventureId);

  // A save captured mid-combat cannot trust enemy stats the model invented
  // under the old protocol, so combat is simply ended on migration.
  let scene = { ...(raw.scene || {}) };
  if (scene.in_combat) {
    scene = { ...scene, in_combat: false, combat_state: null };
  }

  const session = { ...(raw.session || {}), game_over: false };

  return {
    schema_version: SCHEMA_VERSION,
    character,
    campaign,
    session,
    scene,
    meta: {
      ...(raw.meta || {}),
      // Server-only bookkeeping, stripped before any response reaches the
      // browser (stripServerFields below); server.js reads it directly off
      // the loaded state to seed GET/resume for a session with no turn_log
      // rows yet, then it is superseded by real history once one exists.
      _legacy: { messages: extractLegacyMessages(raw), choices: extractLegacyChoices(raw) },
    },
    pending_choices: {},
    _migrated: true,
    _unmatched: unmatched,
  };
}

// Removes fields the browser must never see. session.game_over is one of
// them: the client learns a game ended from the 409 GAME_OVER code on its
// next turn attempt, not by reading this flag out of the state.
function stripServerFields(state) {
  if (!state) return state;
  const { pending_choices, session, ...rest } = state;
  void pending_choices;
  const sessionRest = { ...(session || {}) };
  delete sessionRest.game_over;
  const meta = { ...(rest.meta || {}) };
  delete meta._legacy;
  return { ...rest, meta, session: sessionRest };
}

/**
 * load(db, sessionId) — returns the full (server-shape) state, migrating a
 * legacy save in place if needed. Returns null if the session has no saved
 * state yet.
 */
function load(db, sessionId) {
  const row = dbApi.getGameState(db, sessionId);
  if (!row) return null;
  let parsed;
  try {
    parsed = JSON.parse(row.state_json);
  } catch (_) {
    return null;
  }
  if (parsed && parsed.schema_version === SCHEMA_VERSION) {
    const state = { pending_choices: {}, ...parsed };
    if (state.campaign) {
      state.campaign = {
        ...state.campaign,
        adventure_id: resolveAdventureId(state.campaign.adventure_id),
        current_scene_id: resolveSceneId(state.campaign.current_scene_id),
        visited_scene_ids: Array.isArray(state.campaign.visited_scene_ids)
          ? state.campaign.visited_scene_ids.map(resolveSceneId)
          : state.campaign.visited_scene_ids,
      };
    }
    if (state.character && Array.isArray(state.character.inventory)) {
      state.character = { ...state.character, inventory: state.character.inventory.map(resolveItemName) };
    }
    return state;
  }
  return migrateLegacyState(parsed || {});
}

/**
 * commit(db, sessionId, state) — writes the full (server-shape) state back,
 * bumping game_state.version.
 */
function commit(db, sessionId, state) {
  const toSave = { ...state, schema_version: SCHEMA_VERSION };
  return dbApi.saveGameStateVersioned(db, sessionId, JSON.stringify(toSave));
}

module.exports = {
  load, commit, stripServerFields, migrateLegacyState, SCHEMA_VERSION,
  ADVENTURE_ID_ALIASES, RULES_ID_ALIASES, SCENE_ID_ALIASES, ITEM_NAME_ALIASES,
  resolveAdventureId, resolveRulesId, resolveSceneId, resolveItemName,
};
