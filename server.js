'use strict';

require('dotenv').config();

const express = require('express');
const path    = require('path');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const dbApi = require('./db');
const { initDb, createSession, getSession, saveMessage, getMessages, saveGameState, getGameState, saveActiveModules, getActiveModules,
        generateSaveCode, getSessionByCode, ensureSaveCode, formatSaveCode } = dbApi;
const { configuredProviders, toChatBody, providerStatus, quotaDay, nextQuotaReset } = require('./server/services/aiProviders');
const { loadRules, getRulesCache, getLoadedIds, BLOCKED_IDS } = require('./server/ruleLoader');
const { buildRulesContext } = require('./server/services/promptRulesInjector');

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

// ─── Rules (P2-A1) ────────────────────────────────────────────────────────────

// Load rule files at module init time so they are available synchronously in
// all request handlers. Failures are logged but do not crash the server.
loadRules();

// ─── Express app ──────────────────────────────────────────────────────────────

const app = express();
// Body limits are per-route: only the save-state endpoint has any business
// sending megabytes, and a prompt bounded at 512kb keeps a single turn from
// eating a day's token allowance.
const jsonDefault = express.json();
const jsonPrompt  = express.json({ limit: '512kb' });
const jsonState   = express.json({ limit: '2mb' });

app.use((req, res, next) => {
  if (req.method === 'PUT' && /^\/api\/session\/[^/]+\/state$/.test(req.path)) return jsonState(req, res, next);
  if (req.method === 'POST' && req.path === '/api/chat') return jsonPrompt(req, res, next);
  return jsonDefault(req, res, next);
});

// Oversized bodies get a JSON answer the client can show, not an HTML error page.
app.use((err, _req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'That request is too large.' });
  }
  return next(err);
});

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

// ─── Rules endpoints (P2-A1 through P2-A5) ────────────────────────────────────
// IMPORTANT: specific paths must be registered BEFORE generic /:id and /:id/:section
// routes so Express matches them correctly.

