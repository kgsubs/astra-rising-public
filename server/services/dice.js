'use strict';

// ─── Dice service ──────────────────────────────────────────────────────────────
// Every number the server needs to decide a turn's outcome comes from here.
// Real play uses crypto.randomInt (cryptographically secure, uniform); tests
// use a scripted stand-in so a turn's outcome is deterministic.

const crypto = require('crypto');

/**
 * d(n) — one die of n sides, 1..n inclusive.
 */
function d(n) {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`d(n): n must be a positive integer, got ${n}`);
  }
  return crypto.randomInt(1, n + 1);
}

/**
 * d100() — a percentile roll, 1..100.
 */
function d100() {
  return d(100);
}

/**
 * roll(spec) — parses "NdM", "NdM+K" or "NdM-K" and returns the total.
 * Example: roll('2d10+5') → sum of two d10 plus 5.
 */
function roll(spec) {
  const m = String(spec).trim().match(/^(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?$/i);
  if (!m) throw new Error(`roll(spec): could not parse "${spec}"`);
  const count = parseInt(m[1], 10);
  const sides = parseInt(m[2], 10);
  const sign  = m[3] === '-' ? -1 : 1;
  const bonus = m[4] ? sign * parseInt(m[4], 10) : 0;
  let total = 0;
  for (let i = 0; i < count; i += 1) total += d(sides);
  return total + bonus;
}

function createRealDice() {
  return { d, roll, d100 };
}

/**
 * createScriptedDice(script) — a dice object whose d/roll/d100 calls consume
 * the next value from `script`, in order, wrapping around once exhausted.
 * Used by tests that need to name the exact roll a turn produces.
 */
function createScriptedDice(script) {
  if (!Array.isArray(script) || script.length === 0) {
    throw new Error('createScriptedDice requires a non-empty array of numbers');
  }
  let i = 0;
  function next() {
    const v = script[i % script.length];
    i += 1;
    return v;
  }
  return {
    d(n) { void n; return next(); },
    roll(spec) { void spec; return next(); },
    d100() { return next(); },
    // Test-only introspection: how many values have been consumed.
    _drawCount() { return i; },
  };
}

let _warnedScript = false;

/**
 * getDice() — the real dice, unless ASTRA_DICE_SCRIPT is set and
 * NODE_ENV !== 'production', in which case every roll in the process is
 * scripted from a comma-separated list of integers. Never honored in
 * production, so a leaked env var cannot predict the house's own dice.
 */
function getDice() {
  const scriptEnv = process.env.ASTRA_DICE_SCRIPT;
  if (scriptEnv && process.env.NODE_ENV !== 'production') {
    if (!_warnedScript) {
      console.warn(`[dice] ASTRA_DICE_SCRIPT is set — every roll in this process is scripted, not random: ${scriptEnv}`);
      _warnedScript = true;
    }
    const values = scriptEnv.split(',').map(s => parseInt(s.trim(), 10)).filter(Number.isFinite);
    return createScriptedDice(values.length ? values : [1]);
  }
  return createRealDice();
}

module.exports = { d, roll, d100, createRealDice, createScriptedDice, getDice };
