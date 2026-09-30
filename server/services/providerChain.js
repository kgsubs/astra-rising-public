'use strict';

// ─── Provider chain ─────────────────────────────────────────────────────────
// Tries each candidate provider in preference order, handing off on quota
// (429), a broken provider (5xx, or a 4xx that is plainly the provider's
// own problem), or a network failure / stall. A 4xx that is genuinely this
// request's fault (413/422) is returned to the caller as a clientError
// instead of being handed off. /api/turn and /api/game/new both go through
// this same chain, so every endpoint that calls a provider shares one
// fallback path.

// Tries each candidate in order. Side effects (blocking a provider for
// quota, metering usage, logging a fallback) go through the callbacks so
// this module never touches the database directly and stays unit-testable.
//
// @returns one of:
//   { providerResponse, provider, chatBody, bumpTimeout, clearTimeout }
//   { lastFailure: {status, body} | null }   — every candidate failed
//   { clientError: {status, body} }          — a candidate said this request itself is bad
async function selectProvider({ candidates, clientBody, toChatBody, turnTimeoutMs, onBlocked, onUsage, onFallback, activeProviderId, fetchImpl = fetch }) {
  let lastFailure = null;

  for (const candidate of candidates) {
    const body = toChatBody(clientBody, candidate);
    // A provider that accepts the connection and then goes quiet would
    // otherwise hold the turn open forever. The timer covers the wait for
    // headers and is re-armed on every streamed chunk, so a slow-but-alive
    // generation is never cut off.
    const controller = new AbortController();
    let timer = setTimeout(() => controller.abort(), turnTimeoutMs);
    const bump = () => { clearTimeout(timer); timer = setTimeout(() => controller.abort(), turnTimeoutMs); };
    const clear = () => clearTimeout(timer);

    let response;
    try {
      response = await fetchImpl(candidate.url, {
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
      console.warn(`[ai] ${candidate.id} ${timedOut ? `did not answer within ${turnTimeoutMs}ms` : 'was unreachable'} — trying next provider`);
      lastFailure = { status: 502, body: { error: timedOut ? `${candidate.label} did not answer in time.` : `Could not reach ${candidate.label}.` } };
      continue;
    }

    if (response.status === 429) {
      clear();
      const errBody = await response.json().catch(() => null);
      if (onBlocked) onBlocked(candidate, response, errBody);
      lastFailure = null; // quota, not an error the player should see verbatim
      continue;
    }

    if (!response.ok) {
      clear();
      const errBody = await response.json().catch(() => null);
      // A bad key, a wrong model name, a provider outage or a body this
      // particular provider dislikes is a broken provider for this turn, not
      // a dead turn: hand off rather than failing while a working fallback
      // sits idle. Providers disagree about what a valid body looks like
      // (Gemini rejects one shape with 400 that Groq answers fine), so 400
      // is handed off too and only becomes an error once every provider has
      // refused.
      if (response.status >= 500 || [400, 401, 403, 404].includes(response.status)) {
        console.warn(`[ai] ${candidate.id} returned ${response.status} — trying next provider`, errBody && JSON.stringify(errBody).slice(0, 200));
        lastFailure = { status: 502, body: { error: `${candidate.label} is not accepting requests right now.` } };
        continue;
      }
      // Genuinely our request's fault (413/422): the caller returns this
      // straight to its own client, with provider internals never reaching
      // the player.
      console.warn(`[ai] ${candidate.id} rejected the request with ${response.status}:`, errBody && JSON.stringify(errBody).slice(0, 300));
      return { clientError: { status: response.status, body: { error: 'The AI provider rejected this request.' } } };
    }

    if (onUsage) onUsage(candidate);
    if (onFallback && candidate.id !== activeProviderId) onFallback(candidate);

    return { providerResponse: response, provider: candidate, chatBody: body, bumpTimeout: bump, clearTimeout: clear };
  }

  return { lastFailure };
}

// Reads a provider's OpenAI-style SSE stream, re-emitting each text delta
// through onDelta and returning the accumulated text plus any usage record
// carried on the final chunk (OpenAI shape, or Groq's x_groq wrapper).
async function consumeProviderStream(providerResponse, { onDelta, bump } = {}) {
  let accText = '';
  let usage = null;
  let finishReason = null;
  const reader = providerResponse.body.getReader();
  const dec = new TextDecoder();
  let buf = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (bump) bump();
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const d = line.slice(6).trim();
        if (d === '[DONE]' || !d) continue;
        try {
          const ev = JSON.parse(d);
          const text = ev.choices?.[0]?.delta?.content;
          if (text) {
            accText += text;
            if (onDelta) onDelta(text);
          }
          if (ev.choices?.[0]?.finish_reason) finishReason = ev.choices[0].finish_reason;
          const evUsage = ev.usage || ev.x_groq?.usage;
          if (evUsage && (evUsage.total_tokens || evUsage.completion_tokens)) usage = evUsage;
        } catch (_) { /* ignore an unparseable SSE line */ }
      }
    }
  } catch (streamErr) {
    console.warn('[ai] stream interrupted:', streamErr.name === 'AbortError' ? 'the provider went quiet' : streamErr.message);
  }

  return { text: accText, usage, finishReason };
}

module.exports = { selectProvider, consumeProviderStream };
