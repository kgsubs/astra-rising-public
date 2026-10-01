'use strict';

// Real-model evals: does the live AI still follow the game's contract?
//
//   EVAL_ENV_FILE=/path/to/.env npm run eval         Groq only (the default)
//   EVAL_PROVIDERS=groq,gemini ... npm run eval      Groq, with Gemini as backup
//   EVAL_REPEAT=5 ... npm run eval                    more runs per scenario
//
// Boots this checkout's own server on a scratch port and a scratch database
// with the real provider keys, then plays scripted situations through the
// real routes. So every prompt is the one the server builds, and every reply
// goes through the server's own parser (modelSchema) and rules (resolveTurn):
// what is graded is what a player would get. Each repeat costs about 5 AI
// calls. Groq's free tier allows 8,000 tokens a minute, so a busy reply is
// waited out, not failed. Run it before a release and weekly, at a quiet hour:
// it shares the provider allowance with the live site.

const { spawn } = require('child_process');
const fs        = require('fs');
const os        = require('os');
const path      = require('path');
const Database  = require('better-sqlite3');
const dotenv    = require('dotenv');

const { Reporter }   = require('../qa/lib/report');
const { ALLOWANCE_EXIT, isAllowanceError, liveHeadroom, resetText } = require('../qa/lib/allowance');
const stateStore     = require('../server/services/stateStore');
const { getSession } = require('../db');

const ROOT    = path.resolve(__dirname, '..');
const REPEAT  = Number(process.env.EVAL_REPEAT || 3);
const ORDER   = process.env.EVAL_PROVIDERS || 'groq';
const ENVFILE = process.env.EVAL_ENV_FILE || path.join(ROOT, '.env');
// The keys are shared with the live site, whose meter cannot see these calls.
// Refuse to start unless the live site would still have this much left after
// the run. Measured cost of one repeat is printed at the end of every run.
const LIVE_BASE = process.env.EVAL_LIVE_BASE || 'https://example.com';
const MIN_GROQ_TOKENS_LEFT = Number(process.env.EVAL_MIN_GROQ_TOKENS || 100000);
const MIN_GEMINI_REQUESTS_LEFT = Number(process.env.EVAL_MIN_GEMINI_REQUESTS || 10);

// Mechanics the player must never see as numbers in the story.
const RAW_NUMBERS = /\b(d100|d10|roll(ed)?( a| of)? \d+|target( number)?( of)? \d+|\d+\s*(%|points? of damage|damage|hp|sta|seu|xp)\b)/i;
const ATTACK_WORDS = /\b(attack|shoot|shot|fire[sd]?|lunge|swing|strike)/i;

function readKeys() {
  const fromFile = fs.existsSync(ENVFILE) ? dotenv.parse(fs.readFileSync(ENVFILE)) : {};
  const pick = k => process.env[k] || fromFile[k] || '';
  return { GROQ_API_KEY: pick('GROQ_API_KEY'), GEMINI_API_KEY: pick('GEMINI_API_KEY'), GROQ_MODEL: pick('GROQ_MODEL'), GEMINI_MODEL: pick('GEMINI_MODEL') };
}

function startServer(port, dbPath, logFile, keys) {
  const env = {
    PATH: process.env.PATH, HOME: process.env.HOME,
    PORT: String(port), DB_PATH: dbPath, AI_PROVIDER_ORDER: ORDER,
    ...Object.fromEntries(Object.entries(keys).filter(([, v]) => v)),
    RATE_LIMIT_MAX: '10000', SESSION_RATE_LIMIT_MAX: '10000', IP_RATE_LIMIT_MAX: '10000', SESSION_DAILY_RATE_LIMIT_MAX: '10000',
    TRUST_PROXY: '',
  };
  const out = fs.openSync(logFile, 'a');
  return spawn(process.execPath, ['server.js'], { cwd: ROOT, env, stdio: ['ignore', out, out] });
}

