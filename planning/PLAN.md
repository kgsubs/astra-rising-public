# PLAN.md — Astra Rising Backend Architecture

Generated: 2026-03-10
Target: Option A Backend (Node/Express + SQLite + Frontend Adaptation)

---

## SECTION A — FINDINGS

### A.1 Frontend Stack

| Item | Detail |
|---|---|
| Framework | React 18 UMD (production build), JSX compiled in-browser by Babel Standalone |
| UI | Tailwind CSS v3 full CDN (arbitrary values, JIT); lucide-react 0.383.0 UMD |
| Delivery | Single self-contained file: `index.html` (3,680 lines) |
| Globals | `React`, `ReactDOM`, `LucideReact` via `<script>` CDN tags; no ES imports |
| Build step | None. The browser compiles JSX at runtime via `<script type="text/babel">`. |

### A.2 API Key Handling

- Stored in React `useState('')` inside `function App()` at line 3479: `const [apiKey, setApiKey] = useState('')`
- Entered by user via `<input type="password">` in `SetupScreen` (lines 1493–1499)
- Passed as a prop through: `App → SetupScreen (setApiKey)`, `App → GameScreen (apiKey)`, `GameScreen → useDMTurn (apiKey)`, `GameScreen → MetaControlsBar (apiKey)`, `MetaControlsBar → SummarizeButton (apiKey)`
- Used in `callDM(apiKey, ...)` and `compressCampaignHistory(gameState, apiKey, ...)`
- **Never stored** in localStorage, sessionStorage, gameState, or any export. Confirmed zero occurrences of `localStorage`/`sessionStorage` in the file.
- The gate `const canBegin = selectedCharId && selectedAdventureId && apiKey.trim().length > 0` (line 1462) prevents starting without it
- `handleBeginAdventure` guard at line 3490: `if (!selectedChar || !selectedAdventure || !apiKey.trim()) return;`

### A.3 Anthropic API Calls — How They Are Made

**Two fetch call sites, both browser-direct:**

**`callDM` (lines 3291–3348)** — primary gameplay proxy:
```javascript
fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true'
  },
  body: JSON.stringify({ model, max_tokens: 4096, system, messages })
})
// Response: data.content[0].text → JSON.parse() → DMResponse object
```
Includes one silent network-error retry.

**`compressCampaignHistory` (lines 3207–3263)** — history compression:
```javascript
fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: { /* same four headers */ },
  body: JSON.stringify({ model, max_tokens: 600, system, messages: [{ role: 'user', content }] })
})
// Response: data.content[0].text → plain text, NOT JSON.parsed
```
No retry on network error (inconsistent with callDM — noted as tech debt).

### A.4 Existing Backend Code

**None.** No `server.js`, no `app.py`, no `Dockerfile`, no `nginx.conf`. The repository has zero backend code.

### A.5 File / Folder Structure

```
/path/to/astra-rising/
├── index.html              ← Entire application (3,680 lines)
├── BUILD_LOG.md            ← Development log
├── CODEX.md                ← Reusable patterns
├── EXE.md                  ← Execution record
├── EXECUTION_PLAN.md       ← Pre-build planning
├── ALL_PACKETS_COMPLETE.md ← Completion summary (untracked)
├── packets/                ← Build packets (untracked)
│   └── PACKET_*.md (17 files)
├── research_assets/        ← Adventure JSON source data (untracked)
│   └── *.json (10 files) + astra-rising-ai-dm-PRD-v2.md
└── system/                 ← AI workflow templates
    └── *.md (14 files)
```

**No `package.json`, no `node_modules`, no `*.test.*` files exist.**

### A.6 Dependencies

No `package.json`. All dependencies loaded via CDN:

| Library | Version | URL |
|---|---|---|
| React | 18 | unpkg.com/react@18/umd/react.production.min.js |
| ReactDOM | 18 | unpkg.com/react-dom@18/umd/react-dom.production.min.js |
| Babel Standalone | unpinned | unpkg.com/@babel/standalone/babel.min.js |
| Tailwind CSS | v3 | cdn.tailwindcss.com (unpinned) |
| lucide-react | 0.383.0 | unpkg.com/lucide-react@0.383.0/dist/umd/lucide-react.js |

### A.7 How App Is Currently Served

Unknown. No server, CI config, or `README.md` exists. Project memory references `star.shawndata.com`. Likely static hosting (S3/Netlify/GitHub Pages). Currently any HTTP server that can serve a static file works.

