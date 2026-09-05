'use strict';

// Thin wrapper over the agent-browser CLI.
//
// Two things it exists to hide: every eval runs in one shared scope, so a bare
// `const x` collides across calls and the second one throws, and the CLI
// returns JSON-ish text that needs unwrapping. Every snippet is therefore
// wrapped in an IIFE and every result parsed here.

const { execFileSync } = require('child_process');

const BIN = process.env.AGENT_BROWSER_BIN || `${process.env.HOME}/.local/bin/agent-browser`;

function run(args, { timeout = 60000 } = {}) {
  return execFileSync(BIN, args, { encoding: 'utf8', timeout, maxBuffer: 32 * 1024 * 1024 });
}

class Browser {
  constructor({ log = () => {} } = {}) { this.log = log; }

  setViewport(w, h) { run(['set', 'viewport', String(w), String(h)]); }

  open(url) { run(['open', url], { timeout: 90000 }); }

  close() { try { run(['close']); } catch (_) {} }

  // Evaluate a JS expression in the page and return the parsed value.
  // The snippet is wrapped, so `const` inside it is safe to reuse.
  eval(snippet, { timeout = 60000 } = {}) {
    const wrapped = `(()=>{ ${snippet} })()`;
    const out = run(['eval', wrapped], { timeout });
    const text = out.trim();
    if (!text) return null;
    try { return JSON.parse(text); } catch (_) { return text; }
  }

  // The sheet, the log and the input all live in one document, so a truncated
  // slice silently hides the narration the checks are looking for. Default to
  // everything and let callers trim if they want a short label.
  text(max = 200000) {
    return this.eval(`return document.body.innerText.slice(0, ${max});`) || '';
  }

  // The send control carries an aria-label rather than a text label, and while
  // a turn is in flight it renders bouncing dots and no text at all. Wait for
  // it to be live, then press it.
  async clickSend({ timeout = 30000 } = {}) {
    await this.waitFor("[...document.querySelectorAll('button')].some(b => b.getAttribute('aria-label') === 'Send' && !b.disabled)",
      { timeout, label: 'for the send button to become live' });
    return this.eval(`
      const btn = [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === 'Send' && !b.disabled);
      if (!btn) return { ok: false, reason: 'send button not live' };
      btn.click();
      return { ok: true };
    `);
  }

  // The sheet and the rules log live in a sidebar that starts collapsed at some
  // widths, so a check that reads the page blind passes on one screen size and
  // fails on the other. Open it first, then read.
  // The sidebar also has two tabs, Player (the sheet) and GM (the rules log),
  // and which one is showing depends on the screen size. Name the tab you want.
  openSidebar(tab = null) {
    const want = JSON.stringify(tab);
    return this.eval(`
      const open = [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === 'Open sidebar');
      if (open) open.click();
      const tab = ${want};
      if (!tab) return { ok: true, opened: !!open };
      const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim().toUpperCase() === tab.toUpperCase());
      if (!btn) return { ok: false, reason: 'no such tab', seen: [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(t => t.length < 12).slice(0, 20) };
      btn.click();
      return { ok: true, opened: !!open, tab };
    `);
  }

  // The error banner, if one is showing: its code, its message, and whether it
  // offers a retry. Null when the game is not in an error state.
  errorBanner() {
    return this.eval(`
      const dismiss = [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === 'Dismiss error');
      if (!dismiss) return null;
      const bar = dismiss.closest('div').parentElement;
      const retry = [...bar.querySelectorAll('button')].some(b => b.textContent.trim() === 'Retry');
      return { text: bar.innerText.replace(/\\s+/g, ' ').trim(), retry };
    `);
  }

  dismissError() {
    return this.eval(`
      const dismiss = [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === 'Dismiss error');
      if (!dismiss) return { ok: false };
      dismiss.click();
      return { ok: true };
    `);
  }

  // True while a turn is in flight: the input is disabled for its duration.
  isBusy() {
    return this.eval("const t = document.querySelector('textarea'); return !!(t && t.disabled);") === true;
  }

  // The body is the scroll container (html is overflow:hidden), so window
  // scroll position is meaningless here.
  scrollTop() { return this.eval('return document.body.scrollTop;'); }

  scrollTo(px) { return this.eval(`document.body.scrollTop = ${px}; return document.body.scrollTop;`); }

  horizontalOverflow() {
    return this.eval('return document.body.scrollWidth - document.body.clientWidth;');
  }

  buttons() {
    return this.eval("return [...document.querySelectorAll('button')].map(b => b.textContent.trim());") || [];
  }

  // Click the first button whose text matches. Clicking through the DOM rather
  // than by coordinates: the setup screens sit inside a zoom:0.75 container,
  // which puts synthetic coordinate clicks in the wrong place.
  clickButton(pattern, { exact = false } = {}) {
    const p = JSON.stringify(pattern);
    return this.eval(`
      const want = ${p};
      const all = [...document.querySelectorAll('button')];
      const hit = ${exact}
        ? all.find(b => b.textContent.trim().toUpperCase() === want.toUpperCase())
        : all.find(b => new RegExp(want, 'i').test(b.textContent));
      if (!hit) return { ok: false, reason: 'not found', seen: all.slice(0, 40).map(b => b.textContent.trim().slice(0, 40)) };
      if (hit.disabled) return { ok: false, reason: 'disabled' };
      hit.click();
      return { ok: true };
    `);
  }

  clickNthButton(n) {
    return this.eval(`
      const all = [...document.querySelectorAll('button')];
      if (!all[${n}]) return { ok: false, reason: 'no button at index ${n}', count: all.length };
      all[${n}].click();
      return { ok: true, text: all[${n}].textContent.trim().slice(0, 60) };
    `);
  }

  // React ignores a plain value assignment, so the native setter is called and
  // an input event dispatched, exactly as a real keystroke would.
  type(selector, value) {
    return this.eval(`
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return { ok: false, reason: 'no element' };
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return { ok: true };
    `);
  }

  localStorage(key) {
    return this.eval(`try { return localStorage.getItem(${JSON.stringify(key)}); } catch (e) { return null; }`);
  }

  clearStorage() { return this.eval('try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} return true;'); }

  screenshot(file) {
    try { run(['screenshot', file], { timeout: 60000 }); return true; } catch (_) { return false; }
  }

  // Poll the page until `predicate` (a JS expression returning a boolean) holds.
  async waitFor(predicate, { timeout = 60000, interval = 500, label = 'waiting' } = {}) {
    const deadline = Date.now() + timeout;
    for (;;) {
      let hit = false;
      try { hit = this.eval(`return !!(${predicate});`) === true; } catch (_) {}
      if (hit) return true;
      if (Date.now() > deadline) throw new Error(`timed out after ${Math.round(timeout / 1000)}s ${label}`);
      await new Promise(r => setTimeout(r, interval));
    }
  }

  async waitForText(needle, opts = {}) {
    return this.waitFor(`document.body.innerText.includes(${JSON.stringify(needle)})`, { label: `for text ${JSON.stringify(needle)}`, ...opts });
  }
}

module.exports = { Browser };
