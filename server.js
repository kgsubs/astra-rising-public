'use strict';

require('dotenv').config();

const express = require('express');
const path    = require('path');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const dbApi = require('./db');
const { initDb, createSession, getSession, saveMessage, getMessages, getGameState, saveActiveModules, getActiveModules,
        generateSaveCode, getSessionByCode, ensureSaveCode, formatSaveCode,
        getTurnLog, insertPendingTurn, resolveTurnLogRow, clearTurnLogResultsAfter, getRecentResolvedTurnLog,
        createSnapshot, getSnapshots, getSnapshotById, deleteSnapshot, clearSessionHistory } = dbApi;
const { configuredProviders, toChatBody, providerStatus, quotaDay, nextQuotaReset } = require('./server/services/aiProviders');
const { loadRules, getRulesCache, getLoadedIds, rulesReady } = require('./server/ruleLoader');
const { resolveRulesId } = require('./server/services/stateStore');
const { selectProvider, consumeProviderStream } = require('./server/services/providerChain');
const { getDice } = require('./server/services/dice');
const { buildSheet, buildEmptySheet, dropMismatchedPinnedRow, renderSheet } = require('./server/services/outcomeSheet');
const { resolveTurn } = require('./server/services/resolveTurn');
const { parseModelOutput, stripMechanics } = require('./server/services/modelSchema');
const { buildTurnPrompt, buildSessionZeroPrompt, buildSessionZeroUserMessage, buildCompressPrompt, buildHistoryMessages } = require('./server/services/promptBuilder');
const stateStore = require('./server/services/stateStore');
const { getCharacter, getAdventureLibraryEntry, getAdventureModule, getScene } = require('./server/services/gameData');
const houseRules = require('./server/data/house_rules.json');
const outcomeLines = require('./server/data/outcome_lines.json');

// ─── Configuration ────────────────────────────────────────────────────────────

const PORT    = parseInt(process.env.PORT, 10) || 3500;
const DB_PATH = process.env.DB_PATH || './astra_rising.db';

// Rate limit configuration — defaults are production values; overridable via
// env vars so tests can set a low ceiling without modifying source code.
const RATE_LIMIT_MAX       = parseInt(process.env.RATE_LIMIT_MAX, 10)       || 100;
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60 * 60 * 1000;

// Session creation rate limit — keyed on client IP to prevent DB exhaustion.
const SESSION_RATE_LIMIT_MAX       = parseInt(process.env.SESSION_RATE_LIMIT_MAX, 10)       || 20;
const SESSION_RATE_LIMIT_WINDOW_MS = parseInt(process.env.SESSION_RATE_LIMIT_WINDOW_MS, 10) || 60 * 60 * 1000;

// How long a provider may stay silent before the turn is abandoned. Measured
// from the request, then re-armed on every streamed chunk, so a long
// generation is fine and only a stalled one is cut. Kept short because the
// player is watching a spinner until it fires: first bytes normally arrive in
// well under a second, so 20s is already far outside normal.
const TURN_TIMEOUT_MS = parseInt(process.env.AI_TURN_TIMEOUT_MS, 10) || 20000;

// ─── Database ─────────────────────────────────────────────────────────────────

// initDb is called once at startup; DB_PATH may be ':memory:' in tests.
const db = initDb(DB_PATH);

// ─── Rules ────────────────────────────────────────────────────────────────────

// Load rule files at module init time so they are available synchronously in
// all request handlers. Failures are logged but do not crash the server.
loadRules();

// ─── Express app ──────────────────────────────────────────────────────────────

const app = express();
// Body limits are per-route: the routes that used to need a raised limit
// (the old browser-driven chat relay and state PUT) are retired to 410 below
// and never read their body, so only the default limit remains.
app.use(express.json());

// Malformed or oversized bodies get a JSON answer the client can show, not an
// HTML error page.
app.use((err, _req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'That request is too large.' });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON in request body.' });
  }
  return next(err);
});

app.disable('x-powered-by');
// index.html ships an inline <script> (window.react = window.React) and an
// inline <style> block; helmet's default Content-Security-Policy would block
// both without a nonce or a hash, which means restructuring the page, out of
// scope here. Every other helmet protection (frame options, nosniff, referrer
// policy, HSTS, etc.) stays on.
app.use(helmet({ contentSecurityPolicy: false }));

// Behind nginx the client IP arrives in X-Forwarded-For; without this every
// player shares one rate-limit bucket. Off by default so a directly exposed
// server cannot be spoofed through the header.
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', parseInt(process.env.TRUST_PROXY, 10) || 1);
}

// Vendor files are immutable (filenames don't change) — cache for 1 year.
app.use('/vendor', express.static(path.join(__dirname, 'public/vendor'), {
  maxAge: '1y',
  immutable: true,
}));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/api/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

// ─── Rules endpoints ─────────────────────────────────────────────────────────
// IMPORTANT: specific paths must be registered BEFORE generic /:id and /:id/:section
// routes so Express matches them correctly.

