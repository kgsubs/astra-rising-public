# CHANGES.md — Backend Architecture Implementation Log

---

## WU-7 — Session Init Loading State
Date: 2026-03-11
Status: COMPLETE
Files changed: public/index.html, tests/frontend.test.js
Tests: 16 passing, 0 failing (frontend); 46 passing, 0 failing (regression)
Summary: Added sessionInitState ('pending'|'ready'|'error') to App. While pending: full-screen spinner with "Connecting to Astra Rising..." text. On error (network failure or 10s timeout): error screen with "Unable to connect" message and Retry button. doSessionInit extracted to useCallback so Retry can re-invoke it. On success: normal LandingScreen render.

---

## WU-6 — ChoiceMenu Auto-Open and Sidebar Improvements
Date: 2026-03-11
Status: COMPLETE
Files changed: public/index.html
Tests: 15 passing, 0 failing (frontend); 46 passing, 0 failing (regression)
Summary: Auto-open ChoiceMenu useEffect was implemented in WU-4. Verified SkillBadge shows skill level (already working). Sidebar tab renamed in WU-1. Moved Credits/XP row to below Skills section in CharacterSheet naked=true variant. Portrait wrap div already has bg-gray-700 placeholder and onError handler from WU-3.

---

## WU-5 — Map Architecture — Triage and Unification
Date: 2026-03-11
Status: COMPLETE
Files changed: public/index.html, tests/frontend.test.js
Tests: 15 passing, 0 failing (frontend); 46 passing, 0 failing (regression)
Summary: Retired MAP_DATA constant and MapToggle component (replaced with unified MapModal). Updated AssertionPanel to check MapModal is defined. Fixed SceneMap column width to adapt to actual col count (Math.max(32, floor(containerWidth/cols))). Added current-scene pulsing ring (animate-pulse). Added faint scene titles on unvisited cells (30% opacity). Added scene type color coding (blue=narrative, red=combat, green=social, purple=horror, indigo=investigation). Added MapModal component with enlarged SceneMap, legend, and close button. Added Map button to top bar. SceneMap accepts enlarged prop for modal vs sidebar sizing.

---

## WU-4 — Always-Visible Status Strip and Combat Panel Visibility
Date: 2026-03-11
Status: COMPLETE
Files changed: public/index.html, tests/frontend.test.js
Tests: 13 passing, 0 failing (frontend); 46 passing, 0 failing (regression)
Summary: Added CharacterStatusStrip component to top bar showing compact stamina bar (color-coded), STA X/Y text, SEU count, and status effect badges (mobile shows STA only). Added inline CombatPanel render in main game area when in_combat is true (always visible without opening sidebar). Added combat-resolved banner (4-second auto-dismiss) on in_combat transition. Added dice roll margin display ("by X"). Added "ACTING" badge to active InitiativeTracker combatant. WU-6 auto-open choices also implemented here (actionsOpen auto-sets when currentChoices arrives).

---

## WU-3 — Character Confirmation Gate and Name Fix
Date: 2026-03-11
Status: COMPLETE
Files changed: public/index.html, tests/frontend.test.js
Tests: 11 passing, 0 failing (frontend); 46 passing, 0 failing (regression)
Summary: Added two-click character confirmation gate (first click highlights card with ring-2 ring-yellow-400, second triggers confirm button "Begin Mission as [name]" + "Change Operative" link). Added `display_name` field stored in gameState.character, shown in CharacterSheet header and top bar with fallback to canonical character.name. Added "Experienced Players" badge to characters with non-'any' difficulty. Added portrait error handler to hide broken images gracefully. bg-gray-700 placeholder on portrait wrap div.

---

## WU-2 — Adventure Selection UX
Date: 2026-03-11
Status: COMPLETE
Files changed: public/index.html
Tests: 9 passing, 0 failing (frontend); 46 passing, 0 failing (regression)
Summary: Added two-click adventure confirmation gate (first click previews AdventureDetailPanel + "Choose This Mission" button, second click/button advances to CHARACTER step). Added "Start Here" green badge for Beginner/Beginner-Friendly adventures. Guarded MapToggle to only render when MAP_DATA has data for that adventure. Improved "Continue a previous campaign" link from text-xs/gray-500 to text-sm/gray-400. dark_side_of_the_moon confirmed complete — no preview badge needed.

