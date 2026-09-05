'use strict';

// Does what the DM said actually land in the game, and does it survive a
// reload? The state-heavy fixture moves stamina, credits, XP, ammo, inventory,
// status and the journal in one turn, so one turn proves the whole path.

async function run(r, ctx) {
  const { browser: b, base } = ctx;

  const snapshot = () => b.eval(`
    let s = null;
    try { s = JSON.parse(localStorage.getItem('sf_game_save') || 'null'); } catch (e) {}
    if (!s) return null;
    return {
      stamina: s.character && s.character.stamina ? s.character.stamina.current : null,
      staminaMax: s.character && s.character.stamina ? s.character.stamina.max : null,
      credits: s.character ? s.character.credits : null,
      xp: s.character ? (s.character.xp && s.character.xp.total !== undefined ? s.character.xp.total : s.character.xp) : null,
      status: s.character ? s.character.status_effects : null,
      inventory: s.character ? s.character.inventory : null,
      ammo: s.character ? s.character.ammo : null,
      journal: s.campaign ? (s.campaign.journal || []).length : null,
      scene: s.campaign ? s.campaign.current_scene_id : null,
      turns: s.session ? s.session.turn_count : null,
      messages: (s.messages || []).length,
    };
  `);

  const after = snapshot();
  r.check('a game snapshot is stored locally', !!after, after ? '' : 'nothing in local storage');
  if (!after) return ctx;

  r.check('damage reduced stamina', after.stamina !== null && after.stamina < after.staminaMax,
    `${after.stamina}/${after.staminaMax}`);
  r.check('the payout raised credits', typeof after.credits === 'number' && after.credits > 500, `${after.credits}`);
  r.check('experience was awarded', after.xp !== null && Number(after.xp) > 0, `${after.xp}`);
  r.check('spent ammo was deducted', after.ammo && Object.values(after.ammo).some(v => typeof v === 'number'), JSON.stringify(after.ammo || {}));
  r.check('looted item entered the inventory',
    Array.isArray(after.inventory) && after.inventory.some(i => /data spike/i.test(typeof i === 'string' ? i : (i.name || ''))),
    JSON.stringify(after.inventory || []).slice(0, 120));
  r.check('a status effect was applied then cleared',
    Array.isArray(after.status) && !after.status.includes('Bleeding'), JSON.stringify(after.status || []));
  r.check('journal entries were recorded', after.journal >= 2, `${after.journal} entries`);
  r.check('the scene advanced', after.scene === 'scene_2_hold', String(after.scene));
  r.check('the turn counter advanced', Number(after.turns) >= 2, `${after.turns} turns`);
  r.check('the conversation was kept', after.messages >= 4, `${after.messages} messages`);

  // The server is the source of truth for resuming, so the same snapshot must
  // be on the server, not only in this browser.
  const token = b.localStorage('sf_session_token');
  r.check('a session token is stored', !!token);
  // The autosave fires just after the turn renders, so read the server with a
  // little patience rather than racing it.
  let body = null;
  let res = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    res = await fetch(`${base}/api/session/${token}`);
    body = await res.json().catch(() => null);
    if (body?.state_json && JSON.parse(body.state_json).campaign?.current_scene_id === after.scene) break;
    await new Promise(r2 => setTimeout(r2, 500));
  }
  r.check('the server holds the same game', !!body?.state_json, `status ${res.status}`);
  if (body?.state_json) {
    const server = JSON.parse(body.state_json);
    r.check('server stamina matches the browser', server.character?.stamina?.current === after.stamina,
      `server ${server.character?.stamina?.current} vs browser ${after.stamina}`);
    r.check('server scene matches the browser', server.campaign?.current_scene_id === after.scene);
  }

  // Reload: the game must come back exactly as it was.
  b.open(base + '/?qa=reload');
  await b.waitForText('Continue Game', { timeout: 60000, label: 'for the landing screen after reload' });
  r.check('a saved game offers Continue on return', /Continue Game/.test(b.text()));

  const cont = b.clickButton('Continue Game');
  r.check('Continue can be pressed', cont && cont.ok === true, cont && cont.reason);
  await b.waitFor("document.querySelector('textarea') && !document.querySelector('textarea').disabled",
    { timeout: 120000, label: 'for the resumed game to settle' });

  const resumed = snapshot();
  r.check('the resumed game has the same stamina', resumed && resumed.stamina === after.stamina,
    `${resumed && resumed.stamina} vs ${after.stamina}`);
  r.check('the resumed game has the same scene', resumed && resumed.scene === after.scene);
  r.check('the resumed game kept the conversation', resumed && resumed.messages >= after.messages,
    `${resumed && resumed.messages} vs ${after.messages}`);
  r.check('the resumed game shows the same save code', b.localStorage('sf_save_code') === ctx.saveCode,
    `${b.localStorage('sf_save_code')} vs ${ctx.saveCode}`);

  return ctx;
}

module.exports = { run };
