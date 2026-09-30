'use strict';

const { migrateLegacyState, stripServerFields, SCHEMA_VERSION, load, resolveAdventureId, resolveRulesId } = require('../server/services/stateStore');
const { initDb, createSession, getSession, saveGameStateVersioned } = require('../db');

function tamperedV1Save() {
  return {
    character: {
      id: 'kael_voss', // matches the roster
      name: 'Kael Voss', race: 'Human',
      stats: { str: 99, sta: 99, dex: 99, rs: 99, int: 99, log: 99, per: 99, ldr: 99 }, // tampered — ignored, re-derived
      stamina: { current: 500, max: 55 }, // tampered max, out-of-range current
      credits: 1e9,
      xp: { total: 1e6, unspent: 1e6 },
      inventory: Array.from({ length: 100 }, (_, i) => `Item ${i}`.padEnd(200, '!')),
      status_effects: ['Unconscious', 'Dead', 'Poisoned'],
      seu: { total: 9999, sources: [{ name: 'A13 e-clip', seu: 9999 }] },
    },
    campaign: {
      adventure_id: 'ghost_station',
      current_scene_id: 'scene_does_not_exist',
      visited_scene_ids: ['scene_1_docking'],
    },
    session: { number: 1, scene_count: 0, turn_count: 12 },
    scene: { header: '', summary: '', in_combat: true, combat_state: { round: 3, combatants: [{ id: 'h1', name: 'Invented Monster', sta_current: 9999 }] } },
    meta: { initialized: true },
    messages: [],
  };
}

describe('stateStore.js — lazy migration', () => {
  test('a tampered v1 save comes out re-derived from the roster and clamped', () => {
    const migrated = migrateLegacyState(tamperedV1Save());

    expect(migrated.schema_version).toBe(SCHEMA_VERSION);
    expect(migrated._unmatched).toBe(false);

    // Stats and stamina.max are re-derived from CHARACTER_ROSTER, not trusted from the save.
    expect(migrated.character.stats.str).toBe(55); // kael_voss's real STR
    expect(migrated.character.stamina.max).toBe(55);
    expect(migrated.character.stamina.current).toBe(55); // clamped into 0..max

    // Credits and XP are clamped to their caps.
    expect(migrated.character.credits).toBe(50000);
    expect(migrated.character.xp.total).toBe(500);
    expect(migrated.character.xp.unspent).toBe(500);

    // Inventory clamped to 40 items of 60 chars.
    expect(migrated.character.inventory.length).toBeLessThanOrEqual(40);
    expect(migrated.character.inventory.every(i => i.length <= 60)).toBe(true);

    // SEU clamped to the roster's own source capacity.
    const source = migrated.character.seu.sources.find(s => s.name === 'A13 e-clip');
    expect(source.seu).toBeLessThanOrEqual(20); // kael_voss's A13 e-clip capacity

    // Reserved statuses are stripped — the server re-derives them from STA.
    expect(migrated.character.status_effects).not.toContain('Unconscious');
    expect(migrated.character.status_effects).not.toContain('Dead');
    expect(migrated.character.status_effects).toContain('Poisoned');

    // An invalid current_scene_id resets to the module's first scene.
    expect(migrated.campaign.current_scene_id).toBe('scene_1_docking');

    // A save captured mid-combat has its combat ended.
    expect(migrated.scene.in_combat).toBe(false);
    expect(migrated.scene.combat_state).toBeNull();

    // Server-only fields are present internally...
    expect(migrated.pending_choices).toEqual({});
    expect(migrated.session.game_over).toBe(false);
  });

  test('stripServerFields removes pending_choices and session.game_over before the state reaches the browser', () => {
    const migrated = migrateLegacyState(tamperedV1Save());
    const stripped = stripServerFields(migrated);
    expect(stripped.pending_choices).toBeUndefined();
    expect(stripped.session.game_over).toBeUndefined();
    expect(stripped.session.turn_count).toBe(12); // everything else survives
  });

  test('a character that cannot be matched to the roster migrates read-only', () => {
    const save = tamperedV1Save();
    save.character = { name: 'Nobody Special', race: 'Unknown Race', stamina: { current: 10, max: 10 } };
    const migrated = migrateLegacyState(save);
    expect(migrated._unmatched).toBe(true);
    expect(migrated.character._unmatched).toBe(true);
  });

  test('a character matched by name + race alone (no id in the save) still migrates', () => {
    const save = tamperedV1Save();
    delete save.character.id;
    const migrated = migrateLegacyState(save);
    expect(migrated._unmatched).toBe(false);
    expect(migrated.character.id).toBe('kael_voss');
  });

});

