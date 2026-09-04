'use strict';
// Simple script to verify rule loader works — no HTTP, no server startup

const { loadRules, getRulesCache, getLoadedIds, BLOCKED_IDS } = require('../../server/ruleLoader');

loadRules();

const ids = getLoadedIds();
console.log('Loaded IDs:', ids);
console.log('Count:', ids.length);

const cache = getRulesCache();

// Check 5 rulesets loaded
if (ids.length !== 5) {
  console.log('FAIL expected 5 rulesets, got ' + ids.length);
  process.exit(1);
}

// Check knight_hawks blocked
if (ids.includes('knight_hawks') || ids.includes('knight_hawks_expanded')) {
  console.log('FAIL: knight_hawks in cache');
  process.exit(1);
}

// Check master_index loaded
if (!cache['master_index']) {
  console.log('FAIL: master_index not loaded');
  process.exit(1);
}

// Check ai_query_patterns present in master_index
if (!cache['master_index'].star_frontiers_rules_system) {
  console.log('FAIL: star_frontiers_rules_system not in master_index');
  process.exit(1);
}

// Check alpha_dawn_basic has character_creation.races
if (!cache['alpha_dawn_basic'] || !cache['alpha_dawn_basic'].character_creation) {
  console.log('FAIL: alpha_dawn_basic.character_creation missing');
  process.exit(1);
}

// Check alpha_dawn_basic combat section exists
if (!cache['alpha_dawn_basic'].combat) {
  console.log('FAIL: alpha_dawn_basic.combat missing');
  process.exit(1);
}

// Check zebulons_guide has new_races
if (!cache['zebulons_guide'] || !cache['zebulons_guide'].new_races) {
  console.log('FAIL: zebulons_guide.new_races missing');
  process.exit(1);
}

// Check gamma_dawn has psionics
if (!cache['gamma_dawn'] || !cache['gamma_dawn'].psionics) {
  console.log('FAIL: gamma_dawn.psionics missing');
  process.exit(1);
}

console.log('ALL TESTS PASSED');
process.exit(0);