function toTitleCase(str) {
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// GET /api/rules, master index + loaded ids
app.get('/api/rules', (_req, res) => {
  const cache      = getRulesCache();
  const masterData = cache['master_index'] || {};
  const loadedIds  = getLoadedIds();
  return res.json({ ...masterData, loaded_rulesets: loadedIds });
});

// ─── Convenience endpoints (must come before /:id and /:id/:section) ─────────

// GET /api/rules/combat/quick-ref
app.get('/api/rules/combat/quick-ref', (_req, res) => {
  const cache    = getRulesCache();
  const basic    = cache['core_basic'];
  const expanded = cache['core_expanded'];
  if (!basic || !expanded) {
    return res.status(503).json({ error: 'Rule files not loaded.' });
  }
  return res.json({
    quick_checks:       basic.ai_reference?.quick_checks           || {},
    advanced_modifiers: expanded.combat_expanded?.advanced_modifiers || {},
  });
});

// GET /api/rules/skills
app.get('/api/rules/skills', (_req, res) => {
  const cache = getRulesCache();
  const basic = cache['core_basic'];
  const zeb   = cache['korvaths_guide'];
  if (!basic) return res.status(503).json({ error: 'Rule files not loaded.' });

  const coreSkills     = basic.skills?.core_skills  || {};
  const expandedSkills = zeb?.expanded_skill_system || {};

  // Flatten Korvath's Guide nested PSA structure into a flat object; Korvath's Guide wins on conflict
  const zebFlat = {};
  for (const psa of ['military_skills', 'technological_skills', 'biosocial_skills']) {
    const group = expandedSkills[psa] || {};
    for (const [name, data] of Object.entries(group)) {
      zebFlat[name] = data;
    }
  }

  return res.json({ ...coreSkills, ...zebFlat });
});

// GET /api/rules/equipment/weapons
app.get('/api/rules/equipment/weapons', (_req, res) => {
  const cache    = getRulesCache();
  const basic    = cache['core_basic'];
  const expanded = cache['core_expanded'];
  if (!basic || !expanded) {
    return res.status(503).json({ error: 'Rule files not loaded.' });
  }
  return res.json({
    basic_ranged: basic.combat?.ranged_weapons  || {},
    basic_melee:  basic.combat?.melee_weapons   || {},
    expanded:     expanded.equipment?.weapons   || {},
  });
});

// GET /api/rules/equipment/armor
app.get('/api/rules/equipment/armor', (_req, res) => {
  const cache    = getRulesCache();
  const expanded = cache['core_expanded'];
  if (!expanded) return res.status(503).json({ error: 'Rule files not loaded.' });
  return res.json(expanded.equipment?.armor || {});
});

// GET /api/rules/optional-modules
app.get('/api/rules/optional-modules', (_req, res) => {
  const cache     = getRulesCache();
  const gammaDawn = cache['gamma_rising'];
  if (!gammaDawn) return res.status(503).json({ error: 'Rule files not loaded.' });

  const META_KEYS = new Set(['ruleset', 'alternate_combat', 'variant_races', 'environmental_hazards', 'ai_reference']);
  const modules = Object.keys(gammaDawn)
    .filter(k => !META_KEYS.has(k))
    .map(k => ({
      id:            `gamma_${k}`,
      name:          toTitleCase(k),
      json_section:  k,
      default_state: 'disabled',
    }));

  return res.json({ modules });
});

// GET /api/rules/character/:race (has :param but must come before /:id/:section)
app.get('/api/rules/character/:race', (req, res) => {
  const race  = req.params.race.toLowerCase();
  const cache = getRulesCache();
  const basic = cache['core_basic'];
  const zeb   = cache['korvaths_guide'];
  if (!basic) return res.status(503).json({ error: 'Rule files not loaded.' });

  const basicRace = basic.character_creation?.races?.[race];
  const zebRace   = zeb?.new_races?.[race];

  if (!basicRace && !zebRace) {
    return res.status(404).json({ error: `Race "${race}" not found.` });
  }

  return res.json({ ...(basicRace || {}), ...(zebRace ? { korvaths_guide_data: zebRace } : {}) });
});

// ─── GET /api/rules/:id/:section (generic, after all specific paths) ─────────
app.get('/api/rules/:id/:section', (req, res) => {
  const { section } = req.params;
  const id = resolveRulesId(req.params.id);

  const cache = getRulesCache();
  if (!cache[id]) {
    return res.status(404).json({ error: `Ruleset "${id}" not found.` });
  }

  const data = cache[id];
  if (!(section in data)) {
    return res.status(404).json({ error: `Section "${section}" not found in ruleset "${id}".` });
  }

  return res.json(data[section]);
});

// ─── GET /api/rules/:id (generic, after all specific paths) ──────────────────
app.get('/api/rules/:id', (req, res) => {
  const id = resolveRulesId(req.params.id);

  const cache = getRulesCache();
  if (!cache[id]) {
    return res.status(404).json({ error: `Ruleset "${id}" not found.` });
  }

  return res.json(cache[id]);
});

// ─── Rate limiter ────────────────────────────────────────────────────────────

// Keyed on the session token so each player has their own independent bucket.
// Applied only to /api/chat — session management and state endpoints are exempt.
const chatRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,  // Return RateLimit-* headers
  legacyHeaders: false,
  // Use the session token as the rate-limit key rather than the client IP.
  // The token is already validated earlier in the handler; if somehow absent
  // here we fall back to IP so the request is still rejected cleanly.
  keyGenerator: (req) => req.headers['x-session-token'] || req.ip,
  handler: (_req, res) => {
    res.status(429).json({
      error: `Rate limit exceeded. ${RATE_LIMIT_MAX} requests per hour per session.`
    });
  },
});

// Keyed on client IP — prevents a single host from creating unlimited sessions
// and exhausting DB/disk storage.
const sessionCreateLimiter = rateLimit({
  windowMs: SESSION_RATE_LIMIT_WINDOW_MS,
  max: SESSION_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Too many sessions created from this address. Try again later.' });
  },
});

// Keyed on client IP, independent of the per-session limiter above, a single
// address rotating through fresh sessions would otherwise dodge the per-session
// cap entirely and still run the relay unbounded.
const IP_CHAT_LIMIT_MAX       = parseInt(process.env.IP_RATE_LIMIT_MAX, 10)       || 150;
const IP_CHAT_LIMIT_WINDOW_MS = parseInt(process.env.IP_RATE_LIMIT_WINDOW_MS, 10) || 60 * 60 * 1000;
const ipChatRateLimiter = rateLimit({
  windowMs: IP_CHAT_LIMIT_WINDOW_MS,
  max: IP_CHAT_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: (_req, res) => {
    res.status(429).json({ error: `Rate limit exceeded. ${IP_CHAT_LIMIT_MAX} requests per hour per address.` });
  },
});

// A day-long window per session, on top of the hourly per-session cap, closes
// the gap where a session sits just under the hourly limit for 24 hours straight.
const SESSION_DAILY_LIMIT_MAX       = parseInt(process.env.SESSION_DAILY_RATE_LIMIT_MAX, 10)       || 300;
const SESSION_DAILY_LIMIT_WINDOW_MS = parseInt(process.env.SESSION_DAILY_RATE_LIMIT_WINDOW_MS, 10) || 24 * 60 * 60 * 1000;
const sessionDailyRateLimiter = rateLimit({
  windowMs: SESSION_DAILY_LIMIT_WINDOW_MS,
  max: SESSION_DAILY_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers['x-session-token'] || req.ip,
  handler: (_req, res) => {
    res.status(429).json({ error: `Rate limit exceeded. ${SESSION_DAILY_LIMIT_MAX} requests per day per session.` });
  },
});

// The session token traditionally travels in the URL on these routes; the
// X-Session-Token header (already used by /api/chat) is now accepted too, and
// preferred, so a token need not sit in server logs or browser history.
function resolveSessionToken(req) {
  return req.headers['x-session-token'] || req.params.token;
}

const SAVE_STATE_RATE_LIMIT_MAX       = parseInt(process.env.SAVE_STATE_RATE_LIMIT_MAX, 10)       || 200;
const SAVE_STATE_RATE_LIMIT_WINDOW_MS = parseInt(process.env.SAVE_STATE_RATE_LIMIT_WINDOW_MS, 10) || 60 * 60 * 1000;
const saveStateRateLimiter = rateLimit({
  windowMs: SAVE_STATE_RATE_LIMIT_WINDOW_MS,
  max: SAVE_STATE_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => resolveSessionToken(req) || req.ip,
  handler: (_req, res) => {
    res.status(429).json({ error: `Rate limit exceeded. ${SAVE_STATE_RATE_LIMIT_MAX} saves per hour per session.` });
  },
});

