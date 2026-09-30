'use strict';

// Must set env before requiring app
process.env.GROQ_API_KEY = 'test-key';
process.env.DB_PATH = ':memory:'; // Use in-memory DB for all server tests

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { createFakeProvider } = require('../qa/fake-provider');

// A real provider must never be reachable from a test run: any real key on
// this machine, or one picked up from an inherited environment, is dropped
// and every provider URL is pointed at the same in-process stub the QA
// harness uses. It speaks the OpenAI wire format both providers use, so the
// server code under test cannot tell the difference.
let fakeProvider;

beforeAll(async () => {
  fakeProvider = createFakeProvider();
  const port = await fakeProvider.listen();
  const stubUrl = `http://127.0.0.1:${port}`;
  // '' rather than delete: dotenv only fills in a variable that is entirely
  // absent from process.env, so a deleted key would be silently repopulated
  // from a real .env file in this repo's directory before server.js's own
  // require('dotenv').config() runs.
  process.env.GEMINI_API_KEY = '';
  process.env.GROQ_API_KEY = 'test-key';
  process.env.GROQ_URL = stubUrl;
  process.env.GEMINI_URL = stubUrl;
});

afterAll(async () => {
  if (fakeProvider) await fakeProvider.close();
});

// ─── WU-1: Server scaffolding ────────────────────────────────────────────────

describe('WU-1: Server scaffolding', () => {
  let app;

  beforeAll(() => {
    app = require('../server');
  });

  afterAll(() => {
    if (app && app.db && app.db.open) app.db.close();
  });

  test('app exports a valid Express application', () => {
    expect(typeof app.listen).toBe('function');
    expect(typeof app.use).toBe('function');
  });

  test('GET /api/healthz returns 200 with status ok', async () => {
    const res = await request(app).get('/api/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('GET /nonexistent-route returns 404', async () => {
    const res = await request(app).get('/this-path-does-not-exist-' + Date.now());
    expect(res.status).toBe(404);
  });

  test('public/ directory exists for static serving (index.html moved in WU-7)', () => {
    const publicDir = path.join(__dirname, '..', 'public');
    expect(fs.existsSync(publicDir)).toBe(true);
    // index.html is in public/ after WU-7 completed
    expect(fs.existsSync(path.join(publicDir, 'index.html'))).toBe(true);
  });

  test('server respects PORT environment variable', (done) => {
    const testPort = 19999;
    process.env.PORT = testPort.toString();
    const serverModule = require('../server');
    const srv = serverModule.listen(testPort, () => {
      const addr = srv.address();
      expect(addr.port).toBe(testPort);
      srv.close(done);
      delete process.env.PORT;
    });
  });
});

// ─── WU-2: POST /api/chat proxy ──────────────────────────────────────────────

describe('WU-2: /api/chat is retired; POST /api/turn is the auth-gated replacement', () => {
  let app;

  beforeAll(() => {
    jest.resetModules();
    process.env.GROQ_API_KEY = 'test-key';
    process.env.DB_PATH = ':memory:';
    app = require('../server');
  });

  afterAll(() => {
    if (app && app.db && app.db.open) app.db.close();
  });

  test('POST /api/chat returns 410 regardless of token, retired by the protocol v2 cutover', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ model: 'claude-sonnet-4-6', max_tokens: 100, messages: [] });
    expect(res.status).toBe(410);
    expect(res.body.code).toBe('ENDPOINT_RETIRED');
  });

  test('POST /api/chat does not include x-api-key in response headers', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set('X-Session-Token', 'any-token')
      .send({ messages: [] });
    expect(res.headers['x-api-key']).toBeUndefined();
    expect(res.headers['anthropic-api-key']).toBeUndefined();
  });

  test('POST /api/turn without X-Session-Token returns 401', async () => {
    const res = await request(app)
      .post('/api/turn')
      .set('X-Astra-Protocol', '2')
      .send({ turn: 1 });
    expect(res.status).toBe(401);
  });

  test('POST /api/turn with non-existent session token returns 401', async () => {
    const res = await request(app)
      .post('/api/turn')
      .set('X-Session-Token', 'fake-token-that-does-not-exist')
      .set('X-Astra-Protocol', '2')
      .send({ turn: 1 });
    expect(res.status).toBe(401);
  });

  test('POST /api/turn with a valid session token passes the auth gate (our 401 does not fire)', async () => {
    const createRes = await request(app).post('/api/session').send();
    const { token } = createRes.body;
    const res = await request(app)
      .post('/api/turn')
      .set('X-Session-Token', token)
      .set('X-Astra-Protocol', '2')
      .send({ turn: 1, text: 'hello' });
    // No game has been started for this session, so this is refused for
    // that reason (409), not for the token — proving the auth gate passed.
    expect(res.status).not.toBe(401);
    expect(res.status).toBe(409);
  });

  test('POST /api/turn without X-Astra-Protocol: 2 returns 409 CLIENT_OUTDATED', async () => {
    const createRes = await request(app).post('/api/session').send();
    const { token } = createRes.body;
    const res = await request(app)
      .post('/api/turn')
      .set('X-Session-Token', token)
      .send({ turn: 1, text: 'hello' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CLIENT_OUTDATED');
  });
});

