#!/usr/bin/env node
'use strict';

// Spend report for Astra's AI usage.
//   node planning/deploy/usage-report.js
//
// Reads the api_usage table the chat proxy writes to and prices it. Free-tier
// calls cost nothing; the money column is what the same traffic WOULD cost on
// each provider's paid tier, which is also the real figure if the key's project
// has billing enabled. Verified list prices, 2026-07-25:
//   Gemini 2.5 Flash          $0.30 / 1M input, $2.50 / 1M output
//   Groq llama-3.3-70b        $0.59 / 1M input, $0.79 / 1M output

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const Database = require('better-sqlite3');
const path = require('path');

const PRICES = {
  gemini: { input: 0.30 / 1e6, output: 2.50 / 1e6, label: 'Gemini 2.5 Flash' },
  groq:   { input: 0.59 / 1e6, output: 0.79 / 1e6, label: 'Groq Llama 3.3 70B' },
};

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../astra_rising.db');
const db = new Database(dbPath, { readonly: true });

let rows = [];
try {
  // The input/output split arrived after the table did; a database written by
  // an older server still reports totals only.
  const cols  = db.prepare('PRAGMA table_info(api_usage)').all().map(c => c.name);
  const split = cols.includes('input_tokens') && cols.includes('output_tokens');
  rows = db.prepare(
    `SELECT provider, day, requests, tokens${split ? ', input_tokens, output_tokens' : ''} FROM api_usage ORDER BY day DESC, provider`
  ).all();
  if (!split) console.log('(this database predates the input/output split — costs below are estimated from an 80/20 shape)');
} catch (e) {
  console.error(`Could not read usage from ${dbPath}: ${e.message}`);
  process.exit(1);
}

if (!rows.length) {
  console.log(`No AI calls recorded yet (${dbPath}).`);
  process.exit(0);
}

function cost(row) {
  const p = PRICES[row.provider];
  if (!p) return 0;
  // Older rows predate the input/output split; price them as 80/20, the
  // observed shape of a turn (long prompt, short reply).
  const input  = row.input_tokens  || Math.round(row.tokens * 0.8);
  const output = row.output_tokens || Math.round(row.tokens * 0.2);
  return input * p.input + output * p.output;
}

const money = n => (n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`);
const num   = n => n.toLocaleString('en-US');

console.log('');
console.log('DAY         PROVIDER  CALLS      INPUT     OUTPUT      TOTAL   PAID-TIER COST');
console.log('--------------------------------------------------------------------------');

const totals = { requests: 0, input: 0, output: 0, tokens: 0, cost: 0 };
for (const r of rows) {
  const input  = r.input_tokens  || 0;
  const output = r.output_tokens || 0;
  const c = cost(r);
  totals.requests += r.requests;
  totals.input += input;
  totals.output += output;
  totals.tokens += r.tokens;
  totals.cost += c;
  console.log(
    `${r.day}  ${r.provider.padEnd(8)}  ${String(r.requests).padStart(5)}  ${num(input).padStart(9)}  ${num(output).padStart(9)}  ${num(r.tokens).padStart(9)}   ${money(c).padStart(9)}`
  );
}

console.log('--------------------------------------------------------------------------');
console.log(
  `TOTAL                 ${String(totals.requests).padStart(5)}  ${num(totals.input).padStart(9)}  ${num(totals.output).padStart(9)}  ${num(totals.tokens).padStart(9)}   ${money(totals.cost).padStart(9)}`
);

const perTurn = totals.requests ? totals.tokens / totals.requests : 0;
console.log('');
console.log(`Average per call: ${num(Math.round(perTurn))} tokens, ${money(totals.requests ? totals.cost / totals.requests : 0)}`);
console.log('Free tier: these calls bill nothing while inside the daily allowance');
console.log('(Gemini 250 calls/day, Groq 100k tokens/day). The cost column is what');
console.log('the same traffic costs once a project is on paid billing.');
console.log('');
