#!/usr/bin/env node
'use strict';

// One real Astra turn, sent once to every reachable text model, so the writing
// can be compared side by side rather than argued about.
//
//   node run.js --dry-run     list the models and the estimated cost
//   node run.js               run them and write results.json
//   node run.js --only openai run a single provider
//
// Keys come from `pass`; nothing is written to disk but the answers.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIR     = __dirname;
const PROMPT  = JSON.parse(fs.readFileSync(path.join(DIR, 'prompt.json'), 'utf8'));
const RESULTS = path.join(DIR, 'results.json');
const MAX_OUTPUT_TOKENS = 1200;   // a turn's narrative + choices, not an essay
const CALL_TIMEOUT_MS   = 180000;

const args    = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const RETRY   = args.includes('--retry');   // re-run failures and truncated answers
const ONLY    = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;

// Reasoning models spend their budget thinking before they write, so a cap that
// suits a plain model truncates them mid-thought. The retry pass uses the same
// ceiling the game itself sends.
const RETRY_OUTPUT_TOKENS = 4096;

// ─── Keys ────────────────────────────────────────────────────────────────────

function pass(entry) {
  try {
    return execSync(`pass show ${entry}`, { encoding: 'utf8' }).split('\n')[0].trim();
  } catch (_) {
    return null;
  }
}

const KEYS = {
  openai: pass('openai/api-key-mcfly'),
  gemini: pass('gemini/opencode-api-key'),
  groq:   pass('groq/api-key-standard'),
};

const ENDPOINTS = {
  openai: { models: 'https://api.openai.com/v1/models',                             chat: 'https://api.openai.com/v1/chat/completions' },
  gemini: { models: 'https://generativelanguage.googleapis.com/v1beta/openai/models', chat: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions' },
  groq:   { models: 'https://api.groq.com/openai/v1/models',                        chat: 'https://api.groq.com/openai/v1/chat/completions' },
};

// ─── Prices, $ per 1M tokens (verified 2026-07-25) ───────────────────────────

const PRICES = {
  'gpt-5.6-sol':   [5.00, 30.00],
  'gpt-5.6-terra': [2.50, 15.00],
  'gpt-5.6-luna':  [1.00,  6.00],
  'gpt-5.5':       [5.00, 30.00],
  'gpt-5.4':       [2.50, 15.00],
  'gpt-5.4-mini':  [0.75,  4.50],
  'gpt-5.4-nano':  [0.20,  1.25],
  'gemini-2.5-flash':      [0.30, 2.50],
  'gemini-2.5-flash-lite': [0.10, 0.40],
  'llama-3.3-70b-versatile': [0.59, 0.79],
  'llama-3.1-8b-instant':    [0.05, 0.08],
};

function priceFor(id) {
  if (PRICES[id]) return PRICES[id];
  const base = Object.keys(PRICES).find(k => id.startsWith(k));
  return base ? PRICES[base] : null;
}

// ─── Model discovery ─────────────────────────────────────────────────────────

// Anything that is not a text chat model, or is a dated alias of one we already
// have, only adds noise and cost to the comparison.
// "pro" tiers are excluded on purpose: minutes per answer and an order of
// magnitude more expensive, which is the wrong shape for a live game turn.
const DROP = /audio|realtime|image|tts|transcribe|whisper|embed|moderation|guard|search|codex|instruct|veo|imagen|banana|live|omni|dall|sora|orpheus|-pro$/i;
const DATED_ALIAS = /(-(19|20)\d{2}-\d{2}-\d{2}$)|(-\d{3,4}$)|(-16k$)/;

// Gemini's free tier covers flash, flash-lite and gemma; pro is paid-only.
const GEMINI_FREE = /(flash|lite|gemma)/i;

async function listModels(provider) {
  const res = await fetch(ENDPOINTS[provider].models, {
    headers: { Authorization: `Bearer ${KEYS[provider]}` },
  });
  if (!res.ok) throw new Error(`${provider} model list failed: ${res.status}`);
  const body = await res.json();
  let ids = (body.data || []).map(m => String(m.id).replace(/^models\//, ''));

  ids = ids.filter(id => !DROP.test(id) && !DATED_ALIAS.test(id));
  if (provider === 'openai') ids = ids.filter(id => /^gpt-/.test(id));
  if (provider === 'gemini') ids = ids.filter(id => GEMINI_FREE.test(id));
  if (provider === 'groq')   ids = ids.filter(id => !/^playai|^distil/i.test(id));

  return [...new Set(ids)].sort();
}

// ─── One run ─────────────────────────────────────────────────────────────────

// Newer OpenAI models reject max_tokens and want max_completion_tokens; rather
// than maintain a list of which is which, try one and fall back.
async function callModel(provider, id, useCompletionTokens = false, budget = MAX_OUTPUT_TOKENS) {
  const body = {
    model: id,
    messages: PROMPT.messages,
    [useCompletionTokens ? 'max_completion_tokens' : 'max_tokens']: budget,
  };

  const started = Date.now();
  const res = await fetch(ENDPOINTS[provider].chat, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEYS[provider]}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
  });
  const elapsed = Date.now() - started;
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const message = json?.error?.message || `HTTP ${res.status}`;
    if (!useCompletionTokens && /max_completion_tokens|max_tokens/i.test(message)) {
      return callModel(provider, id, true, budget);
    }
    return { ok: false, error: message, status: res.status, elapsed };
  }

  return {
    ok: true,
    elapsed,
    text: json?.choices?.[0]?.message?.content ?? '',
    finish: json?.choices?.[0]?.finish_reason ?? null,
    usage: json?.usage ?? null,
  };
}