const MODULE_RATE_LIMIT_MAX       = parseInt(process.env.MODULE_RATE_LIMIT_MAX, 10)       || 60;
const MODULE_RATE_LIMIT_WINDOW_MS = parseInt(process.env.MODULE_RATE_LIMIT_WINDOW_MS, 10) || 60 * 60 * 1000;
const moduleRateLimiter = rateLimit({
  windowMs: MODULE_RATE_LIMIT_WINDOW_MS,
  max: MODULE_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => resolveSessionToken(req) || req.ip,
  handler: (_req, res) => {
    res.status(429).json({ error: `Rate limit exceeded. ${MODULE_RATE_LIMIT_MAX} requests per hour per session.` });
  },
});

// ─── Free-tier quota ──────────────────────────────────────────────────────────

// Current state of every configured provider, most-preferred first.
function quotaSnapshot(now = Date.now()) {
  const providers = configuredProviders();
  const statuses  = providers.map(p => providerStatus(db, dbApi, p, now));
  const active    = statuses.find(s => s.available) || null;
  // When everything is out, the player can play again at the earliest reset.
  const resetAt   = statuses.length
    ? Math.min(...statuses.map(s => s.resetAt))
    : nextQuotaReset(now);

  return {
    active,
    providers: statuses,
    exhausted: statuses.length > 0 && !active,
    configured: statuses.length > 0,
    resetAt,
    now,
  };
}

// Payload sent when no provider can serve the turn. A wait of minutes is a
// burst limit the player should retry through; a longer one is the day's
// budget, and the client says when play resumes. resetAt is an epoch
// timestamp so it can be rendered in the player's own timezone.
function exhaustedPayload(snapshot, now = Date.now()) {
  const waitMs = Math.max(0, snapshot.resetAt - now);
  const shortWait = waitMs <= SHORT_BLOCK_MS;
  return {
    error: shortWait ? 'The AI is rate-limited right now.' : 'Daily free AI quota is used up.',
    code: shortWait ? 'PROVIDER_BUSY' : 'QUOTA_EXHAUSTED',
    resetAt: snapshot.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil(waitMs / 1000)),
    quota: snapshot,
  };
}

// A per-minute 429 must not cost the player the rest of the day, so an
// unexplained 429 benches the provider for minutes, not until midnight.
const SHORT_BLOCK_MS = 5 * 60 * 1000;

// Providers disagree on where the retry hint lives: Groq sends retry-after,
// Gemini buries a RetryInfo entry in the error body.
function retryHintMs(response, errBody) {
  const header = parseInt(response.headers.get('retry-after'), 10);
  if (Number.isFinite(header) && header > 0) return header * 1000;
  const details = errBody && errBody.error && errBody.error.details;
  if (Array.isArray(details)) {
    for (const d of details) {
      const delay = d && d.retryDelay;
      if (typeof delay === 'string' && /^\d+(\.\d+)?s$/.test(delay)) {
        return Math.ceil(parseFloat(delay) * 1000);
      }
    }
  }
  return null;
}

// Only a message that names a *daily* limit justifies blocking until reset.
function isDailyLimit(errBody) {
  const text = JSON.stringify(errBody || {}).toLowerCase();
  return text.includes('per day') || text.includes('perday') || text.includes('daily');
}

function markProviderBlocked(provider, response, errBody, now = Date.now()) {
  const hint = retryHintMs(response, errBody);
  const until = hint !== null
    ? now + hint
    : (isDailyLimit(errBody) ? nextQuotaReset(now) : now + SHORT_BLOCK_MS);
  dbApi.setBlockedUntil(db, provider.id, quotaDay(now), until);
  console.warn(`[quota] ${provider.id} returned 429 — blocked until ${new Date(until).toISOString()}`);
}

function meterUsage(provider, tokens, requests = 0, inputTokens = 0, outputTokens = 0) {
  try {
    dbApi.recordUsage(db, provider.id, quotaDay(), tokens, requests, inputTokens, outputTokens);
  } catch (e) {
    console.warn('[quota] failed to record usage:', e.message);
  }
}

// Normalizes the provider's usage block (OpenAI shape, or Groq's x_groq
// wrapper) into totals we can price. Falls back to a character estimate split
// between the prompt we sent and the text that came back.
function usageBreakdown(usage, chatBody, outputText) {
  const input  = usage && usage.prompt_tokens;
  const output = usage && usage.completion_tokens;
  if (Number.isFinite(input) && Number.isFinite(output)) {
    return { input, output, total: (usage.total_tokens || input + output) };
  }
  const estInput  = Math.ceil((chatBody.messages || []).reduce((n, m) => n + (m.content || '').length, 0) / 4);
  const estOutput = Math.ceil((outputText || '').length / 4);
  const total = usage && usage.total_tokens ? usage.total_tokens : estInput + estOutput;
  return { input: estInput, output: estOutput, total };
}

// ─── GET /api/quota — remaining free-tier budget ──────────────────────────────

app.get('/api/quota', (_req, res) => {
  res.json(quotaSnapshot());
});

// ─── POST /api/chat — AI provider proxy ───────────────────────────────────────

// Retired: the browser used to build prompts and talk to a provider
// directly through this route. POST /api/turn is the only way a turn is
// resolved now — the server rolls its own dice and builds its own prompt,
// so a client-driven relay could never be trusted anyway. The route stays,
// returning 410, so an old client still gets a clear message instead of a
// generic connection failure.
app.post('/api/chat', (_req, res) => {
  return res.status(410).json({
    code: 'ENDPOINT_RETIRED',
    error: 'This game has updated. Reload the page to keep playing.',
  });
});

// ─── POST /api/session, create new session ───────────────────────────────────

app.post('/api/session', sessionCreateLimiter, (req, res) => {
  const token    = uuidv4();
  const saveCode = generateSaveCode(db);
  createSession(db, token, saveCode);
  return res.status(201).json({ token, save_code: saveCode, save_code_display: formatSaveCode(saveCode) });
});

// The choices offered by the last resolved turn — resend-able on resume so
// the player picks up exactly where the turn's astra_turn response left
// them (WU app.js reads this back out of state_json as `_autoChoices`).
function lastChoices(sessionId) {
  const row = db.prepare(
    "SELECT result_json FROM turn_log WHERE session_id = ? AND status = 'resolved' ORDER BY turn DESC LIMIT 1"
  ).get(sessionId);
  if (!row) return [];
  try {
    const result = JSON.parse(row.result_json);
    return Array.isArray(result.choices) ? result.choices : [];
  } catch (_) {
    return [];
  }
}