### A.8 Session / Auth / Storage Logic

- **No localStorage, no sessionStorage, no cookies.** Confirmed zero occurrences.
- **No auth system.** No login, no tokens, no sessions.
- Save/load is entirely manual: "End Session" exports `JSON.stringify(gameState)` to a `<textarea>` for copy; "Continue a previous campaign" pastes it back into a `<textarea>`. The `parseAndLoadSave` function validates and calls `setGameState()` + `setPhase('GAME')`.
- **Critical**: the `messages` array (conversation history for display and API replay) is local to `useDMTurn` hook's `useState([])`. It is **not** part of `gameState` and is **not** included in the save export. This means message history is always lost on refresh even with the manual save.

### A.9 Database / Persistence Layer

**None.**

### A.10 Existing Tests

**Zero test files.** No Jest, no pytest, no Playwright, no Mocha. The only assertions are 56 runtime boolean expressions inside `AssertionPanel` (lines ~3546–3637), rendered only when `INITIAL_STATE.meta.dev_mode === true` — which is `false` in shipped code. These are dev-mode sanity checks, not an automated test suite.

---

## SECTION B — REGRESSION RISK REGISTER

### RR-01: Session Zero API call (handleBeginAdventure)
- **Behavior**: User selects char + adventure + enters API key → Begin Adventure → Session Zero call to Anthropic → SessionZeroResponse parsed → hooks displayed
- **Risk**: HIGH — we are removing apiKey from this call path and rerouting to backend proxy
- **Mitigation**: Integration test verifying POST /api/chat proxies correctly; smoke test of the full session zero flow in development

### RR-02: Gameplay DM turns (useDMTurn.submitTurn)
- **Behavior**: Player input → callDM → DMResponse parsed + validated → applyStateUpdates → messages + state updated
- **Risk**: HIGH — callDM URL and signature changes; apiKey prop removed from useDMTurn
- **Mitigation**: Jest test mocking fetch to /api/chat; verify apiKey header is absent from client request; verify response parsing unchanged

### RR-03: History compression (compressCampaignHistory)
- **Behavior**: Triggered from MetaControlsBar → API call returns plain text → stored in scene.compressed_summary → used by buildCompressedSystemPrompt
- **Risk**: MEDIUM — same URL/header change as callDM, but response must remain plain text (not JSON.parsed)
- **Mitigation**: Jest test verifying /api/chat returns raw Anthropic response; verify caller still reads data.content[0].text as plain string

### RR-04: Manual save export/import (ContinueCampaignPanel / parseAndLoadSave)
- **Behavior**: "End Session" → JSON export to textarea → user pastes back → setGameState + setPhase('GAME')
- **Risk**: LOW — we are not touching this code path; state shape is unchanged
- **Mitigation**: Regression test verifying parseAndLoadSave still works with existing state shape

### RR-05: canBegin gate (SetupScreen)
- **Behavior**: "Begin Adventure" button disabled until char + adventure + apiKey are all selected
- **Risk**: MEDIUM — removing apiKey from the condition changes UX: button becomes enabled with just char + adventure
- **Mitigation**: Explicit test verifying canBegin logic after change; document in CHANGES.md

### RR-06: Character + Adventure selection (SetupScreen panels)
- **Behavior**: CharacterSelectPanel and AdventureSelectPanel render and fire callbacks
- **Risk**: LOW — we only change the API key input block and prop signature; panels are untouched
- **Mitigation**: Verify panels render normally after prop signature change

### RR-07: State management (applyStateUpdates, clampStamina, etc.)
- **Behavior**: All 13 state update blocks in applyStateUpdates; stamina clamping; snapshot/restore
- **Risk**: LOW — we are not touching state management code
- **Mitigation**: No specific mitigation needed; existing AssertionPanel sanity checks remain

