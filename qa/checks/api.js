'use strict';

// Route-level checks: every endpoint server.js exposes, its success shape, and
// the ways it is meant to refuse. These run against the same process the
// browser drives, so a failure here explains a failure there.

async function req(base, method, path, { body, headers = {}, raw = false } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...headers },
    body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
  });
  const text = await res.text();
  let json = null;
  if (!raw) { try { json = JSON.parse(text); } catch (_) {} }
  return { status: res.status, json, text, headers: res.headers };
}

async function run(r, ctx) {
  const { base } = ctx;

  // ── Health and static ──────────────────────────────────────────────────────
  const health = await req(base, 'GET', '/api/healthz');
  r.check('healthz returns ok', health.status === 200 && health.json?.status === 'ok', `status ${health.status}`);

  const index = await req(base, 'GET', '/', { raw: true });
  r.check('index page is served', index.status === 200 && /<div id="root"|astra/i.test(index.text), `status ${index.status}`);

  for (const asset of ['/app.js', '/app.css', '/data/game-data.js', '/vendor/react.production.min.js']) {
    const a = await req(base, 'GET', asset, { raw: true });
    r.check(`asset ${asset} is served`, a.status === 200 && a.text.length > 0, `status ${a.status}`);
  }

  // ── Rules endpoints ────────────────────────────────────────────────────────
  const rules = await req(base, 'GET', '/api/rules');
  r.check('rules index lists loaded rulesets',
    rules.status === 200 && Array.isArray(rules.json?.loaded_rulesets) && rules.json.loaded_rulesets.length === 5,
    `${rules.json?.loaded_rulesets?.length} loaded`);

  const quickRef = await req(base, 'GET', '/api/rules/combat/quick-ref');
  r.check('combat quick-ref returns both blocks',
    quickRef.status === 200 && !!quickRef.json?.quick_checks && !!quickRef.json?.advanced_modifiers);

  const skills = await req(base, 'GET', '/api/rules/skills');
  r.check('skills merge core and expanded', skills.status === 200 && Object.keys(skills.json || {}).length > 5,
    `${Object.keys(skills.json || {}).length} skills`);

  const weapons = await req(base, 'GET', '/api/rules/equipment/weapons');
  r.check('weapons return basic and expanded',
    weapons.status === 200 && !!weapons.json?.basic_ranged && !!weapons.json?.expanded);

  const armor = await req(base, 'GET', '/api/rules/equipment/armor');
  r.check('armor is served', armor.status === 200 && typeof armor.json === 'object');

  const modules = await req(base, 'GET', '/api/rules/optional-modules');
  r.check('optional modules list has ids and names',
    modules.status === 200 && Array.isArray(modules.json?.modules) && modules.json.modules.every(m => m.id && m.name),
    `${modules.json?.modules?.length} modules`);

  const race = await req(base, 'GET', '/api/rules/character/human');
  r.check('character race lookup works', race.status === 200 && !!race.json, `status ${race.status}`);

  const badRace = await req(base, 'GET', '/api/rules/character/nosuchrace');
  r.check('unknown race is refused, not guessed', badRace.status === 404, `status ${badRace.status}`);

  const oneRuleset = await req(base, 'GET', '/api/rules/alpha_dawn_basic');
  r.check('single ruleset is served', oneRuleset.status === 200 && !!oneRuleset.json);

  const badRuleset = await req(base, 'GET', '/api/rules/not_a_ruleset');
  r.check('unknown ruleset is refused', badRuleset.status === 404, `status ${badRuleset.status}`);

  // ── Quota ──────────────────────────────────────────────────────────────────
  const quota = await req(base, 'GET', '/api/quota');
  r.check('quota reports configured providers',
    quota.status === 200 && quota.json?.configured === true && Array.isArray(quota.json.providers),
    `${quota.json?.providers?.length} providers`);
  ctx.quotaAtStart = quota.json;

  // ── Sessions ───────────────────────────────────────────────────────────────
  const created = await req(base, 'POST', '/api/session');
  const token = created.json?.token;
  r.check('session creation returns a token and save code',
    created.status === 201 && !!token && !!created.json?.save_code && !!created.json?.save_code_display,
    created.json?.save_code_display);
  ctx.token = token;

  const fetched = await req(base, 'GET', `/api/session/${token}`);
  r.check('session can be read back', fetched.status === 200 && fetched.json?.save_code === created.json.save_code);

  const missing = await req(base, 'GET', '/api/session/00000000-0000-0000-0000-000000000000');
  r.check('unknown session is refused', missing.status === 404, `status ${missing.status}`);

  const state = { character: { name: 'QA' }, session: { turn_count: 3 } };
  const saved = await req(base, 'PUT', `/api/session/${token}/state`, { body: { state_json: JSON.stringify(state) } });
  r.check('game state saves', saved.status === 200, `status ${saved.status}`);

  const reread = await req(base, 'GET', `/api/session/${token}`);
  r.check('saved state is returned on the next read',
    reread.json?.state_json && JSON.parse(reread.json.state_json).session.turn_count === 3);

  const resumed = await req(base, 'POST', '/api/session/resume', { body: { code: created.json.save_code } });
  r.check('save code resumes the same game',
    resumed.status === 200 && !!resumed.json?.token && !!resumed.json?.state_json,
    `status ${resumed.status}`);

  const badCode = await req(base, 'POST', '/api/session/resume', { body: { code: 'ZZZZZZZZZZ' } });
  r.check('unknown save code is refused', badCode.status === 404, `status ${badCode.status}`);

  const setModules = await req(base, 'POST', `/api/session/${token}/modules`, { body: { modules: ['alternate_combat'] } });
  r.check('optional modules can be set', setModules.status === 200, `status ${setModules.status}`);

  const getModules = await req(base, 'GET', `/api/session/${token}/modules`);
  r.check('optional modules read back',
    getModules.status === 200 && JSON.stringify(getModules.json).includes('alternate_combat'),
    JSON.stringify(getModules.json || {}).slice(0, 80));

  const badModule = await req(base, 'POST', `/api/session/${token}/modules`, { body: { modules: ['not_a_module'] } });
  r.check('an unknown module is refused', badModule.status === 400, `status ${badModule.status}`);

  // The id the list endpoint hands out carries a `gamma_` prefix, so it has to
  // be one this endpoint accepts and stores.
  const advertised = modules.json.modules[0].id;
  const setAdvertised = await req(base, 'POST', `/api/session/${token}/modules`, { body: { modules: [advertised] } });
  r.check('the module id the API advertises is accepted', setAdvertised.status === 200,
    `${advertised} -> ${setAdvertised.status}`);
  const readAdvertised = await req(base, 'GET', `/api/session/${token}/modules`);
  r.check('the advertised id is stored under its plain name',
    JSON.stringify(readAdvertised.json).includes(advertised.replace(/^gamma_/, '')),
    JSON.stringify(readAdvertised.json || {}).slice(0, 80));

  // ── Chat guards ────────────────────────────────────────────────────────────
  const noToken = await req(base, 'POST', '/api/chat', { body: { messages: [{ role: 'user', content: 'hi' }] } });
  r.check('chat without a session token is refused', noToken.status === 401, `status ${noToken.status}`);

  const fakeToken = await req(base, 'POST', '/api/chat', {
    body: { messages: [{ role: 'user', content: 'hi' }] },
    headers: { 'x-session-token': '00000000-0000-0000-0000-000000000000' },
  });
  r.check('chat with an invented token is refused', fakeToken.status === 401, `status ${fakeToken.status}`);

  const emptyMessages = await req(base, 'POST', '/api/chat', {
    body: { system: 'you are a gm', messages: [] },
    headers: { 'x-session-token': token },
  });
  r.check('chat with no conversation is refused before a provider call',
    emptyMessages.status === 400, `status ${emptyMessages.status}`);

  const oversized = await req(base, 'POST', '/api/chat', {
    body: { messages: [{ role: 'user', content: 'x'.repeat(600 * 1024) }] },
    headers: { 'x-session-token': token },
  });
  r.check('oversized prompt is refused with JSON, not an HTML error',
    oversized.status === 413 && !!oversized.json?.error, `status ${oversized.status}`);

  const ok = await req(base, 'POST', '/api/chat', {
    body: { max_tokens: 400, system: 'gm', messages: [{ role: 'user', content: 'Begin.' }] },
    headers: { 'x-session-token': token },
  });
  r.check('a non-streaming turn returns Anthropic-shaped content',
    ok.status === 200 && typeof ok.json?.content?.[0]?.text === 'string' && !!ok.json.quota,
    `status ${ok.status}`);

  const streamed = await fetch(base + '/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-session-token': token },
    body: JSON.stringify({ max_tokens: 400, stream: true, system: 'gm', messages: [{ role: 'user', content: 'Again.' }] }),
  });
  const sse = await streamed.text();
  r.check('a streamed turn emits text deltas, a quota event and DONE',
    streamed.status === 200
      && sse.includes('content_block_delta')
      && sse.includes('astra_quota')
      && sse.includes('[DONE]'),
    `${sse.length} bytes`);

  return ctx;
}

module.exports = { run, req };
