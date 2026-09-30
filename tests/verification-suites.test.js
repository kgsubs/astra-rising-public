'use strict';

// The standalone verification suites in server/tests/ were written one per
// build packet, each a plain Node script that asserts its own conditions and
// exits non-zero on failure. They predate the Jest suites and cover different
// ground: the rules engine's arithmetic, the prompt the model actually
// receives, and a full phase-two regression pass.
//
// They stay in their original form (that record is the point) but they run
// here, so `npm test` is the whole story and nothing that looks like a test
// sits outside the runner.

const { execFileSync } = require('child_process');
const os   = require('os');
const path = require('path');

// Each suite requires server.js, which reads DB_PATH from the environment , 
// without an override that could be a real database file. They get their own
// throwaway file instead, and rate limits high enough that a suite is not
// throttled by its own traffic.
function suiteEnv(file) {
  const env = {
    ...process.env,
    DB_PATH: path.join(os.tmpdir(), `astra-verify-${process.pid}-${file.replace(/\W/g, '')}.db`),
    RATE_LIMIT_MAX: '100000',
    SESSION_RATE_LIMIT_MAX: '100000',
  };
  // None of these suites is allowed to reach a real provider. Most never call
  // /api/chat with a valid session at all; the one that does
  // (smoke_c1_rules_injection.js) sets its own key and its own local stub URL
  // for that single test. Keys are blanked to '' rather than deleted: dotenv
  // only fills in a variable that is entirely absent from process.env, so a
  // deleted key would be silently repopulated from a real .env file in this
  // repo's directory, while an explicit '' is left alone. The URLs are
  // pointed at an address nothing listens on, so even a leaked real key can
  // reach no provider.
  env.GEMINI_API_KEY = '';
  env.GROQ_API_KEY = '';
  env.GEMINI_URL = 'http://127.0.0.1:1/no-provider-here';
  env.GROQ_URL = 'http://127.0.0.1:1/no-provider-here';
  return env;
}

const SUITES = [
  ['rule loader', 'check_rules.js'],
  ['rules engine', 'ruleEngine.test.js'],
  ['prompt rules injector', 'promptRulesInjector.test.js'],
  ['rules endpoints', 'smoke_a1_a5.js'],
  ['rules injection into /api/chat', 'smoke_c1_rules_injection.js'],
  ['phase two regression', 'regression.js'],
];

afterAll(() => {
  const fs = require('fs');
  for (const [, file] of SUITES) {
    const base = suiteEnv(file).DB_PATH;
    for (const f of [base, `${base}-wal`, `${base}-shm`]) { try { fs.unlinkSync(f); } catch (_) {} }
  }
});

describe('standalone verification suites', () => {
  for (const [label, file] of SUITES) {
    test(`${label} (server/tests/${file})`, () => {
      const script = path.join(__dirname, '..', 'server', 'tests', file);
      try {
        execFileSync(process.execPath, [script], { encoding: 'utf8', timeout: 60000, stdio: 'pipe', env: suiteEnv(file) });
      } catch (err) {
        // The script's own output names which condition failed; surfacing it
        // here is the difference between a useful failure and "exit code 1".
        const out = `${err.stdout || ''}${err.stderr || ''}`.trim();
        throw new Error(`${file} failed\n\n${out.split('\n').slice(-25).join('\n')}`);
      }
    }, 70000);
  }
});
