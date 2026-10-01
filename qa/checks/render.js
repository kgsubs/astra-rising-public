'use strict';

// Checks that what the player sees is what was built: the title really draws in
// Audiowide, and the starfield covers the whole window at every width and after
// a resize. Both were broken on 2026-09-30 while every other check passed.
//
// The font check compares drawn widths. document.fonts.check() and
// FontFace.status both report "loaded" for a font file that has no glyphs for
// the text (MDN), which is exactly what the first Audiowide file did. Text set
// in a real Audiowide face measures differently from the same text in the
// fallback; text set in a face with no Latin glyphs measures the same.

const WIDTHS = [390, 1280, 2560, 3440];
const HEIGHT = 900;

async function openLanding(b, base, tag) {
  b.open(base + '/?qa=' + tag);
  await b.waitForText('New Game', { timeout: 60000, label: 'for the landing screen' });
}

function titleDrawsInAudiowide(b) {
  return b.eval(`
    return document.fonts.ready.then(() => {
      const measure = (family) => {
        const s = document.createElement('span');
        s.textContent = 'ASTRA RISING';
        s.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-size:64px;font-family:' + family;
        document.body.appendChild(s);
        const w = s.getBoundingClientRect().width;
        s.remove();
        return w;
      };
      const title = [...document.querySelectorAll('div')].find(d => /Audiowide/.test(d.style.fontFamily));
      return {
        titleUsesAudiowide: !!title,
        titleIsCaps: !!title && getComputedStyle(title).textTransform === 'uppercase',
        audiowide: measure("'Audiowide', monospace"),
        fallback: measure('monospace'),
      };
    });
  `);
}

function starfield(b) {
  return b.eval(`
    const c = document.querySelector('canvas');
    if (!c) return { ok: false, reason: 'no canvas' };
    const r = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    // Stars are drawn at random; the right-hand tenth of a covering field
    // always has some. An unredrawn or clipped field has none there.
    const ctx = c.getContext('2d');
    const x0 = Math.floor(c.width * 0.9);
    const data = ctx.getImageData(x0, 0, c.width - x0, c.height).data;
    let lit = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i] > 60) lit++;
    return {
      ok: true, vw: window.innerWidth, vh: window.innerHeight,
      left: r.left, top: r.top, width: Math.round(r.width), height: Math.round(r.height),
      pxWidth: c.width, expectPx: Math.round(window.innerWidth * dpr), litRightEdge: lit,
    };
  `);
}

function checkStarfield(r, s, label) {
  r.check(`${label}: starfield covers the window`,
    s && s.ok && s.left === 0 && s.top === 0 && s.width === s.vw && s.height === s.vh,
    s && s.ok ? `${s.width}x${s.height} in ${s.vw}x${s.vh}` : s && s.reason);
  r.check(`${label}: starfield is drawn at full resolution`, s && s.pxWidth === s.expectPx, s && `${s.pxWidth}px, want ${s.expectPx}px`);
  r.check(`${label}: stars reach the right edge`, s && s.litRightEdge > 0, s && `${s.litRightEdge} lit pixels`);
}

async function run(r, ctx) {
  const { browser: b, base } = ctx;

  for (const w of WIDTHS) {
    b.setViewport(w, HEIGHT);
    await openLanding(b, base, 'render-' + w);
    if (w === WIDTHS[0]) {
      const f = titleDrawsInAudiowide(b);
      r.check('the title is set in Audiowide, in capitals', f && f.titleUsesAudiowide && f.titleIsCaps);
      r.check('the Audiowide file really draws the title letters', f && Math.abs(f.audiowide - f.fallback) > 1,
        f && `Audiowide ${f.audiowide.toFixed(1)}px vs fallback ${f.fallback.toFixed(1)}px`);
    }
    checkStarfield(r, starfield(b), `${w}px wide`);
  }

  // Widen the window after the page has drawn; the field must follow it.
  b.setViewport(1280, HEIGHT);
  await openLanding(b, base, 'render-resize');
  b.setViewport(2560, HEIGHT);
  await new Promise(res => setTimeout(res, 600));
  checkStarfield(r, starfield(b), 'after widening from 1280 to 2560px');
}

// A player turned away by the new-game limit is told so, with a wait time,
// instead of the generic connection failure. Needs a server whose limit is 1.
async function refusedSession(r, ctx, limitedBase) {
  const { browser: b } = ctx;
  b.setViewport(1280, HEIGHT);
  await openLanding(b, limitedBase, 'refused-1');      // spends the one allowed session
  b.clearStorage();
  b.open(limitedBase + '/?qa=refused-2');               // needs a second one: refused
  await b.waitForText('Retry', { timeout: 30000, label: 'for the refused-session screen' });
  const text = b.text();
  r.check('a refused new game names the limit and the wait',
    /Too many new games have been started from this address/.test(text) && /Try again in about \d+ minutes?/.test(text),
    text.replace(/\s+/g, ' ').slice(0, 160));
  r.check('a refused new game does not show the generic failure', !/Unable to connect to the game server/.test(text));
}

module.exports = { run, refusedSession, titleDrawsInAudiowide, starfield, WIDTHS };
