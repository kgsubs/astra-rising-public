'use strict';

// Regression guard for the mechanism every test file above relies on: a
// real .env file dropped in the working directory must never repopulate a
// key that has been intentionally blanked. dotenv only fills in a variable
// that is entirely absent from process.env; deleting a key (rather than
// setting it to '') leaves that opening. This spins up a throwaway
// directory with its own .env carrying a real-looking key, blanks the key
// the way every test file here does, loads dotenv exactly as server.js
// does, and proves the real-looking key never survives. A "trap" HTTP
// server stands in for a real provider and fails the test if it is ever
// hit, in case any code path along the way tried to reach the URL anyway.

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

function startTrap() {
  let hits = 0;
  const server = http.createServer((req, res) => {
    hits += 1;
    res.writeHead(500);
    res.end('trap hit: a real provider URL was reached from a test');
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({
      port: server.address().port,
      hits: () => hits,
      close: () => new Promise((r) => server.close(r)),
    }));
  });
}

test('a real-looking key in .env never survives blanking the key before dotenv loads, and the trap URL is never reached', async () => {
  const trap = await startTrap();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'astra-no-real-provider-'));
  try {
    // Stands in for a real .env accidentally present in the working directory.
    fs.writeFileSync(path.join(tmpDir, '.env'), [
      'GEMINI_API_KEY=REAL_LOOKING_GEMINI_KEY_DO_NOT_USE',
      'GROQ_API_KEY=REAL_LOOKING_GROQ_KEY_DO_NOT_USE',
      '',
    ].join('\n'));

    const trapUrl = `http://127.0.0.1:${trap.port}`;
    const probe = `
      process.chdir(${JSON.stringify(tmpDir)});
      process.env.GEMINI_API_KEY = '';
      process.env.GROQ_API_KEY = '';
      process.env.GEMINI_URL = ${JSON.stringify(trapUrl)};
      process.env.GROQ_URL = ${JSON.stringify(trapUrl)};
      require('dotenv').config();
      const results = {
        geminiKey: process.env.GEMINI_API_KEY,
        groqKey: process.env.GROQ_API_KEY,
        geminiUrl: process.env.GEMINI_URL,
        groqUrl: process.env.GROQ_URL,
      };
      const { configuredProviders } = require(${JSON.stringify(path.join(__dirname, '..', 'server/services/aiProviders'))});
      results.configured = configuredProviders().map((p) => p.id);
      process.stdout.write(JSON.stringify(results));
    `;
    // Written under the repo so require('dotenv') and require('./aiProviders')
    // resolve normally; the script itself chdir()s to tmpDir so dotenv reads
    // the throwaway .env there, the way server.js reads whatever .env sits
    // next to it in production.
    const scriptPath = path.join(__dirname, '.no-real-provider-probe.js');
    fs.writeFileSync(scriptPath, probe);

    const { execFileSync } = require('child_process');
    let out;
    try {
      out = execFileSync(process.execPath, [scriptPath], {
        env: { PATH: process.env.PATH },
        encoding: 'utf8',
      });
    } finally {
      fs.rmSync(scriptPath, { force: true });
    }
    const results = JSON.parse(out);

    expect(results.geminiKey).toBe('');
    expect(results.groqKey).toBe('');
    expect(results.geminiUrl).toBe(trapUrl);
    expect(results.groqUrl).toBe(trapUrl);
    // Blanked keys mean neither provider is configured at all.
    expect(results.configured).toEqual([]);
    expect(trap.hits()).toBe(0);
  } finally {
    await trap.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
