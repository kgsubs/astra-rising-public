'use strict';

// ─── Rule File Loader ─────────────────────────────────────────────────────────
// Loads the 5 in-scope Astra Rising rules JSON files at server startup.
// Knights Rising files are present on disk but are OUT OF SCOPE for Phase 2 and
// are never loaded into rulesCache.
//
// Token estimate: ~50 tokens of module overhead; rule data is ~3,000 tokens
// combined across all 5 files (not injected into AI prompts directly from here).

const fs   = require('fs');
const path = require('path');

// Paths are relative to the repo root (where server.js lives).
const RULES_DIR = path.join(__dirname, '..', 'public', 'data', 'rules');

// Files to load (in-scope only). Knight Hawks is intentionally excluded.
const IN_SCOPE_FILES = [
  'rules_master_index.json',
  'rules_alpha_dawn_basic.json',
  'rules_alpha_dawn_expanded.json',
  'rules_zebulons_guide.json',
  'rules_gamma_dawn.json',
];

// IDs that are blocked even if somehow loaded (defense-in-depth).
const BLOCKED_IDS = new Set(['knight_hawks', 'knight_hawks_expanded']);

/**
 * rulesCache: { [rulesetId: string]: object }
 * Populated once at startup by loadRules(). Read-only thereafter.
 */
const rulesCache = {};

/**
 * loadRules()
 * Must be called once at server startup before any endpoint handler runs.
 * Returns { loaded: string[], errors: string[] }
 */
function loadRules() {
  const loaded  = [];
  const errors  = [];

  for (const filename of IN_SCOPE_FILES) {
    const filePath = path.join(RULES_DIR, filename);
    const start    = Date.now();

    try {
      const raw  = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(raw);
      const ms   = Date.now() - start;

      // Determine the ruleset ID. master_index uses a nested structure.
      let rulesetId;
      if (data.star_frontiers_rules_system) {
        // rules_master_index.json — special case
        rulesetId = 'master_index';
      } else if (data.ruleset && data.ruleset.id) {
        rulesetId = data.ruleset.id;
      } else {
        errors.push(`${filename}: missing ruleset.id field`);
        continue;
      }

      if (BLOCKED_IDS.has(rulesetId)) {
        errors.push(`${filename}: blocked ruleset id "${rulesetId}" — skipping`);
        continue;
      }

      rulesCache[rulesetId] = data;
      loaded.push(rulesetId);

      const topLevelKeys = Object.keys(data).length;
      console.log(
        `[rules] loaded ${filename} → id="${rulesetId}" ` +
        `keys=${topLevelKeys} time=${ms}ms`
      );
    } catch (err) {
      errors.push(`${filename}: ${err.message}`);
      console.error(`[rules] FAILED to load ${filename}: ${err.message}`);
    }
  }

  console.log(`[rules] startup complete — ${loaded.length} rulesets loaded: [${loaded.join(', ')}]`);
  if (errors.length > 0) {
    console.error(`[rules] ${errors.length} error(s) during load:`, errors);
  }

  return { loaded, errors };
}

/**
 * getRulesCache()
 * Returns the populated rulesCache object (read-only reference).
 */
function getRulesCache() {
  return rulesCache;
}

/**
 * getLoadedIds()
 * Returns array of all ruleset IDs currently in cache, including master_index.
 * Callers that need only playable rulesets can filter out 'master_index'.
 */
function getLoadedIds() {
  return Object.keys(rulesCache);
}

module.exports = { loadRules, getRulesCache, getLoadedIds, BLOCKED_IDS };