### RR-08: AssertionPanel (dev mode)
- **Behavior**: 56 assertions visible when meta.dev_mode === true
- **Risk**: LOW — we are not touching this; only risk is if INITIAL_STATE shape changes (it doesn't)
- **Mitigation**: None required

### RR-09: Messages array (useDMTurn local state)
- **Behavior**: Conversation history stored in useDMTurn useState; used for display and API replay
- **Risk**: HIGH — we add an `initialMessages` prop to useDMTurn for session restore; wrong initial value breaks replay
- **Mitigation**: Test that initialMessages defaults to [] when not provided; test that provided messages are reflected in submitTurn's apiMessages construction

### RR-10: Phase state machine (SETUP → SESSION_ZERO → GAME)
- **Behavior**: Phase transitions driven by handleBeginAdventure, handleHookSelect, handleNewAdventure, handleLoadSave
- **Risk**: LOW — transitions are unchanged; we only add a useEffect for session init before the SETUP phase
- **Mitigation**: Verify handleNewAdventure still resets to SETUP cleanly

---

## SECTION C — WORK UNITS

### Sequencing Rationale
Units are sequenced so each is independently deployable and testable. Backend units (WU-1 through WU-5) are built first with no frontend changes. WU-6 (frontend adaptation) depends on WU-1/WU-2/WU-4 being complete. WU-7 (deployment artifacts) depends on all prior units.

---

### WU-1: Project scaffolding — package.json + Express skeleton

**Responsibility**: Create Node.js project with Express, establish that `npm install && npm start` serves `index.html` at `/`.

**Files created** (all new — no existing files touched):
- `package.json`
- `server.js`
- `.env`
- `tests/server.test.js`

**Dependencies to install** (with justification):
- `express` — HTTP server / router
- `dotenv` — load ANTHROPIC_API_KEY from .env file
- `jest` — test framework (Node, no browser required)
- `supertest` — HTTP assertion library for Express tests (no real server port needed)

**Existing behaviors touched**: None (no existing files modified).

**Tests required** (tests/server.test.js):
1. `GET /` returns 200 and serves index.html content
2. Server starts without crashing when ANTHROPIC_API_KEY is set in env
3. Server starts without crashing and returns 503 on /api/chat when ANTHROPIC_API_KEY is missing (fail-safe check)

**Definition of done**: `npm test` passes; `npm start` serves `index.html` from `/`.

---

### WU-2: POST /api/chat — transparent Anthropic proxy

**Responsibility**: Proxy requests from the frontend to `https://api.anthropic.com/v1/messages`. API key lives only on the server. Client sends `session_token` in `X-Session-Token` header; server strips it, adds `x-api-key`, forwards the rest of the body unchanged, streams response back.

**Files modified**:
- `server.js` (new route; WU-1 created this file)

**Dependencies to install**:
- `node-fetch` — if Node < 18; otherwise use built-in `fetch`. Check Node version and comment decision.

**Design decisions**:
- Body forwarded verbatim (minus session_token) → callDM and compressCampaignHistory need zero behavior changes beyond the URL
- Response forwarded verbatim → client JSON.parse or plain-text handling unchanged
- If `X-Session-Token` header is absent: return 401 (no anonymous proxy)
- If Anthropic returns non-2xx: forward the status and body to client (client already handles 401/429/500)

**Existing behaviors touched**: RR-01, RR-02, RR-03

**Tests required** (tests/server.test.js):
1. POST /api/chat with valid session token → calls Anthropic with correct headers (mock Anthropic)
2. POST /api/chat → x-api-key header is NOT echoed back to client in response
3. POST /api/chat without X-Session-Token → 401
4. POST /api/chat → Anthropic 429 is forwarded to client as 429
5. POST /api/chat → body is forwarded without session_token field

**Definition of done**: All 5 tests pass; Anthropic API key never appears in response headers or body.

---

### WU-3: SQLite database setup

**Responsibility**: Initialize SQLite database with the required schema on server start. Provide a `db.js` module with typed query functions.

**Files created** (all new):
- `db.js`
- `tests/db.test.js`
- `astra_rising.db` (auto-created at runtime, gitignored)
- `.gitignore` (new — adds node_modules, .env, astra_rising.db)

**Dependencies to install**:
- `better-sqlite3` — synchronous SQLite driver; no async overhead, no connection pool needed at this scale. Justification: simpler than async drivers for single-writer use case.

**Schema** (exact as specified):
```sql
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_token TEXT UNIQUE NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS game_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL UNIQUE REFERENCES sessions(id),
  state_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**Exported functions from db.js**:
- `initDb()` → creates tables if not exist, returns db instance
- `createSession(token)` → INSERT into sessions, return session row
- `getSession(token)` → SELECT session by token, return row or null
- `saveMessage(sessionId, role, content)` → INSERT into messages
- `getMessages(sessionId)` → SELECT all messages for session ordered by timestamp
- `saveGameState(sessionId, stateJson)` → UPSERT into game_state
- `getGameState(sessionId)` → SELECT game_state for session, return row or null

**Existing behaviors touched**: None.

**Tests required** (tests/db.test.js — uses in-memory SQLite `:memory:`):
1. `initDb()` creates all three tables without error
2. `createSession(token)` inserts and `getSession(token)` retrieves correctly
3. `getSession('nonexistent')` returns null
4. `saveMessage` + `getMessages` round-trip correctly
5. `saveGameState` + `getGameState` round-trip correctly
6. `saveGameState` called twice with same sessionId updates (UPSERT, not INSERT twice)

**Definition of done**: All 6 tests pass; `astra_rising.db` is created on `npm start`.

---

### WU-4: Session management endpoints

**Responsibility**: Add `POST /api/session` (create new session) and `GET /api/session/:token` (restore session). Both use db.js. Token is UUID v4.

**Files modified**:
- `server.js` (two new routes)

**Dependencies to install**:
- `uuid` — UUID v4 generation for session tokens. Justification: crypto.randomUUID() exists in Node 15.6+, but uuid package is more explicit about v4 and simpler to mock in tests.

**Endpoint contracts**:

`POST /api/session`:
- Body: none required
- Creates session, returns `{ token: "<uuid-v4>" }`
- 201 Created

`GET /api/session/:token`:
- Returns `{ token, state_json: "<string|null>", messages: [...] }`
- `state_json` is the game_state.state_json value, or null if no saved state
- `messages` is the array from getMessages(), or [] if none
- 404 if token not in sessions table

**Existing behaviors touched**: None (new code only).

**Tests required** (tests/server.test.js):
1. `POST /api/session` → 201, body contains `token` matching UUID v4 format
2. `GET /api/session/:token` after POST → 200, state_json is null, messages is []
3. `GET /api/session/nonexistent` → 404
4. Token from POST is retrievable via GET (integration)

**Definition of done**: All 4 tests pass.

---

### WU-5: Persistence — messages + game state saved on each turn

**Responsibility**: After each successful `/api/chat` proxy call, save the user message and assistant response to the messages table. Add `PUT /api/session/:token/state` endpoint that the frontend calls after each turn to persist game state.

**Files modified**:
- `server.js` (modify /api/chat handler + add PUT /api/session/:token/state route)

**Design decisions**:
- /api/chat: extract user message from `req.body.messages[last]` before forwarding; extract assistant text from Anthropic response after receiving; save both to messages table. If session token is invalid (not in DB), still proxy the call but skip persistence and log a warning (don't fail the user's game turn over a DB error).
- PUT /api/session/:token/state body: `{ state_json: "<string>" }`. Calls `saveGameState()`.
- On DB error: log to console, return 500 for PUT (client can retry); never fail /api/chat due to DB issues.

**Existing behaviors touched**: RR-02 (message persistence is new, not changing existing behavior), RR-04 (save/load flow unchanged — PUT /state is additive).

**Tests required** (tests/server.test.js):
1. POST /api/chat with valid session token → messages table has user + assistant entries after call (mock Anthropic)
2. PUT /api/session/:token/state with valid token → 200, subsequent GET /api/session/:token returns the state_json
3. PUT /api/session/nonexistent/state → 404
4. POST /api/chat where Anthropic returns error → DB save is NOT attempted (no partial data)
5. DB failure during /api/chat message save → /api/chat still returns the Anthropic response (game not broken)

**Definition of done**: All 5 tests pass; after a turn, state and messages are in DB.

---

### WU-6: Rate limiting on /api/chat

**Responsibility**: Limit /api/chat to 100 requests per hour per session token. Tokens without a valid session entry are rejected at the /api/chat handler level (WU-2 already returns 401 for missing token; here we add per-token rate limiting).

**Files modified**:
- `server.js` (add rate limit middleware to /api/chat route)

**Dependencies to install**:
- `express-rate-limit` — standard Express rate limiting. Justification: purpose-built for this, minimal code, no external state store needed for single-process deployment.

**Design decisions**:
- `keyGenerator`: use `req.headers['x-session-token']` as the key (already validated upstream in /api/chat handler)
- `windowMs`: 60 * 60 * 1000 (1 hour)
- `max`: 100
- `standardHeaders`: true (returns RateLimit-* headers)
- `legacyHeaders`: false
- On limit hit: 429, body `{ error: "Rate limit exceeded. 100 requests per hour per session." }`
- Limit applies only to /api/chat; session management and state endpoints are not rate-limited

**Existing behaviors touched**: RR-01, RR-02, RR-03 (all API calls go through /api/chat, so all could in theory hit rate limit — acceptable)

**Tests required** (tests/server.test.js):
1. 100 requests to /api/chat with same token → all succeed (mock Anthropic)
2. 101st request with same token → 429
3. 101st request with different token → succeeds (rate limit is per-token)
4. Rate limit response has correct error message format

**Definition of done**: All 4 tests pass.

---

### WU-7: Frontend adaptation — remove API key, add session token, reroute calls

**Responsibility**: Modify `index.html` to: (1) remove API key input and state, (2) add session token localStorage logic with init useEffect, (3) reroute callDM and compressCampaignHistory to `/api/chat`, (4) pass session token via X-Session-Token header, (5) add `initialMessages` prop to useDMTurn for session restore, (6) auto-save game state after each turn via PUT /api/session/:token/state, (7) restore session on load.

**Files modified**:
- `index.html` — the only existing file touched in this work unit

**Specific changes to index.html** (all minimal, surgical):

| Location | Change | Risk Register |
|---|---|---|
| Line 3479 | Remove `const [apiKey, setApiKey] = useState('')` | RR-01, RR-02 |
| After line 3479 | Add `const [sessionToken, setSessionToken] = useState(null)` | — |
| After sessionToken useState | Add useEffect for session init (see below) | RR-09, RR-10 |
| Line 1461 | Remove `apiKey, setApiKey` from SetupScreen props | RR-05 |
| Line 1462 | Change `canBegin` to `selectedCharId && selectedAdventureId` (remove apiKey gate) | RR-05 |
| Lines 1490–1499 | Remove API key label + input elements | RR-05 |
| Line 3490 | Remove `!apiKey.trim()` from handleBeginAdventure guard | RR-01 |
| Line 3523 | Remove `apiKey` from useCallback deps | — |
| Line 3642–3643 | Remove apiKey/setApiKey from SetupScreen JSX props | — |
| Lines 3667+ | Remove apiKey from GameScreen JSX prop | RR-02 |
| Line 2852 | Remove apiKey from GameScreen function signature | — |
| Line 2864 | Remove apiKey from useDMTurn call | — |
| Line 1928 | Add `sessionToken, initialMessages = []` to useDMTurn props | RR-09 |
| Line 1931 | Change `useState([])` to `useState(initialMessages)` | RR-09 |
| Line 1952 | Change `callDM(apiKey, apiMessages, ...)` to `callDM(apiMessages, ...)` | RR-02 |
| Line 2014 | Remove `apiKey` from useCallback deps | — |
| After setGameState in submitTurn | Add auto-save call (fetch PUT /api/session/:token/state) | — |
| Line 2600 | Remove apiKey from SummarizeButton props | RR-03 |
| Line 2610 | Remove apiKey from compressCampaignHistory call | RR-03 |
| Line 2642 | Remove apiKey from MetaControlsBar props | — |
| Line 2719 | Remove apiKey prop from SummarizeButton JSX | — |
| Line 2912 | Remove apiKey from MetaControlsBar JSX | — |
| callDM function | Remove apiKey param; change URL to `/api/chat`; replace x-api-key header with X-Session-Token | RR-01, RR-02 |
| compressCampaignHistory | Remove apiKey param; change URL to `/api/chat`; replace x-api-key header with X-Session-Token | RR-03 |
| GameScreen | Add `sessionToken, initialMessages` props; pass to useDMTurn | — |
| App (line ~3667) | Pass `sessionToken` and `initialMessages` to GameScreen | — |

**Session init useEffect** (added inside App, runs once on mount):
```javascript
useEffect(() => {
  const stored = localStorage.getItem('sf_session_token');
  if (stored) {
    fetch(`/api/session/${stored}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setSessionToken(stored);
          // If saved state exists, restore it
          if (data.state_json) {
            try {
              const { gameState: gs, messages: msgs } = JSON.parse(data.state_json);
              if (gs && gs.meta && gs.meta.initialized) {
                setGameState({ ...gs, meta: { ...gs.meta, loading: false } });
                setInitialMessages(msgs || []);
                setPhase('GAME');
              }
            } catch (e) {
              // Ignore parse errors; start fresh
            }
          }
        } else {
          // Token invalid; create new session
          createNewSession();
        }
      })
      .catch(() => createNewSession());
  } else {
    createNewSession();
  }

  function createNewSession() {
    fetch('/api/session', { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        localStorage.setItem('sf_session_token', data.token);
        setSessionToken(data.token);
      })
      .catch(() => { /* Session creation failed; app still works, just no persistence */ });
  }
}, []); // eslint-disable-line -- intentionally runs once on mount
```

**Auto-save in submitTurn** (added after setGameState call, inside useDMTurn):
```javascript
// Auto-save state after each turn (non-blocking; failure doesn't break gameplay)
if (sessionToken) {
  // nextGameState and nextMessages are captured from the setGameState callback
  fetch(`/api/session/${sessionToken}/state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Session-Token': sessionToken },
    body: JSON.stringify({ state_json: JSON.stringify({ gameState: nextState, messages: nextMessages }) })
  }).catch(() => {}); // Silently ignore persistence failures
}
```
Note: `nextState` requires capturing the new state from the `setGameState` functional updater. This is done by extracting the computed new state into a variable before calling `setGameState`.

**Existing behaviors touched**: RR-01, RR-02, RR-03, RR-04, RR-05, RR-09, RR-10

**Tests required** (tests/frontend.test.js — Node-based structural tests on index.html content):
1. `index.html` does NOT contain `api.anthropic.com` (URL replaced)
2. `index.html` does NOT contain `'x-api-key': apiKey` (header removed)
3. `index.html` does NOT contain `type="password"` (API key input removed)
4. `index.html` DOES contain `/api/chat` (new URL present)
5. `index.html` DOES contain `X-Session-Token` (new auth header present)
6. `index.html` DOES contain `sf_session_token` (localStorage key present)
7. `index.html` DOES contain `initialMessages` (restore prop present)
8. `callDM` in index.html does not accept `apiKey` as first parameter (signature check)
9. `canBegin` no longer references `apiKey` (gate updated)
10. Manual save/load path (`parseAndLoadSave`) still present and unchanged

**Definition of done**: All 10 structural tests pass; app loads in browser showing no API key input; starting an adventure works without entering a key.

---

### WU-8: Deployment artifacts

**Responsibility**: Create `.env.example`, `NGINX.md`, ensure `npm install && npm start` produces a running server serving the app.

**Files created** (all new):
- `.env.example`
- `NGINX.md`
- `CHANGES.md`

**Files modified**:
- `package.json` (add `start` script if not already correct from WU-1)
- `.gitignore` (already created in WU-3; verify .env is listed)

**Contents**:

`.env.example`:
```
# Required: Your Anthropic API key (never commit the real value)
ANTHROPIC_API_KEY=<redacted>

# Optional: Port (default 3000)
PORT=3000

# Optional: SQLite database file path (default: ./astra_rising.db)
DB_PATH=./astra_rising.db
```

`NGINX.md` — documents required reverse proxy configuration for serving the app under a domain.

**Tests required** (tests/server.test.js):
1. `npm install` exits 0 (run in CI; skip in unit test context)
2. Server respects `PORT` env var (start on non-default port, verify)
3. `.env.example` exists and contains `ANTHROPIC_API_KEY` key

**Definition of done**: `npm install && npm start` brings up the full app; `.env.example` is documented; `NGINX.md` explains proxy setup.

---

## Execution Order Summary

| Unit | Files Modified | New Files | Touches Risk Items |
|---|---|---|---|
| WU-1 | none | package.json, server.js, .env, tests/server.test.js | none |
| WU-2 | server.js | none | RR-01, RR-02, RR-03 |
| WU-3 | none | db.js, tests/db.test.js, .gitignore | none |
| WU-4 | server.js | none | none |
| WU-5 | server.js | none | RR-02, RR-04 |
| WU-6 | server.js | none | RR-01, RR-02, RR-03 |
| WU-7 | index.html | tests/frontend.test.js | RR-01 through RR-05, RR-09, RR-10 |
| WU-8 | package.json, .gitignore | .env.example, NGINX.md, CHANGES.md | none |

**Constraint check**: No unit touches more than 2 existing files. WU-7 touches only `index.html` (1 file). All backend work creates new files only until WU-4+ which modify the one new `server.js`. ✓
