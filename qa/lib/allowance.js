'use strict';

// Tells "the AI allowance ran out" apart from "the game is broken".
//
// Every real-AI run here (evals, the live smoke check) shares one Groq key and
// one Gemini key with the live site. Groq's free tier is 1,000 requests and
// 200,000 tokens a day plus 8,000 tokens a minute; Gemini's is 20 requests a
// day. When either is spent, a test must stop and say so (exit code 3), not
// report a bug (exit code 1), and it must not start if it would leave the live
// site short.

const ALLOWANCE_EXIT = 3;

// Error codes the server uses when no provider can take the call right now:
// QUOTA_EXHAUSTED is the day's allowance gone, PROVIDER_BUSY a short block.
const ALLOWANCE_CODES = /^(QUOTA_EXHAUSTED|PROVIDER_BUSY|BUSY)$/;

function isAllowanceError(code, message) {
  return ALLOWANCE_CODES.test(code || '') || /quota|rate.?limit|used up/i.test(message || '');
}

// The live site's own meter: what it believes is left today. It does not see
// calls made by other processes on the same key (these tests), so the floor
// below is kept well above one run's measured cost.
async function liveHeadroom(base) {
  try {
    const res = await fetch(base + '/api/quota');
    if (!res.ok) return { ok: false, reason: `quota route answered ${res.status}` };
    const q = await res.json();
    const groq = (q.providers || []).find(p => p.id === 'groq');
    const gemini = (q.providers || []).find(p => p.id === 'gemini');
    return {
      ok: true, exhausted: q.exhausted === true,
      groqTokens: groq ? groq.tokensRemaining : null,
      groqRequests: groq ? groq.requestsRemaining : null,
      geminiRequests: gemini ? gemini.requestsRemaining : null,
      resetAt: q.active ? q.active.resetAt : (groq && groq.resetAt) || null,
      active: q.active ? q.active.id : null,
    };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

function resetText(resetAt) {
  return resetAt ? new Date(resetAt).toLocaleString('en-US', { timeZone: 'America/Puerto_Rico' }) + ' AST' : 'unknown';
}

module.exports = { ALLOWANCE_EXIT, isAllowanceError, liveHeadroom, resetText };
