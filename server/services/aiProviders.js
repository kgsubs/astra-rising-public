'use strict';

// Provider registry + free-tier quota accounting.
//
// Both providers speak the OpenAI chat-completions wire format, so the only
// per-provider differences are the URL, the key, the model name and the free
// tier's daily ceilings. Quota days are tracked in US/Pacific because that is
// the boundary Google documents for free-tier resets; Groq only reports a
// relative reset, so the same boundary is used for both.

const QUOTA_TIMEZONE = 'America/Los_Angeles';

// Rough cost of one Astra turn (system prompt + rules block + 6 turns of
// history + the DM's reply). Used to convert a remaining-token budget into a
// "turns left" figure for the player-facing banner.
const TOKENS_PER_TURN_ESTIMATE = 7000;

const PROVIDER_DEFS = {
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    keyEnv: 'GEMINI_API_KEY',
    modelEnv: 'GEMINI_MODEL',
    defaultModel: 'gemini-2.5-flash',
    // Free tier: request-capped, no published daily token ceiling.
    limits: { requestsPerDay: 250, tokensPerDay: null },
  },
  groq: {
    id: 'groq',
    label: 'Groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    keyEnv: 'GROQ_API_KEY',
    modelEnv: 'GROQ_MODEL',
    // llama-3.3-70b-versatile was decommissioned by Groq and returns
    // 404 model_not_found; it silently killed the fallback chain.
    defaultModel: 'openai/gpt-oss-120b',
    // Free tier: the 100k token/day ceiling binds long before 1000 requests.
    limits: { requestsPerDay: 1000, tokensPerDay: 100000 },
  },
};

const DEFAULT_ORDER = ['gemini', 'groq'];

// ─── Quota day math ───────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: QUOTA_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: QUOTA_TIMEZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});

function quotaDay(now = Date.now()) {
  return dayFormatter.format(new Date(now));
}

// Epoch ms of the next midnight in the quota timezone. The ±1h correction
// handles the two DST transitions, where a naive "24h minus elapsed" lands an
// hour early or late.
function nextQuotaReset(now = Date.now()) {
  const [h, m, s] = timeFormatter.format(new Date(now)).split(':').map(Number);
  const elapsed = (h * 3600 + m * 60 + s) * 1000;
  let candidate = now + (DAY_MS - elapsed);
  const today = quotaDay(now);
  if (quotaDay(candidate) === today) candidate += 3600 * 1000;
  else if (quotaDay(candidate - 3600 * 1000) !== today) candidate -= 3600 * 1000;
  return candidate;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

// Ordered list of providers that actually have a key configured. Order comes
// from AI_PROVIDER_ORDER (comma-separated) so the fallback chain is tunable
// without a code change.
function configuredProviders(env = process.env) {
  const order = (env.AI_PROVIDER_ORDER || '').split(',').map(s => s.trim()).filter(Boolean);
  const ids = (order.length ? order : DEFAULT_ORDER).filter(id => PROVIDER_DEFS[id]);
  return ids
    .filter(id => !!env[PROVIDER_DEFS[id].keyEnv])
    .map(id => {
      const def = PROVIDER_DEFS[id];
      // Free-tier ceilings move; env overrides avoid a code change (and let
      // tests drive the exhausted path).
      const rpd = env[`${id.toUpperCase()}_REQUESTS_PER_DAY`];
      const tpd = env[`${id.toUpperCase()}_TOKENS_PER_DAY`];
      return {
        ...def,
        key: env[def.keyEnv],
        url: env[`${id.toUpperCase()}_URL`] || def.url,
        model: env[def.modelEnv] || def.defaultModel,
        limits: {
          requestsPerDay: rpd === undefined ? def.limits.requestsPerDay : (rpd === '' ? null : parseInt(rpd, 10)),
          tokensPerDay:   tpd === undefined ? def.limits.tokensPerDay   : (tpd === '' ? null : parseInt(tpd, 10)),
        },
      };
    });
}

// Translates the Anthropic-shaped body the frontend sends into the
// OpenAI-compatible body both providers accept.
function toChatBody(anthropicBody, provider) {
  const messages = [];
  if (anthropicBody.system) {
    messages.push({ role: 'system', content: anthropicBody.system });
  }
  for (const m of (anthropicBody.messages || [])) {
    messages.push({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    });
  }
  const body = {
    model: provider.model,
    messages,
    max_tokens: anthropicBody.max_tokens || 4096,
    stream: anthropicBody.stream === true,
  };
  // Ask for a usage record on the final SSE chunk so streamed turns are
  // metered from real token counts rather than a character estimate.
  if (body.stream) body.stream_options = { include_usage: true };
  return body;
}

// ─── Quota state ──────────────────────────────────────────────────────────────

// Snapshot of one provider's remaining free-tier budget for the current day.
function providerStatus(db, dbApi, provider, now = Date.now()) {
  const day   = quotaDay(now);
  const usage = dbApi.getUsage(db, provider.id, day);
  const { requestsPerDay, tokensPerDay } = provider.limits;

  const requestsRemaining = requestsPerDay === null ? null : Math.max(0, requestsPerDay - usage.requests);
  const tokensRemaining   = tokensPerDay   === null ? null : Math.max(0, tokensPerDay   - usage.tokens);

  // A provider is out either because a local counter hit its ceiling or
  // because the provider itself returned a 429 whose retry window is still open.
  const blockedUntil = usage.blocked_until > now ? usage.blocked_until : 0;
  const exhausted    = requestsRemaining === 0 || tokensRemaining === 0;

  // Once the day has a few turns on record, price the remaining budget from
  // what this campaign actually costs rather than the generic estimate — the
  // difference between "14 turns left" and "40 turns left" is the whole point
  // of showing the number.
  const measured = usage.requests >= 3 ? usage.tokens / usage.requests : 0;
  const perTurn  = measured > 0
    ? Math.min(20000, Math.max(1000, measured))
    : TOKENS_PER_TURN_ESTIMATE;

  const turnsByRequests = requestsRemaining === null ? Infinity : requestsRemaining;
  const turnsByTokens   = tokensRemaining   === null ? Infinity : Math.floor(tokensRemaining / perTurn);
  const turnsRemaining  = Math.min(turnsByRequests, turnsByTokens);

  return {
    id: provider.id,
    label: provider.label,
    model: provider.model,
    day,
    requestsUsed: usage.requests,
    tokensUsed: usage.tokens,
    requestsPerDay,
    tokensPerDay,
    requestsRemaining,
    tokensRemaining,
    turnsRemaining: turnsRemaining === Infinity ? null : turnsRemaining,
    blockedUntil,
    available: !exhausted && !blockedUntil,
    resetAt: blockedUntil || nextQuotaReset(now),
  };
}

module.exports = {
  PROVIDER_DEFS,
  QUOTA_TIMEZONE,
  TOKENS_PER_TURN_ESTIMATE,
  quotaDay,
  nextQuotaReset,
  configuredProviders,
  toChatBody,
  providerStatus,
};