describe('stateStore.js — adventure and rules id resolution, unmapped ids', () => {
  test('resolveAdventureId and resolveRulesId pass an id with no alias entry through unchanged', () => {
    expect(resolveAdventureId('ghost_station')).toBe('ghost_station');
    expect(resolveRulesId('some_unmapped_id')).toBe('some_unmapped_id');
  });

  test('a save already on schema_version 2 with no adventure_id alias entry loads with the id untouched', () => {
    const db = initDb(':memory:');
    try {
      createSession(db, 'alias-test-token');
      const sessionId = getSession(db, 'alias-test-token').id;
      const state = {
        schema_version: SCHEMA_VERSION,
        character: { id: 'kael_voss' },
        campaign: { adventure_id: 'ghost_station', current_scene_id: 'scene_1' },
        session: { number: 1, turn_count: 3, game_over: false },
        scene: {},
        meta: {},
      };
      saveGameStateVersioned(db, sessionId, JSON.stringify(state));

      const loaded = load(db, sessionId);
      expect(loaded.campaign.adventure_id).toBe('ghost_station');
    } finally {
      if (db && db.close) db.close();
    }
  });
});

// The real pre-rename ids and item names data/legacy-aliases.json maps live
// only in tests/legacyAliases.test.js, a private-repo-only file
// scripts/export-public.sh excludes alongside the data file itself. The
// tests below use invented ids that are never in any alias map, in either
// repo, so they exercise the same "nothing to resolve, pass it through"
// behavior an absent alias file produces without depending on the file's
// presence or contents.
describe('stateStore.js, data/legacy-aliases.json absent or an id has no entry', () => {
  test('a fresh migration and a fresh game both work, with every id and item name passed through unchanged', () => {
    jest.resetModules();
    const realFs = jest.requireActual('fs');
    jest.doMock('fs', () => ({
      ...realFs,
      existsSync: (p) => (String(p).endsWith('legacy-aliases.json') ? false : realFs.existsSync(p)),
    }));

    let freshStateStore;
    jest.isolateModules(() => {
      freshStateStore = require('../server/services/stateStore');
    });

    // Aliasing helpers pass every id and item name through unchanged.
    expect(freshStateStore.resolveAdventureId('retired_adventure_x')).toBe('retired_adventure_x');
    expect(freshStateStore.resolveSceneId('retired_scene_y')).toBe('retired_scene_y');
    expect(freshStateStore.resolveItemName('Retired item z')).toBe('Retired item z');

    // A fresh game (current ids throughout, nothing to migrate) still loads clean.
    const save = tamperedV1Save();
    save.campaign = {
      adventure_id: 'ghost_station',
      current_scene_id: 'scene_1_docking',
      visited_scene_ids: ['scene_1_docking'],
    };
    save.character.inventory = ['Item never renamed'];
    const migrated = freshStateStore.migrateLegacyState(save);
    expect(migrated._unmatched).toBe(false);
    expect(migrated.campaign.current_scene_id).toBe('scene_1_docking');
    expect(migrated.character.inventory).toEqual(['Item never renamed']);

    jest.dontMock('fs');
    jest.resetModules();
  });
});
