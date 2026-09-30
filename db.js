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

// Every message read and write filters on session_id; without an index each
// lookup is a full table scan once a campaign's history grows.
function migrateMessagesIndex(db) {
  db.exec('CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id)');
}

// Optimistic-concurrency counter for server-owned state: every commit bumps
// it, so a stale write can be detected.
function migrateGameStateVersion(db) {
  const cols = db.prepare('PRAGMA table_info(game_state)').all();
  if (!cols.some(c => c.name === 'version')) {
    db.exec('ALTER TABLE game_state ADD COLUMN version INTEGER NOT NULL DEFAULT 0');
  }
}

// turn_log records the outcome sheet and resolved result for every turn.
// The row is inserted before the provider is ever called, so a retried or
// duplicate POST /api/turn finds it already resolved and replays that
// result instead of re-rolling or re-spending a provider call.
function migrateTurnLog(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS turn_log (
      session_id  INTEGER NOT NULL REFERENCES sessions(id),
      turn        INTEGER NOT NULL,
      status      TEXT    NOT NULL DEFAULT 'pending',
      request_json TEXT,
      sheet_json  TEXT    NOT NULL,
      result_json TEXT,
      created_at  INTEGER NOT NULL,
      resolved_at INTEGER,
      PRIMARY KEY (session_id, turn)
    );
  `);
}

// Up to 3 server-held checkpoints per session. Restoring one
// clears result_json for later turns but keeps their sheets, so undo cannot
// be used to re-roll the dice.
function migrateSnapshots(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id  INTEGER NOT NULL REFERENCES sessions(id),
      turn_count  INTEGER NOT NULL,
      scene_count INTEGER NOT NULL,
      state_json  TEXT    NOT NULL,
      created_at  INTEGER NOT NULL
    );
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_snapshots_session_id ON snapshots(session_id)');
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
  migrateMessagesIndex(db);
  migrateGameStateVersion(db);
  migrateTurnLog(db);
  migrateSnapshots(db);
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
  let out = '';
  for (let i = 0; i < SAVE_CODE_LENGTH; i++) {
    // crypto.randomInt is uniform over [0, length), randomBytes()[i] % length
    // is not, since 256 does not divide evenly by 30 and biases the low end.
    out += SAVE_CODE_ALPHABET[crypto.randomInt(SAVE_CODE_ALPHABET.length)];
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

// UPSERT: insert on first save, update on subsequent saves. Uses
// INSERT ... ON CONFLICT DO UPDATE, which updates the existing row in place
// rather than deleting and re-inserting it, so the row's id is stable.
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

// Server-owned writes (POST /api/turn and friends) go through this instead
// of saveGameState, so `version` moves with every commit — the basis for
// detecting a stale write, even though nothing here yet acts on a mismatch
// (the per-session turn lock in server.js is what actually prevents one).
function saveGameStateVersioned(db, sessionId, stateJson) {
  const now = Date.now();
  db.prepare(`
    INSERT INTO game_state (session_id, state_json, updated_at, version)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(session_id) DO UPDATE SET
      state_json = excluded.state_json,
      updated_at = excluded.updated_at,
      version    = game_state.version + 1
  `).run(sessionId, stateJson, now);
  return getGameState(db, sessionId);
}

// ─── turn_log ─────────────────────────────────────────────────────────────────
// One row per (session, turn). A pending row is written before the provider
// call so a retry or a duplicate POST /api/turn can replay the same sheet
// without re-rolling or spending a second call.

function getTurnLog(db, sessionId, turn) {
  return db.prepare(
    'SELECT * FROM turn_log WHERE session_id = ? AND turn = ?'
  ).get(sessionId, turn) || null;
}

function insertPendingTurn(db, sessionId, turn, requestJson, sheetJson) {
  const now = Date.now();
  db.prepare(`
    INSERT INTO turn_log (session_id, turn, status, request_json, sheet_json, created_at)
    VALUES (?, ?, 'pending', ?, ?, ?)
    ON CONFLICT(session_id, turn) DO UPDATE SET request_json = excluded.request_json
  `).run(sessionId, turn, requestJson, sheetJson, now);
  return getTurnLog(db, sessionId, turn);
}

function resolveTurnLogRow(db, sessionId, turn, resultJson) {
  db.prepare(`
    UPDATE turn_log SET status = 'resolved', result_json = ?, resolved_at = ?
    WHERE session_id = ? AND turn = ?
  `).run(resultJson, Date.now(), sessionId, turn);
}

// promptBuilder.js's buildHistoryMessages only ever uses the last 6 resolved
// turns; a long campaign's turn_log can run into the hundreds of rows, so
// this asks the database for just those 6 (DESC + LIMIT) instead of loading
// every resolved turn on every single request only to slice it down in JS.
// Returned oldest-first, the order buildHistoryMessages expects.
function getRecentResolvedTurnLog(db, sessionId, limit = 6) {
  return db.prepare(
    "SELECT * FROM turn_log WHERE session_id = ? AND status = 'resolved' ORDER BY turn DESC LIMIT ?"
  ).all(sessionId, limit).reverse();
}

// Used by snapshot restore: later turns keep their sheet (undo cannot re-roll
// the dice) but lose their resolved result, so they replay through
// resolveTurn again against the restored state on next request.
function clearTurnLogResultsAfter(db, sessionId, turn) {
  db.prepare(`
    UPDATE turn_log SET status = 'pending', result_json = NULL, resolved_at = NULL
    WHERE session_id = ? AND turn > ?
  `).run(sessionId, turn);
}

// ─── snapshots ──────────────────────────────────────────────────────────────
// At most 3 per session; the oldest is dropped on the 4th.

const MAX_SNAPSHOTS_PER_SESSION = 3;

function createSnapshot(db, sessionId, turnCount, sceneCount, stateJson) {
  const now = Date.now();
  db.prepare(`
    INSERT INTO snapshots (session_id, turn_count, scene_count, state_json, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(sessionId, turnCount, sceneCount, stateJson, now);
  const extra = db.prepare(
    'SELECT id FROM snapshots WHERE session_id = ? ORDER BY created_at DESC, id DESC'
  ).all(sessionId).slice(MAX_SNAPSHOTS_PER_SESSION);
  for (const row of extra) {
    db.prepare('DELETE FROM snapshots WHERE id = ?').run(row.id);
  }
  return db.prepare('SELECT * FROM snapshots WHERE session_id = ? ORDER BY created_at DESC, id DESC').all(sessionId);
}

function getSnapshots(db, sessionId) {
  return db.prepare(
    'SELECT id, turn_count, scene_count, created_at FROM snapshots WHERE session_id = ? ORDER BY created_at DESC, id DESC'
  ).all(sessionId);
}

function getSnapshotById(db, sessionId, id) {
  return db.prepare(
    'SELECT * FROM snapshots WHERE session_id = ? AND id = ?'
  ).get(sessionId, id) || null;
}

function deleteSnapshot(db, sessionId, id) {
  db.prepare('DELETE FROM snapshots WHERE session_id = ? AND id = ?').run(sessionId, id);
}

// Wipes everything a previous playthrough left behind for this session:
// turn_log (so a fresh turn 1 never replays an old resolved result),
// messages (so the migrated-save history fallback never leaks the old
// story into the new game's prompt), and snapshots (so an old checkpoint
// can't restore a character from a different adventure). Called from
// POST /api/game/begin so "New Adventure" starts genuinely clean even
// though it reuses the session/save code (every new game is meant to get a
// fresh save code; this is the in-session fallback for the same effect).
function clearSessionHistory(db, sessionId) {
  db.prepare('DELETE FROM turn_log WHERE session_id = ?').run(sessionId);
  db.prepare('DELETE FROM messages WHERE session_id = ?').run(sessionId);
  db.prepare('DELETE FROM snapshots WHERE session_id = ?').run(sessionId);
}

// ─── Active modules ───────────────────────────────────────────────────────────

// Stores the list of active Gamma Rising optional module IDs for a session.
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
  saveGameStateVersioned,
  saveActiveModules, getActiveModules,
  generateSaveCode, getSessionByCode, ensureSaveCode, normalizeSaveCode, formatSaveCode,
  getUsage, getUsageHistory, recordUsage, setBlockedUntil,
  getTurnLog, insertPendingTurn, resolveTurnLogRow, clearTurnLogResultsAfter, getRecentResolvedTurnLog,
  createSnapshot, getSnapshots, getSnapshotById, deleteSnapshot, clearSessionHistory, MAX_SNAPSHOTS_PER_SESSION,
};
