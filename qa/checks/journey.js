'use strict';

// The journey a player actually takes, driven through a real browser at a given
// viewport. Each screen is asserted on three things: it arrived, it opened at
// the top, and it does not scroll sideways.

const path = require('path');

// Read at call time, not at import time: the runner picks the folder after the
// modules are loaded, so a constant captured up here is always empty.
async function shot(b, name, label) {
  const dir = process.env.QA_SHOT_DIR;
  if (!dir) return;
  b.screenshot(path.join(dir, `${label}-${name}.png`));
}

// Every setup screen is long enough to scroll on a phone. Scrolling down before
// each transition is what surfaced the bug where the next screen opened
// half-way down, so the journey deliberately scrolls before it advances.
async function advance(b, r, label, { scrollFirst = 1200, click, waitFor, screen }) {
  if (scrollFirst) b.scrollTo(scrollFirst);
  const res = click();
  if (!res || res.ok !== true) {
    throw new Error(`could not click into ${screen}: ${res && res.reason}${res && res.seen ? ` (saw ${JSON.stringify(res.seen).slice(0, 300)})` : ''}`);
  }
  await b.waitForText(waitFor, { timeout: 90000, label: `for the ${screen} screen` });
  r.check(`${screen} screen opens at the top`, b.scrollTop() === 0, `scrollTop ${b.scrollTop()}`);
  r.check(`${screen} screen has no sideways scroll`, b.horizontalOverflow() <= 0, `overflow ${b.horizontalOverflow()}px`);
  await shot(b, screen.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label);
}

async function settled(b, timeout = 60000) {
  return b.waitFor("document.querySelector('textarea') && !document.querySelector('textarea').disabled",
    { timeout, label: 'for the turn to settle' });
}

