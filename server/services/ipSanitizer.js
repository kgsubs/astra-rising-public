'use strict';

// ipSanitizer.js
// Applies the canonical IP registry to raw campaign JSON strings on ingest.
// JSON keys are never modified - only string values.
// Path is resolved relative to this file so it works on any host.

const fs   = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, '../../public/data/ip-registry.json');

let _registry  = null;
let _pairs     = null;

function getRegistry() {
  if (!_registry) {
    _registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  }
  return _registry;
}

// Flatten registry sections into [find, replace] pairs.
// Longer strings first to prevent partial matches clobbering full matches.
function getPairs() {
  if (_pairs) return _pairs;
  const registry = getRegistry();
  const raw = [];
  for (const section of Object.values(registry)) {
    if (!section || typeof section !== 'object' || Array.isArray(section)) continue;
    for (const [find, replace] of Object.entries(section)) {
      if (find === '_meta') continue;
      raw.push([find, replace]);
    }
  }
  raw.sort((a, b) => b[0].length - a[0].length);
  _pairs = raw;
  return _pairs;
}

function sanitizeString(input) {
  if (typeof input !== 'string') return input;
  const pairs = getPairs();
  let result = input;
  for (const [find, replace] of pairs) {
    const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), replace);
  }
  return result;
}

function deepSanitize(node) {
  if (typeof node === 'string') return sanitizeString(node);
  if (Array.isArray(node))     return node.map(deepSanitize);
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = deepSanitize(v);
    }
    return out;
  }
  return node;
}

function sanitizeCampaignJson(rawJson) {
  const obj = JSON.parse(rawJson);
  return JSON.stringify(deepSanitize(obj), null, 2);
}

module.exports = { sanitizeString, sanitizeCampaignJson };
