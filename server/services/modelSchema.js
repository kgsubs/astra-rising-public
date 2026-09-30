'use strict';

// ─── Model output schema (protocol v2) ─────────────────────────────────────────
// Extracts, repairs, sanitizes and validates the model's JSON reply. The
// model never supplies a number that matters: any dice/target/success/delta
// field it sends is dropped here and logged, never applied.

const CODE_FENCE_RE = /^```[a-zA-Z]*\n?|```\s*$/g;

// Field names the model must never be trusted for. Present anywhere in the
// top-level object, they are stripped and reported, never applied.
const BANNED_FIELD_RE = /^(dice_rolls|roll|target|success|state_updates|combat_state_update|.*_delta)$/;

const HAZARD_SEVERITIES = new Set(['minor', 'moderate', 'severe']);
const HEALING_KINDS = new Set(['stimdose', 'first_aid', 'rest_day']);
const CREDIT_KINDS = new Set(['reward', 'purchase', 'payment', 'sale']);
const CREDIT_TIERS = new Set(['token', 'small', 'medium', 'large', 'fortune']);
const COMBAT_THREATS = new Set(['minion', 'soldier', 'elite', 'boss']);
const COMBAT_END_KINDS = new Set(['victory', 'fled', 'surrender']);
const HOSTILE_ACTION_KINDS = new Set(['attack', 'hold', 'flee', 'surrender', 'finish']);
const CHECK_KINDS = new Set(['skill', 'ability', 'attack', 'none']);
const CHECK_TIERS = new Set(['easy', 'standard', 'hard']);

// Sentences that name a mechanic the model was never shown (a stray number
// leaking through, or the model narrating a rule it should not reference).
// Ported from app.js sanitizeNarrative (SECTION 6).
const MECH_PATTERNS = [
  /\bd\d+\b/i,
  /\brolled?\s+\d+\b/i,
  /\btarget\s+(number\s+)?of\s+\d+/i,
  /\b\d+\s*%\s*(chance|target|check|roll)/i,
  /\((\d+)\s*vs\.?\s*(\d+)\)/i,
  /\bskill\s+check\s+(succeed|fail|pass)/i,
  /\b(succeed|fail|pass)s?\s+(?:the|a)?\s*(?:skill\s+)?check/i,
  /check\s+target/i,
  /\broll\s+(d\d+|against|under|over)\b/i,
  /\binitiative\s+(modifier|roll|score)\b/i,
  /\bSTA\s+threshold/i,
  /target\s+number\b/i,
];

function sanitizeNarrative(text) {
  if (!text || typeof text !== 'string') return text;
  const paragraphs = text.split(/(\n+)/);
  const cleaned = paragraphs.map(chunk => {
    if (/^\n+$/.test(chunk)) return chunk;
    const sentences = chunk.split(/(?<=[.!?])\s+/);
    const kept = sentences.filter(s => !MECH_PATTERNS.some(re => re.test(s)));
    return kept.join(' ').trim();
  }).filter(chunk => chunk !== '' || /^\n+$/.test(chunk));
  const result = cleaned.join('').trim();
  return result || text;
}

