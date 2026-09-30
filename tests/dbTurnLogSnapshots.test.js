'use strict';

const {
  initDb, createSession, getSession, saveGameStateVersioned, getGameState,
  getTurnLog, insertPendingTurn, resolveTurnLogRow, clearTurnLogResultsAfter, getRecentResolvedTurnLog,
  createSnapshot, getSnapshots, getSnapshotById, deleteSnapshot, MAX_SNAPSHOTS_PER_SESSION,
} = require('../db');

describe('db.js — turn_log and snapshots', () => {
  let db;
  let sessionId;

  beforeAll(() => {
    db = initDb(':memory:');
    createSession(db, 'turnlog-test-token');
    sessionId = getSession(db, 'turnlog-test-token').id;
  });

  afterAll(() => {
    if (db && db.close) db.close();
  });

  test('game_state.version increments on every versioned save', () => {
    saveGameStateVersioned(db, sessionId, '{"turn":1}');
    let row = getGameState(db, sessionId);
    expect(row.version).toBe(1);
    saveGameStateVersioned(db, sessionId, '{"turn":2}');
    row = getGameState(db, sessionId);
    expect(row.version).toBe(2);
    expect(JSON.parse(row.state_json).turn).toBe(2);
  });

  test('turn_log: a pending row can be inserted, read back and resolved', () => {
    expect(getTurnLog(db, sessionId, 1)).toBeNull();
    const pending = insertPendingTurn(db, sessionId, 1, '{"text":"go north"}', '{"rows":{}}');
    expect(pending.status).toBe('pending');
    expect(pending.result_json).toBeNull();

    resolveTurnLogRow(db, sessionId, 1, '{"narrative":"You go north."}');
    const resolved = getTurnLog(db, sessionId, 1);
    expect(resolved.status).toBe('resolved');
    expect(JSON.parse(resolved.result_json).narrative).toBe('You go north.');
    expect(resolved.resolved_at).not.toBeNull();
  });

  test('inserting a pending row twice for the same turn does not duplicate it', () => {
    insertPendingTurn(db, sessionId, 2, '{"a":1}', '{"rows":{}}');
    insertPendingTurn(db, sessionId, 2, '{"a":2}', '{"rows":{}}');
    const count = db.prepare('SELECT COUNT(*) AS cnt FROM turn_log WHERE session_id = ? AND turn = ?').get(sessionId, 2);
    expect(count.cnt).toBe(1);
  });

  test('clearTurnLogResultsAfter resets later turns to pending without touching earlier ones', () => {
    insertPendingTurn(db, sessionId, 3, '{}', '{"rows":{}}');
    resolveTurnLogRow(db, sessionId, 3, '{"narrative":"three"}');
    insertPendingTurn(db, sessionId, 4, '{}', '{"rows":{}}');
    resolveTurnLogRow(db, sessionId, 4, '{"narrative":"four"}');

    clearTurnLogResultsAfter(db, sessionId, 2);

    expect(getTurnLog(db, sessionId, 1).status).toBe('resolved'); // turn 1 unaffected
    expect(getTurnLog(db, sessionId, 3).status).toBe('pending');
    expect(getTurnLog(db, sessionId, 3).result_json).toBeNull();
    expect(getTurnLog(db, sessionId, 4).status).toBe('pending');
  });

  test('getRecentResolvedTurnLog loads only the last N resolved turns, oldest first', () => {
    for (let t = 10; t <= 20; t += 1) {
      insertPendingTurn(db, sessionId, t, '{}', '{"rows":{}}');
      resolveTurnLogRow(db, sessionId, t, `{"narrative":"turn ${t}"}`);
    }
    const recent = getRecentResolvedTurnLog(db, sessionId, 6);
    expect(recent).toHaveLength(6);
    expect(recent.map(r => r.turn)).toEqual([15, 16, 17, 18, 19, 20]); // oldest first
    expect(JSON.parse(recent[0].result_json).narrative).toBe('turn 15');
    expect(JSON.parse(recent[5].result_json).narrative).toBe('turn 20');
  });

  test('snapshots: created, listed newest first, and capped at MAX_SNAPSHOTS_PER_SESSION', () => {
    for (let i = 1; i <= MAX_SNAPSHOTS_PER_SESSION + 2; i += 1) {
      createSnapshot(db, sessionId, i, 0, `{"turn":${i}}`);
    }
    const list = getSnapshots(db, sessionId);
    expect(list.length).toBe(MAX_SNAPSHOTS_PER_SESSION);
    expect(list[0].turn_count).toBe(MAX_SNAPSHOTS_PER_SESSION + 2); // newest first
  });

  test('getSnapshotById and deleteSnapshot work on a session\'s own rows', () => {
    const list = getSnapshots(db, sessionId);
    const id = list[0].id;
    expect(getSnapshotById(db, sessionId, id)).not.toBeNull();
    deleteSnapshot(db, sessionId, id);
    expect(getSnapshotById(db, sessionId, id)).toBeNull();
  });
});