---

## WU-1 — Five-Minute Fixes
Date: 2026-03-11
Status: COMPLETE
Files changed: public/index.html, tests/frontend.test.js
Tests: 9 passing, 0 failing (frontend); 46 passing, 0 failing (regression)
Summary: Added landing screen subtitle, improved PlayerInput placeholder based on disabled state, renamed sidebar "Rules" tab to "Combat Log", added 3 new LORE_TIDBITS entries for Grak/Chiivari/Ossivaan, updated "four major races" phrase to inclusive wording, updated AssertionPanel assertion to LORE_TIDBITS.length === 10, and added iOS/Android safe-area-inset-bottom padding to mobile player input bar.

---

## WU-CS1: Character select stacked row layout with race portrait images

**Files modified**
- `public/index.html` — character select screen redesigned: grid container replaced with flex column; each character button is a horizontal row card (`sf-char-row-btn`) with a race portrait image left-anchored at 2:3 ratio (60/73/87px wide at mobile/tablet/desktop), content pane right; dead `.sf-char-grid` grid-template-columns media query overrides removed; new CSS for `.sf-char-row-btn` heights and `.sf-char-portrait` sizing added; description text removed from card (replaced by skills inline); no game logic changes

---

## WU-1: Project scaffolding — package.json + Express skeleton

**Files added**
- `package.json` — dependencies: express, better-sqlite3, dotenv, express-rate-limit, uuid; devDeps: jest, supertest
- `server.js` — Express app with static serving from `public/`, `/api/healthz`, module.exports for testing
- `db.js` — SQLite wrapper with initDb, createSession, getSession, saveMessage, getMessages, saveGameState, getGameState
- `.env` — local dev env file (not committed; gitignored in WU-3)
- `public/` — empty directory; index.html moved here in WU-7
- `tests/server.test.js` — test suite for all backend WUs (written up-front; WU-specific tests run per unit)

**Tests added** (WU-1 block, 5 tests — all pass)
- app exports a valid Express application
- GET /api/healthz returns 200 with status ok
- GET /nonexistent-route returns 404
- public/ directory exists for static serving (index.html moved in WU-7)
- server respects PORT environment variable

**Risk register items resolved**: none (no existing files touched)

**Decisions**
- Node 20 built-in `fetch` used — no `node-fetch` needed (justified by Node version check)
- `--runInBand` in jest config: tests share a module cache; in-band prevents race on `jest.resetModules()`
- `--forceExit`: better-sqlite3 keeps the event loop alive after tests; this is the documented solution
- All WU tests written in a single `tests/server.test.js` file to avoid cross-module state problems with `jest.resetModules()`
- db.js also created here (WU-3 content) because server.js requires it at module load time; WU-3 tests verify its behavior

---

## WU-2: POST /api/chat — Anthropic proxy

**Files modified**
- `server.js` — proxy route already included in WU-1 implementation (written together to avoid requiring server.js before db.js existed)

**Tests added** (WU-2 block, 4 tests — all pass)
- POST /api/chat without X-Session-Token returns 401
- POST /api/chat does not include x-api-key in response headers
- POST /api/chat strips session_token field from forwarded body
- POST /api/chat forwards non-2xx Anthropic status to client

**Risk register items addressed**: RR-01, RR-02, RR-03

**Decisions**
- `anthropic-dangerous-direct-browser-access` header NOT forwarded — only needed for browser-direct calls; server-to-server uses standard x-api-key only
- DB persistence failures in /api/chat are logged but swallowed — gameplay must never fail due to DB issues
- `session_token` stripped from forwarded body via destructuring — explicit and readable

---

## WU-3: SQLite database setup

**Files added**
- `db.js` — initDb, createSession, getSession, saveMessage, getMessages, saveGameState, getGameState
- `.gitignore` — excludes node_modules/, .env, astra_rising.db (and WAL files)

