'use strict';

// Live-site smoke check: run after every deploy and once a day.
//
//   npm run smoke                      https://example.com
//   QA_REAL_BASE=http://127.0.0.1:3500 npm run smoke
//
// Starts exactly one real game (the site allows 20 new games an hour per
// address) and plays one real turn, so it spends one AI call. The browser
// checks reuse that game's session instead of starting another. Writes a dated
// report under qa/runs/ and exits 1 if anything failed, or 3 if
// everything checked passed but the AI allowance (or this address's new-game
// limit) stopped the real game.

const fs   = require('fs');
const path = require('path');

const { Reporter }  = require('./lib/report');
const { Browser }   = require('./lib/browser');
const renderChecks  = require('./checks/render');
const { ALLOWANCE_EXIT, isAllowanceError, resetText } = require('./lib/allowance');

const BASE = process.env.QA_REAL_BASE || 'https://example.com';
const ROOT = path.resolve(__dirname, '..');

async function http(method, p, { body, token, raw = false } = {}) {
  const headers = { 'Content-Type': 'application/json', 'X-Astra-Protocol': '2' };
  if (token) headers['X-Session-Token'] = token;
  const res = await fetch(BASE + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json = null;
  if (!raw) { try { json = JSON.parse(text); } catch (_) {} }
  return { status: res.status, text, json, headers: res.headers };
}

function sseEvents(text) {
  return text.split('\n')
    .filter(l => l.startsWith('data: ') && l !== 'data: [DONE]')
    .map(l => { try { return JSON.parse(l.slice(6)); } catch (_) { return null; } })
    .filter(Boolean);
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(ROOT, 'qa/runs', 'smoke-' + stamp);
  fs.mkdirSync(dir, { recursive: true });
  process.env.QA_SHOT_DIR = dir;

  const r = new Reporter(3);
  const browser = new Browser();
  const ctx = { base: BASE, browser };
  let token = null;
  // Set when the AI allowance (Groq or Gemini) is what stopped a check, so the
  // run ends as "skipped, allowance" rather than as a broken site.
  let allowance = null;

  console.log(`Astra live smoke: ${BASE}`);
  console.log(`Run folder: ${dir}`);
  console.log('');

  const step = async (name, fn) => {
    r.startStep(name);
    const tick = r.ticker(name.slice(0, 40));
    let err = null;
    try { await fn(); } catch (e) { err = e; }
    tick.stop();
    return r.endStep(err);
  };

  try {
    await step('The site and its routes answer', async () => {
      const home = await http('GET', '/', { raw: true });
      r.check('home page loads', home.status === 200 && /<div id="root"/.test(home.text), `status ${home.status}`);
      const health = await http('GET', '/api/healthz');
      r.check('health route reports ok', health.status === 200 && health.json?.status === 'ok', `status ${health.status}`);
      const quota = await http('GET', '/api/quota');
      r.check('quota route answers', quota.status === 200 && Array.isArray(quota.json?.providers),
        quota.json ? `exhausted=${quota.json.exhausted}` : `status ${quota.status}`);
      if (quota.json && quota.json.exhausted) {
        allowance = `the live site's AI allowance is used up until ${resetText(quota.json.providers.map(p => p.resetAt).sort()[0])}`;
        console.log(`      [SKIP] ${allowance}; the real game and turn are skipped`);
      } else if (quota.json && quota.json.active) {
        console.log(`      [INFO] AI allowance: ${quota.json.active.id}, about ${quota.json.active.turnsRemaining} turns left today`);
      }
      const chat = await http('POST', '/api/chat', { body: {} });
      r.check('the retired chat route says so', chat.status === 410, `status ${chat.status}`);
    });

    await step('One real new game and one real turn', async () => {
      if (allowance) return;
      const s = await http('POST', '/api/session', { body: {} });
      if (s.status === 429) {
        // The site's 20-new-games-an-hour limit for this address, usually
        // spent by other testing from this server. Not a site fault.
        allowance = `this address has used its new-game allowance, retry after ${s.headers.get('retry-after')}s`;
        console.log(`      [SKIP] ${allowance}`);
        return;
      }
      token = s.json && s.json.token;
      r.check('a new game can be started', s.status === 201 && !!token, `status ${s.status}`);
      if (!token) return;
      const n = await http('POST', '/api/game/new', { token, body: { character_id: 'skrix', adventure_id: 'ghost_station', display_name: 'Smoke Check' } });
      if (n.status !== 200 && isAllowanceError(n.json?.code, n.json?.error)) {
        allowance = `AI allowance hit at session zero: ${n.json.code} ${n.json.error}`;
        console.log(`      [SKIP] ${allowance}`);
        return;
      }
      r.check('session zero offers three openings', n.status === 200 && n.json?.hooks?.length === 3, `status ${n.status} ${n.json?.error || ''}`);
      if (n.status !== 200) return;
      const b = await http('POST', '/api/game/begin', { token, body: { hook_index: 0 } });
      r.check('the adventure begins', b.status === 200 && b.json?.state?.meta?.initialized === true, `status ${b.status}`);
      const t = await http('POST', '/api/turn', { token, body: { turn: 1, text: 'I look around carefully.' } });
      const events = sseEvents(t.text);
      const turn = events.find(e => e.type === 'astra_turn');
      const err = events.find(e => e.type === 'astra_error');
      if (!turn && err && isAllowanceError(err.code, err.message)) {
        allowance = `AI allowance hit on the first turn: ${err.code} ${err.message}`;
        console.log(`      [SKIP] ${allowance}`);
        return;
      }
      r.check('the first turn is narrated', !!turn && (turn.narrative || '').length > 40,
        turn ? turn.narrative.replace(/\s+/g, ' ').slice(0, 100) : JSON.stringify(err || t.json || t.status).slice(0, 160));
      r.check('the first turn offers choices', !!turn && Array.isArray(turn.choices) && turn.choices.length > 0, turn && `${turn.choices.length} choices`);
    });

    await step('The title font and starfield render on the live site', async () => {
      // Reuse the game above so these page loads start no new sessions.
      browser.open(BASE + '/api/healthz');
      if (token) browser.eval(`localStorage.setItem('sf_session_token', ${JSON.stringify(token)}); return true;`);
      await renderChecks.run(r, ctx);
      browser.setViewport(1280, 820);
      browser.screenshot(path.join(dir, 'landing.png'));
    });
  } finally {
    browser.close();
  }

  const result = r.summary();
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ mode: 'smoke', base: BASE, allowance, ...r.toJSON() }, null, 2) + '\n');
  console.log(`Report: ${path.join(dir, 'report.json')}`);
  if (result.ok && allowance) console.log(`Site checks passed; real-AI part skipped: ${allowance}`);
  process.exit(!result.ok ? 1 : allowance ? ALLOWANCE_EXIT : 0);
}

main().catch(err => {
  console.error('Smoke run could not complete:', err && err.stack ? err.stack : err);
  process.exit(2);
});
