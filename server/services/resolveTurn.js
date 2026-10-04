'use strict';

// ─── Turn resolution ────────────────────────────────────────────────────────────
// Applies the server's own pre-rolled outcome sheet to the game state. The
// model's narrative may say anything; only the sheet's rolls, and the model's
// row/action/enum *selections* (never its numbers), change state. This module
// has no randomness of its own — every number it uses comes from the sheet
// buildSheet() already rolled, so the same (state, sheet, out) always
// produces the same result.

const RESERVED_STATUSES = new Set(['Unconscious', 'Dead']);

// A model-written inventory_add item that carries a count suffix ("Stimdose
// x50") is the model minting quantity for itself — every real quantity
// change (stimdose consumption, a purchase, a reward) already goes through
// its own server-rolled path elsewhere in this module. Refuse the item
// entirely rather than silently stripping the suffix and keeping the count.
const COUNT_SUFFIX_RE = /\bx\s*\d+\s*$/i;

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function applySeuCost(seu, cost) {
  if (!cost) return { seu, spent: 0, source: null, insufficient: false };
  if ((seu.total || 0) < cost) return { seu, spent: 0, source: null, insufficient: true };
  let remaining = cost;
  let spentFromSource = null;
  const sources = (seu.sources || []).map(s => ({ ...s }));
  for (const src of sources) {
    if (remaining <= 0) break;
    if (src.seu > 0) {
      const deduct = Math.min(remaining, src.seu);
      src.seu -= deduct;
      remaining -= deduct;
      if (!spentFromSource) spentFromSource = src.name;
    }
  }
  const total = sources.reduce((sum, s) => sum + s.seu, 0);
  return { seu: { total, sources }, spent: cost, source: spentFromSource, insufficient: false };
}

function outcomeLine(outcomeLines, kind, outcome) {
  return (outcomeLines[kind] && outcomeLines[kind][outcome]) || null;
}

function ruleSourceFor(kind, key) {
  if (kind === 'skill') return `core_basic.skills.core_skills.${key}`;
  if (kind === 'ability') return `core_basic (ability check)`;
  if (kind === 'attack') return `core_basic.combat.to_hit`;
  if (kind === 'enemy_attack') return 'house.enemy_threat_tiers';
  if (kind === 'hazard') return 'house.hazard_dice';
  return 'core_basic';
}

// Picks the row(s) the player actually acted on this turn: the pinned row
// (always applied, whether or not the model echoed it) plus up to one more
// distinct row the model declared in `checks`. Unknown or duplicate row ids
// are dropped and logged.
function selectPlayerRows(sheet, declaredChecks, log) {
  const chosen = [];
  const seen = new Set();

  if (sheet.rows.P1) {
    chosen.push({ id: 'P1', declared: declaredChecks.find(c => c.row === 'P1') || null });
    seen.add('P1');
  }

  for (const c of declaredChecks) {
    if (c.row === 'P1') continue; // echoing the pinned row back is expected, not a duplicate
    if (chosen.length >= 2) break;
    if (seen.has(c.row)) { log.push(`[dropped] duplicate declared row ${c.row}`); continue; }
    if (!sheet.rows[c.row]) { log.push(`[dropped] unknown declared row ${c.row}`); continue; }
    seen.add(c.row);
    chosen.push({ id: c.row, declared: c });
  }

  return chosen;
}

function checkContradiction(row, declared) {
  if (!declared || !declared.outcome_seen) return null;
  const seen = declared.outcome_seen.toUpperCase();
  if (row.kind === 'skill') {
    const tier = declared.tier || 'standard';
    const t = row.tiers ? row.tiers[tier] : row;
    if (!t) return null;
    const actual = t.success ? 'PASS' : 'FAIL';
    return seen.includes(actual) ? null : actual;
  }
  if (row.kind === 'ability') {
    const actual = row.success ? 'PASS' : 'FAIL';
    return seen.includes(actual) ? null : actual;
  }
  if (row.kind === 'attack') {
    const tier = declared.tier || 'standard';
    const t = row.tiers ? row.tiers[tier] : row;
    const hit = t ? (t.hit !== undefined ? t.hit : row.hit) : row.hit;
    const actual = hit ? 'HIT' : 'MISS';
    return seen.includes(actual) ? null : actual;
  }
  return null;
}

