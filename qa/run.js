'use strict';

// One command that plays the whole product and says what worked.
//
//   npm run qa            fake AI, scratch database, scratch port  (free, deterministic)
//   npm run qa -- --real  the live site and the real providers     (spends quota)
//
// The fake-AI run is the one to trust for pass/fail: it is repeatable and costs
// nothing. The --real run is a confidence pass before a release, and it skips
// the fault-injection layer because those faults cannot be induced upstream.

const { spawn }  = require('child_process');
const fs         = require('fs');
const os         = require('os');
const path       = require('path');

const { Reporter }         = require('./lib/report');
const { Browser }          = require('./lib/browser');
const { createFakeProvider } = require('./fake-provider');

const apiChecks        = require('./checks/api');
const journeyChecks    = require('./checks/journey');
const stateChecks      = require('./checks/state');
const checkpointChecks = require('./checks/checkpoint');
const resilienceChecks = require('./checks/resilience');
const renderChecks     = require('./checks/render');

const REAL      = process.argv.includes('--real');
const KEEP      = process.argv.includes('--keep');
const REAL_BASE = process.env.QA_REAL_BASE || 'https://example.com';
const ROOT      = path.resolve(__dirname, '..');
const TURN_TIMEOUT_MS = 6000;   // short on purpose: the stall checks wait on it

const VIEWPORTS = [
  { label: 'phone',   width: 390,  height: 844 },
  { label: 'desktop', width: 1440, height: 900 },
];

function runDir() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(ROOT, 'qa/runs', stamp);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function waitForServer(base, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const res = await fetch(base + '/api/healthz');
      if (res.ok) return true;
    } catch (_) {}
    if (Date.now() > deadline) throw new Error(`server did not come up at ${base}`);
    await new Promise(r => setTimeout(r, 300));
  }
}

// Boot the app the way production does, but pointed at a scratch database and
// the fake provider, on a port nothing else is using.
function startServer({ port, dbPath, fakeUrl, logFile, extraEnv = {} }) {
  const env = {
    ...process.env,
    PORT: String(port),
    DB_PATH: dbPath,
    AI_TURN_TIMEOUT_MS: String(TURN_TIMEOUT_MS),
    AI_PROVIDER_ORDER: 'groq,gemini',
    GEMINI_API_KEY: 'qa-fake-key',
    GROQ_API_KEY: 'qa-fake-key',
    GEMINI_URL: fakeUrl,
    GROQ_URL: fakeUrl,
    // Real free-tier ceilings would make a long run look exhausted.
    GEMINI_REQUESTS_PER_DAY: '100000',
    GROQ_REQUESTS_PER_DAY: '100000',
    GROQ_TOKENS_PER_DAY: '100000000',
    // The journey takes more turns than the production hourly/daily caps allow.
    RATE_LIMIT_MAX: '10000',
    SESSION_RATE_LIMIT_MAX: '10000',
    IP_RATE_LIMIT_MAX: '10000',
    SESSION_DAILY_RATE_LIMIT_MAX: '10000',
    TRUST_PROXY: '',
    // Protocol v2: every roll in the process is this one value, so every
    // check/attack auto-succeeds (the 01-05 rule) and every damage/heal roll
    // is a small, predictable 3, instead of the QA journey depending on
    // whatever crypto.randomInt happens to draw.
    ASTRA_DICE_SCRIPT: '3',
    ...extraEnv,
  };
  const out = fs.openSync(logFile, 'a');
  const child = spawn(process.execPath, ['server.js'], { cwd: ROOT, env, stdio: ['ignore', out, out] });
  return child;
}