// state_json is the server-owned, stripped state (schema_version 2,
// migrated lazily if the save predates it), plus `choices` and
// `state_version` alongside it. The
// choices are also folded into state_json as `_autoChoices`, the field the
// existing client already reads on load, so no other frontend change was
// needed to carry them across a resume.
// db.js stores messages in the {role: 'user'|'assistant', content, timestamp}
// shape /api/turn writes; the client's display shape is
// {id, role: 'player'|'dm', content, timestamp} (SECTION 13's `messages`
// state in useDMTurn). Embedded into state_json (alongside _autoChoices) so
// a reload rebuilds the same conversation the server-owned state describes.
function clientShapedMessages(sessionId) {
  return getMessages(db, sessionId).map(m => ({
    id: String(m.id),
    role: m.role === 'assistant' ? 'dm' : 'player',
    content: m.content,
    timestamp: m.timestamp,
  }));
}

function hasResolvedTurns(sessionId) {
  return !!db.prepare("SELECT 1 FROM turn_log WHERE session_id = ? AND status = 'resolved' LIMIT 1").get(sessionId);
}

function buildSessionPayload(session) {
  const state = stateStore.load(db, session.id);
  const gameStateRow = getGameState(db, session.id);
  // A migrated save that has never played a protocol-v2 turn has nothing in
  // turn_log yet; its history instead comes from what stateStore.js carried
  // through from the old client's own embedded messages/_autoChoices
  // (state.meta._legacy), display text only, never the old raw JSON.
  const playedV2 = hasResolvedTurns(session.id);
  const legacy = (state && state.meta && state.meta._legacy) || { messages: [], choices: [] };
  const choices = playedV2 ? lastChoices(session.id) : legacy.choices;
  const messages = playedV2 ? clientShapedMessages(session.id) : legacy.messages;
  const stateJson = state
    ? JSON.stringify({ ...stateStore.stripServerFields(state), messages, _autoChoices: choices })
    : null;
  return {
    token: session.user_token,
    state_json: stateJson,
    messages: playedV2 ? getMessages(db, session.id) : legacy.messages,
    choices,
    state_version: gameStateRow ? gameStateRow.version : 0,
  };
}

// ─── POST /api/session/resume — continue a game from a save code ──────────────

// The save code is short enough to type by hand, so it is guessable in a way a
// UUID is not; the same IP limiter that guards session creation caps how fast
// codes can be tried.
app.post('/api/session/resume', sessionCreateLimiter, (req, res) => {
  const session = getSessionByCode(db, req.body && req.body.code);
  if (!session) {
    return res.status(404).json({ error: 'No saved game found for that code.' });
  }

  return res.json({
    ...buildSessionPayload(session),
    save_code: session.save_code,
    save_code_display: formatSaveCode(session.save_code),
  });
});

// ─── GET /api/session/:token, restore session ────────────────────────────────

app.get('/api/session/:token', (req, res) => {
  const session = getSession(db, req.params.token);
  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  const saveCode = ensureSaveCode(db, session);
  return res.json({
    ...buildSessionPayload(session),
    save_code: saveCode,
    save_code_display: formatSaveCode(saveCode),
  });
});

// ─── PUT /api/session/:token/state, save game state ──────────────────────────
// Retired: the server is the only writer of game state now (POST /api/turn
// and the /api/game/* endpoints commit it). The browser no longer PUTs its
// own copy, so this route only ever needs to return 410; no rate limiter is
// wired to it.

app.put('/api/session/:token/state', (req, res) => {
  return res.status(410).json({
    code: 'STATE_IS_SERVER_OWNED',
    error: 'Game state is saved by the server now. Reload the page to keep playing.',
  });
});

// ─── POST /api/session/:token/modules, set active optional modules ──────────

app.post('/api/session/:token/modules', moduleRateLimiter, (req, res) => {
  const session = getSession(db, resolveSessionToken(req));
  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  const { modules } = req.body;
  if (!Array.isArray(modules)) {
    return res.status(400).json({ error: 'modules must be an array of strings.' });
  }

  // Validate: only allow known Gamma Rising module IDs. GET /api/rules/optional-modules
  // advertises these with a `gamma_` prefix, so both spellings are accepted and
  // stored unprefixed; rejecting the id the API itself hands out is a trap.
  const VALID_MODULES = new Set(['psionics', 'mutations', 'cybernetics', 'reputation_system', 'alternate_combat', 'variant_races', 'environmental_hazards']);
  const normalised = modules.map(m => (typeof m === 'string' && m.startsWith('gamma_') ? m.slice(6) : m));
  const invalid = normalised.filter(m => typeof m !== 'string' || !VALID_MODULES.has(m));
  if (invalid.length > 0) {
    return res.status(400).json({ error: `Unknown module(s): ${invalid.join(', ')}` });
  }

  try {
    saveActiveModules(db, session.id, normalised);
  } catch (dbErr) {
    console.error('[db] Failed to save active modules:', dbErr.message);
    return res.status(500).json({ error: 'Failed to persist modules.' });
  }

  return res.json({ ok: true, active_modules: normalised });
});

// ─── GET /api/session/:token/modules, get active optional modules ───────────

app.get('/api/session/:token/modules', moduleRateLimiter, (req, res) => {
  const session = getSession(db, resolveSessionToken(req));
  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  const activeModules = getActiveModules(db, session.id);
  return res.json({ active_modules: activeModules });
});

// ─── Protocol v2: server-authoritative turns ──────────────────────────────────
// The server is the sole authority over game state from here on: it rolls
// its own dice and applies its own rules, and only asks the AI provider to
// narrate against the outcome sheet it built. PUT /api/session/:token/state
// and POST /api/chat, the endpoints the pre-v2 client used to write and
// fetch state itself, are retired (410) above.

const X_ASTRA_PROTOCOL = '2';

// Every choice id this server itself ever mints is "c" + a small integer
// (modelSchema.js normalizes choices but does not constrain their id's
// shape), so an incoming choice_id this far outside that pattern is either a
// stale client or a hand-crafted request — reject it before it is used to
// index state.pending_choices.
const CHOICE_ID_RE = /^[A-Za-z0-9_-]{1,16}$/;

// Same filter/map used by /api/chat's candidate list, factored out so the
// three new endpoints below don't each repeat it.
function candidatesFromSnapshot(snapshot) {
  return snapshot.providers.filter(s => s.available)
    .map(s => configuredProviders().find(p => p.id === s.id))
    .filter(Boolean);
}