**Tests added** (WU-3 block, 8 tests — all pass)
- initDb creates sessions table
- initDb creates messages table
- initDb creates game_state table
- createSession inserts and getSession retrieves correctly
- getSession returns null for nonexistent token
- saveMessage and getMessages round-trip
- saveGameState and getGameState round-trip
- saveGameState is idempotent (UPSERT, not duplicate INSERT)

**Risk register items resolved**: none (no existing files touched)

**Decisions**
- `ON CONFLICT(session_id) DO UPDATE` for game_state UPSERT — avoids duplicate rows; simpler than delete+insert
- WAL mode enabled — improves concurrent read performance for file-based DB; silently ignored for :memory: in tests
- Tests use ':memory:' DB path — fast, isolated, no filesystem cleanup needed
- db.js written in WU-1 because server.js requires it at module load time; tests verify it here in WU-3

---

## WU-4: Session management endpoints

**Files modified**
- `server.js` — POST /api/session and GET /api/session/:token routes already present in WU-1 implementation

**Tests added** (WU-4 block, 4 tests — all pass)
- POST /api/session returns 201 with a UUID v4 token
- GET /api/session/:token after POST returns 200 with null state and empty messages
- GET /api/session/nonexistent returns 404
- Two POST /api/session calls produce different tokens

**Risk register items resolved**: none (new endpoints only)

**Decisions**
- `uuid` v4 used for token generation — crypto.randomUUID() is available in Node 20 but uuid package is more explicit and simpler to audit/mock
- GET /api/session/:token returns state_json as null (not missing key) when no state saved — explicit null avoids "key undefined" bugs on the frontend

---

## WU-6: Rate limiting on /api/chat

**Files modified**
- `server.js` — chatRateLimiter already present in WU-1 implementation; configurable via RATE_LIMIT_MAX / RATE_LIMIT_WINDOW_MS env vars

**Tests added** (WU-6 block, 3 tests — all pass)
- requests within rate limit are not rejected with 429
- exceeding rate limit returns 429 with error message
- different tokens have independent rate limit counters

**Risk register items resolved**: RR-04

**Decisions**
- Rate limit keyed on X-Session-Token header (not IP) — each player has their own independent bucket; IP fallback only if header somehow absent
- RATE_LIMIT_MAX and RATE_LIMIT_WINDOW_MS configurable via env vars — allows tests to use small values (1–3 requests) without waiting real time
- Custom 429 handler returns structured JSON: `{ error: "Rate limit exceeded. N requests per hour per session." }`

---

## WU-7: Frontend adaptation

**Files modified**
- `index.html` → moved to `public/index.html`; 4 minimal changes made (details below)

**Changes made (minimum required)**
1. **Removed API key input** — removed `const [apiKey, setApiKey] = useState('')` from App; removed API key label + password input JSX from SetupScreen; removed `apiKey`/`setApiKey` props from all component signatures and call sites; replaced with `sessionToken` state throughout
2. **Replaced fetch() calls** — `callDM` and `compressCampaignHistory` now call `fetch('/api/chat', ...)` instead of `fetch('https://api.anthropic.com/v1/messages', ...)`; removed `x-api-key` and `anthropic-dangerous-direct-browser-access` headers; added `X-Session-Token: sessionToken` header; removed unused `BASE_URL` from `API_CONSTANTS`
3. **Session token localStorage** — App reads `localStorage.getItem('sf_session_token')` on mount and writes on session creation via `localStorage.setItem('sf_session_token', token)`
4. **Session restore on mount** — App `useEffect` on mount: if token exists in localStorage, calls `GET /api/session/:token`; if valid, sets sessionToken; if not, creates a new session via `POST /api/session`

**Tests added** (WU-7 block, 7 tests — all pass)
- public/index.html exists
- index.html does not reference api.anthropic.com
- index.html does not contain x-api-key header
- index.html does not contain anthropic-dangerous-direct-browser-access header
- index.html references /api/chat for DM calls
- index.html references sf_session_token localStorage key
- index.html references /api/session for session restore

**Risk register items resolved**: RR-07, RR-08, RR-09

---

## WU-8: Deployment artifacts