// Extracts the JSON object from a raw model reply: strips code fences, then
// takes the substring between the first "{" and the last "}".
function extractJSONText(rawText) {
  if (typeof rawText !== 'string') return '';
  const stripped = rawText.replace(CODE_FENCE_RE, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return stripped;
  return stripped.slice(start, end + 1);
}

// Ported from app.js repairTruncatedJSON (SECTION 7b), adapted to the v2
// field names. Salvages the narrative (present even in heavily truncated
// output) plus choices and scene_summary when they serialized cleanly
// before the cutoff. A repaired turn keeps the story and applies no
// mechanics (resolveTurn treats `checks: []` as nothing declared).
function repairTruncatedJSON(str) {
  const narrativeMatch = str.match(/"narrative"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (!narrativeMatch) return null;
  const narrative = narrativeMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');

  let choices = [];
  try {
    const choicesMatch = str.match(/"choices"\s*:\s*(\[[\s\S]*?\])/);
    if (choicesMatch) choices = JSON.parse(choicesMatch[1]);
  } catch (_) { /* leave choices empty */ }

  let scene_summary = '';
  const summaryMatch = str.match(/"scene_summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (summaryMatch) scene_summary = summaryMatch[1];

  return {
    narrative,
    checks: [],
    hostile_actions: [],
    hazard: null,
    healing: null,
    xp_awards: [],
    credits: null,
    combat: null,
    story_updates: emptyStoryUpdates(),
    choices,
    scene_change: false,
    scene_header: null,
    scene_summary,
    ooc_note: null,
    tooltip_terms: [],
    _repaired: true,
  };
}

function emptyStoryUpdates() {
  return {
    status_add: [], status_remove: [], inventory_add: [], inventory_remove: [],
    npc_updates: [], faction_updates: [], journal_entry: null, scene_id: null,
  };
}

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

// Strips banned fields (present anywhere at the top level) and normalizes
// every other field to the shape resolveTurn.js expects, dropping anything
// that fails its enum check rather than trusting it.
function normalize(raw) {
  const ignoredFields = [];
  const out = {};

  for (const key of Object.keys(raw || {})) {
    if (BANNED_FIELD_RE.test(key)) ignoredFields.push(key);
  }

  out.narrative = typeof raw.narrative === 'string' ? raw.narrative : '';
  out.ooc_note = typeof raw.ooc_note === 'string' && raw.ooc_note.trim() ? raw.ooc_note : null;

  out.checks = asArray(raw.checks)
    .filter(c => c && typeof c.row === 'string')
    .map(c => ({
      row: c.row,
      tier: CHECK_TIERS.has(c.tier) ? c.tier : null,
      target_id: typeof c.target_id === 'string' ? c.target_id : null,
      outcome_seen: typeof c.outcome_seen === 'string' ? c.outcome_seen : null,
    }));
  void CHECK_KINDS; // reserved for a future stricter check-kind validation

  out.hostile_actions = asArray(raw.hostile_actions)
    .filter(h => h && typeof h.id === 'string' && HOSTILE_ACTION_KINDS.has(h.action))
    .map(h => ({ id: h.id, action: h.action }));

  out.hazard = (raw.hazard && HAZARD_SEVERITIES.has(raw.hazard.severity))
    ? { severity: raw.hazard.severity } : null;

  out.healing = HEALING_KINDS.has(raw.healing) ? raw.healing : null;

  out.xp_awards = asArray(raw.xp_awards).filter(k => typeof k === 'string');

  out.credits = (raw.credits && CREDIT_KINDS.has(raw.credits.kind) && CREDIT_TIERS.has(raw.credits.tier))
    ? { kind: raw.credits.kind, tier: raw.credits.tier, item: typeof raw.credits.item === 'string' ? raw.credits.item : null }
    : null;

  out.combat = null;
  const rawStart = raw.combat && raw.combat.start;
  const startList = Array.isArray(rawStart) ? rawStart : (rawStart && typeof rawStart === 'object' ? [rawStart] : null);
  if (startList) {
    // Threat is lowercased and an unknown tier becomes 'soldier', so a model
    // that writes "Minion" still starts the fight; a nameless entry is dropped
    // and recorded.
    const kept = startList
      .filter(e => e && typeof e.name === 'string' && e.name.trim())
      .slice(0, 4)
      .map(e => {
        const t = typeof e.threat === 'string' ? e.threat.toLowerCase() : '';
        return { name: e.name.trim(), threat: COMBAT_THREATS.has(t) ? t : 'soldier' };
      });
    if (kept.length < startList.length) ignoredFields.push('combat.start[dropped]');
    out.combat = { start: kept };
  } else if (raw.combat && COMBAT_END_KINDS.has(raw.combat.end)) {
    out.combat = { end: raw.combat.end };
  }

  const su = raw.story_updates || {};
  out.story_updates = {
    status_add: asArray(su.status_add).filter(s => typeof s === 'string'),
    status_remove: asArray(su.status_remove).filter(s => typeof s === 'string'),
    inventory_add: asArray(su.inventory_add).filter(s => typeof s === 'string'),
    inventory_remove: asArray(su.inventory_remove).filter(s => typeof s === 'string'),
    npc_updates: asArray(su.npc_updates).filter(n => n && typeof n.name === 'string'),
    faction_updates: asArray(su.faction_updates).filter(f => f && typeof f.name === 'string' && (f.standing === 'up' || f.standing === 'down')),
    journal_entry: typeof su.journal_entry === 'string' && su.journal_entry.trim() ? su.journal_entry : null,
    scene_id: typeof su.scene_id === 'string' && su.scene_id.trim() ? su.scene_id : null,
  };

  out.choices = asArray(raw.choices)
    .filter(c => c && typeof c.id === 'string' && typeof c.text === 'string')
    .slice(0, 4)
    .map(c => ({
      id: c.id,
      text: c.text,
      action_type: typeof c.action_type === 'string' ? c.action_type : 'other',
      check: (c.check && CHECK_KINDS.has(c.check.kind)) ? {
        kind: c.check.kind,
        key: typeof c.check.key === 'string' ? c.check.key : null,
        tier: CHECK_TIERS.has(c.check.tier) ? c.check.tier : 'standard',
        target_id: typeof c.check.target_id === 'string' ? c.check.target_id : null,
      } : null,
    }));

  out.scene_change = raw.scene_change === true;
  out.scene_header = typeof raw.scene_header === 'string' ? raw.scene_header : null;
  out.scene_summary = typeof raw.scene_summary === 'string' ? raw.scene_summary : '';
  out.tooltip_terms = asArray(raw.tooltip_terms).filter(t => t && typeof t.term === 'string');
  out._repaired = raw._repaired === true;

  return { data: out, ignoredFields };
}

/**
 * parseModelOutput(rawText) → { ok, repaired, data, ignoredFields, error }
 *
 * `data` is null only when ok is false. A repaired (truncated) answer comes
 * back ok:true, repaired:true, with an empty `checks` array, so
 * resolveTurn.js applies no mechanics for it (matching today's `_repaired`
 * behavior).
 */
function parseModelOutput(rawText) {
  const jsonText = extractJSONText(rawText);
  let raw = null;
  let repaired = false;

  try {
    raw = JSON.parse(jsonText);
  } catch (_) {
    raw = repairTruncatedJSON(jsonText) || repairTruncatedJSON(rawText || '');
    repaired = !!raw;
  }

  if (!raw || typeof raw !== 'object') {
    return { ok: false, repaired: false, data: null, ignoredFields: [], error: 'Could not parse a JSON reply.' };
  }

  const hasNarrative = typeof raw.narrative === 'string' && raw.narrative.trim().length > 0;
  const hasOoc = typeof raw.ooc_note === 'string' && raw.ooc_note.trim().length > 0;
  if (!hasNarrative && !hasOoc) {
    return { ok: false, repaired, data: null, ignoredFields: [], error: 'Reply has no narrative or ooc_note.' };
  }

  const { data, ignoredFields } = normalize(raw);
  data.narrative = sanitizeNarrative(data.narrative);
  data._repaired = repaired || data._repaired;

  return { ok: true, repaired: data._repaired, data, ignoredFields, error: null };
}

// Neuters every mechanical field on an already-normalized output: "Ask GM:"
// turns get no outcome sheet (buildEmptySheet already blocks row- and
// initiative-based mechanics structurally), but nothing stops the model
// itself from filling in hazard/healing/xp_awards/credits/combat/story_updates
// anyway. This is the belt to that sheet's suspenders, so an Ask GM turn
// changes nothing but the chat log and the turn counter, regardless of what
// the model sends. narrative, ooc_note and choices are untouched — those are
// the whole point of an Ask GM reply.
function stripMechanics(data) {
  return {
    ...data,
    checks: [],
    hostile_actions: [],
    hazard: null,
    healing: null,
    xp_awards: [],
    credits: null,
    combat: null,
    story_updates: emptyStoryUpdates(),
    scene_change: false,
    scene_header: null,
  };
}

module.exports = {
  parseModelOutput,
  sanitizeNarrative,
  extractJSONText,
  repairTruncatedJSON,
  normalize,
  stripMechanics,
};