// Runs one provider call to completion and returns its full text (or an
// {status, body} error already shaped for res.status().json()). Shared by
// /api/game/new, /api/turn and /api/game/compress, each of which needs
// exactly one model call resolved before it can respond.
async function callProviderForText({ system, messages, maxTokens, onDelta, excludeProviderId }) {
  const snapshot = quotaSnapshot();
  if (!snapshot.configured) {
    return { error: { status: 503, body: { error: 'Server configuration error: no AI provider key set.' } } };
  }
  if (snapshot.exhausted) {
    return { error: { status: 429, body: exhaustedPayload(snapshot) } };
  }

  const chainResult = await selectProvider({
    candidates: candidatesFromSnapshot(snapshot).filter(c => c.id !== excludeProviderId),
    clientBody: { system, messages, max_tokens: maxTokens, stream: true },
    toChatBody,
    turnTimeoutMs: TURN_TIMEOUT_MS,
    onBlocked: (candidate, response, errBody) => markProviderBlocked(candidate, response, errBody),
    onUsage: (candidate) => meterUsage(candidate, 0, 1),
    onFallback: (candidate) => console.log(`[ai] fell back to ${candidate.id}`),
    activeProviderId: snapshot.active && snapshot.active.id,
  });

  if (chainResult.clientError) return { error: chainResult.clientError };
  if (!chainResult.providerResponse) {
    if (chainResult.lastFailure) return { error: chainResult.lastFailure };
    return { error: { status: 429, body: exhaustedPayload(quotaSnapshot()) } };
  }

  const { providerResponse, provider, chatBody, bumpTimeout, clearTimeout: clearT } = chainResult;
  const { text, usage, finishReason } = await consumeProviderStream(providerResponse, { bump: bumpTimeout, onDelta });
  clearT();
  const used = usageBreakdown(usage, chatBody, text);
  meterUsage(provider, used.total, 0, used.input, used.output);
  return { text, provider: provider.id, finishReason };
}

// Extracts and validates a SessionZeroResponse (schema unchanged by v2).
function parseSessionZeroOutput(rawText) {
  const stripped = String(rawText || '').replace(/^```[a-zA-Z]*\n?|```\s*$/g, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  const jsonText = start !== -1 && end > start ? stripped.slice(start, end + 1) : stripped;
  let obj;
  try { obj = JSON.parse(jsonText); } catch (_) { return null; }
  if (!obj || typeof obj.story_device !== 'string' || !Array.isArray(obj.hooks) || obj.hooks.length !== 3) return null;
  const spine = obj.campaign_spine;
  if (!spine || !spine.act1_goal || !spine.act2_complication || !spine.act3_convergence) return null;
  return obj;
}

function requireSession(req, res) {
  const sessionToken = req.headers['x-session-token'];
  if (!sessionToken) { res.status(401).json({ error: 'X-Session-Token header required.' }); return null; }
  const session = getSession(db, sessionToken);
  if (!session) { res.status(401).json({ error: 'Invalid or expired session token.' }); return null; }
  return session;
}

// ─── POST /api/game/new — session zero on the server ─────────────────────────

app.post('/api/game/new', chatRateLimiter, ipChatRateLimiter, sessionDailyRateLimiter, async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;

  if (!rulesReady()) {
    return res.status(503).json({ code: 'RULES_NOT_LOADED', error: 'The rules engine did not finish loading. Try again shortly.' });
  }

  const { character_id, display_name, adventure_id, regenerate } = req.body || {};
  if (typeof character_id !== 'string' || typeof adventure_id !== 'string') {
    return res.status(400).json({ error: 'character_id and adventure_id are required.' });
  }
  const character = getCharacter(character_id);
  const adventure = getAdventureLibraryEntry(adventure_id);
  if (!character || !adventure) return res.status(404).json({ error: 'Unknown character or adventure.' });
  const displayName = (typeof display_name === 'string' ? display_name.trim() : '').slice(0, 40) || character.name;

  const existing = stateStore.load(db, session.id);
  const pendingAlready = existing && existing.meta && existing.meta._pending_setup;
  if (pendingAlready && pendingAlready.adventure_id === adventure_id && regenerate !== true) {
    return res.json({ hooks: pendingAlready.hooks });
  }

  const system = buildSessionZeroPrompt(character, adventure);
  const userMsg = buildSessionZeroUserMessage(displayName, character, adventure);
  const szMessages = [{ role: 'user', content: userMsg }];
  let { text, error, provider: providerId, finishReason } = await callProviderForText({ system, messages: szMessages, maxTokens: 4096 });
  if (error) return res.status(error.status).json(error.body);

  let parsed = parseSessionZeroOutput(text);
  if (!parsed) {
    const raw = String(text || '');
    console.warn(`[session-zero] parse_failed provider=${providerId} finish=${finishReason} len=${raw.length} head=${JSON.stringify(raw.slice(0, 200))} tail=${JSON.stringify(raw.slice(-200))}`);
    // A provider occasionally ends a stream early while reporting a normal
    // finish (seen live on gemini-2.5-flash, 2026-09-30); try the next one once.
    const retry = await callProviderForText({ system, messages: szMessages, maxTokens: 4096, excludeProviderId: providerId });
    if (!retry.error) {
      parsed = parseSessionZeroOutput(retry.text);
      if (!parsed) console.warn(`[session-zero] parse_failed provider=${retry.provider} finish=${retry.finishReason} len=${String(retry.text || '').length} (retry)`);
    }
  }
  if (!parsed) return res.status(502).json({ error: 'Could not parse the session-zero response.', code: 'JSON_PARSE_ERROR' });

  const base = existing || {
    schema_version: stateStore.SCHEMA_VERSION,
    character: null, campaign: null,
    session: { number: 1, scene_count: 0, turn_count: 0, game_over: false },
    scene: { header: '', summary: '', in_combat: false, combat_state: null, recent_summaries: [], history_compressed: false, compressed_summary: null, scene_type_history: [] },
    meta: {},
    pending_choices: {},
  };
  const pendingState = {
    ...base,
    meta: {
      ...base.meta,
      initialized: false,
      _pending_setup: {
        character_id, display_name: displayName, adventure_id,
        hooks: parsed.hooks, story_device: parsed.story_device,
        story_device_seed: parsed.story_device_seed || '', campaign_spine: parsed.campaign_spine,
        key_npcs: parsed.key_npcs || [],
      },
    },
  };
  stateStore.commit(db, session.id, pendingState);

  return res.json({ hooks: parsed.hooks });
});

// ─── POST /api/game/begin — server port of initializeSession ────────────────

