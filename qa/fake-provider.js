'use strict';

// Stand-in AI provider for the QA harness.
//
// Speaks the same OpenAI chat-completions wire format the real providers do, so
// server.js talks to it without knowing the difference: point GEMINI_URL and
// GROQ_URL at it. Answers are canned, so a QA run is instant, free and
// identical every time, and the metered free tier is never touched.
//
// It also fakes the ways a real provider misbehaves. POST /__mode { mode } sets
// the next behaviour; see MODES below. The control endpoint lives on the same
// listener so the runner needs only one port.

const http = require('http');
const fs   = require('fs');
const path = require('path');

const FIXTURES = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/turns.json'), 'utf8'));

const MODES = [
  'ok',          // canned, valid answers
  'stall',       // accept the connection, then never speak (drives the turn timeout)
  'stall_mid',   // start streaming, then go quiet halfway (drives the chunk timeout)
  'bad_request', // 400, the shape Gemini returns for an empty conversation
  'busy',        // 429 with a short retry window
  'daily_limit', // 429 whose body reads as the day's quota being gone
  'server_error',// 500
  'malformed',   // 200 whose content is not the JSON the client expects
  'truncated',   // 200 whose JSON is cut off mid-object
];

function createFakeProvider({ port = 0, log = () => {} } = {}) {
  let mode = 'ok';
  let turnIndex = 0;
  const calls = [];

  function nextTurn(body) {
    const text = JSON.stringify(body.messages || []);
    // Session zero is the only call that asks for a campaign spine.
    if (/Begin Session Zero|SessionZeroResponse/i.test(text)) {
      return { kind: 'session_zero', payload: FIXTURES.sessionZero };
    }
    // "Ask GM:" turns are answered out of character.
    if (/"content":"Ask GM:/i.test(text)) {
      return { kind: 'turn', payload: FIXTURES.turns.find(t => t._qa_name === 'ooc') };
    }
    const turns = FIXTURES.turns.filter(t => t._qa_name !== 'ooc');
    const picked = turns[turnIndex % turns.length];
    turnIndex += 1;
    return { kind: 'turn', payload: picked };
  }

  function bodyText(payload) {
    const clean = { ...payload };
    delete clean._qa_name;
    return JSON.stringify(clean);
  }

  function sendJson(res, status, obj) {
    const buf = Buffer.from(JSON.stringify(obj));
    res.writeHead(status, { 'content-type': 'application/json', 'content-length': buf.length });
    res.end(buf);
  }

  function errorFor(res, activeMode) {
    if (activeMode === 'bad_request') {
      return sendJson(res, 400, [{ error: {
        code: 400, status: 'INVALID_ARGUMENT',
        message: '* GenerateContentRequest.contents: contents is not specified\n',
      } }]);
    }
    if (activeMode === 'busy') {
      res.setHeader('retry-after', '7');
      return sendJson(res, 429, { error: { message: 'Rate limit reached. Try again in 7s.', type: 'rate_limit_exceeded' } });
    }
    if (activeMode === 'daily_limit') {
      return sendJson(res, 429, { error: {
        code: 429, status: 'RESOURCE_EXHAUSTED',
        message: 'You exceeded your current quota. Quota exceeded for metric: requests per day.',
      } });
    }
    if (activeMode === 'server_error') {
      return sendJson(res, 500, { error: { code: 500, message: 'An internal error has occurred.' } });
    }
    return false;
  }

  // Chunk the answer the way a real model streams it, so the client's
  // partial-JSON extraction is exercised rather than handed one whole blob.
  function chunksOf(text, size = 24) {
    const out = [];
    for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
    return out;
  }

  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', d => { raw += d; });
    req.on('end', () => {
      if (req.method === 'POST' && req.url.startsWith('/__mode')) {
        let requested;
        try { requested = JSON.parse(raw).mode; } catch (_) { requested = null; }
        if (!MODES.includes(requested)) return sendJson(res, 400, { error: 'unknown mode', modes: MODES });
        mode = requested;
        log(`[fake-ai] mode=${mode}`);
        return sendJson(res, 200, { mode });
      }
      if (req.method === 'GET' && req.url.startsWith('/__calls')) {
        return sendJson(res, 200, { calls, mode, turnIndex });
      }
      if (req.method === 'POST' && req.url.startsWith('/__reset')) {
        mode = 'ok'; turnIndex = 0; calls.length = 0;
        return sendJson(res, 200, { ok: true });
      }

      let body = {};
      try { body = JSON.parse(raw || '{}'); } catch (_) {}
      calls.push({ at: Date.now(), mode, stream: body.stream === true, messages: (body.messages || []).length });

      const activeMode = mode;

      if (activeMode === 'stall') return; // socket held open, nothing ever written

      if (errorFor(res, activeMode) !== false) return;

      const { kind, payload } = nextTurn(body);
      let content = bodyText(payload);
      if (activeMode === 'malformed') content = 'I am afraid I cannot answer that in JSON.';
      if (activeMode === 'truncated') content = content.slice(0, Math.floor(content.length * 0.6));

      const usage = { prompt_tokens: 1200, completion_tokens: 400, total_tokens: 1600 };

      if (body.stream !== true) {
        return sendJson(res, 200, {
          id: 'qa-' + calls.length, object: 'chat.completion',
          choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }],
          usage,
        });
      }

      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      });
      const parts = chunksOf(content);
      const half = Math.floor(parts.length / 2);
      let i = 0;
      const tick = setInterval(() => {
        if (activeMode === 'stall_mid' && i >= half) { clearInterval(tick); return; } // stop writing, hold the socket
        if (i >= parts.length) {
          clearInterval(tick);
          res.write(`data: ${JSON.stringify({ choices: [{ delta: {} , finish_reason: 'stop' }], usage })}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        }
        res.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: parts[i] } }] })}\n\n`);
        i += 1;
      }, 5);
      res.on('close', () => clearInterval(tick));
      // Session zero and turns share the same path; kind is informational.
      void kind;
    });
  });

  return {
    server,
    modes: MODES,
    listen() {
      return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server.address().port)));
    },
    close() {
      return new Promise(resolve => server.close(() => resolve()));
    },
  };
}

module.exports = { createFakeProvider, MODES };

// Runnable on its own for manual poking: node qa/fake-provider.js 3599
if (require.main === module) {
  const p = parseInt(process.argv[2], 10) || 0;
  const fake = createFakeProvider({ port: p, log: console.log });
  fake.listen().then(actual => console.log(`fake provider on http://127.0.0.1:${actual}`));
}
