'use strict';
// Smoke tests for P2-A1 through P2-A5

const http = require('http');
const app  = require('../../server');

const server = http.createServer(app);
server.listen(0, async () => {
  const port = server.address().port;
  const base = 'http://localhost:' + port;

  async function get(url) {
    const r = await fetch(url);
    return { status: r.status, body: await r.json() };
  }

  let failures = 0;
  function check(label, cond) {
    const icon = cond ? 'PASS' : 'FAIL';
    if (!cond) failures++;
    console.log(icon + ' ' + label);
  }

  // A1: GET /api/rules returns 200
  const r1 = await get(base + '/api/rules');
  check('A1: GET /api/rules returns 200', r1.status === 200);
  check('A1: loaded_rulesets is array', Array.isArray(r1.body.loaded_rulesets));
  check('A1: exactly 5 rulesets loaded', r1.body.loaded_rulesets.length === 5);
  check('A1: knight_hawks NOT in loaded_rulesets', !r1.body.loaded_rulesets.includes('knight_hawks'));
  check('A1: knight_hawks_expanded NOT in loaded_rulesets', !r1.body.loaded_rulesets.includes('knight_hawks_expanded'));

  // A2: master index fields
  check('A2: ai_query_patterns present', !!(r1.body.star_frontiers_rules_system && r1.body.star_frontiers_rules_system.ai_query_patterns));

  // A3: full ruleset endpoint
  const r2 = await get(base + '/api/rules/alpha_dawn_basic');
  check('A3: GET /api/rules/alpha_dawn_basic returns 200', r2.status === 200);
  check('A3: character_creation.races present', !!(r2.body.character_creation && r2.body.character_creation.races));
  const r3 = await get(base + '/api/rules/knight_hawks');
  check('A3: GET /api/rules/knight_hawks returns 403', r3.status === 403);

  // A4: section endpoint
  const r4 = await get(base + '/api/rules/alpha_dawn_basic/combat');
  check('A4: GET /api/rules/alpha_dawn_basic/combat returns 200', r4.status === 200);
  check('A4: combat has initiative field', !!(r4.body.initiative));
  const r5 = await get(base + '/api/rules/alpha_dawn_basic/nonexistent');
  check('A4: GET /api/rules/alpha_dawn_basic/nonexistent returns 404', r5.status === 404);

  // A5: convenience endpoints
  const r6 = await get(base + '/api/rules/combat/quick-ref');
  check('A5: GET /api/rules/combat/quick-ref returns 200', r6.status === 200);
  check('A5: quick_checks present', !!(r6.body.quick_checks));
  check('A5: advanced_modifiers present', !!(r6.body.advanced_modifiers));

  const r7 = await get(base + '/api/rules/character/krix');
  check('A5: GET /api/rules/character/krix returns 200', r7.status === 200);
  const r8 = await get(base + '/api/rules/character/grak');
  check('A5: GET /api/rules/character/grak returns 200', r8.status === 200);
  check('A5: grak has zebulon_data', !!(r8.body.zebulon_data));
  const r9 = await get(base + '/api/rules/character/bogusrace');
  check('A5: GET /api/rules/character/bogusrace returns 404', r9.status === 404);

  const r10 = await get(base + '/api/rules/skills');
  check('A5: GET /api/rules/skills returns 200', r10.status === 200);
  check('A5: skills has beam_weapons', !!(r10.body.beam_weapons));
  check('A5: skills has demolitions (Zebulon expanded)', !!(r10.body.demolitions));

  const r11 = await get(base + '/api/rules/equipment/weapons');
  check('A5: GET /api/rules/equipment/weapons returns 200', r11.status === 200);
  check('A5: weapons has expanded field', !!(r11.body.expanded));

  const r12 = await get(base + '/api/rules/equipment/armor');
  check('A5: GET /api/rules/equipment/armor returns 200', r12.status === 200);
  check('A5: armor has skeinsuit', !!(r12.body.skeinsuit));

  const r13 = await get(base + '/api/rules/optional-modules');
  check('A5: GET /api/rules/optional-modules returns 200', r13.status === 200);
  check('A5: modules is array', Array.isArray(r13.body.modules));
  check('A5: gamma_psionics in modules', r13.body.modules.some(m => m.id === 'gamma_psionics'));
  check('A5: knight_hawks NOT in optional-modules', !r13.body.modules.some(m => m.id.includes('knight')));

  // Regression: healthz still works
  const rh = await get(base + '/api/healthz');
  check('REGRESSION: GET /api/healthz still returns 200', rh.status === 200);

  console.log(failures === 0 ? 'ALL TESTS PASSED' : failures + ' FAILURE(S)');
  server.close();
  process.exit(failures > 0 ? 1 : 0);
});
