'use strict';

const Database = require('better-sqlite3');
const crypto   = require('crypto');

// ─── Schema ───────────────────────────────────────────────────────────────────

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_token TEXT    UNIQUE NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  role       TEXT    NOT NULL,
  content    TEXT    NOT NULL,
  timestamp  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS game_state (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL UNIQUE REFERENCES sessions(id),
  state_json TEXT    NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS session_modules (
  session_id INTEGER PRIMARY KEY REFERENCES sessions(id),
  modules    TEXT    NOT NULL DEFAULT '[]',
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS api_usage (
  provider      TEXT    NOT NULL,
  day           TEXT    NOT NULL,
  requests      INTEGER NOT NULL DEFAULT 0,
  tokens        INTEGER NOT NULL DEFAULT 0,
  blocked_until INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (provider, day)
);
`;

// Added after the initial release — sessions predate save_code, so it is applied
// as an ADD COLUMN migration rather than being part of SCHEMA.
function migrateSaveCode(db) {
  const cols = db.prepare('PRAGMA table_info(sessions)').all();
  if (!cols.some(c => c.name === 'save_code')) {
    db.exec('ALTER TABLE sessions ADD COLUMN save_code TEXT');
  }
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_save_code ON sessions(save_code)');
}

// Input and output tokens are priced differently (output costs several times
// more), so spend can only be worked out if the two are stored apart.
function migrateUsageSplit(db) {
  const cols = db.prepare('PRAGMA table_info(api_usage)').all();
  if (!cols.some(c => c.name === 'input_tokens')) {
    db.exec('ALTER TABLE api_usage ADD COLUMN input_tokens INTEGER NOT NULL DEFAULT 0');
  }
  if (!cols.some(c => c.name === 'output_tokens')) {
    db.exec('ALTER TABLE api_usage ADD COLUMN output_tokens INTEGER NOT NULL DEFAULT 0');
  }
}

// ─── initDb ───────────────────────────────────────────────────────────────────
// Accepts a file path or ':memory:' (used by tests).
// Returns the better-sqlite3 database instance so callers can pass it around.
// Called once at server startup; synchronous by design (better-sqlite3 is sync).

function initDb(dbPath) {
  const db = new Database(dbPath);
  // Enable WAL mode for better concurrent read performance on file-based DBs.
  // WAL is silently ignored by :memory: databases.
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);
  migrateSaveCode(db);
  migrateUsageSplit(db);
  return db;
}

// ─── Session CRUD ─────────────────────────────────────────────────────────────

function createSession(db, token, saveCode) {
  const now = Date.now();
  db.prepare(
    'INSERT INTO sessions (user_token, created_at, updated_at, save_code) VALUES (?, ?, ?, ?)'
  ).run(token, now, now, saveCode || null);
}

function getSession(db, token) {
  return db.prepare(
    'SELECT * FROM sessions WHERE user_token = ?'
  ).get(token) || null;
}

// ─── Save codes ───────────────────────────────────────────────────────────────

// Ambiguous glyphs (0/O, 1/I/L, U) are excluded so a code can be read aloud or
// copied off a screen without transcription errors.
const SAVE_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
const SAVE_CODE_LENGTH   = 10;

function randomSaveCode() {
  const bytes = crypto.randomBytes(SAVE_CODE_LENGTH);
  let out = '';
  for (let i = 0; i < SAVE_CODE_LENGTH; i++) {
    out += SAVE_CODE_ALPHABET[bytes[i] % SAVE_CODE_ALPHABET.length];
  }
  return out;
}

// Strips the display dash and any stray whitespace so "abcde-fghjk" and
// "ABCDEFGHJK" both resolve to the same stored code.
function normalizeSaveCode(input) {
  if (typeof input !== 'string') return '';
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function formatSaveCode(code) {
  if (!code || code.length !== SAVE_CODE_LENGTH) return code || '';
  return code.slice(0, 5) + '-' + code.slice(5);
}

// Retries on the (astronomically unlikely) unique-index collision.
function generateSaveCode(db) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomSaveCode();
    const taken = db.prepare('SELECT 1 FROM sessions WHERE save_code = ?').get(code);
    if (!taken) return code;
  }
  throw new Error('Could not generate a unique save code.');
}

function getSessionByCode(db, code) {
  const normalized = normalizeSaveCode(code);
  if (!normalized) return null;
  return db.prepare('SELECT * FROM sessions WHERE save_code = ?').get(normalized) || null;
}

// Sessions created before save codes existed get one on first access so old
// browsers with a stored token can still surface a code to the player.
function ensureSaveCode(db, session) {
  if (session.save_code) return session.save_code;
  const code = generateSaveCode(db);
  db.prepare('UPDATE sessions SET save_code = ? WHERE id = ?').run(code, session.id);
  session.save_code = code;
  return code;
}

// ─── API usage / quota ────────────────────────────────────────────────────────

// One row per provider per quota-day. `day` is supplied by the caller so the
// provider's own reset timezone (not the server's) defines the boundary.
function getUsage(db, provider, day) {
  return db.prepare(
    'SELECT provider, day, requests, tokens, input_tokens, output_tokens, blocked_until FROM api_usage WHERE provider = ? AND day = ?'
  ).get(provider, day) || { provider, day, requests: 0, tokens: 0, input_tokens: 0, output_tokens: 0, blocked_until: 0 };
}

// Every recorded day, newest first — the basis for the spend report.
function getUsageHistory(db) {
  return db.prepare(
    'SELECT provider, day, requests, tokens, input_tokens, output_tokens FROM api_usage ORDER BY day DESC, provider'
  ).all();
}

// requests and tokens are counted separately: the request is booked the moment
// a provider accepts the call, the token cost only once the answer is in, so an
// aborted stream still consumes its share of the daily allowance.
function recordUsage(db, provider, day, tokens, requests = 1, inputTokens = 0, outputTokens = 0) {
  const n = v => Math.max(0, Math.round(v) || 0);
  db.prepare(`
    INSERT INTO api_usage (provider, day, requests, tokens, input_tokens, output_tokens)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider, day) DO UPDATE SET
      requests      = requests + excluded.requests,
      tokens        = tokens + excluded.tokens,
      input_tokens  = input_tokens + excluded.input_tokens,
      output_tokens = output_tokens + excluded.output_tokens
  `).run(provider, day, n(requests), n(tokens), n(inputTokens), n(outputTokens));
}

function setBlockedUntil(db, provider, day, timestamp) {
  db.prepare(`
    INSERT INTO api_usage (provider, day, requests, tokens, blocked_until)
    VALUES (?, ?, 0, 0, ?)
    ON CONFLICT(provider, day) DO UPDATE SET
      blocked_until = MAX(blocked_until, excluded.blocked_until)
  `).run(provider, day, timestamp);
}

// ─── Messages ─────────────────────────────────────────────────────────────────

function saveMessage(db, sessionId, role, content) {
  db.prepare(
    'INSERT INTO messages (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)'
  ).run(sessionId, role, content, Date.now());
}

function getMessages(db, sessionId) {
  return db.prepare(
    'SELECT id, session_id, role, content, timestamp FROM messages WHERE session_id = ? ORDER BY timestamp ASC'
  ).all(sessionId);
}

// ─── Game state ───────────────────────────────────────────────────────────────

// UPSERT: insert on first save, update on subsequent saves.
// SQLite's INSERT OR REPLACE is used here; it deletes + re-inserts the row
// which resets the auto-increment id — acceptable because we look up by
// session_id, not by id.
function saveGameState(db, sessionId, stateJson) {
  const now = Date.now();
  db.prepare(`
    INSERT INTO game_state (session_id, state_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at
  `).run(sessionId, stateJson, now);
}

function getGameState(db, sessionId) {
  return db.prepare(
    'SELECT * FROM game_state WHERE session_id = ?'
  ).get(sessionId) || null;
}

// ─── Active modules ───────────────────────────────────────────────────────────

// Stores the list of active Gamma Dawn optional module IDs for a session.
// modules is a JSON-serialized string (array of strings).
function saveActiveModules(db, sessionId, modules) {
  const now = Date.now();
  db.prepare(`
    INSERT INTO session_modules (session_id, modules, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET modules = excluded.modules, updated_at = excluded.updated_at
  `).run(sessionId, JSON.stringify(modules), now);
}

function getActiveModules(db, sessionId) {
  const row = db.prepare('SELECT modules FROM session_modules WHERE session_id = ?').get(sessionId);
  if (!row) return [];
  try {
    return JSON.parse(row.modules);
  } catch (_) {
    return [];
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  initDb, createSession, getSession, saveMessage, getMessages, saveGameState, getGameState,
  saveActiveModules, getActiveModules,
  generateSaveCode, getSessionByCode, ensureSaveCode, normalizeSaveCode, formatSaveCode,
  getUsage, getUsageHistory, recordUsage, setBlockedUntil,
};