**Files added**
- `.env.example` — documents all env vars: ANTHROPIC_API_KEY, PORT, DB_PATH, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS
- `NGINX.md` — reverse proxy config, systemd unit, and deployment steps for production

**Tests added** (WU-8 block, 5 tests — all pass)
- .env.example exists and documents ANTHROPIC_API_KEY
- .env.example documents PORT
- NGINX.md exists
- package.json has a start script
- server respects PORT env var (runtime check)

**Risk register items resolved**: RR-05, RR-06, RR-10

---

## P2-A1: Rule File Loader

**Files added**
- `server/ruleLoader.js` — loads 5 in-scope JSON files from `public/data/rules/` at startup; caches in `rulesCache`; exports `loadRules`, `getRulesCache`, `getLoadedIds`, `BLOCKED_IDS`
- `server/` directory and `server/services/`, `server/tests/` subdirectories created

**Files modified**
- `server.js` — imports `ruleLoader`; calls `loadRules()` at startup; adds all rules API endpoints (A2–A5)

**Tests passed** (node server/tests/smoke_a1_a5_http.js — 32 checks, 0 failures)
- 5 rulesets loaded (master_index, alpha_dawn_basic, alpha_dawn_expanded, Korvaths_guide, gamma_dawn)
- knight_hawks and knight_hawks_expanded absent from loaded_rulesets
- GET /api/rules returns ai_query_patterns
- GET /api/rules/alpha_dawn_basic returns 200 with character_creation.races
- GET /api/rules/knight_hawks returns 403
- GET /api/rules/alpha_dawn_basic/combat returns combat section
- GET /api/rules/alpha_dawn_basic/nonexistent returns 404
- All 6 convenience endpoints return 200 with expected fields
- Regression: /api/healthz 200; /api/chat without token 401

---

## P2-A2: Master Index Endpoint

Implemented as part of P2-A1 (see above). No separate file changes.

---

## P2-A3: Full Ruleset Endpoint

Implemented as part of P2-A1 (see above). No separate file changes.

---

## P2-A4: Section Endpoint

Implemented as part of P2-A1 (see above). No separate file changes.

---

## P2-A5: Convenience Endpoints

Implemented as part of P2-A1 (see above). No separate file changes.

---

## P2-F1: Full Regression Suite

**Files added**
- `server/tests/regression.js` — 46-test combined suite covering A1–A5, B1, B2, C1, C2, D1, D2, D3, E1, E2–E5, and core regressions (HTTP + unit + static analysis)

**Tests passed** (node server/tests/regression.js — 46 tests, 0 failures)

---

## P2-E2 through E5: Module-Specific Rich Injection

**Files modified**
- `server/services/promptRulesInjector.js` — replaced generic P7 module block with module-specific injection:
  - **E2 Psionics**: Power Points formula, recovery rate, discipline names, psionic combat description
  - **E3 Cybernetics**: Cyber Points base formula and cost-per-implant, implant categories, cyberpsychosis trigger
  - **E4 Reputation**: Category names (CFW/corporations/underworld/frontier), positive/negative effects
  - **E5 Mutations**: Sources, mutation types, beneficial examples (first 3)

**Tests passed**: promptRulesInjector.test.js (20/20); all 4 modules verified non-empty; 207 words with all 4 active

---

## P2-E1: Active Modules Endpoint

**Files modified**
- `db.js` — added `session_modules` table (CREATE TABLE IF NOT EXISTS); added `saveActiveModules(db, sessionId, modules)` and `getActiveModules(db, sessionId)` functions
- `server.js` — imports `saveActiveModules`, `getActiveModules`; updates `/api/chat` handler to read active modules from DB and pass to `buildRulesContext`; adds `POST /api/session/:token/modules` (validates against VALID_MODULES set, stores, returns `{ok:true, active_modules}`); adds `GET /api/session/:token/modules`

**Smoke test results** (manual HTTP)
- POST /api/session/token/modules with ['psionics'] → 200 `{ok:true, active_modules:['psionics']}`
- GET /api/session/token/modules → 200 `{active_modules:['psionics']}`
- POST with unknown module ['knight_hawks'] → 400 `{error:"Unknown module(s): knight_hawks"}`
- GET with nonexistent token → 404

