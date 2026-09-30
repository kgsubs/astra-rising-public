'use strict';
// Simple script to verify rule loader works — no HTTP, no server startup

const { loadRules, getRulesCache, getLoadedIds, rulesReady } = require('../../server/ruleLoader');

// Before loadRules() runs, nothing is cached yet: rulesReady() must say so.
if (rulesReady()) {
  console.log('FAIL: rulesReady() is true before loadRules() has run');
  process.exit(1);
}

loadRules();

// After a normal load, every ruleset a turn depends on is present.
if (!rulesReady()) {
  console.log('FAIL: rulesReady() is false after a normal loadRules()');
  process.exit(1);
}

const ids = getLoadedIds();
console.log('Loaded IDs:', ids);
console.log('Count:', ids.length);

const cache = getRulesCache();

// Check 5 rulesets loaded
if (ids.length !== 5) {
  console.log('FAIL expected 5 rulesets, got ' + ids.length);
  process.exit(1);
}

// Check master_index loaded
if (!cache['master_index']) {
  console.log('FAIL: master_index not loaded');
  process.exit(1);
}

// Check ai_query_patterns present in master_index
if (!cache['master_index'].astra_rules_system) {
  console.log('FAIL: astra_rules_system not in master_index');
  process.exit(1);
}

// Check core_basic has character_creation.races
if (!cache['core_basic'] || !cache['core_basic'].character_creation) {
  console.log('FAIL: core_basic.character_creation missing');
  process.exit(1);
}

// Check core_basic combat section exists
if (!cache['core_basic'].combat) {
  console.log('FAIL: core_basic.combat missing');
  process.exit(1);
}

// Check korvaths_guide has new_races
if (!cache['korvaths_guide'] || !cache['korvaths_guide'].new_races) {
  console.log('FAIL: korvaths_guide.new_races missing');
  process.exit(1);
}

// Check gamma_rising has psionics
if (!cache['gamma_rising'] || !cache['gamma_rising'].psionics) {
  console.log('FAIL: gamma_rising.psionics missing');
  process.exit(1);
}

console.log('ALL TESTS PASSED');
process.exit(0);