/**
 * resolveTurn(state, sheet, out, ctx) → { state, dice_rolls, applied, patched, log }
 *
 * @param {object} state — current game state
 * @param {object} sheet — from outcomeSheet.buildSheet()
 * @param {object} out   — normalized model output, from modelSchema.parseModelOutput().data
 * @param {object} ctx   — { rules, house, outcomeLines, getScene }
 */
function resolveTurn(state, sheet, out, ctx) {
  const log = [];
  const diceRolls = [];
  let patched = false;

  if (state.session && state.session.game_over) {
    return { state, dice_rolls: [], applied: {}, patched: false, log: ['refused: game_over'], refused: true };
  }

  let character = { ...state.character, stamina: { ...state.character.stamina }, seu: { ...state.character.seu, sources: state.character.seu.sources.map(s => ({ ...s })) }, xp: { ...state.character.xp }, status_effects: [...state.character.status_effects], inventory: [...state.character.inventory] };
  let campaign = { ...state.campaign, journal: [...(state.campaign.journal || [])], npcs: [...(state.campaign.npcs || [])], factions: [...(state.campaign.factions || [])] };
  let scene = { ...state.scene, combat_state: state.scene.combat_state ? { ...state.scene.combat_state, combatants: state.scene.combat_state.combatants.map(c => ({ ...c })) } : null };
  let session = { ...state.session };

  const applied = {
    stamina_delta: 0, seu_delta: 0, seu_source: null, xp_delta: 0, credits_delta: 0,
    status_add: [], status_remove: [], inventory_add: [], inventory_remove: [],
    npc_updates: [], faction_updates: [], journal_entry: null, scene_id: null,
  };

  const thresholds = sheet.thresholds;
  const wasUnconscious = character.status_effects.includes('Unconscious');
  // Never mutate the caller's `out` — a patch line is appended to a local
  // copy so the same (state, sheet, out) can be resolved more than once
  // (replay) without narrative lines piling up.
  let narrative = out.narrative;

  function addStamina(delta, reason) {
    if (!delta) return;
    const before = character.stamina.current;
    character.stamina.current = clamp(before + delta, thresholds.dying - 1000, character.stamina.max);
    applied.stamina_delta += (character.stamina.current - before);
    void reason;
  }

  function checkThresholds() {
    const cur = character.stamina.current;
    if (cur <= thresholds.dying) {
      if (!session.game_over) {
        session.game_over = true;
        if (!character.status_effects.includes('Dead')) { character.status_effects.push('Dead'); applied.status_add.push('Dead'); }
        const line = outcomeLine(ctx.outcomeLines, 'threshold', 'dead');
        if (line) { narrative = `${narrative}\n\n${line}`; }
        patched = true;
        log.push('[threshold] character died (STA <= dying)');
      }
    } else if (cur <= thresholds.unconscious) {
      if (!character.status_effects.includes('Unconscious')) {
        character.status_effects.push('Unconscious');
        applied.status_add.push('Unconscious');
        const line = outcomeLine(ctx.outcomeLines, 'threshold', 'unconscious');
        if (line) { narrative = `${narrative}\n\n${line}`; }
        patched = true;
        log.push('[threshold] character fell unconscious (STA <= 0)');
      }
    } else if (character.status_effects.includes('Unconscious')) {
      character.status_effects = character.status_effects.filter(s => s !== 'Unconscious');
      applied.status_remove.push('Unconscious');
      log.push('[threshold] character recovered from unconscious');
    }
  }

  // ── 1. Player rows ────────────────────────────────────────────────────────
  const playerRows = selectPlayerRows(sheet, out.checks || [], log);
  const playerAttackRowId = playerRows.find(r => sheet.rows[r.id].kind === 'attack')
    ? playerRows.find(r => sheet.rows[r.id].kind === 'attack').id : null;

  for (const { id, declared } of playerRows) {
    const row = sheet.rows[id];
    const contradiction = checkContradiction(row, declared);
    if (contradiction) {
      const kindLine = row.kind === 'attack' ? 'attack' : row.kind;
      const line = outcomeLine(ctx.outcomeLines, kindLine, contradiction);
      if (line) narrative = `${narrative}\n\n${line}`;
      patched = true;
      log.push(`[patched] ${id} declared "${declared.outcome_seen}", server had ${contradiction}`);
    }

    if (row.kind === 'skill') {
      const tier = declared ? (declared.tier || 'standard') : 'standard';
      const t = row.tiers ? row.tiers[tier] : row;
      diceRolls.push({ description: `${row.label} check`, roll: row.roll, target: t.target, success: t.success, margin: t.target - row.roll, rule_source: ruleSourceFor('skill', row.key) });
    } else if (row.kind === 'ability') {
      diceRolls.push({ description: row.label, roll: row.roll, target: row.target, success: row.success, margin: row.target - row.roll, rule_source: ruleSourceFor('ability', row.key) });
    }
    // 'attack' player rows are resolved below, in initiative order (or
    // immediately if there is no active combat to sequence them against).
  }

  // ── 2. Combat exchange, in initiative order ────────────────────────────────
  const hostileActions = new Map((out.hostile_actions || []).map(h => [h.id, h.action]));

  // A sheet's initiative order is only ever meaningful against the combat it
  // was rolled for. A reused sheet (retry, or a turn replayed after a
  // checkpoint restore landed the state outside combat) can carry initiative
  // from a fight the current state is no longer in — walking it anyway would
  // let a phantom enemy attack, or a player row spend SEU, for a fight that
  // structurally does not exist right now.
  if (scene.in_combat && scene.combat_state && sheet.initiative && sheet.initiative.length) {
    const initiativeOrder = sheet.initiative.map(e => ({ ...e }));

    for (const entry of initiativeOrder) {
      if (entry.is_player) {
        if (!playerAttackRowId) continue;
        const row = sheet.rows[playerAttackRowId];
        const declared = playerRows.find(r => r.id === playerAttackRowId).declared;
        const tier = declared ? (declared.tier || 'standard') : 'standard';
        const t = row.tiers ? row.tiers[tier] : row;

        if (row.usesSeu) {
          const cost = applySeuCost(character.seu, row.seuCost);
          if (cost.insufficient) {
            diceRolls.push({ description: `${row.weaponLabel} vs ${row.targetLabel}`, roll: row.roll, target: t.target, success: false, margin: t.target - row.roll, rule_source: 'house.seu_per_shot' });
            log.push(`[combat] ${playerAttackRowId} cannot fire — no SEU`);
            entry.has_acted = true;
            continue;
          }
          character.seu = cost.seu;
          applied.seu_delta -= cost.spent;
          applied.seu_source = cost.source;
        }

        diceRolls.push({ description: `${row.weaponLabel} vs ${row.targetLabel}`, roll: row.roll, target: t.target, success: t.hit, margin: t.target - row.roll, rule_source: ruleSourceFor('attack', row.weaponId) });

        if (t.hit) {
          const targetC = scene.combat_state && scene.combat_state.combatants.find(c => c.id === row.targetId);
          if (targetC) {
            targetC.sta_current = clamp((targetC.sta_current ?? targetC.sta_max ?? 0) - row.damage, thresholds.dying - 1000, targetC.sta_max ?? 999);
            if (targetC.sta_current <= 0 && targetC.status === 'active') {
              targetC.status = 'down';
              log.push(`[combat] ${targetC.name} is down`);
            }
          }
        }
        entry.has_acted = true;
      } else {
        const eRow = Object.values(sheet.rows).find(r => r.kind === 'enemy_attack' && r.targetId === entry.id);
        if (!eRow) continue;
        const action = hostileActions.get(entry.id) || 'attack';
        entry.has_acted = true;

        // A row rolled at sheet time for an enemy the player has since
        // defeated earlier in this same initiative pass is skipped — "acts
        // after you, skipped if DOWN" (the sheet's own wording). An entry
        // with no matching combatant at all (never real, or removed some
        // other way) gets the same treatment: no combatant, no attack.
        const selfCombatant = scene.combat_state && scene.combat_state.combatants.find(cc => cc.id === entry.id);
        if (!selfCombatant || selfCombatant.status !== 'active') {
          log.push(`[combat] ${entry.name} is ${selfCombatant ? selfCombatant.status : 'not an active combatant'} — skips its turn`);
          continue;
        }

        if (action === 'hold' || action === 'flee' || action === 'surrender') {
          if (scene.combat_state) {
            const c = scene.combat_state.combatants.find(cc => cc.id === entry.id);
            if (c && action !== 'hold') c.status = action === 'flee' ? 'fled' : 'surrendered';
          }
          log.push(`[combat] ${entry.name} ${action}s instead of attacking`);
          continue;
        }

        const playerUnconscious = character.status_effects.includes('Unconscious');
        if (playerUnconscious && action !== 'finish') {
          log.push(`[combat] ${entry.name} holds — player is unconscious`);
          continue;
        }

        diceRolls.push({ description: `${entry.name} attacks`, roll: eRow.roll, target: eRow.target, success: eRow.hit, margin: eRow.target - eRow.roll, rule_source: ruleSourceFor('enemy_attack') });
        if (eRow.hit) {
          addStamina(-eRow.damage, 'enemy attack');
          checkThresholds();
        }
      }
    }

    if (scene.combat_state) {
      scene.combat_state.initiative_order = initiativeOrder;
      scene.combat_state.round = (scene.combat_state.round || 1) + 1;
    }
  }

  // ── 3. Hazard ────────────────────────────────────────────────────────────
  if (out.hazard && out.hazard.severity) {
    const h = sheet.hazard[out.hazard.severity];
    diceRolls.push({ description: `Hazard (${out.hazard.severity})`, roll: h.damage, target: null, success: h.word !== 'HURT' ? false : true, margin: null, rule_source: ruleSourceFor('hazard') });
    addStamina(-h.damage, 'hazard');
    checkThresholds();
  }

  // ── 4. Healing ─────────────────────────────────────────────────────────────
  if (out.healing === 'stimdose') {
    const idx = character.inventory.findIndex(i => /stimdose/i.test(i));
    if (idx >= 0) {
      character.inventory = consumeOne(character.inventory, idx);
      applied.inventory_remove.push('Stimdose x1');
      addStamina(ctx.house.stimdose_heal.value, 'stimdose');
    } else {
      log.push('[healing] stimdose requested but none in inventory — ignored');
    }
  } else if (out.healing === 'first_aid') {
    const hasKit = character.inventory.some(i => /medkit/i.test(i));
    const medicalRow = playerRows.find(r => sheet.rows[r.id].kind === 'skill' && sheet.rows[r.id].key === 'medical');
    const passed = medicalRow
      ? (row => (row.tiers ? row.tiers[(medicalRow.declared && medicalRow.declared.tier) || 'standard'] : row).success)(sheet.rows[medicalRow.id])
      : false;
    if (hasKit && passed) {
      addStamina(sheet.firstAidHeal, 'first aid');
    } else {
      log.push(`[healing] first_aid refused — kit=${hasKit} passed=${passed}`);
    }
  } else if (out.healing === 'rest_day') {
    addStamina(1, 'rest day');
  }
  if (out.healing) checkThresholds();

  // ── 5. XP ────────────────────────────────────────────────────────────────
  if (out.xp_awards && out.xp_awards.length) {
    const distinct = [...new Set(out.xp_awards)];
    let gained = 0;
    for (const key of distinct) {
      const v = ctx.house.xp_awards[key];
      if (typeof v === 'number') gained += v;
    }
    gained = Math.min(gained, ctx.house.xp_cap_per_turn.value);
    if (gained > 0) {
      character.xp = { total: character.xp.total + gained, unspent: character.xp.unspent + gained };
      applied.xp_delta = gained;
    }
  }

  // ── 6. Credits ───────────────────────────────────────────────────────────
  // "purchase" (buying an item) and "payment" (paying a cost with nothing
  // bought — a fine, a bribe, a fee) are both a cost to the player; "reward"
  // and "sale" are both a gain.
  if (out.credits) {
    const cost = ctx.house.credit_bands[out.credits.tier] || 0;
    const isCost = out.credits.kind === 'purchase' || out.credits.kind === 'payment';
    if (isCost) {
      if (character.credits >= cost) {
        const before = character.credits;
        character.credits = clamp(character.credits - cost, 0, 50000);
        applied.credits_delta -= (before - character.credits);
        if (out.credits.kind === 'purchase' && out.credits.item && !COUNT_SUFFIX_RE.test(out.credits.item)
            && character.inventory.length < ctx.house.per_turn_caps.inventory_total_max) {
          const item = out.credits.item.slice(0, ctx.house.per_turn_caps.inventory_item_chars_max);
          character.inventory.push(item);
          applied.inventory_add.push(item);
        }
      } else {
        const line = outcomeLine(ctx.outcomeLines, 'purchase', 'refused');
        if (line) narrative = `${narrative}\n\n${line}`;
        patched = true;
        log.push(`[credits] ${out.credits.kind} refused — ${character.credits} < ${cost}`);
      }
    } else {
      const before = character.credits;
      character.credits = clamp(character.credits + cost, 0, 50000);
      applied.credits_delta += (character.credits - before);
    }
  }

  // ── 7. Combat start / end ───────────────────────────────────────────────
  if (out.combat && Array.isArray(out.combat.start) && out.combat.start.length && !scene.in_combat) {
    const combatants = out.combat.start.slice(0, ctx.house.per_turn_caps.combat_start_max_enemies).map((e, i) => {
      const tier = ctx.house.enemy_threat_tiers[e.threat] || ctx.house.enemy_threat_tiers.minion;
      return { id: `h${i + 1}`, name: e.name, threat: e.threat, rs: tier.rs, sta_current: tier.sta, sta_max: tier.sta, status: 'active', is_player: false };
    });
    // Real initiative rolls wait for next turn's sheet (no A/E rows existed
    // before this call, so the opening strike lands then, not now). The
    // roster is still listed immediately, with no roll, so the combat panel
    // shows who is in the fight the instant it starts.
    const openingOrder = [
      { id: 'player', name: character.display_name || character.name, is_player: true, initiative_roll: null, has_acted: false },
      ...combatants.map(c => ({ id: c.id, name: c.name, is_player: false, initiative_roll: null, has_acted: false })),
    ];
    scene = {
      ...scene,
      in_combat: true,
      combat_state: { round: 1, phase: 'player_turn', initiative_order: openingOrder, combatants, active_optional_rules: { burst_fire: false, called_shots: false, cover_concealment: false, suppression_fire: false } },
    };
    log.push(`[combat] started with ${combatants.length} enemies`);
  }

  // Combat ends only once the server's own combatant statuses say no enemy
  // is still active — never because the model declared out.combat.end.
  // "fled"/"surrender" hostile_actions already move a combatant's status out
  // of "active" above, so a genuine end is already reflected here by the
  // time this runs; trusting the model's declaration on top of that would
  // let it end a fight (and stop tracking a still-alive enemy) while
  // combatants remain active.
  const stillActive = scene.combat_state ? scene.combat_state.combatants.filter(c => c.status === 'active') : [];
  const combatShouldEnd = scene.in_combat && stillActive.length === 0;
  if (combatShouldEnd) {
    scene = { ...scene, in_combat: false, combat_state: null };
    log.push('[combat] ended');
  } else if (scene.in_combat && out.combat && out.combat.end) {
    log.push(`[dropped] model declared combat.end="${out.combat.end}" with ${stillActive.length} enemy(ies) still active — ignored`);
  }

  // ── 8. Story updates (clamped) ──────────────────────────────────────────
  const su = out.story_updates || {};
  const caps = ctx.house.per_turn_caps;

  for (const s of (su.status_add || []).slice(0, caps.status_add_max)) {
    const clean = s.slice(0, caps.status_chars_max);
    if (RESERVED_STATUSES.has(clean)) { log.push(`[dropped] model tried to set reserved status "${clean}"`); continue; }
    if (!character.status_effects.includes(clean)) { character.status_effects.push(clean); applied.status_add.push(clean); }
  }
  for (const s of (su.status_remove || [])) {
    if (RESERVED_STATUSES.has(s)) continue;
    if (character.status_effects.includes(s)) { character.status_effects = character.status_effects.filter(x => x !== s); applied.status_remove.push(s); }
  }

  for (const item of (su.inventory_add || []).slice(0, caps.inventory_add_max)) {
    if (character.inventory.length >= caps.inventory_total_max) break;
    if (COUNT_SUFFIX_RE.test(item)) { log.push(`[dropped] inventory_add item with a count suffix "${item}"`); continue; }
    character.inventory.push(item.slice(0, caps.inventory_item_chars_max));
    applied.inventory_add.push(item.slice(0, caps.inventory_item_chars_max));
  }
  for (const item of (su.inventory_remove || [])) {
    const idx = character.inventory.indexOf(item);
    if (idx >= 0) { character.inventory.splice(idx, 1); applied.inventory_remove.push(item); }
  }

  for (const n of (su.npc_updates || []).slice(0, caps.npc_updates_max)) {
    if (campaign.npcs.length >= caps.npc_total_max && !campaign.npcs.some(x => x.name === n.name)) continue;
    const idx = campaign.npcs.findIndex(x => x.name === n.name);
    const entry = { name: n.name, role: n.role || '', attitude: n.attitude || 'neutral' };
    if (idx >= 0) campaign.npcs[idx] = { ...campaign.npcs[idx], ...entry };
    else campaign.npcs.push(entry);
    applied.npc_updates.push(entry);
  }

  for (const f of (su.faction_updates || [])) {
    const idx = campaign.factions.findIndex(x => x.name === f.name);
    const step = caps.faction_standing_step * (f.standing === 'up' ? 1 : -1);
    if (idx >= 0) {
      campaign.factions[idx] = { ...campaign.factions[idx], standing: clamp((campaign.factions[idx].standing || 0) + step, caps.faction_standing_min, caps.faction_standing_max) };
    } else {
      campaign.factions.push({ name: f.name, standing: clamp(step, caps.faction_standing_min, caps.faction_standing_max) });
    }
    applied.faction_updates.push({ name: f.name, standing: f.standing });
  }

  if (su.journal_entry) {
    const entry = su.journal_entry.slice(0, caps.journal_chars_max);
    campaign.journal.push({ timestamp: Date.now(), entry });
    applied.journal_entry = entry;
  }

  if (su.scene_id) {
    const scenesValid = ctx.getScene ? !!ctx.getScene(campaign.adventure_id, su.scene_id) : true;
    if (scenesValid) {
      campaign = { ...campaign, current_scene_id: su.scene_id, visited_scene_ids: campaign.visited_scene_ids.includes(su.scene_id) ? campaign.visited_scene_ids : [...campaign.visited_scene_ids, su.scene_id] };
      applied.scene_id = su.scene_id;
    } else {
      log.push(`[dropped] invalid scene_id "${su.scene_id}"`);
    }
  }

  // ── 9. Counters ──────────────────────────────────────────────────────────
  session.turn_count = (session.turn_count || 0) + 1;
  if (out.scene_change) {
    session.scene_count = (session.scene_count || 0) + 1;
    scene.header = out.scene_header || scene.header;
    scene.summary = (out.scene_summary || scene.summary || '').slice(0, caps.summary_chars_max);
    scene.recent_summaries = [...(scene.recent_summaries || []), scene.summary].slice(-6);
  }

  void wasUnconscious;

  const nextState = { ...state, character, campaign, scene, session };

  return { state: nextState, dice_rolls: diceRolls, applied, patched, log, narrative };
}

function consumeOne(inventory, idx) {
  const item = inventory[idx];
  const m = item.match(/^(.*)\sx(\d+)$/i);
  if (m && parseInt(m[2], 10) > 1) {
    const copy = [...inventory];
    copy[idx] = `${m[1]} x${parseInt(m[2], 10) - 1}`;
    return copy;
  }
  return inventory.filter((_, i) => i !== idx);
}

module.exports = { resolveTurn };
