'use strict';

const crypto = require('crypto');
const { d, roll, d100, createRealDice, createScriptedDice, getDice } = require('../server/services/dice');

describe('dice.js', () => {
  test('d(100) stays within 1..100 over 10k draws', () => {
    for (let i = 0; i < 10000; i += 1) {
      const v = d(100);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  test('d100() stays within 1..100 over 10k draws', () => {
    for (let i = 0; i < 10000; i += 1) {
      const v = d100();
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  test('d(n) rejects a non-positive-integer n', () => {
    expect(() => d(0)).toThrow();
    expect(() => d(-5)).toThrow();
    expect(() => d(1.5)).toThrow();
  });

  test('roll("2d10+5") stays within the formula bounds over many draws', () => {
    for (let i = 0; i < 2000; i += 1) {
      const v = roll('2d10+5');
      expect(v).toBeGreaterThanOrEqual(7);
      expect(v).toBeLessThanOrEqual(25);
    }
  });

  test('roll("1d5") stays within 1..5', () => {
    for (let i = 0; i < 500; i += 1) {
      const v = roll('1d5');
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(5);
    }
  });

  test('roll rejects an unparseable spec', () => {
    expect(() => roll('not a spec')).toThrow();
  });

  test('d() uses crypto.randomInt', () => {
    const spy = jest.spyOn(crypto, 'randomInt');
    d(20);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('createRealDice() exposes d/roll/d100 backed by crypto', () => {
    const dice = createRealDice();
    expect(typeof dice.d).toBe('function');
    expect(typeof dice.roll).toBe('function');
    expect(typeof dice.d100).toBe('function');
    const v = dice.d(6);
    expect(v).toBeGreaterThanOrEqual(1);
    expect(v).toBeLessThanOrEqual(6);
  });

  test('createScriptedDice replays its script in order and wraps around', () => {
    const dice = createScriptedDice([1, 50, 99]);
    expect(dice.d(20)).toBe(1);
    expect(dice.roll('2d10')).toBe(50);
    expect(dice.d100()).toBe(99);
    expect(dice.d(20)).toBe(1); // wrapped
  });

  test('createScriptedDice rejects an empty script', () => {
    expect(() => createScriptedDice([])).toThrow();
    expect(() => createScriptedDice('nope')).toThrow();
  });

  describe('getDice() and ASTRA_DICE_SCRIPT', () => {
    const ORIGINAL_ENV = { ...process.env };

    afterEach(() => {
      process.env = { ...ORIGINAL_ENV };
    });

    test('with no script set, getDice() returns real dice', () => {
      delete process.env.ASTRA_DICE_SCRIPT;
      const dice = getDice();
      const v = dice.d(6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    });

    test('ASTRA_DICE_SCRIPT drives every roll outside production', () => {
      process.env.NODE_ENV = 'test';
      process.env.ASTRA_DICE_SCRIPT = '7,8,9';
      const dice = getDice();
      expect(dice.d(20)).toBe(7);
      expect(dice.roll('1d10')).toBe(8);
      expect(dice.d100()).toBe(9);
    });

    test('ASTRA_DICE_SCRIPT is ignored under NODE_ENV=production', () => {
      process.env.NODE_ENV = 'production';
      process.env.ASTRA_DICE_SCRIPT = '7,8,9';
      const dice = getDice();
      // A scripted die always returns 7 first; a real die essentially never
      // does across a long draw, so this proves production ignored the script.
      let allSeven = true;
      for (let i = 0; i < 50; i += 1) {
        if (dice.d(100) !== 7) { allSeven = false; break; }
      }
      expect(allSeven).toBe(false);
    });
  });
});