// The game requires a JSON object with narrative, choices and state_updates;
// a model that cannot hold that format is unusable however well it writes.
function schemaCheck(text) {
  const stripped = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = stripped.indexOf('{');
  const end   = stripped.lastIndexOf('}');
  if (start === -1 || end <= start) return { valid: false, reason: 'no JSON object found' };
  let obj;
  try {
    obj = JSON.parse(stripped.slice(start, end + 1));
  } catch (e) {
    return { valid: false, reason: 'invalid JSON: ' + e.message.slice(0, 80) };
  }
  const missing = [];
  if (typeof obj.narrative !== 'string' || !obj.narrative) missing.push('narrative');
  if (!Array.isArray(obj.choices)) missing.push('choices');
  if (!obj.state_updates || typeof obj.state_updates !== 'object') missing.push('state_updates');
  return missing.length
    ? { valid: false, reason: 'missing ' + missing.join(', '), parsed: obj }
    : { valid: true, parsed: obj };
}

function costOf(id, usage) {
  const p = priceFor(id);
  if (!p || !usage) return null;
  const input  = usage.prompt_tokens || 0;
  const output = usage.completion_tokens || 0;
  return (input * p[0] + output * p[1]) / 1e6;
}

// ─── Main ────────────────────────────────────────────────────────────────────

// Second pass: anything that errored or ran out of room gets one more try with
// the game's own token ceiling, and the earlier record is replaced.
async function retryPass() {
  const data = JSON.parse(fs.readFileSync(RESULTS, 'utf8'));
  const needsRetry = data.results.filter(r => !r.ok || r.finish === 'length');
  console.log(`\nRetrying ${needsRetry.length} models at ${RETRY_OUTPUT_TOKENS} output tokens\n`);

  for (const old of needsRetry) {
    process.stdout.write(`[retry] ${old.provider}/${old.model} ... `);
    let outcome;
    try {
      outcome = await callModel(old.provider, old.model, false, RETRY_OUTPUT_TOKENS);
    } catch (e) {
      outcome = { ok: false, error: e.message, elapsed: null };
    }
    const record = { provider: old.provider, model: old.model, ...outcome, budget: RETRY_OUTPUT_TOKENS };
    if (outcome.ok) {
      record.schema = schemaCheck(outcome.text);
      record.cost = costOf(old.model, outcome.usage);
      console.log(`${outcome.elapsed}ms, ${outcome.usage?.completion_tokens ?? '?'} out tokens, schema ${record.schema.valid ? 'ok' : 'BROKEN'}`);
    } else {
      console.log(`FAILED: ${String(outcome.error).slice(0, 90)}`);
    }
    const idx = data.results.findIndex(r => r.provider === old.provider && r.model === old.model);
    data.results[idx] = record;
    fs.writeFileSync(RESULTS, JSON.stringify(data, null, 2));
    await new Promise(r => setTimeout(r, 4000)); // slower: these are the rate-limited ones
  }
  const spent = data.results.reduce((n, r) => n + (r.cost || 0), 0);
  console.log(`\nRetry done. Total spend across both passes: $${spent.toFixed(4)}`);
}

(async () => {
  if (RETRY) return retryPass();

  const providers = (ONLY ? [ONLY] : ['openai', 'gemini', 'groq']).filter(p => {
    if (!KEYS[p]) console.warn(`[skip] no key for ${p}`);
    return KEYS[p];
  });

  const plan = [];
  for (const provider of providers) {
    try {
      for (const id of await listModels(provider)) plan.push({ provider, id });
    } catch (e) {
      console.error(`[${provider}] ${e.message}`);
    }
  }

  const promptChars  = PROMPT.messages.reduce((n, m) => n + m.content.length, 0);
  const promptTokens = Math.ceil(promptChars / 4);

  console.log(`\nPrompt: ${PROMPT.messages.length} messages, ~${promptTokens} tokens\n`);
  console.log('MODELS TO RUN');
  let estimate = 0;
  for (const { provider, id } of plan) {
    const p = priceFor(id);
    const c = p ? (promptTokens * p[0] + 600 * p[1]) / 1e6 : null;
    if (c) estimate += c;
    console.log(`  ${provider.padEnd(7)} ${id.padEnd(34)} ${c === null ? 'free / unpriced' : '$' + c.toFixed(4)}`);
  }
  console.log(`\n${plan.length} models, estimated cost $${estimate.toFixed(2)} (unpriced models assumed free)\n`);

  if (DRY_RUN) return;

  const results = [];
  for (const { provider, id } of plan) {
    process.stdout.write(`[run] ${provider}/${id} ... `);
    let outcome;
    try {
      outcome = await callModel(provider, id);
    } catch (e) {
      outcome = { ok: false, error: e.message, elapsed: null };
    }
    const record = { provider, model: id, ...outcome };
    if (outcome.ok) {
      record.schema = schemaCheck(outcome.text);
      record.cost = costOf(id, outcome.usage);
      console.log(`${outcome.elapsed}ms, ${outcome.usage?.completion_tokens ?? '?'} out tokens, schema ${record.schema.valid ? 'ok' : 'BROKEN'}`);
    } else {
      console.log(`FAILED: ${String(outcome.error).slice(0, 90)}`);
    }
    results.push(record);
    // Written after every model so a late failure cannot lose the earlier work.
    fs.writeFileSync(RESULTS, JSON.stringify({ prompt: PROMPT, results }, null, 2));
    await new Promise(r => setTimeout(r, 1500)); // stay under free-tier per-minute caps
  }

  const spent = results.reduce((n, r) => n + (r.cost || 0), 0);
  console.log(`\nDone: ${results.filter(r => r.ok).length}/${results.length} answered, $${spent.toFixed(4)} spent.`);
  console.log(`Raw results: ${RESULTS}`);
})();
