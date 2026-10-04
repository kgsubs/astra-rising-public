'use strict';

const { loadGameData, getAdventureModule, getScene, getCharacter, getAdventureLibraryEntry } = require('../server/services/gameData');

describe('gameData.js', () => {
  test('loadGameData() runs public/data/game-data.js cleanly and returns the four globals', () => {
    const data = loadGameData();
    expect(Array.isArray(data.ADVENTURE_LIBRARY)).toBe(true);
    expect(typeof data.ADVENTURE_MODULES).toBe('object');
    expect(Array.isArray(data.CHARACTER_ROSTER)).toBe(true);
    expect(typeof data.TOOLTIP_GLOSSARY).toBe('object');
    expect(data.CHARACTER_ROSTER.length).toBeGreaterThan(0);
  });

  test('getAdventureModule finds a known module and its scenes', () => {
    const mod = getAdventureModule('ghost_station');
    expect(mod).not.toBeNull();
    expect(Array.isArray(mod.scenes)).toBe(true);
    expect(mod.scenes.length).toBeGreaterThan(0);
  });

  test('getAdventureModule returns null for an unknown id', () => {
    expect(getAdventureModule('not_a_real_adventure')).toBeNull();
  });

  test('getScene finds a scene by adventure + scene id', () => {
    const scene = getScene('ghost_station', 'scene_1_docking');
    expect(scene).not.toBeNull();
    expect(scene.id).toBe('scene_1_docking');
    expect(Array.isArray(scene.exits)).toBe(true);
  });

  test('getScene returns null for an unknown scene id', () => {
    expect(getScene('ghost_station', 'scene_does_not_exist')).toBeNull();
  });

  test('getCharacter finds a roster character by id', () => {
    const char = getCharacter('kael_voss');
    expect(char).not.toBeNull();
    expect(char.name).toBe('Kael Voss');
    expect(char.stamina.max).toBe(55);
  });

  test('getCharacter returns null for an unknown id', () => {
    expect(getCharacter('nobody')).toBeNull();
  });

  test('every scene exit leads to a scene that exists in the same adventure', () => {
    const { ADVENTURE_MODULES } = loadGameData();
    const dead = [];
    for (const [id, mod] of Object.entries(ADVENTURE_MODULES)) {
      const ids = new Set(mod.scenes.map(s => s.id));
      for (const s of mod.scenes) for (const e of s.exits || []) if (!ids.has(e.to)) dead.push(`${id}: ${s.id} -> ${e.to}`);
    }
    expect(dead).toEqual([]);
  });

  test('getAdventureLibraryEntry finds the library card for an adventure', () => {
    const entry = getAdventureLibraryEntry('ghost_station');
    expect(entry).not.toBeNull();
    expect(entry.title).toBe('Ghost Station');
  });
});
