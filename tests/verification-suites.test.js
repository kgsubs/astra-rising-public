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
const path = require('path');

const SUITES = [
  ['rule loader', 'check_rules.js'],
  ['rules engine', 'ruleEngine.test.js'],
  ['prompt rules injector', 'promptRulesInjector.test.js'],
  ['rules endpoints', 'smoke_a1_a5.js'],
  ['rules injection into /api/chat', 'smoke_c1_rules_injection.js'],
  ['phase two regression', 'regression.js'],
];

describe('standalone verification suites', () => {
  for (const [label, file] of SUITES) {
    test(`${label} (server/tests/${file})`, () => {
      const script = path.join(__dirname, '..', 'server', 'tests', file);
      try {
        execFileSync(process.execPath, [script], { encoding: 'utf8', timeout: 60000, stdio: 'pipe' });
      } catch (err) {
        // The script's own output names which condition failed; surfacing it
        // here is the difference between a useful failure and "exit code 1".
        const out = `${err.stdout || ''}${err.stderr || ''}`.trim();
        throw new Error(`${file} failed\n\n${out.split('\n').slice(-25).join('\n')}`);
      }
    }, 70000);
  }
});
