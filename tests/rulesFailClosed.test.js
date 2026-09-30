'use strict';

// If the rules JSON files a turn depends on failed to load at startup,
// server.js must fail closed on the endpoints that build a turn against
// them, rather than letting outcomeSheet.js silently build one from an
// empty ruleset. server/ruleLoader.js is mocked here so rulesReady() is
// false regardless of what is actually on disk in this checkout.

process.env.GEMINI_API_KEY = '';
process.env.GROQ_API_KEY = 'test-key';
process.env.GEMINI_URL = 'http://127.0.0.1:1/no-provider-here';
process.env.GROQ_URL = 'http://127.0.0.1:1/no-provider-here';
process.env.DB_PATH = ':memory:';

jest.mock('../server/ruleLoader', () => ({
  loadRules: () => ({ loaded: [], errors: ['mocked: nothing loaded'] }),
  getRulesCache: () => ({}),
  getLoadedIds: () => [],
  REQUIRED_RULE_IDS: ['core_basic', 'core_expanded', 'korvaths_guide', 'gamma_rising'],
  rulesReady: () => false,
}));

const request = require('supertest');

describe('rules fail closed when required rulesets are not loaded', () => {
  let app;
  let token;

  beforeAll(async () => {
    app = require('../server');
    const session = await request(app).post('/api/session').send({});
    token = session.body.token;
  });

  afterAll(() => {
    if (app && app.db && app.db.open) app.db.close();
  });

  test('POST /api/game/new returns 503 RULES_NOT_LOADED', async () => {
    const res = await request(app)
      .post('/api/game/new')
      .set('X-Session-Token', token)
      .send({ character_id: 'kael_voss', display_name: 'Test', adventure_id: 'ghost_station' });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('RULES_NOT_LOADED');
  });

  test('POST /api/turn returns 503 RULES_NOT_LOADED', async () => {
    const res = await request(app)
      .post('/api/turn')
      .set('X-Session-Token', token)
      .set('X-Astra-Protocol', '2')
      .send({ turn: 1, text: 'I look around.' });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('RULES_NOT_LOADED');
  });
});
