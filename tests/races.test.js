const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const rulesDir = path.join(root, 'data', 'rules');
const basic = JSON.parse(fs.readFileSync(path.join(rulesDir, 'rules_core_basic.json'), 'utf8'));
const zeb = JSON.parse(fs.readFileSync(path.join(rulesDir, 'rules_korvaths_guide.json'), 'utf8'));
const gameData = fs.readFileSync(path.join(root, 'public', 'data', 'game-data.js'), 'utf8');

const races = [...new Set([...gameData.matchAll(/race:\s*'([^']+)'/g)].map((m) => m[1].toLowerCase()))];

describe('playable races', () => {
  test('game data defines playable characters', () => {
    expect(races.length).toBeGreaterThan(0);
  });

  test.each(races)('race "%s" resolves in the rules files', (race) => {
    const found = basic.character_creation?.races?.[race] || zeb.new_races?.[race];
    expect(found && typeof found === 'object').toBe(true);
  });
});