---

## Sidebar-WU-5: Wire RulesLogPanel into Sidebar

**Files modified**
- `public/index.html` — added `{sidebarTab === 'rules' && <RulesLogPanel rulesLog={rulesLog} />}` sibling to the player tab fragment inside the sidebar column

**Verified**: rules tab renders, player tab still shows normally, no layout regression

---

## Sidebar-WU-4: RulesLogPanel Component

**Files modified**
- `public/index.html` — added `RulesLogPanel` component (SECTION 29e) with:
  - `useRef` + `useEffect` auto-scroll to bottom on `rulesLog.length` change
  - Header: "Rules Activity" label + turn count right-aligned
  - Empty state: italic hint message when no turns recorded
  - Per-turn block: turn label + `<hr>`, bullet list of entries
  - Text coloring: HIT=green-400, MISS=red-400, Stamina=orange-300, XP=yellow-300, DM note=blue-300, default=gray-300
  - `entry.src` rendered as `text-gray-500` parenthetical after main text

---

## Sidebar-WU-3: Rules Log State and Data Collection

**Files modified**
- `public/index.html`:
  - Added `const [rulesLog, setRulesLog] = useState([]);` to GameScreen state
  - Updated `useDMTurn` to accept `onTurnComplete` prop; calls it before `setLoading(false)` with `(result, newStateForLog)` where `newStateForLog = applyStateUpdates(gameState, result.state_updates)`
  - Added `onTurnComplete` to `useCallback` dependency array
  - Implemented `onTurnComplete` callback in GameScreen's `useDMTurn` call: collects entries from 8 sources (dice rolls with HIT/MISS, stamina delta, SEU delta, status_add/remove, XP delta, credits delta, inventory_add/remove, ooc_note); appends `{id, turn, timestamp, entries}` entry to `rulesLog` with 100-entry cap

---

## Sidebar-WU-2: Player Tab Content Wrapper

**Files modified**
- `public/index.html` — wrapped existing scrollable sidebar content + sticky tools in `{sidebarTab === 'player' && <> ... </>}` fragment

---

## Sidebar-WU-1: Sidebar Tab State and Strip

**Files modified**
- `public/index.html`:
  - Added `const [sidebarTab, setSidebarTab] = useState('player');` to GameScreen state
  - Inserted 2-button tab strip (Player / Rules) between sidebar header and content area; active tab shows `border-b-2 border-yellow-400 bg-gray-800 text-white`; inactive shows `text-gray-500 bg-gray-900 hover:text-gray-300`

---

## P2-D3: Korvath Expanded Skill Availability

**Files modified**
- `server/services/promptRulesInjector.js` — enhanced P4 SKILL DEFS:
  1. Builds flat map of all Korvath expanded skills (military/technological/biosocial)
  2. Appends `[subs: X/Y/Z]` to each skill def line where Korvath subskills exist
  3. Appends `(PSA skill)` when skill is in the character's PSA group (affects XP cost)

**Tests passed**: promptRulesInjector.test.js (20/20); spot-check: Beam Weapons shows [subs: Pistol/Rifle/Heavy], Technician shows [subs: ...] (PSA skill)

---

## P2-D2: Profession Bonuses and Korvath Race Injection

**Files modified**
- `server/services/promptRulesInjector.js`:
  1. P3 RACE section now checks `Korvaths_guide.new_races[race]` as fallback for Grak/Chiivari/Ossivaan
  2. P4b PROFESSION section: matches `char.archetype` to `Korvaths_guide.professions` keys by substring, emits free_skill and typical_skills

**Tests passed**: promptRulesInjector.test.js (20/20); Grak spot-check: RACE(Grak), Spring Charge, PROFESSION(enforcer), Free skill all present

---

## P2-D1: Korvath Character Roster

**Files modified**
- `public/data/game-data.js` — added 3 Korvath characters: Grukk (Grak Enforcer, STR/STA 65, Melee 2/Beam 1/MA 1), Pip (Chiivari Explorer, INT/LOG 55, Environmental 2/Medical 1), Vael (Ossivaan Spacer-Techex, DEX/RS 55, Technician 2/Beam 1)
- `public/index.html` — Override 3: updated assertion `CHARACTER_ROSTER has 4 entries` → `CHARACTER_ROSTER has 7 entries`