// ─── WU-3: Database ──────────────────────────────────────────────────────────

describe('WU-3: SQLite database', () => {
  let db;

  beforeAll(() => {
    jest.resetModules();
    const { initDb } = require('../db');
    db = initDb(':memory:');
  });

  afterAll(() => {
    if (db && db.close) db.close();
  });

  test('initDb creates sessions table', () => {
    const row = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'"
    ).get();
    expect(row).toBeDefined();
    expect(row.name).toBe('sessions');
  });

  test('initDb creates messages table', () => {
    const row = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='messages'"
    ).get();
    expect(row).toBeDefined();
  });

  test('initDb creates game_state table', () => {
    const row = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='game_state'"
    ).get();
    expect(row).toBeDefined();
  });

  test('createSession inserts and getSession retrieves correctly', () => {
    const { createSession, getSession } = require('../db');
    const token = 'test-token-' + Date.now();
    createSession(db, token);
    const session = getSession(db, token);
    expect(session).not.toBeNull();
    expect(session.user_token).toBe(token);
    expect(typeof session.created_at).toBe('number');
  });

  test('getSession returns null for nonexistent token', () => {
    const { getSession } = require('../db');
    const result = getSession(db, 'this-token-does-not-exist');
    expect(result).toBeNull();
  });

  test('saveMessage and getMessages round-trip', () => {
    const { createSession, saveMessage, getMessages } = require('../db');
    const token = 'msg-test-' + Date.now();
    createSession(db, token);
    const session = require('../db').getSession(db, token);
    saveMessage(db, session.id, 'user', 'Hello world');
    saveMessage(db, session.id, 'assistant', 'Hi there');
    const msgs = getMessages(db, session.id);
    expect(msgs.length).toBe(2);
    expect(msgs[0].role).toBe('user');
    expect(msgs[0].content).toBe('Hello world');
    expect(msgs[1].role).toBe('assistant');
  });

  test('saveGameState and getGameState round-trip', () => {
    const { createSession, saveGameState, getGameState } = require('../db');
    const token = 'state-test-' + Date.now();
    createSession(db, token);
    const session = require('../db').getSession(db, token);
    const stateJson = JSON.stringify({ foo: 'bar', turn: 1 });
    saveGameState(db, session.id, stateJson);
    const row = getGameState(db, session.id);
    expect(row).not.toBeNull();
    expect(row.state_json).toBe(stateJson);
  });

  test('saveGameState is idempotent (UPSERT, not duplicate INSERT)', () => {
    const { createSession, saveGameState, getGameState } = require('../db');
    const token = 'upsert-test-' + Date.now();
    createSession(db, token);
    const session = require('../db').getSession(db, token);
    saveGameState(db, session.id, '{"turn":1}');
    saveGameState(db, session.id, '{"turn":2}');
    const row = getGameState(db, session.id);
    expect(JSON.parse(row.state_json).turn).toBe(2);
    // Ensure only one row exists
    const count = db.prepare(
      'SELECT COUNT(*) as cnt FROM game_state WHERE session_id = ?'
    ).get(session.id);
    expect(count.cnt).toBe(1);
  });
});

// ─── WU-4: Session management endpoints ──────────────────────────────────────