async function waitForServer(base) {
  const deadline = Date.now() + 30000;
  for (;;) {
    try { if ((await fetch(base + '/api/healthz')).ok) return; } catch (_) {}
    if (Date.now() > deadline) throw new Error(`server did not come up at ${base}`);
    await new Promise(r => setTimeout(r, 300));
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function client(base) {
  async function call(method, p, { token, body } = {}) {
    const headers = { 'Content-Type': 'application/json', 'X-Astra-Protocol': '2' };
    if (token) headers['X-Session-Token'] = token;
    const res = await fetch(base + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch (_) {}
    const events = text.split('\n').filter(l => l.startsWith('data: ') && l !== 'data: [DONE]')
      .map(l => { try { return JSON.parse(l.slice(6)); } catch (_) { return null; } }).filter(Boolean);
    return { status: res.status, json, events };
  }
  // A busy provider (the per-minute token cap) is waited out and the same
  // turn resent; the server keeps its rolled sheet, so nothing is re-rolled.
  async function withBusyRetry(fn, busyOf) {
    for (let attempt = 0; ; attempt++) {
      const res = await fn();
      const wait = busyOf(res);
      if (wait == null || attempt >= 5) return res;
      await sleep((Math.min(Math.max(wait, 5), 70) + 2) * 1000);
    }
  }
  return {
    session: async () => (await call('POST', '/api/session', { body: {} })).json.token,
    sessionZero: token => withBusyRetry(
      () => call('POST', '/api/game/new', { token, body: { character_id: 'skrix', adventure_id: 'ghost_station', display_name: 'Eval Runner' } }),
      // Only a short block is worth waiting out; a spent day is reported.
      r => (r.status === 429 && r.json && /BUSY/.test(r.json.code || '') ? r.json.retryAfterSeconds || 30 : null)),
    begin: token => call('POST', '/api/game/begin', { token, body: { hook_index: 0 } }),
    turn: (token, turn, text) => withBusyRetry(
      () => call('POST', '/api/turn', { token, body: { turn, text } }),
      r => { const e = r.events.find(x => x.type === 'astra_error'); return e && /BUSY/.test(e.code || '') ? (e.retryAfterSeconds || 30) : null; }),
  };
}

// Put a known situation in front of the model: same state the server built at
// "begin", with the scene summary replaced.
function seedScene(db, token, header, summary) {
  const id = getSession(db, token).id;
  const state = stateStore.load(db, id);
  state.scene = { ...state.scene, header, summary };
  stateStore.commit(db, id, state);
}

function copySetup(db, fromToken, toToken) {
  const from = stateStore.load(db, getSession(db, fromToken).id);
  stateStore.commit(db, getSession(db, toToken).id, from);
}

const SCENARIOS = [
  {
    name: 'a hostile who attacks starts combat',
    header: 'Corridor C',
    summary: 'A raider in a pressure suit stands ten meters down the corridor, blaster raised and aimed at the player. It is about to fire.',
    text: 'The raider fires at me. I dive behind a crate and shoot back.',
    grade: t => ({ pass: t.state.scene.in_combat === true, why: `in_combat=${t.state.scene.in_combat}` }),
  },
  {
    name: 'a fight the AI narrates starts combat, and never hurts through hazard',
    header: 'Cargo Bay',
    summary: 'The cargo bay is dark. Two armed pirates are hiding behind the crates, weapons ready, waiting to ambush whoever walks in.',
    text: 'I walk into the middle of the cargo bay.',
    // The pirates may hold back; that is fine. If the story has anyone
    // attacking, combat must have started, and a hazard roll must not stand
    // in for their attack.
    grade: t => {
      const hazard = (t.dice_rolls || []).some(d => /^Hazard/.test(d.description));
      const fight = ATTACK_WORDS.test(t.narrative || '');
      return { pass: !hazard && (t.state.scene.in_combat === true || !fight), why: `in_combat=${t.state.scene.in_combat} hazard=${hazard} attack_words=${fight}` };
    },
  },
  {
    name: 'a skill check is told as a story, with no raw numbers',
    header: 'Security Door',
    summary: 'A sealed security door with a scorched keypad blocks the way to the reactor.',
    text: 'I try to hack the keypad to open the door.',
    grade: () => ({ pass: true, why: 'graded by the story and parse checks' }),
  },
  {
    name: 'Ask GM answers and changes nothing',
    header: 'Security Door',
    summary: 'A sealed security door with a scorched keypad blocks the way to the reactor.',
    text: 'Ask GM: how much stamina do I have left?',
    askGM: true,
    grade: (t, before) => {
      const c = t.state.character;
      const same = c.stamina.current === before.stamina.current && c.credits === before.credits
        && JSON.stringify(c.seu) === JSON.stringify(before.seu) && JSON.stringify(c.xp) === JSON.stringify(before.xp);
      const noRolls = (t.dice_rolls || []).length === 0;
      return { pass: same && noRolls, why: `unchanged=${same} rolls=${(t.dice_rolls || []).length}` };
    },
  },
];

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(ROOT, 'qa/runs', 'eval-' + stamp);
  fs.mkdirSync(dir, { recursive: true });
  const keys = readKeys();
  const r = new Reporter(REPEAT + 2);
  console.log(`Astra model evals: providers ${ORDER}, ${REPEAT} repeat${REPEAT === 1 ? '' : 's'}, about ${REPEAT * 5} AI calls`);
  console.log(`Run folder: ${dir}`);
  console.log('');

  const dbPath = path.join(os.tmpdir(), `astra-eval-${process.pid}.db`);
  const port = 3700 + (process.pid % 200);
  const base = `http://127.0.0.1:${port}`;
  let server = null;
  let db = null;
  const cases = [];
  const api = client(base);
  let allowance = null;   // set when the AI allowance, not the model, stopped the run
  let usage = null;

  const step = async (name, fn) => {
    r.startStep(name);
    const tick = r.ticker(name.slice(0, 40));
    let err = null;
    try { await fn(); } catch (e) { err = e; }
    tick.stop();
    return r.endStep(err);
  };

  try {
    await step('Boot this checkout against the real AI and a scratch database', async () => {
      const needed = ORDER.split(',').map(p => p.trim().toUpperCase() + '_API_KEY');
      const missing = needed.filter(k => !keys[k]);
      if (missing.length) throw new Error(`missing ${missing.join(', ')} (set it, or point EVAL_ENV_FILE at an .env that has it)`);
      server = startServer(port, dbPath, path.join(dir, 'server.log'), keys);
      await waitForServer(base);
      db = new Database(dbPath);
      r.check('app is up on a scratch port with a scratch database', true, base);
    });

    await step('Check there is AI allowance to spare for a test run', async () => {
      const h = await liveHeadroom(LIVE_BASE);
      if (!h.ok) { console.log(`      [INFO] could not read the live site's allowance (${h.reason}); going ahead`); return; }
      const short = [];
      if (h.exhausted) short.push(`the live site's allowance is used up until ${resetText(h.resetAt)}`);
      if (h.groqTokens != null && h.groqTokens < MIN_GROQ_TOKENS_LEFT) short.push(`Groq has about ${h.groqTokens} tokens left today, under the ${MIN_GROQ_TOKENS_LEFT} kept for players`);
      if (/gemini/.test(ORDER) && h.geminiRequests != null && h.geminiRequests < MIN_GEMINI_REQUESTS_LEFT) short.push(`Gemini has ${h.geminiRequests} requests left today, under the ${MIN_GEMINI_REQUESTS_LEFT} kept for players`);
      if (short.length) { allowance = short.join('; '); console.log(`      [SKIP] ${allowance}`); return; }
      console.log(`      [INFO] live site has about ${h.groqTokens} Groq tokens and ${h.groqRequests} Groq requests left today${/gemini/.test(ORDER) ? `, ${h.geminiRequests} Gemini requests` : ''}`);
    });

    for (let i = 1; i <= REPEAT && !allowance; i++) {
      await step(`Run ${i} of ${REPEAT}: session zero, then every scenario on a fresh game`, async () => {
        const setupToken = await api.session();
        const sz = await api.sessionZero(setupToken);
        if (sz.status !== 200 && isAllowanceError(sz.json && sz.json.code, sz.json && sz.json.error)) {
          allowance = `AI allowance hit at session zero: ${sz.json.code} ${sz.json.error}`;
          console.log(`      [SKIP] ${allowance}; stopping the run`);
          return;
        }
        const szOk = sz.status === 200 && Array.isArray(sz.json && sz.json.hooks) && sz.json.hooks.length === 3;
        cases.push({ run: i, scenario: 'session zero', pass: szOk, detail: `status ${sz.status} ${(sz.json && sz.json.error) || ''}` });
        r.check('session zero parses and offers three openings', szOk, `status ${sz.status} ${(sz.json && sz.json.error) || ''}`);
        if (!szOk) return;

        for (const sc of SCENARIOS) {
          const token = await api.session();
          copySetup(db, setupToken, token);
          const began = await api.begin(token);
          if (began.status !== 200) { r.check(`${sc.name}: game begins`, false, `status ${began.status}`); continue; }
          seedScene(db, token, sc.header, sc.summary);
          const before = began.json.state.character;
          const res = await api.turn(token, 1, sc.text);
          const t = res.events.find(e => e.type === 'astra_turn');
          const err = res.events.find(e => e.type === 'astra_error');
          if (!t && err && isAllowanceError(err.code, err.message)) {
            allowance = `AI allowance hit during "${sc.name}": ${err.code} ${err.message}`;
            console.log(`      [SKIP] ${allowance}; stopping the run`);
            return;
          }
          const parsed = !!t && !t._repaired;
          r.check(`${sc.name}: the reply parses`, parsed, t ? (t._repaired ? 'repaired' : 'clean') : JSON.stringify(err || res.json || res.status).slice(0, 140));
          if (!t) { cases.push({ run: i, scenario: sc.name, pass: false, detail: 'no turn' }); continue; }
          const g = sc.grade(t, before);
          r.check(sc.name, g.pass, g.why);
          let storyOk = true;
          if (!sc.askGM) {
            const hit = (t.narrative || '').match(RAW_NUMBERS);
            storyOk = !hit;
            r.check(`${sc.name}: the story states no raw numbers`, storyOk, hit ? `"${hit[0]}"` : '');
          }
          cases.push({
            run: i, scenario: sc.name, pass: parsed && g.pass && storyOk, detail: g.why,
            attackWords: ATTACK_WORDS.test(t.narrative || ''), narrative: t.narrative, dice_rolls: t.dice_rolls, state_updates: t.state_updates,
          });
        }
      });
    }
    // What this run spent, from the scratch server's own meter.
    try {
      const q = await (await fetch(base + '/api/quota')).json();
      usage = Object.fromEntries((q.providers || []).map(p => [p.id, { requests: p.requestsUsed, tokens: p.tokensUsed }]));
    } catch (_) {}
  } finally {
    if (db) db.close();
    if (server) server.kill('SIGTERM');
    for (const f of [dbPath, dbPath + '-wal', dbPath + '-shm']) { try { fs.unlinkSync(f); } catch (_) {} }
  }

  // The fallback retry: how often a reply could not be read and went to the
  // other provider, taken from the server's own log.
  const log = fs.existsSync(path.join(dir, 'server.log')) ? fs.readFileSync(path.join(dir, 'server.log'), 'utf8') : '';
  const retries = (log.match(/parse_failed .*\(retry\)/g) || []).length;
  const firstFails = (log.match(/parse_failed (?!.*\(retry\))/g) || []).length;
  console.log('');
  console.log(`Unreadable first replies: ${firstFails}; still unreadable after the retry: ${retries}`);
  const byScenario = {};
  for (const c of cases) { const s = byScenario[c.scenario] || (byScenario[c.scenario] = { pass: 0, total: 0 }); s.total++; if (c.pass) s.pass++; }
  for (const [name, s] of Object.entries(byScenario)) console.log(`  ${s.pass}/${s.total}  ${name}`);

  if (usage) console.log(`AI used by this run: ${Object.entries(usage).map(([id, u]) => `${id} ${u.requests} requests, ${u.tokens} tokens`).join('; ')}`);
  const result = r.summary();
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ mode: 'eval', providers: ORDER, repeat: REPEAT, allowance, usage, byScenario, firstFails, retries, cases, ...r.toJSON() }, null, 2) + '\n');
  console.log(`Report: ${path.join(dir, 'report.json')}`);
  if (allowance) console.log(`Stopped by the AI allowance, not by a failure: ${allowance}`);
  process.exit(!result.ok ? 1 : allowance ? ALLOWANCE_EXIT : 0);
}

main().catch(err => {
  console.error('Eval run could not complete:', err && err.stack ? err.stack : err);
  process.exit(2);
});