**Tests passed**: Syntax check on game-data.js (12 ids: 5 adventures + 7 characters)

---

## P2-C2: rule_source Field in Dice Roll Schema

**Files modified**
- `public/index.html` — added `"rule_source": null` to dice roll object in both `buildSystemPrompt` verbose schema (line ~2955) and `buildCompressedSystemPrompt` compact responseSchema string (line ~3059); also expanded compact schema to show an example dice_rolls element with all fields

**Tests passed**: C1 regression (5/5)

---

## P2-C1: Rules Context Wiring

**Files modified**
- `server.js` — imports `buildRulesContext`; destructures `game_state` out of `req.body` (stripped before Anthropic forward); parses game_state JSON and injects rules context into `anthropicBody.system`; logs injection word count
- `public/index.html` — `callDM` accepts new 7th parameter `gameState`; serializes it as `game_state` in the POST body; call site in `useDMTurn.submitTurn` now passes `gameState`

**Files added**
- `server/tests/smoke_c1_rules_injection.js` — 5-condition smoke test (Override 2)

**Tests passed** (node server/tests/smoke_c1_rules_injection.js — 5 tests, 0 failures)
- Condition 1: /api/healthz returns HTTP 200 (regression)
- Condition 2: POST /api/chat without X-Session-Token returns 401 (regression)
- Condition 3: buildRulesContext returns non-empty output for valid gameState
- Condition 4: server.js destructures game_state from req.body (static analysis)
- Condition 5: rules context appended to system prompt when game_state present

---

## P2-B2: Prompt Rules Injector

**Files added**
- `server/services/promptRulesInjector.js` — `buildRulesContext(gameState, activeModules)→string`; outputs `[COMPUTED STATE]` and `[RULES CONTEXT]` blocks; ~186 words for typical character state; never exceeds 700 words
- `server/tests/promptRulesInjector.test.js` — 20 smoke tests using Node built-in assert

**Tests passed** (node server/tests/promptRulesInjector.test.js — 20 tests, 0 failures)
- [COMPUTED STATE] and [RULES CONTEXT] headers present
- IM: line present; IM=5 for RS=50
- Beam Weapons L2 skill check target: 45% (floor(50/2) + 2*10)
- laser_pistol dmg line present in output
- STA thresholds line present; dying=-70 for maxSTA=40
- Ambidexterity and Comprehension (Krix racial abilities) present
- COMBAT SEQUENCE + TO-HIT MODS injected when in_combat=true; absent when false
- psionics MODULE block injected when activeModules=['psionics']; absent when empty
- null gameState / null character → empty string
- output under 700 words (got 186)

---

## P2-B1: Rule Computation Service

**Files added**
- `server/services/ruleEngine.js` — 6 pure functions: computeIM, computeSkillTarget, parseWeaponDamage, computeSTAThresholds, computeRacialTriggerChance, computeAbilityModifier
- `server/tests/ruleEngine.test.js` — 32 unit tests using Node built-in assert

**Files modified**
- `public/index.html` — Override 1: updated death threshold text in buildSystemPrompt Layer 1 and buildCompressedSystemPrompt Layer 1 from "death at -STA(max)" to "death at -(maxSTA + 30)"

**Tests passed** (node server/tests/ruleEngine.test.js — 32 tests, 0 failures)
- computeIM(45)===5, computeIM(55)===6
- computeSkillTarget(60,3)===60, computeSkillTarget(50,2)===45
- parseDamageString for 1d10/2d10/1d10+2/4d10/per-SEU formats
- parseWeaponDamage for laser_pistol (beam), gyrojet_pistol (projectile), nonexistent (null)
- computeSTAThresholds(50) deepEqual {unconscious:0, dying:-80}
- computeRacialTriggerChance for Skrath/Moluun/Krix/human/bogusrace
- computeAbilityModifier for all ranges including 65→"+10%", 10→"-20%"

---