describe('WU-4: Session management endpoints', () => {
  let app;

  beforeAll(() => {
    jest.resetModules();
    process.env.GROQ_API_KEY = 'test-key';
    process.env.DB_PATH = ':memory:';
    app = require('../server');
  });

  afterAll(() => {
    if (app && app.db && app.db.open) app.db.close();
  });

  test('POST /api/session returns 201 with a UUID v4 token', async () => {
    const res = await request(app).post('/api/session').send();
    expect(res.status).toBe(201);
    expect(res.body.token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  test('GET /api/session/:token after POST returns 200 with null state and empty messages', async () => {
    const createRes = await request(app).post('/api/session').send();
    const { token } = createRes.body;
    const getRes = await request(app).get(`/api/session/${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.token).toBe(token);
    expect(getRes.body.state_json).toBeNull();
    expect(getRes.body.messages).toEqual([]);
  });

  test('GET /api/session/nonexistent returns 404', async () => {
    const res = await request(app).get('/api/session/this-token-never-exists');
    expect(res.status).toBe(404);
  });

  test('Two POST /api/session calls produce different tokens', async () => {
    const [r1, r2] = await Promise.all([
      request(app).post('/api/session').send(),
      request(app).post('/api/session').send(),
    ]);
    expect(r1.body.token).not.toBe(r2.body.token);
  });
});

// ─── WU-5: Persistence ───────────────────────────────────────────────────────

describe('WU-5: Message and state persistence', () => {
  let app;

  beforeAll(() => {
    jest.resetModules();
    process.env.GROQ_API_KEY = 'test-key';
    process.env.DB_PATH = ':memory:';
    app = require('../server');
  });

  afterAll(() => {
    if (app && app.db && app.db.open) app.db.close();
  });

  test('PUT /api/session/:token/state returns 410, retired by the protocol v2 cutover: state is server-owned', async () => {
    const createRes = await request(app).post('/api/session').send();
    const { token } = createRes.body;
    const res = await request(app)
      .put(`/api/session/${token}/state`)
      .set('Content-Type', 'application/json')
      .send({ state_json: JSON.stringify({ gameState: { test: true }, messages: [] }) });
    expect(res.status).toBe(410);
    expect(res.body.code).toBe('STATE_IS_SERVER_OWNED');
  });

  test('PUT /api/session/:token/state returns 410 even for an unknown token (retired before the session lookup)', async () => {
    const res = await request(app)
      .put('/api/session/nonexistent-token/state')
      .send({ state_json: '{}' });
    expect(res.status).toBe(410);
  });

  test('a server-committed state (stateStore.commit) round-trips through GET, stripped of server-only fields', async () => {
    const createRes = await request(app).post('/api/session').send();
    const { token } = createRes.body;
    const session = require('../db').getSession(app.db, token);
    const stateStore = require('../server/services/stateStore');
    const state = {
      schema_version: 2,
      character: { id: 'kael_voss', name: 'Kael Voss' },
      campaign: { adventure_id: 'ghost_station' },
      session: { number: 1, scene_count: 0, turn_count: 5, game_over: true },
      scene: { header: '', summary: '', in_combat: false, combat_state: null },
      meta: { initialized: true },
      pending_choices: { c1: { kind: 'skill', key: 'beam_weapons' } },
    };
    stateStore.commit(app.db, session.id, state);

    const getRes = await request(app).get(`/api/session/${token}`);
    expect(getRes.status).toBe(200);
    const returned = JSON.parse(getRes.body.state_json);
    expect(returned.session.turn_count).toBe(5);
    expect(returned.pending_choices).toBeUndefined(); // server-only, stripped
    expect(returned.session.game_over).toBeUndefined(); // server-only, stripped
    expect(getRes.body.state_version).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(getRes.body.choices)).toBe(true);
  });

  test('POST /api/chat is retired; hitting it never writes to session state', async () => {
    const createRes = await request(app).post('/api/session').send();
    const { token } = createRes.body;
    const chatRes = await request(app)
      .post('/api/chat')
      .set('X-Session-Token', token)
      .send({ messages: [{ role: 'user', content: 'test' }], max_tokens: 10 });
    expect(chatRes.status).toBe(410);
    const getRes = await request(app).get(`/api/session/${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.state_json).toBeNull();
  });
});

// ─── WU-6: Rate limiting ─────────────────────────────────────────────────────

// /api/chat is retired (410, no rate limiter attached: see WU-2 above), so
// the rate limiter it used to carry is exercised here against /api/turn
// instead, which still carries it. No active game exists for these
// sessions, so /api/turn answers 409 well before any provider call; that
// 409 (not the limiter) is what proves a request got through.
describe('WU-6: Rate limiting', () => {
  let app;

  beforeAll(() => {
    jest.resetModules();
    process.env.GROQ_API_KEY = 'test-key';
    process.env.DB_PATH = ':memory:';
    // Set very low limit for testing
    process.env.RATE_LIMIT_MAX = '3';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    app = require('../server');
  });

  afterAll(() => {
    if (app && app.db && app.db.open) app.db.close();
    delete process.env.RATE_LIMIT_MAX;
    delete process.env.RATE_LIMIT_WINDOW_MS;
  });

  test('requests within rate limit are not rejected with 429', async () => {
    const createRes = await request(app).post('/api/session').send();
    const { token } = createRes.body;
    // First request: should not be 429
    const res = await request(app)
      .post('/api/turn')
      .set('X-Session-Token', token)
      .set('X-Astra-Protocol', '2')
      .send({ turn: 1 });
    expect(res.status).not.toBe(429);
  });

  test('exceeding rate limit returns 429 with error message', async () => {
    // Close current db before resetting modules to avoid native module conflicts
    if (app && app.db && app.db.open) app.db.close();
    jest.resetModules();
    process.env.RATE_LIMIT_MAX = '2';
    app = require('../server');
    const createRes = await request(app).post('/api/session').send();
    const { token } = createRes.body;

    // Make 2 requests (at limit)
    for (let i = 0; i < 2; i++) {
      await request(app)
        .post('/api/turn')
        .set('X-Session-Token', token)
        .set('X-Astra-Protocol', '2')
        .send({ turn: 1 });
    }
    // 3rd request should be rate limited
    const res = await request(app)
      .post('/api/turn')
      .set('X-Session-Token', token)
      .set('X-Astra-Protocol', '2')
      .send({ turn: 1 });
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/rate limit/i);
  });

  test('different tokens have independent rate limit counters', async () => {
    if (app && app.db && app.db.open) app.db.close();
    jest.resetModules();
    process.env.RATE_LIMIT_MAX = '1';
    app = require('../server');
    // Create two sessions
    const [r1, r2] = await Promise.all([
      request(app).post('/api/session').send(),
      request(app).post('/api/session').send(),
    ]);
    const token1 = r1.body.token;
    const token2 = r2.body.token;

    // Exhaust token1's limit
    await request(app)
      .post('/api/turn')
      .set('X-Session-Token', token1)
      .set('X-Astra-Protocol', '2')
      .send({ turn: 1 });
    const limitedRes = await request(app)
      .post('/api/turn')
      .set('X-Session-Token', token1)
      .set('X-Astra-Protocol', '2')
      .send({ turn: 1 });
    expect(limitedRes.status).toBe(429);

    // token2 should still be allowed
    const token2Res = await request(app)
      .post('/api/turn')
      .set('X-Session-Token', token2)
      .set('X-Astra-Protocol', '2')
      .send({ turn: 1 });
    expect(token2Res.status).not.toBe(429);
  });
});

// ─── WU-8: Deployment artifacts ──────────────────────────────────────────────

describe('WU-8: Deployment artifacts', () => {
  const root = path.join(__dirname, '..');
  let portTestApp;

  afterAll(() => {
    if (portTestApp && portTestApp.db && portTestApp.db.open) portTestApp.db.close();
  });

  test('.env.example exists and documents GROQ_API_KEY', () => {
    const examplePath = path.join(root, '.env.example');
    expect(fs.existsSync(examplePath)).toBe(true);
    const content = fs.readFileSync(examplePath, 'utf8');
    expect(content).toContain('GROQ_API_KEY');
  });

  test('.env.example documents PORT', () => {
    const content = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
    expect(content).toContain('PORT');
  });

  test('package.json has a start script', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts.start).toBeDefined();
  });

  test('server respects PORT env var (runtime check)', async () => {
    jest.resetModules();
    process.env.GROQ_API_KEY = 'test-key';
    process.env.DB_PATH = ':memory:';
    process.env.PORT = '19998';
    portTestApp = require('../server');
    const srv = portTestApp.listen(19998);
    const addr = srv.address();
    expect(addr.port).toBe(19998);
    srv.close();
    delete process.env.PORT;
  });
});

// ─── Security regression: H1 + H2 fixes ──────────────────────────────────────

describe('Security: H1/H2 regression', () => {
  let app;

  beforeAll(() => {
    jest.resetModules();
    process.env.GROQ_API_KEY = 'test-key';
    process.env.DB_PATH = ':memory:';
    app = require('../server');
  });

  afterAll(() => {
    if (app && app.db && app.db.open) app.db.close();
    delete process.env.SESSION_RATE_LIMIT_MAX;
    delete process.env.SESSION_RATE_LIMIT_WINDOW_MS;
  });

  // H1: a provider must not be called for unrecognised session tokens.
  // /api/chat itself is retired (410) by the protocol v2 cutover; the
  // property H1 protects now lives on /api/turn, the only endpoint left
  // that can spend a provider call.
  test('H1: POST /api/turn with a fake session token returns 401, not 502/503', async () => {
    const res = await request(app)
      .post('/api/turn')
      .set('X-Session-Token', 'totally-fake-token-' + Date.now())
      .set('X-Astra-Protocol', '2')
      .send({ turn: 1 });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid|expired/i);
  });

  test('H1: POST /api/turn with a valid session token passes the auth gate', async () => {
    const createRes = await request(app).post('/api/session').send();
    const { token } = createRes.body;
    const res = await request(app)
      .post('/api/turn')
      .set('X-Session-Token', token)
      .set('X-Astra-Protocol', '2')
      .send({ turn: 1, text: 'hello' });
    // No game has been started, so this is refused for that reason (409),
    // not for the token — our auth gate did not fire.
    expect(res.status).not.toBe(401);
    expect(res.status).toBe(409);
  });

  // H2: Session creation endpoint must reject rapid creation from a single source.
  test('H2: POST /api/session is rate-limited after limit is reached', async () => {
    if (app && app.db && app.db.open) app.db.close();
    jest.resetModules();
    process.env.GROQ_API_KEY = 'test-key';
    process.env.DB_PATH = ':memory:';
    process.env.SESSION_RATE_LIMIT_MAX = '3';
    process.env.SESSION_RATE_LIMIT_WINDOW_MS = '60000';
    app = require('../server');

    // First 3 requests must succeed.
    for (let i = 0; i < 3; i++) {
      const r = await request(app).post('/api/session').send();
      expect(r.status).toBe(201);
    }
    // 4th from same IP must be rejected.
    const r = await request(app).post('/api/session').send();
    expect(r.status).toBe(429);
    expect(r.body.error).toMatch(/too many sessions/i);
  });
});