app.post('/api/game/begin', chatRateLimiter, (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;

  const state = stateStore.load(db, session.id);
  const pending = state && state.meta && state.meta._pending_setup;
  if (!pending) return res.status(409).json({ error: 'No pending session-zero setup for this session.' });

  const { hook_index } = req.body || {};
  const idx = Number.isInteger(hook_index) ? hook_index : 0;
  const hook = pending.hooks[idx];
  if (!hook) return res.status(400).json({ error: 'Unknown hook_index.' });

  const character = getCharacter(pending.character_id);
  const adventureLib = getAdventureLibraryEntry(pending.adventure_id);
  const adventureModule = getAdventureModule(pending.adventure_id);
  const firstScene = adventureModule && adventureModule.scenes && adventureModule.scenes[0];
  if (!character || !adventureModule) return res.status(409).json({ error: 'The pending setup no longer resolves to a known character or adventure.' });

  const newState = {
    schema_version: stateStore.SCHEMA_VERSION,
    character: { ...character, display_name: pending.display_name, stamina: { current: character.stamina.max, max: character.stamina.max } },
    campaign: {
      adventure_id: pending.adventure_id,
      adventure_title: adventureLib ? adventureLib.title : pending.adventure_id,
      story_device: pending.story_device,
      story_device_seed: pending.story_device_seed,
      spine: pending.campaign_spine,
      npcs: pending.key_npcs,
      factions: [],
      hooks: pending.hooks,
      journal: [],
      current_scene_id: firstScene ? firstScene.id : null,
      visited_scene_ids: firstScene ? [firstScene.id] : [],
    },
    session: { number: 1, scene_count: 0, turn_count: 0, game_over: false },
    scene: {
      header: hook.title || '', summary: hook.opening || '', in_combat: false, combat_state: null,
      recent_summaries: [], history_compressed: false, compressed_summary: null, scene_type_history: [],
    },
    meta: { initialized: true, loading: false, error: null, last_saved: null, snapshots: [], dev_mode: false, display_name: pending.display_name },
    pending_choices: {},
  };
  // A "New Adventure" reuses this session's token and save code, so a truly
  // fresh save is met here instead: wipe the previous playthrough's
  // turn_log, messages and snapshots in the same transaction as the new
  // state commit, so turn 1 of the new game never replays an old resolved
  // turn and no old checkpoint or history leaks into the new campaign.
  db.transaction(() => {
    clearSessionHistory(db, session.id);
    stateStore.commit(db, session.id, newState);
  })();
  return res.json({ state: stateStore.stripServerFields(newState), choices: [] });
});

// ─── POST /api/turn — the one call per turn ──────────────────────────────────
// In-memory, single-process lock: a session can have only one turn resolving
// at a time, so two tabs (or a client retry racing the original request)
// cannot spend two provider calls on the same turn.
const turnLocks = new Set();

