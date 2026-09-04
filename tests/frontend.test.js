'use strict';

// WU-7: Frontend adaptation tests
// The JSX was pre-compiled out of index.html into public/app.js (perf rework),
// so app assertions target app.js; index.html keeps only shell markup and CSS.
//   - Files are in public/
//   - API key is NOT exposed in the browser bundle
//   - fetch calls use /api/chat (server proxy), not Anthropic directly
//   - Session token localStorage key is present
//   - Session restore endpoint is referenced

const fs   = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'public', 'index.html');
const APP_PATH  = path.join(__dirname, '..', 'public', 'app.js');

let html;
let appJs;
let bundle; // everything shipped to the browser

beforeAll(() => {
  html   = fs.readFileSync(HTML_PATH, 'utf8');
  appJs  = fs.readFileSync(APP_PATH, 'utf8');
  bundle = html + appJs;
});

describe('WU-7: Frontend adaptation', () => {
  it('public/index.html exists', () => {
    expect(fs.existsSync(HTML_PATH)).toBe(true);
  });

  it('public/app.js exists', () => {
    expect(fs.existsSync(APP_PATH)).toBe(true);
  });

  it('bundle does not reference api.anthropic.com', () => {
    expect(bundle).not.toContain('api.anthropic.com');
  });

  it('bundle does not contain x-api-key header', () => {
    expect(bundle.toLowerCase()).not.toContain("'x-api-key'");
    expect(bundle.toLowerCase()).not.toContain('"x-api-key"');
  });

  it('bundle does not contain anthropic-dangerous-direct-browser-access header', () => {
    expect(bundle).not.toContain('anthropic-dangerous-direct-browser-access');
  });

  it('app.js references /api/chat for DM calls', () => {
    expect(appJs).toContain("'/api/chat'");
  });

  it('app.js references sf_session_token localStorage key', () => {
    expect(appJs).toContain('sf_session_token');
  });

  it('app.js references /api/session for session restore', () => {
    expect(appJs).toContain('/api/session/');
  });
});

describe('WU-1: Five-Minute Fixes', () => {
  it('bundle LORE_TIDBITS does not contain "four major races"', () => {
    expect(bundle).not.toContain('four major races');
  });

  it('index.html contains safe-area-inset-bottom in player input CSS', () => {
    expect(html).toContain('safe-area-inset-bottom');
  });
});

describe('WU-3: Character Confirmation Gate', () => {
  it('app.js contains CHARACTER_ROSTER for character selection', () => {
    expect(appJs).toContain('CHARACTER_ROSTER');
  });

  it('app.js contains display_name field reference', () => {
    expect(appJs).toContain('display_name');
  });
});

describe('WU-4: Status Strip and Combat Visibility', () => {
  it('app.js contains CharacterStatusStrip component', () => {
    expect(appJs).toContain('CharacterStatusStrip');
  });

  it('app.js renders CombatPanel conditionally on in_combat', () => {
    expect(appJs).toContain('in_combat');
    expect(appJs).toContain('CombatPanel');
  });
});

describe('WU-5: Map Architecture', () => {
  it('bundle does not contain MAP_DATA constant definition', () => {
    expect(bundle).not.toContain('const MAP_DATA');
  });

  it('app.js contains CharacterStatusStrip component', () => {
    expect(appJs).toContain('CharacterStatusStrip');
  });
});

describe('WU-7: Session Init Loading State', () => {
  it('app.js contains LoadingScreen component with lore tidbits', () => {
    expect(appJs).toContain('LoadingScreen');
    expect(appJs).toContain('LORE_TIDBITS');
  });
});
