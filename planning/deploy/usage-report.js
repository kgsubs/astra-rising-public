#!/usr/bin/env node
'use strict';

// Usage report for Astra's AI calls.
//   node planning/deploy/usage-report.js
//
// Reads the api_usage table the chat proxy writes to. Every call so far has
// landed inside the free tier (server/services/aiProviders.js is the source
// of truth for the current daily ceilings: Groq 200,000 tokens/day, Gemini
// 20 requests/day), so this reports request and token counts only; it does
// not price them. A per-token price belongs here only once it is verified
// against each provider's own current pricing page for the model actually
// configured (server/services/aiProviders.js PROVIDER_DEFS), not carried
// over from a prior model or provider.

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const Database = require('better-sqlite3');
const path = require('path');

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
} catch (e) {
  console.error(`Could not read usage from ${dbPath}: ${e.message}`);
  process.exit(1);
}

if (!rows.length) {
  console.log(`No AI calls recorded yet (${dbPath}).`);
  process.exit(0);
}

const num = n => n.toLocaleString('en-US');

console.log('');
console.log('DAY         PROVIDER  CALLS      INPUT     OUTPUT      TOTAL');
console.log('----------------------------------------------------------');

const totals = { requests: 0, input: 0, output: 0, tokens: 0 };
for (const r of rows) {
  const input  = r.input_tokens  || 0;
  const output = r.output_tokens || 0;
  totals.requests += r.requests;
  totals.input += input;
  totals.output += output;
  totals.tokens += r.tokens;
  console.log(
    `${r.day}  ${r.provider.padEnd(8)}  ${String(r.requests).padStart(5)}  ${num(input).padStart(9)}  ${num(output).padStart(9)}  ${num(r.tokens).padStart(9)}`
  );
}

console.log('----------------------------------------------------------');
console.log(
  `TOTAL                 ${String(totals.requests).padStart(5)}  ${num(totals.input).padStart(9)}  ${num(totals.output).padStart(9)}  ${num(totals.tokens).padStart(9)}`
);

const perTurn = totals.requests ? totals.tokens / totals.requests : 0;
console.log('');
console.log(`Average per call: ${num(Math.round(perTurn))} tokens`);
console.log('Free tier: these calls bill nothing while inside the daily allowance');
console.log('(Groq 200,000 tokens/day, Gemini 20 requests/day, from');
console.log('server/services/aiProviders.js).');
console.log('');