app.post('/api/turn', chatRateLimiter, ipChatRateLimiter, sessionDailyRateLimiter, async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;

  if (!rulesReady()) {
    return res.status(503).json({ code: 'RULES_NOT_LOADED', error: 'The rules engine did not finish loading. Try again shortly.' });
  }

  if (req.headers['x-astra-protocol'] !== X_ASTRA_PROTOCOL) {
    return res.status(409).json({ code: 'CLIENT_OUTDATED', error: 'This page is out of date. Reload to keep playing.' });
  }

  const { turn, text, choice_id } = req.body || {};
  if (!Number.isInteger(turn) || turn < 1) return res.status(400).json({ error: 'turn must be a positive integer.' });
  if (text !== undefined && (typeof text !== 'string' || text.length > 500)) {
    return res.status(400).json({ error: 'text must be a string of at most 500 characters.' });
  }
  if (choice_id !== undefined && (typeof choice_id !== 'string' || !CHOICE_ID_RE.test(choice_id))) {
    return res.status(400).json({ error: 'choice_id must match ^[A-Za-z0-9_-]{1,16}$.' });
  }

  if (turnLocks.has(session.id)) {
    return res.status(409).json({ code: 'TURN_IN_PROGRESS', error: 'A turn is already being resolved for this session.' });
  }
  turnLocks.add(session.id);

  // Hoisted so the catch/finally below can always see and clear them, even
  // when the throw that lands there happened before either was assigned.
  let progressTimer = null;
  let streamOpened = false;

  try {
    const state = stateStore.load(db, session.id);
    if (!state || !state.meta || !state.meta.initialized) {
      return res.status(409).json({ error: 'No active game for this session.' });
    }
    if (state._unmatched) {
      return res.status(409).json({ code: 'UNSUPPORTED_SAVE', error: 'This save cannot be played here; its character no longer matches a known roster entry.' });
    }
    if (state.session.game_over) {
      return res.status(409).json({ code: 'GAME_OVER', error: 'This character has died. Start a new game.' });
    }

    const existingLog = getTurnLog(db, session.id, turn);

    // Replay: the network retry / retry_action paths, and interrupted-turn
    // recovery, all resend the turn the server already resolved. No provider
    // call, and the stored result is returned byte-for-byte.
    if (turn === state.session.turn_count && existingLog && existingLog.status === 'resolved') {
      const result = JSON.parse(existingLog.result_json);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      streamOpened = true;
      res.write(`data: ${JSON.stringify({ type: 'astra_turn', ...result })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'astra_quota', quota: quotaSnapshot() })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    if (turn !== state.session.turn_count + 1) {
      return res.status(409).json({ code: 'STALE_TURN', error: 'This turn is out of sync with the server.', state: stateStore.stripServerFields(state) });
    }

    // "Ask GM:" turns get no outcome sheet and no mechanics: an empty sheet
    // has no rows and no initiative, so there is nothing for an enemy to
    // attack with and no round to advance.
    const isAskGM = typeof text === 'string' && /^Ask GM:/i.test(text.trim());

    // The sheet: a retry of a pending turn (provider failure, malformed
    // answer) reuses it rather than rolling again.
    let sheet;
    if (existingLog && existingLog.status === 'pending') {
      sheet = JSON.parse(existingLog.sheet_json);
      let originalRequest = {};
      try { originalRequest = JSON.parse(existingLog.request_json || '{}'); } catch (_) { /* treat as no prior choice */ }
      // A genuine retry resends the same choice_id; a restored/replayed turn
      // (or a race) can arrive with a different one.
      sheet = dropMismatchedPinnedRow(sheet, originalRequest.choice_id || null, choice_id || null);
    } else if (isAskGM) {
      sheet = buildEmptySheet(state);
      insertPendingTurn(db, session.id, turn, JSON.stringify({ text: text || null, choice_id: choice_id || null }), JSON.stringify(sheet));
    } else {
      const pinnedCheck = (choice_id && state.pending_choices) ? (state.pending_choices[choice_id] || null) : null;
      sheet = buildSheet(state, pinnedCheck, getDice(), getRulesCache(), houseRules);
      insertPendingTurn(db, session.id, turn, JSON.stringify({ text: text || null, choice_id: choice_id || null }), JSON.stringify(sheet));
    }

    const activeModules = getActiveModules(db, session.id);
    const system = buildTurnPrompt({ state, sheetText: isAskGM ? null : renderSheet(sheet), isAskGM, activeModules });

    const resolvedRows = getRecentResolvedTurnLog(db, session.id, 6);
    // A migrated save with no turn_log rows yet falls back to the DB
    // messages table (the pre-cutover /api/chat wrote it on every turn), so
    // the model still sees this campaign's history on its first v2 turn
    // instead of starting from nothing.
    const legacyMessages = resolvedRows.length ? [] : getMessages(db, session.id);
    const history = buildHistoryMessages({ turnLogRows: resolvedRows, legacyMessages });
    const userText = text || (choice_id ? `(chose ${choice_id})` : '(continue)');
    const messages = [...history, { role: 'user', content: userText }];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Connection', 'keep-alive');
    // Committed to the SSE contract from here on: res.headersSent alone
    // isn't a reliable signal, since setHeader takes effect on the response
    // immediately even though nothing has been flushed yet — a later
    // res.status(...).json(...) would go out with this Content-Type still
    // attached, not the one the JSON body actually needs.
    streamOpened = true;
    // Toward the browser: keep-alive pings only, never the raw provider text
    // (that would leak the model's draft before it is resolved).
    progressTimer = setInterval(() => {
      try { res.write(`data: ${JSON.stringify({ type: 'astra_progress' })}\n\n`); } catch (_) { /* client gone */ }
    }, 4000);

    let { text: rawText, error, provider: providerId, finishReason } = await callProviderForText({ system, messages, maxTokens: 4096 });
    clearInterval(progressTimer);

    if (error) {
      // Headers are already committed to the SSE response by this point, so
      // a 429 (quota exhausted / provider busy) has to travel as an event
      // rather than an HTTP status; astra_error carries the same code,
      // resetAt and retryAfterSeconds the old /api/chat 429 body did, so the
      // client's busy/daily-limit messaging still has what it needs.
      const body = error.body || {};
      try {
        res.write(`data: ${JSON.stringify({
          type: 'astra_error',
          code: body.code || 'PROVIDER_ERROR',
          message: body.error,
          retryable: error.status !== 401,
          resetAt: body.resetAt,
          retryAfterSeconds: body.retryAfterSeconds,
          quota: body.quota,
        })}\n\n`);
        res.write('data: [DONE]\n\n');
      } catch (_) { /* client gone */ }
      return res.end();
    }

    let parsed = parseModelOutput(rawText);
    // An unreadable reply, or one that could only be patched up (its story
    // kept as written, which on 2026-10-01 meant a sentence cut off mid-way
    // and a stray "{"), gets one try on the other provider with the same
    // prompt and sheet. A clean retry wins; otherwise a patched reply is
    // still better than an error.
    if (!parsed.ok || parsed.repaired) {
      const raw = String(rawText || '');
      console.warn(`[turn] ${parsed.ok ? 'repaired' : 'parse_failed'} provider=${providerId} finish=${finishReason} len=${raw.length} head=${JSON.stringify(raw.slice(0, 200))} tail=${JSON.stringify(raw.slice(-200))}`);
      const keepAlive = setInterval(() => { try { res.write(`data: ${JSON.stringify({ type: 'astra_progress' })}\n\n`); } catch (_) { /* client gone */ } }, 5000);
      const retry = await callProviderForText({ system, messages, maxTokens: 4096, excludeProviderId: providerId });
      clearInterval(keepAlive);
      if (!retry.error) {
        const retryParsed = parseModelOutput(retry.text);
        if (retryParsed.ok && (!retryParsed.repaired || !parsed.ok)) { parsed = retryParsed; rawText = retry.text; providerId = retry.provider; }
        if (!retryParsed.ok || retryParsed.repaired) console.warn(`[turn] ${retryParsed.ok ? 'repaired' : 'parse_failed'} provider=${retry.provider} finish=${retry.finishReason} len=${String(retry.text || '').length} (retry)`);
      }
    }
    if (!parsed.ok) {
      // The turn stays pending with the same sheet; the client's retry
      // re-sends the same `turn` and lands back on the reuse path above.
      try {
        res.write(`data: ${JSON.stringify({ type: 'astra_error', code: 'JSON_PARSE_ERROR', message: parsed.error, retryable: true })}\n\n`);
        res.write('data: [DONE]\n\n');
      } catch (_) { /* client gone */ }
      return res.end();
    }

    if (isAskGM) parsed.data = stripMechanics(parsed.data);

    // A truncated or stalled reply is already repaired down to an inert
    // shape (repairTruncatedJSON's checks:[]/hazard:null/etc — modelSchema.js
    // says "a repaired turn applies no mechanics"), but resolveTurn's pinned
    // row is applied regardless of what the model declared, so a genuinely
    // pinned P1 would still resolve against a repaired reply. Swap in an
    // empty sheet for resolution only — the real sheet stays in turn_log
    // unchanged, so a retry that gets a full answer next time still uses it.
    const sheetForResolve = parsed.repaired ? buildEmptySheet(state) : sheet;

    const ctx = { rules: getRulesCache(), house: houseRules, outcomeLines, getScene };
    const resolved = resolveTurn(state, sheetForResolve, parsed.data, ctx);

    // Monitoring: watch the patched rate per provider, and how often the
    // model tries to hand back fields it was never trusted for or declares
    // a row that doesn't exist on the sheet.
    console.log(
      `[turn] provider=${providerId} patched=${resolved.patched} ` +
      `legacy_fields=${parsed.ignoredFields.length} invalid_rows=${resolved.log.filter(l => l.startsWith('[dropped]')).length}`
    );

    // Choice tags (`check`) are server-internal: stash them as this turn's
    // pending_choices for next turn's pinned-check resolution, and strip
    // them out of what the browser receives.
    const pendingChoices = {};
    const clientChoices = (parsed.data.choices || []).map((c) => {
      if (c.check) pendingChoices[c.id] = c.check;
      return { id: c.id, text: c.text, action_type: c.action_type };
    });

    const finalState = { ...resolved.state, pending_choices: pendingChoices };
    const resultPayload = {
      turn,
      narrative: resolved.narrative,
      choices: clientChoices,
      dice_rolls: resolved.dice_rolls,
      state_updates: resolved.applied,
      scene_change: parsed.data.scene_change === true,
      scene_header: parsed.data.scene_header,
      scene_summary: parsed.data.scene_summary,
      ooc_note: parsed.data.ooc_note,
      tooltip_terms: parsed.data.tooltip_terms,
      patched: resolved.patched,
      _repaired: !!parsed.repaired,
      state: stateStore.stripServerFields(finalState),
    };
    const resultJson = JSON.stringify(resultPayload);

    db.transaction(() => {
      stateStore.commit(db, session.id, finalState);
      resolveTurnLogRow(db, session.id, turn, resultJson);
      if (text) saveMessage(db, session.id, 'user', text);
      else if (choice_id) saveMessage(db, session.id, 'user', userText);
      if (resolved.narrative) saveMessage(db, session.id, 'assistant', resolved.narrative);
    })();

    try {
      res.write(`data: ${JSON.stringify({ type: 'astra_turn', ...resultPayload })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'astra_quota', quota: quotaSnapshot() })}\n\n`);
      res.write('data: [DONE]\n\n');
    } catch (_) { /* client gone */ }
    return res.end();
  } catch (err) {
    // Express 4 does not forward a rejected async handler to error-handling
    // middleware, and by this point in the handler the SSE response may
    // already be open — an uncaught throw here would otherwise leave the
    // client's connection hanging with no astra_turn, no astra_error and no
    // [DONE], until whatever proxy/client timeout eventually gives up.
    console.error('[turn] unexpected error resolving turn:', err && err.stack || err);
    try {
      if (streamOpened) {
        res.write(`data: ${JSON.stringify({ type: 'astra_error', code: 'INTERNAL_ERROR', message: 'Something went wrong resolving this turn. Try again.', retryable: true })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      } else if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error.' });
      } else {
        res.end();
      }
    } catch (_) { /* client gone */ }
  } finally {
    if (progressTimer) clearInterval(progressTimer);
    turnLocks.delete(session.id);
  }
});