async function run(r, ctx, { label, width, height }) {
  const { browser: b, base } = ctx;

  // The canned turns are handed out in order, and the API layer already took
  // some. Rewind so every journey sees the same script: opening, then the
  // state-heavy turn, then the scene change.
  if (ctx.fakeBase) await fetch(ctx.fakeBase + '/__reset', { method: 'POST' });

  b.setViewport(width, height);
  b.open(base + '/?qa=' + label);
  await b.waitForText('New Game', { timeout: 60000, label: 'for the landing screen' });
  b.clearStorage();
  b.open(base + '/?qa=' + label + '-clean');
  await b.waitForText('New Game', { timeout: 60000, label: 'for the landing screen' });

  r.check('landing screen offers a new game', b.text().includes('New Game'));
  r.check('landing screen offers a save code', /save code/i.test(b.text()));
  r.check('landing screen opens at the top', b.scrollTop() === 0, `scrollTop ${b.scrollTop()}`);
  r.check('landing screen has no sideways scroll', b.horizontalOverflow() <= 0, `overflow ${b.horizontalOverflow()}px`);
  await shot(b, 'landing', label);

  await advance(b, r, label, {
    scrollFirst: 0, screen: 'Choose Campaign', waitFor: 'Choose Campaign',
    click: () => b.clickButton('New Game'),
  });

  await advance(b, r, label, {
    screen: 'Choose Character', waitFor: 'Choose Character',
    click: () => b.clickButton('GHOST STATION'),
  });

  await advance(b, r, label, {
    screen: 'Name Character', waitFor: 'Name Character',
    click: () => b.clickButton('^\\s*HUMAN'),
  });

  const named = b.type('input[type="text"]', 'QA TESTWORTH');
  r.check('character name accepts typing', named && named.ok === true, named && named.reason);

  await advance(b, r, label, {
    screen: 'Choose Opening Scene', waitFor: 'Choose Opening Scene',
    click: () => b.clickButton('BEGIN ADVENTURE', { exact: true }),
  });

  const hooks = b.eval("return [...document.querySelectorAll('button')].filter(x => x.textContent.length > 40).length;");
  r.check('session zero offers three hooks', hooks === 3, `${hooks} hooks`);

  // Choosing a hook drops into the game and fires the first turn automatically.
  const chose = b.clickNthButton(0);
  r.check('an opening scene can be chosen', chose && chose.ok === true, chose && chose.reason);
  // "SUGGESTED ACTIONS" is a heading that renders before the answer arrives, so
  // waiting on it proves nothing. Wait for text only the DM's reply contains,
  // and for the input to come back to life.
  await b.waitForText('frost crawls', { timeout: 120000, label: 'for the first turn to arrive' });
  await settled(b);

  const gameText = b.text();
  r.check('game screen shows the character name', /QA TESTWORTH/i.test(gameText));
  r.check('game screen shows the save code', /YOUR GAME CODE/i.test(gameText));
  b.openSidebar('Player');
  const sheetText = b.text();
  r.check('the character sheet is reachable and populated',
    /INVENTORY/.test(sheetText) && /ATTRIBUTES/.test(sheetText) && /STA/.test(sheetText),
    sheetText.replace(/\s+/g, ' ').slice(0, 90));
  r.check('first turn produced narration',
    gameText.includes('frost crawls') || gameText.includes('airlock'),
    gameText.replace(/\s+/g, ' ').slice(-200));
  const offered = b.eval("return [...document.querySelectorAll('button')].filter(x => /Head aft|Check the bridge|Scan for/.test(x.textContent)).length;");
  r.check('first turn produced suggested actions', offered >= 1, `${offered} offered`);
  await shot(b, 'game-first-turn', label);

  ctx.saveCode = b.localStorage('sf_save_code');
  r.check('a save code was stored for this game', !!ctx.saveCode, ctx.saveCode || 'none');

  // A typed turn.
  const typed = b.type('textarea', 'I check the aft panel for damage.');
  r.check('the player input accepts typing', typed && typed.ok === true, typed && typed.reason);
  const sent = await b.clickSend();
  r.check('the send button is live once there is text', sent && sent.ok === true, sent && sent.reason);
  await b.waitForText('takes a swing at you', { timeout: 120000, label: 'for the typed turn to answer' });
  await settled(b);
  r.check('a typed turn is answered', b.text().includes('takes a swing at you'));
  // Roll results reach the player through the rules log in the sidebar, which is
  // collapsed at some widths, so open it before looking.
  b.openSidebar('GM');
  const dice = b.text();
  r.check('the roll behind the turn is reported',
    /Beam Weapons check/.test(dice) && /HIT|MISS/.test(dice),
    (dice.replace(/\s+/g, ' ').match(/Beam Weapons check[^.]*\./) || ['no roll in the log'])[0]);
  await shot(b, 'game-typed-turn', label);

  // A turn taken by pressing one of the offered choices.
  const choiceClicked = b.eval(`
    const btns = [...document.querySelectorAll('button')].filter(x => /Patch the wound|Press on regardless/.test(x.textContent));
    if (!btns.length) return { ok: false, reason: 'no choice buttons' };
    btns[0].click();
    return { ok: true, text: btns[0].textContent.trim().slice(0, 40) };
  `);
  r.check('a suggested action can be taken', choiceClicked && choiceClicked.ok === true, choiceClicked && choiceClicked.reason);
  await b.waitForText('cryo pods', { timeout: 120000, label: 'for the choice turn to answer' });
  await settled(b);
  r.check('a scene change renders its new scene', /The Hold/i.test(b.text()));
  await shot(b, 'game-scene-change', label);

  // Combat opens a panel of its own, with the initiative order in it.
  b.type('textarea', 'I open the nearest pod.');
  await b.clickSend();
  await b.waitForText('cracks its seal', { timeout: 120000, label: 'for combat to start' });
  await settled(b);
  // The combat panel sits under the Player tab of the sidebar.
  b.openSidebar('Player');
  const combatText = b.text();
  r.check('combat announces itself', /COMBAT ACTIVE/i.test(combatText),
    (combatText.replace(/\s+/g, ' ').match(/Combat Active.{0,60}/i) || ['no panel'])[0]);
  r.check('combat lists who is in the fight', /Pod Sleeper/.test(combatText),
    (combatText.replace(/\s+/g, ' ').match(/Combat Active.{0,120}/i) || ['no combat panel'])[0]);
  await shot(b, 'game-combat', label);

  return ctx;
}

module.exports = { run };
