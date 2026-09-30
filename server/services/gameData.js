'use strict';

// ─── Game data loader ──────────────────────────────────────────────────────────
// public/data/game-data.js is a plain browser script of top-level `const`s
// with no exports (the browser loads it with a <script> tag before app.js).
// The server needs the same data — adventure scenes, the character roster,
// the tooltip glossary — without editing that file, because the browser
// still needs it exactly as it is.
//
// vm.runInNewContext runs the file's source in a throwaway global scope and
// evaluates a trailing expression that packages up the four top-level
// consts as an object. The file is read, not required, so it never touches
// module.exports and stays a plain browser script.

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const GAME_DATA_PATH = path.join(__dirname, '..', '..', 'public', 'data', 'game-data.js');

let _cache = null;

/**
 * loadGameData() — returns { ADVENTURE_LIBRARY, ADVENTURE_MODULES,
 * CHARACTER_ROSTER, TOOLTIP_GLOSSARY }, read once and cached for the life of
 * the process (the file does not change at runtime).
 */
function loadGameData() {
  if (_cache) return _cache;
  const src = fs.readFileSync(GAME_DATA_PATH, 'utf8');
  const wrapped = `${src}\n;({ADVENTURE_LIBRARY, ADVENTURE_MODULES, CHARACTER_ROSTER, TOOLTIP_GLOSSARY})`;
  _cache = vm.runInNewContext(wrapped, {}, { filename: GAME_DATA_PATH });
  return _cache;
}

/**
 * _resetCacheForTests() — test-only escape hatch; production code never
 * needs to reload a file that cannot change underneath a running process.
 */
function _resetCacheForTests() {
  _cache = null;
}

function getAdventureModule(adventureId) {
  const data = loadGameData();
  return (data.ADVENTURE_MODULES && data.ADVENTURE_MODULES[adventureId]) || null;
}

function getScene(adventureId, sceneId) {
  const mod = getAdventureModule(adventureId);
  if (!mod || !Array.isArray(mod.scenes)) return null;
  return mod.scenes.find(s => s.id === sceneId) || null;
}

function getCharacter(characterId) {
  const data = loadGameData();
  return (data.CHARACTER_ROSTER || []).find(c => c.id === characterId) || null;
}

function getAdventureLibraryEntry(adventureId) {
  const data = loadGameData();
  return (data.ADVENTURE_LIBRARY || []).find(a => a.id === adventureId) || null;
}

module.exports = {
  loadGameData,
  getAdventureModule,
  getScene,
  getCharacter,
  getAdventureLibraryEntry,
  GAME_DATA_PATH,
  _resetCacheForTests,
};