async function main() {
  const dir = runDir();
  process.env.QA_SHOT_DIR = dir;

  const layers = REAL ? 5 : 7;
  const steps = layers + (VIEWPORTS.length - 1);
  const r = new Reporter(REAL ? 4 + VIEWPORTS.length : 7 + VIEWPORTS.length);

  console.log(`Astra QA — ${REAL ? 'live site, real providers' : 'local app, fake provider'}`);
  console.log(`Run folder: ${dir}`);
  console.log('');

  let server = null;
  let limited = null;
  let fake   = null;
  let base   = REAL_BASE;
  let fakeBase = null;
  const dbPath = path.join(os.tmpdir(), `astra-qa-${process.pid}.db`);
  const ctx = { turnTimeoutMs: TURN_TIMEOUT_MS };
  const browser = new Browser();
  ctx.browser = browser;

  const step = async (name, fn) => {
    r.startStep(name);
    let err = null;
    try { await fn(); } catch (e) { err = e; }
    return r.endStep(err);
  };

  try {
    if (!REAL) {
      await step('Boot the app against a fake provider and a scratch database', async () => {
        fake = createFakeProvider({ port: 0 });
        const fakePort = await fake.listen();
        fakeBase = `http://127.0.0.1:${fakePort}`;
        ctx.fakeBase = fakeBase;
        r.check('fake provider is listening', !!fakePort, fakeBase);

        const port = 3600 + (process.pid % 300);
        base = `http://127.0.0.1:${port}`;
        server = startServer({ port, dbPath, fakeUrl: fakeBase + '/v1/chat/completions', logFile: path.join(dir, 'server.log') });
        await waitForServer(base);
        r.check('app is up on a scratch port', true, base);
        r.check('app is using a scratch database', fs.existsSync(dbPath), dbPath);
      });
    }
    ctx.base = base;

    await step('Check every API route and its refusals', async () => {
      if (REAL) { r.check('API layer skipped on the live site (it would write real sessions)', true, 'skipped'); return; }
      await apiChecks.run(r, ctx);
    });

    await step('Check the title font and the starfield really render, at four widths and after a resize', async () => {
      await renderChecks.run(r, ctx);
    });

    if (!REAL) {
      await step('A player turned away by the new-game limit is told why and for how long', async () => {
        const port = 3900 + (process.pid % 90);
        const limitedBase = `http://127.0.0.1:${port}`;
        limited = startServer({
          port, dbPath: dbPath + '-limited', fakeUrl: fakeBase + '/v1/chat/completions',
          logFile: path.join(dir, 'server-limited.log'), extraEnv: { SESSION_RATE_LIMIT_MAX: '1' },
        });
        await waitForServer(limitedBase);
        await renderChecks.refusedSession(r, ctx, limitedBase);
      });
    }

    for (const vp of VIEWPORTS) {
      await step(`Play the game end to end at ${vp.label} size (${vp.width}x${vp.height})`, async () => {
        await journeyChecks.run(r, ctx, vp);
      });
    }

    await step('Check the game state the turns produced, and that it survives a reload', async () => {
      if (REAL) { r.check('state layer skipped on the live site', true, 'skipped'); return; }
      await stateChecks.run(r, ctx);
    });

    // Runs on its own fresh session through the API directly, so it neither
    // depends on nor disturbs the shared browser session the other checks
    // use. Must run before the resilience step: that one's last probe
    // (daily_limit) deliberately leaves the fake provider blocked behind it.
    await step('Checkpoint save/restore: a fired shot spends SEU, and a replay after restore does not re-roll', async () => {
      if (REAL) { r.check('checkpoint layer skipped on the live site (it would write real sessions)', true, 'skipped'); return; }
      await checkpointChecks.run(r, ctx);
    });

    if (!REAL) {
      await step('Break the AI on purpose and check the player is told, not stranded', async () => {
        await resilienceChecks.run(r, ctx);
      });
    }
  } finally {
    browser.close();
    if (server) server.kill('SIGTERM');
    if (limited) limited.kill('SIGTERM');
    if (fake) await fake.close();
    if (!KEEP) for (const f of [dbPath, dbPath + '-limited'].flatMap(d => [d, d + '-wal', d + '-shm'])) { try { fs.unlinkSync(f); } catch (_) {} }
  }

  const result = r.summary();
  const report = { mode: REAL ? 'real' : 'fake', base, ...r.toJSON() };
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`Report: ${path.join(dir, 'report.json')}`);
  void steps;
  process.exit(result.ok ? 0 : 1);
}

main().catch(err => {
  console.error('QA run could not complete:', err && err.stack ? err.stack : err);
  process.exit(2);
});