// ─── Save codes ──────────────────────────────────────────────────────────────

describe('Save codes: continue a game from a short UID', () => {
  let app;

  beforeAll(() => {
    jest.resetModules();
    process.env.GROQ_API_KEY = 'test-key';
    process.env.DB_PATH = ':memory:';
    process.env.SESSION_RATE_LIMIT_MAX = '200';
    app = require('../server');
  });

  afterAll(() => {
    if (app && app.db && app.db.open) app.db.close();
    delete process.env.SESSION_RATE_LIMIT_MAX;
  });

  test('POST /api/session returns a 10-character save code plus a dashed display form', async () => {
    const res = await request(app).post('/api/session').send();
    expect(res.status).toBe(201);
    expect(res.body.save_code).toMatch(/^[2-9A-HJ-NP-TV-Z]{10}$/);
    expect(res.body.save_code_display).toBe(
      res.body.save_code.slice(0, 5) + '-' + res.body.save_code.slice(5)
    );
  });

  test('save codes are unique across sessions', async () => {
    const a = await request(app).post('/api/session').send();
    const b = await request(app).post('/api/session').send();
    expect(a.body.save_code).not.toBe(b.body.save_code);
  });

  test('POST /api/session/resume with an unknown code returns 404', async () => {
    const res = await request(app).post('/api/session/resume').send({ code: 'ZZZZZ-ZZZZZ' });
    expect(res.status).toBe(404);
  });

  test('POST /api/session/resume returns the saved state for a valid code', async () => {
    const created = await request(app).post('/api/session').send();
    const { token, save_code } = created.body;
    const session = require('../db').getSession(app.db, token);
    // State is server-owned as of the protocol v2 cutover; seed it through
    // stateStore.commit the way POST /api/turn would, rather than a client
    // PUT (which now returns 410).
    require('../server/services/stateStore').commit(app.db, session.id, {
      schema_version: 2,
      character: { id: 'rayla', name: 'Rayla', race: 'Skrath' },
      campaign: { adventure_id: 'ghost_station' },
      session: { number: 1, scene_count: 0, turn_count: 0, game_over: false },
      scene: { header: '', summary: '', in_combat: false, combat_state: null },
      meta: { initialized: true },
      pending_choices: {},
    });

    const res = await request(app).post('/api/session/resume').send({ code: save_code });
    expect(res.status).toBe(200);
    expect(res.body.token).toBe(token);
    const state = JSON.parse(res.body.state_json);
    expect(state.character.name).toBe('Rayla');
    expect(state.meta.initialized).toBe(true);
  });

  test('resume accepts the dashed, lower-case form of the code', async () => {
    const created = await request(app).post('/api/session').send();
    const { token, save_code_display } = created.body;
    const res = await request(app).post('/api/session/resume').send({ code: save_code_display.toLowerCase() });
    expect(res.status).toBe(200);
    expect(res.body.token).toBe(token);
  });

  test('GET /api/session/:token exposes the save code', async () => {
    const created = await request(app).post('/api/session').send();
    const res = await request(app).get(`/api/session/${created.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.save_code).toBe(created.body.save_code);
  });
});

// ─── Free-tier quota ─────────────────────────────────────────────────────────

describe('Free-tier quota tracking and alerts', () => {
  let app;

  beforeAll(() => {
    jest.resetModules();
    process.env.GROQ_API_KEY = 'test-key';
    process.env.DB_PATH = ':memory:';
    process.env.AI_PROVIDER_ORDER = 'groq';
    process.env.SESSION_RATE_LIMIT_MAX = '200';
    delete process.env.GROQ_REQUESTS_PER_DAY;
    app = require('../server');
  });

  afterAll(() => {
    if (app && app.db && app.db.open) app.db.close();
    delete process.env.AI_PROVIDER_ORDER;
    delete process.env.SESSION_RATE_LIMIT_MAX;
    delete process.env.GROQ_REQUESTS_PER_DAY;
  });

  test('GET /api/quota reports the active provider and its remaining budget', async () => {
    const res = await request(app).get('/api/quota');
    expect(res.status).toBe(200);
    expect(res.body.configured).toBe(true);
    expect(res.body.exhausted).toBe(false);
    expect(res.body.active.id).toBe('groq');
    expect(res.body.active.tokensPerDay).toBe(200000);
    expect(res.body.resetAt).toBeGreaterThan(Date.now());
  });

  test('turnsRemaining is derived from the token ceiling, not the request count', async () => {
    const res = await request(app).get('/api/quota');
    // 200k tokens/day at ~7k per turn.
    expect(res.body.active.turnsRemaining).toBe(28);
  });

  test('POST /api/game/new returns 429 QUOTA_EXHAUSTED with a reset time once the day is spent', async () => {
    // /api/chat is retired and no longer checks quota at all (410 fires
    // first); /api/game/new is the simplest surviving endpoint that still
    // spends exactly one provider call and hits this same quota path.
    if (app && app.db && app.db.open) app.db.close();
    jest.resetModules();
    process.env.GROQ_API_KEY = 'test-key';
    process.env.DB_PATH = ':memory:';
    process.env.AI_PROVIDER_ORDER = 'groq';
    process.env.GROQ_REQUESTS_PER_DAY = '0';
    app = require('../server');

    const created = await request(app).post('/api/session').send();
    const res = await request(app)
      .post('/api/game/new')
      .set('X-Session-Token', created.body.token)
      .send({ character_id: 'kael_voss', display_name: 'QA', adventure_id: 'ghost_station' });

    expect(res.status).toBe(429);
    expect(res.body.code).toBe('QUOTA_EXHAUSTED');
    expect(res.body.resetAt).toBeGreaterThan(Date.now());
    expect(res.body.retryAfterSeconds).toBeGreaterThan(0);
    expect(res.body.quota.exhausted).toBe(true);
  });
});

// ─── Provider 429 classification ─────────────────────────────────────────────

// A burst limit and a spent daily quota both arrive as 429; treating the first
// as the second would strand the player for the rest of the day.
describe('Provider rate limits: busy vs out for the day', () => {
  const http = require('http');
  let upstream;
  let upstreamBody;
  let upstreamHeaders;
  let app;
  let port;
  let previousGroqUrl;

  beforeAll((done) => {
    upstream = http.createServer((req, res) => {
      req.resume();
      req.on('end', () => {
        res.writeHead(429, { 'Content-Type': 'application/json', ...upstreamHeaders });
        res.end(JSON.stringify(upstreamBody));
      });
    });
    upstream.listen(0, () => {
      port = upstream.address().port;
      jest.resetModules();
      process.env.GROQ_API_KEY = 'test-key';
      process.env.DB_PATH = ':memory:';
      process.env.AI_PROVIDER_ORDER = 'groq';
      previousGroqUrl = process.env.GROQ_URL;
      process.env.GROQ_URL = `http://127.0.0.1:${port}/v1/chat/completions`;
      process.env.SESSION_RATE_LIMIT_MAX = '200';
      app = require('../server');
      done();
    });
  });

  afterAll((done) => {
    if (app && app.db && app.db.open) app.db.close();
    delete process.env.AI_PROVIDER_ORDER;
    // Restore the shared stub URL rather than deleting it outright, later
    // suites in this file must keep talking to the stub, not a real provider.
    if (previousGroqUrl) process.env.GROQ_URL = previousGroqUrl;
    else delete process.env.GROQ_URL;
    delete process.env.SESSION_RATE_LIMIT_MAX;
    upstream.close(done);
  });

  // /api/chat is retired and never reaches provider-selection logic at all;
  // /api/game/new is the simplest surviving endpoint that spends exactly
  // one provider call through the same selectProvider()/markProviderBlocked
  // path this whole describe block is about.
  async function chat() {
    const created = await request(app).post('/api/session').send();
    return request(app)
      .post('/api/game/new')
      .set('X-Session-Token', created.body.token)
      .send({ character_id: 'kael_voss', display_name: 'QA', adventure_id: 'ghost_station' });
  }

  test('a per-minute limit with a RetryInfo delay is reported as busy, not exhausted', async () => {
    upstreamHeaders = {};
    upstreamBody = {
      error: {
        code: 429,
        message: 'Quota exceeded for generate_requests_per_model_per_minute',
        details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '27s' }],
      },
    };
    const res = await chat();
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('PROVIDER_BUSY');
    expect(res.body.retryAfterSeconds).toBeLessThanOrEqual(27);
    expect(res.body.retryAfterSeconds).toBeGreaterThan(0);
  });

  test('a retry-after header is honored', async () => {
    if (app && app.db && app.db.open) app.db.close();
    jest.resetModules();
    app = require('../server');
    upstreamHeaders = { 'retry-after': '45' };
    upstreamBody = { error: { message: 'slow down' } };
    const res = await chat();
    expect(res.body.code).toBe('PROVIDER_BUSY');
    expect(res.body.retryAfterSeconds).toBeLessThanOrEqual(45);
  });

  test('a limit that names a daily quota blocks until the next reset', async () => {
    if (app && app.db && app.db.open) app.db.close();
    jest.resetModules();
    app = require('../server');
    upstreamHeaders = {};
    upstreamBody = { error: { message: 'Rate limit reached: tokens per day (TPD) exceeded' } };
    const res = await chat();
    expect(res.body.code).toBe('QUOTA_EXHAUSTED');
    expect(res.body.retryAfterSeconds).toBeGreaterThan(5 * 60);
  });

  test('an oversized request body is rejected as JSON, not an HTML error page', async () => {
    const created = await request(app).post('/api/session').send();
    const res = await request(app)
      .post('/api/game/new')
      .set('X-Session-Token', created.body.token)
      .send({ character_id: 'kael_voss', adventure_id: 'ghost_station', display_name: 'x'.repeat(600 * 1024) });
    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/too large/i);
  });
});
