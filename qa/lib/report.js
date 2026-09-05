'use strict';

// Progress output for the QA run.
//
// Every step announces itself before it runs and reports OK or FAIL after, with
// a running [N/M] counter and a total at the end. Colour is used only on a TTY
// so the same output survives `npm run qa | tee qa.log`. Long steps get a
// ticker on stderr that rewrites one line, so a pipe captures nothing extra.

const TTY = process.stdout.isTTY === true;
const c = {
  reset: TTY ? '\x1b[0m'  : '',
  dim:   TTY ? '\x1b[2m'  : '',
  red:   TTY ? '\x1b[31m' : '',
  green: TTY ? '\x1b[32m' : '',
  yellow:TTY ? '\x1b[33m' : '',
  bold:  TTY ? '\x1b[1m'  : '',
};

function pad(n, width) { return String(n).padStart(width, ' '); }

class Reporter {
  constructor(totalSteps) {
    this.total = totalSteps;
    this.index = 0;
    this.started = Date.now();
    this.results = [];   // { step, name, ok, detail, ms }
    this.checks = [];    // { step, name, ok, detail }
    this.width = String(totalSteps).length;
  }

  get counter() { return `[${pad(this.index, this.width)}/${this.total}]`; }

  startStep(name) {
    this.index += 1;
    this.stepName = name;
    this.stepStarted = Date.now();
    this.stepChecks = [];
    console.log(`${this.counter} starting step ${this.index}: ${name}`);
  }

  // One assertion inside the current step. Recorded for the report and echoed
  // so a failure names itself the moment it happens.
  check(name, ok, detail = '') {
    const row = { step: this.stepName, name, ok: !!ok, detail: String(detail || '') };
    this.checks.push(row);
    this.stepChecks.push(row);
    const tag = ok ? `${c.green}[OK]${c.reset}` : `${c.red}[FAIL]${c.reset}`;
    console.log(`${' '.repeat(this.counter.length)} ${tag} ${name}${row.detail ? ` ${c.dim}(${row.detail})${c.reset}` : ''}`);
    return ok;
  }

  endStep(err) {
    const ms = Date.now() - this.stepStarted;
    const failed = this.stepChecks.filter(r => !r.ok).length;
    const ok = !err && failed === 0;
    const tag = ok ? `${c.green}[OK]${c.reset}` : `${c.red}[FAIL]${c.reset}`;
    const detail = err ? ` ${c.red}${err.message}${c.reset}`
                       : (failed ? ` ${c.red}${failed} check${failed === 1 ? '' : 's'} failed${c.reset}` : '');
    console.log(`${this.counter} ${tag} ${this.stepName} ${c.dim}(${(ms / 1000).toFixed(1)}s)${c.reset}${detail}`);
    this.results.push({ step: this.stepName, index: this.index, ok, ms, error: err ? err.message : null });
    return ok;
  }

  // A ticker for a step that would otherwise sit silent. Writes to stderr with
  // a carriage return and clears itself, so piped output stays clean.
  ticker(label) {
    if (!process.stderr.isTTY) return { stop() {} };
    const began = Date.now();
    const timer = setInterval(() => {
      const secs = Math.floor((Date.now() - began) / 1000);
      process.stderr.write(`\r${c.dim}    ${label} ${secs}s${c.reset}   `);
    }, 1000);
    return {
      stop() {
        clearInterval(timer);
        process.stderr.write('\r' + ' '.repeat(label.length + 20) + '\r');
      },
    };
  }

  summary() {
    const elapsed = ((Date.now() - this.started) / 1000).toFixed(1);
    const failedChecks = this.checks.filter(r => !r.ok);
    const failedSteps  = this.results.filter(r => !r.ok);
    console.log('');
    console.log(`${c.bold}Checks:${c.reset} ${this.checks.length - failedChecks.length}/${this.checks.length} passed`);
    console.log(`${c.bold}Steps:${c.reset}  ${this.results.length - failedSteps.length}/${this.results.length} passed`);
    if (failedChecks.length) {
      console.log(`${c.red}${c.bold}Failures:${c.reset}`);
      for (const f of failedChecks) console.log(`  ${c.red}-${c.reset} ${f.step} :: ${f.name}${f.detail ? ` (${f.detail})` : ''}`);
    }
    console.log(`${c.bold}Total elapsed:${c.reset} ${elapsed}s`);
    return { ok: failedChecks.length === 0 && failedSteps.length === 0, elapsed, failedChecks, failedSteps };
  }

  toJSON() {
    return {
      startedAt: new Date(this.started).toISOString(),
      elapsedSeconds: Number(((Date.now() - this.started) / 1000).toFixed(1)),
      steps: this.results,
      checks: this.checks,
    };
  }
}

module.exports = { Reporter, colours: c };