// ─── POST /api/game/compress — server port of compressCampaignHistory ───────

app.post('/api/game/compress', chatRateLimiter, ipChatRateLimiter, sessionDailyRateLimiter, async (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;

  // Shares /api/turn's per-session lock: compression commits game_state just
  // like a turn does, so the two must never run concurrently (a turn landing
  // mid-compression is exactly the stale-overwrite this endpoint used to risk).
  if (turnLocks.has(session.id)) {
    return res.status(409).json({ code: 'TURN_IN_PROGRESS', error: 'A turn is already being resolved for this session.' });
  }
  turnLocks.add(session.id);

  try {
    const state = stateStore.load(db, session.id);
    if (!state || !state.meta || !state.meta.initialized) return res.status(409).json({ error: 'No active game for this session.' });
    if (state.scene && state.scene.history_compressed) {
      return res.status(409).json({ code: 'ALREADY_COMPRESSED', error: 'This campaign\'s history is already compressed.', state: stateStore.stripServerFields(state) });
    }

    const { system, user } = buildCompressPrompt(state);
    const { text, error } = await callProviderForText({ system, messages: [{ role: 'user', content: user }], maxTokens: 4096 });
    if (error) return res.status(error.status).json(error.body);
    if (!text) return res.status(502).json({ error: 'Empty compression response.' });

    // The provider call can take seconds; reload rather than reuse the state
    // read before it, and apply only the two summary fields, so nothing this
    // session committed while the call was in flight gets overwritten.
    const fresh = stateStore.load(db, session.id);
    if (!fresh) return res.status(409).json({ error: 'No active game for this session.' });
    if (fresh.scene && fresh.scene.history_compressed) {
      return res.status(409).json({ code: 'ALREADY_COMPRESSED', error: 'This campaign\'s history is already compressed.', state: stateStore.stripServerFields(fresh) });
    }
    const newState = { ...fresh, scene: { ...fresh.scene, history_compressed: true, compressed_summary: text } };
    stateStore.commit(db, session.id, newState);
    return res.json({ state: stateStore.stripServerFields(newState) });
  } finally {
    turnLocks.delete(session.id);
  }
});

// ─── Snapshots (checkpoints), stored server-side ─────────────────────────────

app.post('/api/game/snapshot', saveStateRateLimiter, (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  const state = stateStore.load(db, session.id);
  if (!state) return res.status(409).json({ error: 'No active game for this session.' });
  const rows = createSnapshot(db, session.id, state.session.turn_count, state.session.scene_count, JSON.stringify(state));
  return res.json({ snapshots: rows.map(r => ({ id: r.id, turn_count: r.turn_count, scene_count: r.scene_count, created_at: r.created_at })) });
});

app.get('/api/game/snapshot', saveStateRateLimiter, (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  return res.json({ snapshots: getSnapshots(db, session.id) });
});

app.post('/api/game/restore', saveStateRateLimiter, (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  const { snapshot_id } = req.body || {};
  const row = getSnapshotById(db, session.id, snapshot_id);
  if (!row) return res.status(404).json({ error: 'Snapshot not found.' });

  let restoredState;
  try { restoredState = JSON.parse(row.state_json); } catch (_) { return res.status(500).json({ error: 'Snapshot is corrupt.' }); }

  db.transaction(() => {
    stateStore.commit(db, session.id, restoredState);
    // Later turns keep their rolled sheet (undo cannot re-roll the dice) but
    // lose their resolved result, so the next play-through of them replays
    // resolveTurn against the restored state instead of trusting stale output.
    clearTurnLogResultsAfter(db, session.id, restoredState.session.turn_count);
  })();

  return res.json({ state: stateStore.stripServerFields(restoredState) });
});

app.delete('/api/game/snapshot/:id', saveStateRateLimiter, (req, res) => {
  const session = requireSession(req, res);
  if (!session) return;
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid snapshot id.' });
  deleteSnapshot(db, session.id, id);
  return res.json({ ok: true });
});

// ─── Export / start ───────────────────────────────────────────────────────────

// A rejected promise inside a route (an upstream stream reset, say) must not
// terminate the process and drop every player's session.
process.on('unhandledRejection', (reason) => {
  console.error('[fatal-guard] unhandled rejection:', reason && reason.stack || reason);
});

// Final error handler, anything a route or middleware above did not already
// turn into a JSON response lands here. The player gets a generic message;
// the stack (which names this machine's file paths) goes to the server log
// only, never the response.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[fatal] unhandled route error:', err && err.stack || err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal server error.' });
});

app.db = db; // exposed for test teardown only

module.exports = app;

// Start the HTTP server only when this file is executed directly,
// not when required by tests (which import the app module directly).
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Astra Rising server running on http://localhost:${PORT}`);
    const providers = configuredProviders();
    if (!providers.length) {
      console.warn('WARNING: no AI provider key set (GEMINI_API_KEY / GROQ_API_KEY). /api/game/new and /api/turn will return 503.');
    } else {
      console.log(`[ai] providers: ${providers.map(p => `${p.id} (${p.model})`).join(' -> ')}`);
    }
  });
}