function toTitleCase(str) {
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// P2-A2: GET /api/rules — master index + loaded ids
app.get('/api/rules', (_req, res) => {
  const cache      = getRulesCache();
  const masterData = cache['master_index'] || {};
  const loadedIds  = getLoadedIds();
  return res.json({ ...masterData, loaded_rulesets: loadedIds });
});

// ─── P2-A5 convenience endpoints (must come before /:id and /:id/:section) ────

// GET /api/rules/combat/quick-ref
app.get('/api/rules/combat/quick-ref', (_req, res) => {
  const cache    = getRulesCache();
  const basic    = cache['alpha_dawn_basic'];
  const expanded = cache['alpha_dawn_expanded'];
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
  const basic = cache['alpha_dawn_basic'];
  const zeb   = cache['zebulons_guide'];
  if (!basic) return res.status(503).json({ error: 'Rule files not loaded.' });

  const coreSkills     = basic.skills?.core_skills  || {};
  const expandedSkills = zeb?.expanded_skill_system || {};

  // Flatten Zebulon nested PSA structure into a flat object; Zebulon wins on conflict
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
  const basic    = cache['alpha_dawn_basic'];
  const expanded = cache['alpha_dawn_expanded'];
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
  const expanded = cache['alpha_dawn_expanded'];
  if (!expanded) return res.status(503).json({ error: 'Rule files not loaded.' });
  return res.json(expanded.equipment?.armor || {});
});

// GET /api/rules/optional-modules
app.get('/api/rules/optional-modules', (_req, res) => {
  const cache     = getRulesCache();
  const gammaDawn = cache['gamma_dawn'];
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
  const basic = cache['alpha_dawn_basic'];
  const zeb   = cache['zebulons_guide'];
  if (!basic) return res.status(503).json({ error: 'Rule files not loaded.' });

  const basicRace = basic.character_creation?.races?.[race];
  const zebRace   = zeb?.new_races?.[race];

  if (!basicRace && !zebRace) {
    return res.status(404).json({ error: `Race "${race}" not found.` });
  }

  return res.json({ ...(basicRace || {}), ...(zebRace ? { zebulon_data: zebRace } : {}) });
});

// ─── P2-A4: GET /api/rules/:id/:section (generic, after all specific paths) ───
app.get('/api/rules/:id/:section', (req, res) => {
  const { id, section } = req.params;

  if (BLOCKED_IDS.has(id)) {
    return res.status(403).json({ error: `Ruleset "${id}" is not available.` });
  }

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

// ─── P2-A3: GET /api/rules/:id (generic, after all specific paths) ────────────
app.get('/api/rules/:id', (req, res) => {
  const { id } = req.params;

  if (BLOCKED_IDS.has(id)) {
    return res.status(403).json({ error: `Ruleset "${id}" is not available.` });
  }

  const cache = getRulesCache();
  if (!cache[id]) {
    return res.status(404).json({ error: `Ruleset "${id}" not found.` });
  }

  return res.json(cache[id]);
});

// ─── Rate limiter (WU-6) ──────────────────────────────────────────────────────

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

// Normalises the provider's usage block (OpenAI shape, or Groq's x_groq
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

app.post('/api/chat', chatRateLimiter, async (req, res) => {
  // Require a session token; anonymous proxying is not allowed.
  const sessionToken = req.headers['x-session-token'];
  if (!sessionToken) {
    return res.status(401).json({ error: 'X-Session-Token header required.' });
  }

  // Validate token against the DB before calling Groq — prevents fake tokens
  // from consuming API quota by rotating through new rate-limit buckets.
  const session = getSession(db, sessionToken);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }

  const snapshot = quotaSnapshot();
  if (!snapshot.configured) {
    return res.status(503).json({ error: 'Server configuration error: no AI provider key set.' });
  }
  if (snapshot.exhausted) {
    return res.status(429).json(exhaustedPayload(snapshot));
  }

  // Strip session_token and game_state from the body before forwarding — both
  // are our internal fields and must never be sent to Anthropic.
  // eslint-disable-next-line no-unused-vars
  const { session_token: _stripped, game_state: _gameStateRaw, ...anthropicBody } = req.body;

  // Parse game_state and inject computed rules context into the system prompt.
  // Active modules are read from the DB for the session so they persist across requests.
  // Failures are silently swallowed — a missing rules block should never block gameplay.
  if (_gameStateRaw && typeof _gameStateRaw === 'string') {
    try {
      const parsedGameState = JSON.parse(_gameStateRaw);
      let activeModules = [];
      try {
        activeModules = getActiveModules(db, session.id);
      } catch (_) {}
      const rulesContext = buildRulesContext(parsedGameState, activeModules);
      if (rulesContext) {
        anthropicBody.system = (anthropicBody.system || '') + '\n\n' + rulesContext;
        console.log(`[rules] injected context block (~${rulesContext.split(/\s+/).filter(Boolean).length} words)${activeModules.length ? ' modules=' + activeModules.join(',') : ''}`);
      }
    } catch (e) {
      console.warn('[rules] failed to parse game_state or build rules context:', e.message);
    }
  }

  // Capture the user message for persistence (last entry in messages array).
  // We capture before the await so we have it regardless of Anthropic's response.
  const inboundMessages = anthropicBody.messages || [];
  const lastUserMsg = inboundMessages.length > 0
    ? inboundMessages[inboundMessages.length - 1]
    : null;

  const isStreaming = anthropicBody.stream === true;

  // A system prompt with no conversation is not a turn any provider can serve:
  // Gemini answers it with `contents is not specified` (400) and the turn dies
  // while a healthy fallback sits idle. Reject it here rather than spending a
  // provider call to learn the same thing.
  if (inboundMessages.length === 0) {
    console.warn('[ai] refused a turn with no messages');
    return res.status(400).json({ error: 'No conversation was sent with this turn.' });
  }

  // Try each provider that still has budget, in preference order. A provider
  // that is out of quota (429) or broken (5xx / unreachable) hands off to the
  // next one; a 4xx that is our own fault is returned as-is.
  const candidates = snapshot.providers.filter(s => s.available)
    .map(s => configuredProviders().find(p => p.id === s.id))
    .filter(Boolean);

  let anthropicResponse = null;
  let provider = null;
  let chatBody = null;
  let lastFailure = null;
  // Armed for the winning provider so the stream loop below can keep it fed;
  // every losing candidate clears its own timer before moving on.
  let bumpTurnTimeout = () => {};
  let clearTurnTimeout = () => {};

  for (const candidate of candidates) {
    const body = toChatBody(anthropicBody, candidate);
    // A provider that accepts the connection and then goes quiet would
    // otherwise hold the turn open forever and the player just watches a
    // spinner. The timer covers the wait for headers and is re-armed on every
    // streamed chunk, so a slow-but-alive generation is never cut off.
    const controller = new AbortController();
    let timer = setTimeout(() => controller.abort(), TURN_TIMEOUT_MS);
    const bump  = () => { clearTimeout(timer); timer = setTimeout(() => controller.abort(), TURN_TIMEOUT_MS); };
    const clear = () => clearTimeout(timer);
    let response;
    try {
      response = await fetch(candidate.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${candidate.key}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (networkErr) {
      clear();
      const timedOut = networkErr.name === 'AbortError';
      console.warn(`[ai] ${candidate.id} ${timedOut ? `did not answer within ${TURN_TIMEOUT_MS}ms` : 'was unreachable'} — trying next provider`);
      lastFailure = { status: 502, body: { error: timedOut ? `${candidate.label} did not answer in time.` : `Could not reach ${candidate.label}.` } };
      continue;
    }

    if (response.status === 429) {
      clear();
      const errBody = await response.json().catch(() => null);
      markProviderBlocked(candidate, response, errBody);
      lastFailure = null; // quota, not an error the player should see verbatim
      continue;
    }

    if (!response.ok) {
      clear();
      const errBody = await response.json().catch(() => null);
      // A bad key, a wrong model name, a provider outage or a body this
      // particular provider dislikes is a broken provider for this turn, not a
      // dead turn: hand off rather than failing while a working fallback sits
      // idle. Providers disagree about what a valid body looks like (Gemini
      // rejects one shape with 400 that Groq answers fine), so 400 is handed
      // off too and only becomes an error once every provider has refused.
      if (response.status >= 500 || [400, 401, 403, 404].includes(response.status)) {
        console.warn(`[ai] ${candidate.id} returned ${response.status} — trying next provider`, errBody && JSON.stringify(errBody).slice(0, 200));
        lastFailure = { status: 502, body: { error: `${candidate.label} is not accepting requests right now.` } };
        continue;
      }
      // Genuinely our request's fault (413/422): log the detail, return a
      // generic message so provider internals never reach the player.
      console.warn(`[ai] ${candidate.id} rejected the request with ${response.status}:`, errBody && JSON.stringify(errBody).slice(0, 300));
      return res.status(response.status).json({ error: 'The AI provider rejected this request.' });
    }

    anthropicResponse = response;
    provider = candidate;
    chatBody = body;
    bumpTurnTimeout = bump;
    clearTurnTimeout = clear;
    // The provider has counted this call, so book the request now — the token
    // cost is added when the response completes.
    meterUsage(candidate, 0, 1);
    if (candidate.id !== snapshot.active.id) {
      console.log(`[ai] fell back to ${candidate.id}`);
    }
    break;
  }

  if (!anthropicResponse) {
    if (lastFailure) return res.status(lastFailure.status).json(lastFailure.body);
    // Every remaining provider reported quota exhaustion.
    return res.status(429).json(exhaustedPayload(quotaSnapshot()));
  }

  // ── Streaming path ────────────────────────────────────────────────────────
  if (isStreaming) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx proxy buffering
    res.setHeader('Connection', 'keep-alive');

    let accText = '';
    let usageReport = null;
    const reader = anthropicResponse.body.getReader();
    const dec = new TextDecoder();
    let buf = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bumpTurnTimeout();
        buf += dec.decode(value, { stream: true });
        // Parse Groq/OpenAI SSE events and re-emit in Anthropic SSE format
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const d = line.slice(6).trim();
          if (d === '[DONE]') continue;
          if (!d) continue;
          try {
            const ev = JSON.parse(d);
            const text = ev.choices?.[0]?.delta?.content;
            if (text) {
              accText += text;
              res.write(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text } })}\n\n`);
            }
            // Final chunk carries token usage (OpenAI shape, or Groq's x_groq).
            const usage = ev.usage || ev.x_groq?.usage;
            if (usage && (usage.total_tokens || usage.completion_tokens)) usageReport = usage;
          } catch (_) {}
        }
      }
    } catch (streamErr) {
      // An upstream reset mid-generation must not take the process down; the
      // player sees a truncated turn and the tokens already spent are metered.
      console.warn('[ai] stream interrupted:', streamErr.name === 'AbortError'
        ? `${provider.id} went quiet for ${TURN_TIMEOUT_MS}ms`
        : streamErr.message);
    } finally {
      clearTurnTimeout();
      try {
        // Meter the turn, then hand the client fresh quota numbers on the same
        // stream so the banner updates without an extra round trip.
        const used = usageBreakdown(usageReport, chatBody, accText);
        meterUsage(provider, used.total, 0, used.input, used.output);
        res.write(`data: ${JSON.stringify({ type: 'astra_quota', quota: quotaSnapshot() })}\n\n`);
        res.write('data: [DONE]\n\n');
      } catch (_) {}
      res.end();
    }

    // Persist after stream ends (best-effort)
    try {
      if (lastUserMsg) {
        saveMessage(db, session.id, lastUserMsg.role || 'user', lastUserMsg.content || '');
        if (accText) saveMessage(db, session.id, 'assistant', accText);
      }
    } catch (dbErr) {
      console.warn('[db] Failed to persist streaming messages:', dbErr.message);
    }
    return;
  }

  // ── Non-streaming path ────────────────────────────────────────────────────
  const responseBody = await anthropicResponse.json().catch(() => null);
  clearTurnTimeout();
  const groqText = responseBody?.choices?.[0]?.message?.content || '';

  const used = usageBreakdown(responseBody?.usage, chatBody, groqText);
  meterUsage(provider, used.total, 0, used.input, used.output);

  try {
    if (lastUserMsg) {
      saveMessage(db, session.id, lastUserMsg.role || 'user', lastUserMsg.content || '');
      if (groqText) saveMessage(db, session.id, 'assistant', groqText);
    }
  } catch (dbErr) {
    console.warn('[db] Failed to persist messages:', dbErr.message);
  }

  // Return in Anthropic format so the frontend parser (data.content[0].text) works unchanged.
  return res.status(200).json({ content: [{ type: 'text', text: groqText }], quota: quotaSnapshot() });
});

// ─── POST /api/session — create new session (WU-4) ────────────────────────────

app.post('/api/session', sessionCreateLimiter, (req, res) => {
  const token    = uuidv4();
  const saveCode = generateSaveCode(db);
  createSession(db, token, saveCode);
  return res.status(201).json({ token, save_code: saveCode, save_code_display: formatSaveCode(saveCode) });
});

// ─── POST /api/session/resume — continue a game from a save code ──────────────

// The save code is short enough to type by hand, so it is guessable in a way a
// UUID is not; the same IP limiter that guards session creation caps how fast
// codes can be tried.
app.post('/api/session/resume', sessionCreateLimiter, (req, res) => {
  const session = getSessionByCode(db, req.body && req.body.code);
  if (!session) {
    return res.status(404).json({ error: 'No saved game found for that code.' });
  }

  const gameStateRow = getGameState(db, session.id);
  return res.json({
    token:             session.user_token,
    save_code:         session.save_code,
    save_code_display: formatSaveCode(session.save_code),
    state_json:        gameStateRow ? gameStateRow.state_json : null,
    messages:          getMessages(db, session.id),
  });
});

// ─── GET /api/session/:token — restore session (WU-4) ─────────────────────────

app.get('/api/session/:token', (req, res) => {
  const session = getSession(db, req.params.token);
  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  const gameStateRow = getGameState(db, session.id);
  const messages     = getMessages(db, session.id);
  const saveCode     = ensureSaveCode(db, session);

  return res.json({
    token:             session.user_token,
    save_code:         saveCode,
    save_code_display: formatSaveCode(saveCode),
    state_json:        gameStateRow ? gameStateRow.state_json : null,
    messages,
  });
});

// ─── PUT /api/session/:token/state — save game state (WU-5) ───────────────────

app.put('/api/session/:token/state', (req, res) => {
  const session = getSession(db, req.params.token);
  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  const { state_json } = req.body;
  if (typeof state_json !== 'string') {
    return res.status(400).json({ error: 'state_json must be a string.' });
  }

  try {
    saveGameState(db, session.id, state_json);
  } catch (dbErr) {
    console.error('[db] Failed to save game state:', dbErr.message);
    return res.status(500).json({ error: 'Failed to persist state.' });
  }

  return res.json({ ok: true });
});

// ─── POST /api/session/:token/modules — set active optional modules (P2-E1) ───

app.post('/api/session/:token/modules', (req, res) => {
  const session = getSession(db, req.params.token);
  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  const { modules } = req.body;
  if (!Array.isArray(modules)) {
    return res.status(400).json({ error: 'modules must be an array of strings.' });
  }

  // Validate: only allow known Gamma Dawn module IDs
  const VALID_MODULES = new Set(['psionics', 'mutations', 'cybernetics', 'reputation_system', 'alternate_combat', 'variant_races', 'environmental_hazards']);
  const invalid = modules.filter(m => typeof m !== 'string' || !VALID_MODULES.has(m));
  if (invalid.length > 0) {
    return res.status(400).json({ error: `Unknown module(s): ${invalid.join(', ')}` });
  }

  try {
    saveActiveModules(db, session.id, modules);
  } catch (dbErr) {
    console.error('[db] Failed to save active modules:', dbErr.message);
    return res.status(500).json({ error: 'Failed to persist modules.' });
  }

  return res.json({ ok: true, active_modules: modules });
});

// ─── GET /api/session/:token/modules — get active optional modules (P2-E1) ────

app.get('/api/session/:token/modules', (req, res) => {
  const session = getSession(db, req.params.token);
  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  const activeModules = getActiveModules(db, session.id);
  return res.json({ active_modules: activeModules });
});

// ─── Export / start ───────────────────────────────────────────────────────────

// A rejected promise inside a route (an upstream stream reset, say) must not
// terminate the process and drop every player's session.
process.on('unhandledRejection', (reason) => {
  console.error('[fatal-guard] unhandled rejection:', reason && reason.stack || reason);
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
      console.warn('WARNING: no AI provider key set (GEMINI_API_KEY / GROQ_API_KEY). /api/chat will return 503.');
    } else {
      console.log(`[ai] providers: ${providers.map(p => `${p.id} (${p.model})`).join(' -> ')}`);
    }
  });
}
