#!/usr/bin/env node
'use strict';

// Turns results.json into a single self-contained page: the prompt every model
// received, then what each one wrote back.
//   node report.js  ->  report.html

const fs = require('fs');
const path = require('path');

const DIR  = __dirname;
const DATA = JSON.parse(fs.readFileSync(path.join(DIR, 'results.json'), 'utf8'));
const OUT  = path.join(DIR, 'report.html');

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const words = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const money = n => (n == null ? 'free' : n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(3)}`);
const secs  = ms => (ms == null ? '-' : `${(ms / 1000).toFixed(1)}s`);

const PROVIDER_LABEL = { openai: 'OpenAI', gemini: 'Google Gemini', groq: 'Groq' };

// The narrative is what we are judging; everything else is context.
function narrativeOf(r) {
  const parsed = r.schema && r.schema.parsed;
  if (parsed && typeof parsed.narrative === 'string') return parsed.narrative;
  return null;
}

function choicesOf(r) {
  const parsed = r.schema && r.schema.parsed;
  if (!parsed || !Array.isArray(parsed.choices)) return [];
  return parsed.choices.map(c => (typeof c === 'string' ? c : c && (c.text || c.label || JSON.stringify(c))));
}

const answered = DATA.results.filter(r => r.ok);
const failed   = DATA.results.filter(r => !r.ok);
const spend    = DATA.results.reduce((n, r) => n + (r.cost || 0), 0);

// Ranked by how much prose came back, since that is the question being asked.
const ranked = [...answered].sort((a, b) => words(narrativeOf(b)) - words(narrativeOf(a)));

const summaryRows = ranked.map(r => {
  const n = narrativeOf(r);
  return `<tr>
    <td class="model"><a href="#${esc(r.provider + '-' + r.model)}">${esc(r.model)}</a></td>
    <td>${esc(PROVIDER_LABEL[r.provider] || r.provider)}</td>
    <td class="num">${n ? words(n) : '-'}</td>
    <td class="num">${secs(r.elapsed)}</td>
    <td class="num">${r.usage ? r.usage.completion_tokens : '-'}</td>
    <td class="num">${money(r.cost)}</td>
    <td>${r.schema && r.schema.valid ? '<span class="ok">valid</span>' : '<span class="bad">broken</span>'}</td>
  </tr>`;
}).join('\n');

const cards = ranked.map(r => {
  const narrative = narrativeOf(r);
  const choices = choicesOf(r);
  const badges = [
    `<span class="badge">${esc(PROVIDER_LABEL[r.provider] || r.provider)}</span>`,
    `<span class="badge">${secs(r.elapsed)}</span>`,
    r.usage ? `<span class="badge">${r.usage.completion_tokens} out tokens</span>` : '',
    `<span class="badge">${money(r.cost)}</span>`,
    narrative ? `<span class="badge">${words(narrative)} words</span>` : '',
    r.schema && r.schema.valid
      ? '<span class="badge ok">schema valid</span>'
      : `<span class="badge bad">schema broken: ${esc(r.schema ? r.schema.reason : 'unknown')}</span>`,
  ].filter(Boolean).join(' ');

  const body = narrative
    ? `<div class="narrative">${esc(narrative).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>')}</div>`
    : `<div class="narrative muted">No narrative could be read from this answer.</div>`;

  const choiceList = choices.length
    ? `<ul class="choices">${choices.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`
    : '';

  return `<article class="card" id="${esc(r.provider + '-' + r.model)}">
    <h3>${esc(r.model)}</h3>
    <div class="badges">${badges}</div>
    <p class="paragraph-lead"></p>
    ${body}
    ${choiceList}
    <details><summary>raw answer</summary><pre>${esc(r.text)}</pre></details>
  </article>`;
}).join('\n');

const failedRows = failed.map(r =>
  `<li><strong>${esc(r.model)}</strong> (${esc(PROVIDER_LABEL[r.provider] || r.provider)}) - ${esc(String(r.error).slice(0, 160))}</li>`
).join('\n');

const system = DATA.prompt.messages.find(m => m.role === 'system');
const turns  = DATA.prompt.messages.filter(m => m.role !== 'system');

