'use strict';

const { loadRules } = require('../server/ruleLoader');
loadRules();

const {
  buildTurnPrompt, buildSessionZeroPrompt, buildSessionZeroUserMessage,
  buildCompressPrompt, buildHistoryMessages, XP_AWARD_KEYS,
} = require('../server/services/promptBuilder');
const { buildSheet, renderSheet } = require('../server/services/outcomeSheet');
const { createScriptedDice } = require('../server/services/dice');
const { getRulesCache } = require('../server/ruleLoader');
const houseRules = require('../server/data/house_rules.json');
const { makeState } = require('./helpers/astraFixtures');

describe('promptBuilder.js', () => {
  // Without a format block the model answered Ask GM in plain prose 2 of 4
  // times in the real-AI evals (2026-10-01).
  test('an Ask GM turn is told the exact reply format, answer in ooc_note', () => {
    const prompt = buildTurnPrompt({ state: makeState(), sheetText: null, isAskGM: true });
    expect(prompt).toMatch(/OUTPUT: respond with ONLY a single JSON object/);
    expect(prompt).toMatch(/"ooc_note":"string"/);
    expect(prompt).not.toMatch(/OUTCOME SHEET/);
  });

  test('the prompt header is ASTRA RISING RULES ENGINE, not the old game\'s rules-engine header', () => {
    const prompt = buildTurnPrompt({ state: makeState(), sheetText: 'OUTCOME SHEET (turn 1).', isAskGM: false });
    expect(prompt).toContain('ASTRA RISING RULES ENGINE');
    expect(prompt).not.toMatch(/RPG RULES/);
  });

  test('a normal turn includes the outcome sheet and the v2 schema block', () => {
    const state = makeState();
    const sheet = buildSheet(state, null, createScriptedDice([50]), getRulesCache(), houseRules);
    const sheetText = renderSheet(sheet);
    const prompt = buildTurnPrompt({ state, sheetText, isAskGM: false });
    expect(prompt).toContain('OUTCOME SHEET');
    expect(prompt).toContain('"checks"');
    expect(prompt).toContain('Never output dice_rolls');
  });

  test('the schema block gives the full enum shapes, not just null, for hazard/healing/credits/combat', () => {
    const state = makeState();
    const sheet = buildSheet(state, null, createScriptedDice([50]), getRulesCache(), houseRules);
    const prompt = buildTurnPrompt({ state, sheetText: renderSheet(sheet), isAskGM: false });
    expect(prompt).toContain('"severity":"minor|moderate|severe"');
    expect(prompt).toContain('"stimdose|first_aid|rest_day"');
    expect(prompt).toContain('"kind":"reward|purchase|payment|sale"');
    expect(prompt).toContain('"tier":"token|small|medium|large|fortune"');
    expect(prompt).toContain('{"start":[{"name":"Pod Sleeper","threat":"minion|soldier|elite|boss"}]}');
    expect(prompt).toContain('{"end":"victory|fled|surrender"}');
  });

  test('the schema block lists the valid xp_awards keys from house_rules.json', () => {
    expect(XP_AWARD_KEYS).toEqual(expect.arrayContaining(['discovery', 'victory', 'mission_success']));
    expect(XP_AWARD_KEYS).not.toContain('source');
    const prompt = buildTurnPrompt({ state: makeState(), sheetText: 'OUTCOME SHEET (turn 1).', isAskGM: false });
    for (const key of XP_AWARD_KEYS) expect(prompt).toContain(key);
  });

  test('the outcome sheet lists the player owned weapon ids, skill keys and active enemy ids', () => {
    const character = { ...makeState().character };
    const state = makeState({
      character: { ...character, inventory: ['Olef A13 laser pistol', 'Medkit'] },
      scene: { ...makeState().scene, in_combat: true, combat_state: { round: 1, phase: 'player_turn', initiative_order: [], combatants: [{ id: 'h1', name: 'Pod Sleeper', is_player: false, status: 'active', rs: 30 }] } },
    });
    const sheet = buildSheet(state, null, createScriptedDice([50]), getRulesCache(), houseRules);
    const sheetText = renderSheet(sheet);
    expect(sheetText).toContain('laser_pistol');
    expect(sheetText).toContain('beam_weapons');
    expect(sheetText).toContain('h1');
    const prompt = buildTurnPrompt({ state, sheetText, isAskGM: false });
    expect(prompt).toContain('IDS for a choice');
  });

  test('a compressed campaign\'s summary reaches the turn prompt', () => {
    const state = makeState({
      scene: { ...makeState().scene, history_compressed: true, compressed_summary: 'Kael fled the wreck and allied with the station crew.' },
    });
    const prompt = buildTurnPrompt({ state, sheetText: 'OUTCOME SHEET (turn 5).', isAskGM: false });
    expect(prompt).toContain('COMPRESSED_HISTORY');
    expect(prompt).toContain('Kael fled the wreck and allied with the station crew.');
  });

  test('an uncompressed campaign carries no COMPRESSED_HISTORY line', () => {
    const prompt = buildTurnPrompt({ state: makeState(), sheetText: 'OUTCOME SHEET (turn 1).', isAskGM: false });
    expect(prompt).not.toContain('COMPRESSED_HISTORY');
  });

  test('an Ask GM turn gets no sheet and no mechanics', () => {
    const state = makeState();
    const prompt = buildTurnPrompt({ state, sheetText: 'OUTCOME SHEET (turn 1).', isAskGM: true });
    expect(prompt).not.toContain('OUTCOME SHEET');
    expect(prompt).not.toContain('"checks"');
  });

  test('the prompt does not carry the old numeric rules lines', () => {
    const prompt = buildTurnPrompt({ state: makeState(), sheetText: null, isAskGM: true });
    expect(prompt).not.toMatch(/roll d100 equal to or under/i);
    expect(prompt).not.toMatch(/roll d10, add IM/i);
  });

  test('buildSessionZeroPrompt keeps the literal "SessionZeroResponse" wording (fake-provider routes on it)', () => {
    const prompt = buildSessionZeroPrompt(
      { name: 'Kael Voss', race: 'Human', archetype: 'Soldier/Enforcer' },
      { title: 'Ghost Station', genre: 'Cosmic Horror', tone: ['Dread', 'Mystery'] },
    );
    expect(prompt).toContain('SessionZeroResponse');
  });

  test('buildSessionZeroUserMessage keeps the literal "Begin Session Zero" wording', () => {
    const msg = buildSessionZeroUserMessage(
      'QA Testworth',
      { race: 'Human', archetype: 'Soldier/Enforcer' },
      { title: 'Ghost Station', genre: 'Cosmic Horror', tone: ['Dread'] },
    );
    expect(msg).toMatch(/^Begin Session Zero/);
    expect(msg).toContain('QA Testworth');
  });

  test('buildCompressPrompt produces a plain-prose system message, not JSON output', () => {
    const { system, user } = buildCompressPrompt(makeState());
    expect(system).toMatch(/campaign historian/i);
    expect(user).toContain('Campaign data:');
  });

  test('buildHistoryMessages rewrites resolved turn_log rows as compact v2 JSON', () => {
    const rows = [
      { status: 'resolved', request_json: JSON.stringify({ text: 'I check the panel.' }), result_json: JSON.stringify({ narrative: 'You check the panel.', checks: [{ row: 'S1' }] }) },
      { status: 'pending', request_json: '{}', result_json: null },
    ];
    const history = buildHistoryMessages({ turnLogRows: rows });
    expect(history).toHaveLength(2); // one user + one assistant, the pending row is skipped
    expect(history[0]).toEqual({ role: 'user', content: 'I check the panel.' });
    const assistant = JSON.parse(history[1].content);
    expect(assistant.narrative).toBe('You check the panel.');
    expect(assistant.checks).toEqual([{ row: 'S1' }]);
  });

  test('buildHistoryMessages falls back to legacy messages, keeping only the narrative', () => {
    const legacyMessages = [
      { role: 'user', content: 'go north' },
      { role: 'assistant', content: JSON.stringify({ narrative: 'You head north.', dice_rolls: [{ roll: 42 }], state_updates: { stamina_delta: -5 } }) },
    ];
    const history = buildHistoryMessages({ legacyMessages });
    expect(history).toHaveLength(1);
    const parsed = JSON.parse(history[0].content);
    expect(parsed.narrative).toBe('You head north.');
    expect(parsed.dice_rolls).toBeUndefined();
    expect(parsed.state_updates).toBeUndefined();
  });

  test('buildHistoryMessages keeps only the last 6 resolved turns', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      status: 'resolved', request_json: JSON.stringify({ text: `turn ${i}` }),
      result_json: JSON.stringify({ narrative: `narrative ${i}`, checks: [] }),
    }));
    const history = buildHistoryMessages({ turnLogRows: rows });
    // 6 turns * 2 messages (user + assistant) = 12
    expect(history).toHaveLength(12);
    expect(history[0].content).toBe('turn 4'); // the 5th of 10, i.e. the first of the last 6
  });
});