const html = `<title>Astra model bake-off</title>
<style>
  :root { color-scheme: light dark; --bg:#ffffff; --fg:#1a1a1a; --muted:#666; --line:#e2e2e2; --card:#fafafa; --accent:#b45309; --ok:#15803d; --bad:#b91c1c; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#111827; --fg:#e5e7eb; --muted:#9ca3af; --line:#374151; --card:#1a2231; --accent:#facc15; --ok:#4ade80; --bad:#f87171; }
  }
  :root[data-theme="dark"] { --bg:#111827; --fg:#e5e7eb; --muted:#9ca3af; --line:#374151; --card:#1a2231; --accent:#facc15; --ok:#4ade80; --bad:#f87171; }
  :root[data-theme="light"] { --bg:#ffffff; --fg:#1a1a1a; --muted:#666; --line:#e2e2e2; --card:#fafafa; --accent:#b45309; --ok:#15803d; --bad:#b91c1c; }
  body { background:var(--bg); color:var(--fg); font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; margin:0; padding:2rem 1.25rem 4rem; }
  .wrap { max-width: 60rem; margin: 0 auto; }
  h1 { font-size:1.9rem; margin:0 0 .25rem; }
  h2 { font-size:1.25rem; margin:2.5rem 0 .75rem; border-bottom:1px solid var(--line); padding-bottom:.35rem; }
  h3 { font-size:1.05rem; margin:0 0 .5rem; color:var(--accent); font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
  .sub { color:var(--muted); margin:0 0 1.5rem; }
  table { width:100%; border-collapse:collapse; font-size:.875rem; }
  th, td { text-align:left; padding:.4rem .5rem; border-bottom:1px solid var(--line); }
  th { color:var(--muted); font-weight:600; }
  td.num { text-align:right; font-variant-numeric:tabular-nums; }
  td.model a { color:var(--fg); text-decoration:none; font-family:ui-monospace,monospace; }
  td.model a:hover { color:var(--accent); }
  .scroll { overflow-x:auto; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:.6rem; padding:1rem 1.15rem; margin:1rem 0; }
  .badges { display:flex; flex-wrap:wrap; gap:.35rem; margin-bottom:.85rem; }
  .badge { font-size:.7rem; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); border:1px solid var(--line); border-radius:1rem; padding:.1rem .5rem; }
  .badge.ok, .ok { color:var(--ok); }
  .badge.bad, .bad { color:var(--bad); }
  .narrative { font-size:1.02rem; }
  .narrative.muted { color:var(--muted); font-style:italic; }
  .choices { margin:.85rem 0 0; padding-left:1.1rem; color:var(--muted); font-size:.9rem; }
  details { margin-top:.85rem; }
  summary { cursor:pointer; color:var(--muted); font-size:.8rem; }
  pre { background:var(--bg); border:1px solid var(--line); border-radius:.4rem; padding:.75rem; overflow-x:auto; font-size:.75rem; white-space:pre-wrap; word-break:break-word; }
  ul.failed { color:var(--muted); font-size:.9rem; }
</style>
<div class="wrap">
  <h1>Astra model bake-off</h1>
  <p class="sub">${answered.length} of ${DATA.results.length} models answered the same live game turn, once each. Total spend ${money(spend)}. Ranked by length of narrative returned.</p>

  <h2>The prompt every model received</h2>
  <details><summary>System prompt (${esc(String(system ? system.content.length : 0))} characters)</summary><pre>${esc(system ? system.content : '')}</pre></details>
  <details><summary>Conversation so far (${turns.length} messages)</summary><pre>${esc(turns.map(m => `[${m.role}] ${m.content}`).join('\n\n'))}</pre></details>
  <p class="sub">Player's action this turn: <em>${esc(turns.length ? turns[turns.length - 1].content : '')}</em></p>

  <h2>Summary</h2>
  <div class="scroll"><table>
    <thead><tr><th>Model</th><th>Provider</th><th>Words</th><th>Time</th><th>Out tokens</th><th>Cost</th><th>Format</th></tr></thead>
    <tbody>${summaryRows}</tbody>
  </table></div>

  <h2>What each model wrote</h2>
  ${cards}

  ${failed.length ? `<h2>Did not answer</h2><ul class="failed">${failedRows}</ul>` : ''}
</div>`;

fs.writeFileSync(OUT, html, 'utf8');
console.log(`Wrote ${OUT} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB, ${answered.length} models)`);
