# CODEX.md — Astra Rising AI DM
# Harvested: 2026-03-10
# Source project: astra-rising (17 packets, COMPLETE)
# Stack: React 18 UMD + Tailwind v3 CDN + Babel standalone + lucide-react@0.383.0 + Anthropic API
# Output: index.html (2736 lines, self-hosted at star.shawndata.com)

---

## HARVEST SUMMARY

- **Project:** Astra Rising AI DM — solo browser-based AI Dungeon Master for the Astra Rising tabletop RPG
- **Packets completed:** 17/17 (all COMPLETE)
- **Total assertions:** 56 (all PASS at ship)
- **Final file size:** 2736 lines (index.html)
- **Build strategy:** Sequential packets, single file, CDN-only, zero build step
- **Extraction date:** 2026-03-10
- **Entries:** 14 PAT, 10 ANTI, 9 TRANS, 4 ENV, 3 PARA, 1 estimation block, 8 DEC

---

## CODE AND ARCHITECTURE PATTERNS (PAT)

---

### PAT-001: CDN React Single-File Application Shell
**Context:** Browser app with no build tooling. All logic in one HTML file.
**Pattern:** Five CDN `<script>` tags in `<head>`, a `<div id="root">`, and a `<script type="text/babel">` block that contains all components.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>App Title</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://unpkg.com/lucide-react@0.383.0/dist/umd/lucide-react.js"></script>
</head>
<body class="bg-gray-900 min-h-screen">
  <div id="root"></div>
  <script type="text/babel">
    // ALL CODE HERE
    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  </script>
</body>
</html>
```

**Why:** Babel standalone transpiles JSX in-browser. No webpack, no vite, no node_modules.
**Guards:** See ANTI-001 (ES imports), ANTI-002 (dev build CDN), ANTI-008 (wrong Tailwind mode).
**Confidence:** HIGH (verified working in production)

---

### PAT-002: UMD Destructuring Block
**Context:** React and lucide-react loaded as UMD globals; ES `import` syntax fails.
**Pattern:** Always the first lines inside `<script type="text/babel">`:

```js
// SECTION 1 -- UMD DESTRUCTURING
const { useState, useEffect, useCallback, useRef, useMemo } = React;
const { AlertCircle, ChevronRight, Loader, BookOpen, Shield, Zap,
        User, Menu, X, Check, RefreshCw, Globe, Briefcase, Star, Eye, Grid } = LucideReact;
```

**Rule:** Declare ALL hooks and icons here. Never write `React.useState(...)` inline — it works but is inconsistent. Never write `import`.
**Confidence:** HIGH

---

### PAT-003: AssertionPanel In-File QA Infrastructure
**Context:** No test runner, no browser automation. QA must happen at runtime inside the artifact itself.
**Pattern:** A fixed overlay component that renders assertion results as colored dots.

```jsx
function AssertionPanel({ assertions }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-gray-900 bg-opacity-90 border border-gray-700 rounded-lg p-3 max-h-64 overflow-y-auto w-72 shadow-xl">
      <div className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-2 border-b border-gray-700 pb-1">
        DEV ASSERTIONS
      </div>
      {assertions.map((assertion, idx) => (
        <div key={idx} className="flex items-center gap-2 py-0.5">
          <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${assertion.pass ? 'bg-green-400' : 'bg-red-500'}`} />
          <span className={`text-xs ${assertion.pass ? 'text-green-300' : 'text-red-400'}`}>
            {assertion.label}
          </span>
        </div>
      ))}
    </div>
  );
}
```

**Assertion shape:** `{ label: string, pass: boolean }`
**Usage:** `{gameState.meta.dev_mode && <AssertionPanel assertions={allAssertions} />}`
**Accumulation:** Each packet appends new assertions. By PACKET_8_1 there are 56 total. All are merged into a single `allAssertions` array.
**Dev mode gate:** `dev_mode: true` in PACKET_1_1, `dev_mode: false` in PACKET_8_1 (final act, after verifying all 56 pass).
**Confidence:** HIGH

---

### PAT-004: Dev Mode Lifecycle Gate
**Context:** QA infrastructure must not appear in production.
**Pattern:** `meta.dev_mode` boolean in `INITIAL_STATE`. Set to `true` on first packet, flipped to `false` in the polish/final packet.

```js
// PACKET_1_1 — INITIAL_STATE
meta: { initialized: false, loading: false, error: null, last_saved: null, snapshots: [], dev_mode: true }

// PACKET_8_1 — final act (after verifying all assertions pass)
meta: { ..., dev_mode: false }
```

**Gate usage:**
```jsx
{gameState.meta.dev_mode && <AssertionPanel assertions={allAssertions} />}
```

**Critical:** Do not set `dev_mode: false` until you have verified all assertions pass in browser. This is a one-way door per session.
**Confidence:** HIGH

---

### PAT-005: AppError Shape with Recoverable + Retry Action
**Context:** API calls fail for recoverable (network, 429, 500) and non-recoverable (401 auth) reasons. UX must differentiate.

```js
// AppError shape
const err = {
  code: 'HTTP_429',          // string: shown in red badge in error banner
  message: 'Human-readable explanation',
  recoverable: true,         // false for 401 (bad API key — user must re-enter)
  retry_action: () => callDM(...)  // null when non-recoverable
};
```

**Error banner render:**
```jsx
{gameError && (
  <div className="bg-red-900 border-b border-red-700 px-4 py-2 flex items-center justify-between gap-3 flex-shrink-0">
    <div className="flex items-start gap-2 flex-1 min-w-0">
      <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
      {gameError.code && (
        <span className="text-xs font-bold text-red-400 bg-red-800 px-1.5 py-0.5 rounded font-mono flex-shrink-0">
          {gameError.code}
        </span>
      )}
      <span className="text-red-200 text-xs leading-relaxed truncate">{gameError.message}</span>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0">
      {gameError.recoverable && gameError.retry_action && (
        <button onClick={() => { setGameError(null); gameError.retry_action(); }}
          className="text-xs bg-yellow-400 text-gray-900 font-bold px-2 py-1 rounded hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 cursor-pointer">
          Retry
        </button>
      )}
      <button onClick={() => setGameError(null)}
        className="text-red-400 hover:text-red-200 focus:outline-none cursor-pointer"
        aria-label="Dismiss error">
        <X size={14} />
      </button>
    </div>
  </div>
)}
```

**Confidence:** HIGH

---

### PAT-006: callDM — Browser-Direct Anthropic API Call
**Context:** No backend proxy. API key entered by user in UI. Requires special CORS header.

```js
const API_CONSTANTS = {
  BASE_URL: 'https://api.anthropic.com/v1/messages',
  API_VERSION: '2023-06-01',
  MODEL: 'claude-sonnet-4-6',
  MAX_TOKENS: 1024
};

async function callDM(apiKey, messages, systemPrompt, onError) {
  const makeRequest = async () => {
    const response = await fetch(API_CONSTANTS.BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_CONSTANTS.API_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true'  // CRITICAL: enables browser CORS
      },
      body: JSON.stringify({
        model: API_CONSTANTS.MODEL,
        max_tokens: API_CONSTANTS.MAX_TOKENS,
        system: systemPrompt,
        messages
      })
    });

    if (!response.ok) {
      const code = { 401: 'HTTP_401', 429: 'HTTP_429', 500: 'HTTP_500' }[response.status] || `HTTP_${response.status}`;
      onError({ code, message: `API error ${response.status}: ${response.statusText}`,
        recoverable: response.status !== 401,
        retry_action: response.status !== 401 ? (() => callDM(apiKey, messages, systemPrompt, onError)) : null });
      return null;
    }

    const data = await response.json();
    const text = data.content?.[0]?.text;
    if (!text) {
      onError({ code: 'JSON_PARSE_ERROR', message: 'Empty response from API', recoverable: true,
        retry_action: () => callDM(apiKey, messages, systemPrompt, onError) });
      return null;
    }

    try { return JSON.parse(text); }
    catch (e) {
      onError({ code: 'JSON_PARSE_ERROR', message: 'Could not parse DM response as JSON', recoverable: true,
        retry_action: () => callDM(apiKey, messages, systemPrompt, onError) });
      return null;
    }
  };

  try { return await makeRequest(); }
  catch (networkErr) {
    try { return await makeRequest(); }  // silent retry once
    catch (retryErr) {
      onError({ code: 'NETWORK_ERROR', message: 'Network error: could not reach Anthropic API', recoverable: true,
        retry_action: () => callDM(apiKey, messages, systemPrompt, onError) });
      return null;
    }
  }
}
```

**Key:** `anthropic-dangerous-direct-browser-access: true` is mandatory. Without it, all CORS preflight requests fail.
**Error callback:** `onError` receives AppError shape (PAT-005). Caller sets state: `setGameError(err)`.
**JSON-in-prose:** Claude returns a JSON object as a plain text string inside `data.content[0].text`. Always `JSON.parse(text)`.
**Confidence:** HIGH

---

### PAT-007: Immutable State Reducer (applyStateUpdates)
**Context:** AI returns a `state_updates` delta object. Must apply it immutably (never mutate gameState).

```js
function applyStateUpdates(gameState, stateUpdates) {
  if (!stateUpdates || !gameState.character) return gameState;
  const su = stateUpdates;
  let char = { ...gameState.character };
  let campaign = { ...gameState.campaign };

  // Pattern: check, then spread-update
  if (su.stamina_delta) {
    char = { ...char, stamina: { ...char.stamina, current: clampStamina(char.stamina.current, su.stamina_delta, char.stamina.max) } };
  }
  if (Array.isArray(su.inventory_add)) {
    const newInv = [...char.inventory];
    su.inventory_add.forEach(item => { if (item?.trim()) newInv.push(item.trim()); });
    char = { ...char, inventory: newInv };
  }
  // ... repeat for each field in state_updates shape

  return { ...gameState, character: char, campaign };
}
```

**Rule:** Every field check guards against `undefined`/`null`/zero before applying. Clamp numeric fields (never go below 0 for credits, STA). Return `gameState` unchanged if nothing to apply.
**Test assertion:** `applyStateUpdates(s, {...}) !== s && result.character !== s.character` (reference inequality confirms immutability).
**Confidence:** HIGH

---

### PAT-008: Phase Discriminator (Screen Routing via State Flag)
**Context:** Single-page app with multiple "screens." No router library.

```jsx
function App() {
  const [gameState, setGameState] = useState(INITIAL_STATE);
  // ...

  if (!gameState.meta.initialized) {
    return <SetupScreen ... />;
  }
  return <GameScreen ... />;
}
```

**Extension:** For sub-screens within SetupScreen (e.g., Session Zero hook selection), use a separate local state:

```jsx
const [phase, setPhase] = useState('setup');  // 'setup' | 'session_zero' | 'hook_select'
```

**Rule:** `meta.initialized` is the top-level gate (false → setup, true → game). Never re-use `meta.initialized` for sub-screen logic.
**Confidence:** HIGH

---

### PAT-009: JSON Schema Embedded in System Prompt
**Context:** Claude must return structured JSON. The system prompt includes the exact JSON schema as a string literal.

```js
const systemPrompt = `You are the AI Game Master for a Astra Rising campaign...

CRITICAL: You must respond with ONLY valid JSON matching this exact schema:
${JSON.stringify(RESPONSE_SCHEMA_EXAMPLE, null, 2)}

Rules:
- narrative: 2-4 paragraphs of vivid prose
- choices: always provide 3-4 action choices
- state_updates: only include fields that actually change
- scene_change: true only when moving to a genuinely new location
`;
```

**Why:** Without the exact schema, Claude will invent field names or omit required fields. The JSON example acts as a one-shot template.
**Two schemas:** `DMResponse` for gameplay turns; `SessionZeroResponse` for the init call. Keep them separate.
**Confidence:** HIGH

---

### PAT-010: Response Validator Functions
**Context:** Claude responses may be malformed (empty field, wrong type, missing required key).

```js
function validateDMResponse(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object') { errors.push('Response is not an object'); return { valid: false, errors }; }
  if (typeof obj.narrative !== 'string' || obj.narrative.length === 0) errors.push('narrative missing or empty');
  if (!Array.isArray(obj.choices)) errors.push('choices is not an array');
  if (!obj.state_updates || typeof obj.state_updates !== 'object') errors.push('state_updates missing');
  return { valid: errors.length === 0, errors };
}
```

**Pattern:** One validator per response type. Check presence + type for every required field. Return `{ valid, errors[] }` (never throw). Caller decides whether to surface the error or silently ignore with defaults.
**Confidence:** HIGH

---

### PAT-011: History Compression Pattern (Token Budget Management)
**Context:** Conversation history grows unboundedly. At scene 15, summarize with a separate Claude call and replace raw history.

```js
// Trigger condition
if (gameState.session.scene_count >= 15 && !gameState.scene.history_compressed) {
  showCompressionPrompt(); // surface "Summarize Campaign" button to user
}

// Compression call (plain text, not DMResponse JSON)
async function compressHistory(apiKey, gameState, onError, onSuccess) {
  const response = await fetch(API_CONSTANTS.BASE_URL, {
    headers: { ..., 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({
      model: API_CONSTANTS.MODEL,
      max_tokens: 600,
      system: 'You are a campaign historian. Compress history to prose. Max 500 tokens.',
      messages: [{ role: 'user', content: compressionPrompt }]
    })
  });
  const compressedText = data.content[0].text;  // plain string, not JSON
  // Store: scene.compressed_summary = compressedText; scene.history_compressed = true
}
```

**Key difference from callDM:** Compression returns plain prose, not JSON. Do NOT `JSON.parse()` the response.
**State flag:** `scene.history_compressed` prevents re-triggering; `scene.compressed_summary` is included in subsequent system prompts instead of raw history.
**Confidence:** HIGH

---

### PAT-012: API Key in React State (Never Stored)
**Context:** API key entered by user in UI. Must not persist.

```jsx
const [apiKey, setApiKey] = useState('');

// In SetupScreen
<input
  type="password"
  value={apiKey}
  onChange={e => setApiKey(e.target.value)}
  placeholder="Enter your Anthropic API key"
  className="..."
/>
```

**Rules:** apiKey is NOT inside `gameState`. It is a separate top-level state variable in App. It is passed as a parameter to `callDM(apiKey, ...)`. It is never written to localStorage, sessionStorage, or any export. Page refresh clears it (intentional).
**Confidence:** HIGH

---

### PAT-013: Loading State with Inline Spinner
**Context:** API calls are async. UI must indicate loading and disable input during the call.

```jsx
// State
const [loading, setLoading] = useState(false);

// Send button
<button
  onClick={handleSubmit}
  disabled={loading || !inputVal.trim()}
  className="bg-yellow-400 text-gray-900 font-bold px-4 py-2 rounded hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 cursor-pointer flex items-center gap-1.5"
  aria-label={loading ? 'Loading...' : 'Send'}
>
  {loading && <Loader size={12} className="animate-spin flex-shrink-0" />}
  Send
</button>
```

**Pattern:** `disabled={loading}` prevents double-submit. Spinner replaces or precedes label text. `disabled:opacity-50 disabled:cursor-not-allowed` provides visual feedback without custom CSS.
**Confidence:** HIGH

---

### PAT-014: Empty State Placeholder in List Components
**Context:** Skills, inventory, journal etc. may be empty. Always render a placeholder rather than collapsing the section.

```jsx
// Skills section in CharacterSheet
<div>
  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Skills</div>
  {character.skills.length === 0
    ? <p className="text-xs text-gray-600 italic">No skills</p>
    : character.skills.map((skill, i) => (
        <div key={i} className="text-xs text-gray-300">{skill.name} {skill.level}</div>
      ))
  }
</div>
```

**Why:** Collapsing sections causes layout shift; empty states communicate clearly to the user that the section exists but is empty.
**Confidence:** MEDIUM (established in PACKET_8_1 polish pass)

---

## ANTI-PATTERNS AND FAILURE MODES (ANTI)

---

### ANTI-001: ES Import Syntax in Browser UMD Context
**What happens:** `import { useState } from 'react'` throws `SyntaxError: Cannot use import statement outside a module` in Babel standalone context.
**Root cause:** Babel standalone's default presets include JSX transform but not ES module resolution. The CDN scripts load as UMD globals.
**Fix:** Always use PAT-002 (UMD destructuring). Grep for `^import` before committing.
**Detection:** `grep -n "^import " index.html` → must return 0 matches.

---

### ANTI-002: Loading react.development.js in Production
**What happens:** Development build is ~3x larger, includes runtime warnings that pollute console, slower.
**Fix:** Always use `react.production.min.js` and `react-dom.production.min.js` in the CDN URLs.
**Note:** The PACKET_1_1 spec had `react.development.js` as documentation debt. The actual implementation correctly used production builds. Spec was wrong, implementation was right.

---

### ANTI-003: localStorage or sessionStorage in Constrained Environments
**What happens:** Some sandboxed environments (Claude.ai artifact renderer, certain iframe policies) block storage APIs with `SecurityError` at runtime. Breaks silently or crashes the app.
**Fix:** Keep all state in React memory (`useState`, `useReducer`). For this project, the PRD explicitly scoped out cross-session persistence in Phase 1.
**Detection:** `grep -i "localStorage\|sessionStorage" index.html` → must return 0 matches.

---

### ANTI-004: Parallel Packet Execution on Single-File Output
**What happens:** Two AI agents writing to the same file concurrently will produce merge conflicts or a corrupted file. One agent's changes are silently lost.
**Fix:** All packets sequential when they share an output file. When the PRD suggested parallel groups for [1_2/1_3], [3_2/3_3], [4_2/5_1], all three were converted to sequential after detecting the single-file constraint.
**Rule:** If packets A and B both write to the same file, they cannot be in the same parallel group regardless of their logical independence.

---

### ANTI-005: Hardcoded API Key in Source
**What happens:** Key committed to git is permanently exposed in history even after deletion.
**Fix:** PAT-012. API key lives only in React state. User enters it per session. Never in constants, never in BUILD_LOG.md, never in any comment.

---

### ANTI-006: Not Clamping Numeric State Fields
**What happens:** `stamina_delta: -100` on a character with 10 STA produces `current: -90`. Negative STA breaks combat logic and display.
**Fix:** Always clamp before applying:
```js
function clampStamina(current, delta, max) {
  return Math.max(0, Math.min(current + delta, max));
}
// Same pattern for credits, SEU, ammo
```

---

### ANTI-007: Trusting Claude's JSON Without Validation
**What happens:** Claude sometimes returns a response missing required fields, or with a field as `null` instead of `[]`. Downstream code crashes with `TypeError: Cannot read property of null`.
**Fix:** PAT-010. Always run `validateDMResponse(result)` before consuming. Surface as OOC error if invalid rather than crashing.

---

### ANTI-008: Attempting Arbitrary Tailwind Values With Base Stylesheet Only
**What happens:** `w-[123px]` silently does nothing. No error, no warning. The element renders with no width class applied.
**Context:** The base Tailwind stylesheet CDN (pre-built, no JIT) does not include arbitrary values. The full Tailwind CDN (`https://cdn.tailwindcss.com`) includes JIT and DOES support arbitrary values.
**Fix:** Use `https://cdn.tailwindcss.com` (not the versioned stylesheet URL) to get JIT/arbitrary value support.
**Lesson learned:** MEMORY.md initially had an incorrect note saying "no arbitrary values." The actual implementation uses the full CDN. Always verify which CDN URL you have before writing Tailwind classes.

---

### ANTI-009: Scope Creep Between Packets
**What happens:** Implementing features from later packets in earlier ones creates hidden dependencies. When the later packet runs, it re-implements the feature, creating duplicate code and potential conflicts.
**Rule:** If a feature is assigned to PACKET_X, do not implement it in PACKET_Y (Y < X). If an unspecified need is discovered mid-packet, document in BUILD_LOG.md as a deferred item and continue.
**Example:** Polish (animations, transitions, spacing) belonged exclusively to PACKET_8_1. Prior packets must not add polish.

---

### ANTI-010: JSON.parse on Compression Response
**What happens:** History compression returns plain prose (not JSON). Calling `JSON.parse(text)` on prose throws `SyntaxError` and breaks the compression flow.
**Fix:** PAT-011. Compression call is a separate code path from `callDM`. It reads `data.content[0].text` directly as a string and stores it as-is.

---

## STACK TRANSLATION RULES (TRANS)

---

### TRANS-001: React Hooks
| Modern module syntax | CDN UMD equivalent |
|---|---|
| `import { useState } from 'react'` | `const { useState } = React;` |
| `import { useEffect, useCallback, useRef, useMemo } from 'react'` | `const { useEffect, useCallback, useRef, useMemo } = React;` |
| `import React from 'react'` | (not needed — `React` is global) |

---

### TRANS-002: lucide-react Icons
| Modern module syntax | CDN UMD equivalent |
|---|---|
| `import { AlertCircle } from 'lucide-react'` | `const { AlertCircle } = LucideReact;` |
| `import { X, Loader, Check } from 'lucide-react'` | `const { X, Loader, Check } = LucideReact;` |

**Important:** Always use `lucide-react@0.383.0`. Other versions may have different icon names or UMD export shapes.

---

### TRANS-003: App Export and Mount
| Module convention | CDN UMD equivalent |
|---|---|
| `export default App` | (nothing — just define `function App()`) |
| `ReactDOM.render(<App />, ...)` (React 17) | `ReactDOM.createRoot(document.getElementById('root')).render(<App />)` |
| Mount call at bottom of `index.js` | Mount call at bottom of `<script type="text/babel">` block |

---

### TRANS-004: Environment Variables
| Module convention | CDN UMD equivalent |
|---|---|
| `process.env.REACT_APP_API_KEY` | `const [apiKey, setApiKey] = useState('')` (user enters it) |
| `.env` file | Not applicable. No environment. |
| `VITE_API_KEY` | Same — user-entered React state |

---

### TRANS-005: Routing
| React Router | CDN UMD equivalent |
|---|---|
| `<BrowserRouter>` / `<Routes>` | Phase state variable or `meta.initialized` flag |
| `useNavigate()` + `navigate('/game')` | `setGameState(s => ({...s, meta: {...s.meta, initialized: true}}))` |
| Route params | Props passed to screen component |
| Multiple top-level routes | `if (!initialized) return <SetupScreen />; return <GameScreen />;` |

---

### TRANS-006: Build and Dev Server
| Node/npm convention | CDN equivalent |
|---|---|
| `npm install` | No-op. All deps are CDN. |
| `npm run dev` / `vite dev` | `python3 -m http.server 8080` then open `localhost:8080`, OR open `index.html` directly |
| `npm run build` | No-op. `index.html` IS the build output. |
| `dist/` directory | Not applicable. |
| `package.json` | Not applicable. |

---

### TRANS-007: Separate Component Files
| Module convention | CDN UMD equivalent |
|---|---|
| `// CharacterCard.jsx` (separate file) | Inline function in `index.html` babel script |
| `import CharacterCard from './CharacterCard'` | Just reference `CharacterCard` (it's in the same scope) |
| Barrel exports (`index.js`) | Not applicable |

**Rule:** All components in one file. No barrel exports. No separate files. Order matters: define components before the component that uses them.

---

### TRANS-008: Debug Tooling
| Module convention | CDN UMD equivalent |
|---|---|
| `console.log(state)` for debugging | AssertionPanel (PAT-003) |
| Jest / Vitest unit tests | Assertion expressions inside `AssertionPanel` |
| E2E tests (Playwright, Cypress) | Human AC walkthrough in browser |
| Test runner output | AssertionPanel green/red dots |

---

### TRANS-009: State Management
| Module convention | CDN UMD equivalent |
|---|---|
| Redux store | `useState` + `useReducer` (in-memory only) |
| Zustand / Jotai | Same |
| localStorage persistence | Not used (Phase 1 scopes out) |
| Context API | Can be used — `React.createContext` is available via UMD global |

---

## ENVIRONMENT AND CONFIGURATION LIBRARY (ENV)

---

### ENV-001: Full CDN Stack (Exact Versions)

```html
<!-- Tailwind v3 full CDN (includes JIT + arbitrary values) -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- React 18 production UMD -->
<script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>

<!-- Babel standalone (JSX transform) -->
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

<!-- lucide-react UMD (pinned — icon availability varies by version) -->
<script src="https://unpkg.com/lucide-react@0.383.0/dist/umd/lucide-react.js"></script>
```

**Load order is critical.** React must load before ReactDOM. Both must load before Babel transforms the `<script type="text/babel">` block. lucide-react must load before the babel script references `LucideReact`.

---

### ENV-002: API_CONSTANTS Pattern

```js
const API_CONSTANTS = {
  BASE_URL: 'https://api.anthropic.com/v1/messages',
  API_VERSION: '2023-06-01',
  MODEL: 'claude-sonnet-4-6',
  MAX_TOKENS: 1024
};
```

**Rule:** Never hardcode these values inline in fetch calls. Centralizing them makes model upgrades a one-line change. `MAX_TOKENS` may need tuning per use case (1024 works for structured JSON responses; 600 for compression prose).

---

### ENV-003: Browser CORS Header for Anthropic

```js
headers: {
  'Content-Type': 'application/json',
  'x-api-key': apiKey,
  'anthropic-version': API_CONSTANTS.API_VERSION,
  'anthropic-dangerous-direct-browser-access': 'true'  // MANDATORY
}
```

**Without `anthropic-dangerous-direct-browser-access: true`:** Every fetch to api.anthropic.com fails with a CORS preflight error. This header opts into the "I understand the risks of browser-direct API calls" contract with Anthropic.

---

### ENV-004: Astra Rising Theme (COLORS + LAYOUT Constants)

```js
const COLORS = {
  bg_primary: 'bg-gray-900',
  bg_secondary: 'bg-gray-800',
  bg_card: 'bg-gray-800',
  accent_primary: 'text-yellow-400',
  accent_info: 'text-blue-400',
  accent_danger: 'text-red-400',
  text_primary: 'text-gray-100',
  text_secondary: 'text-gray-400',
  border: 'border-gray-700',
  cta_btn: 'bg-yellow-400 text-gray-900 hover:bg-yellow-300 font-bold',
  danger_btn: 'bg-red-600 text-white hover:bg-red-500 font-bold'
};

const LAYOUT = {
  sidebar: 'w-64 bg-gray-800 min-h-screen flex flex-col',
  main: 'flex-1 bg-gray-900 min-h-screen flex flex-col',
  full_screen: 'min-h-screen bg-gray-900 flex flex-col items-center justify-center'
};
```

**Reuse:** These constants provide a consistent dark space aesthetic. CTA buttons are yellow-on-dark. Danger actions are red. The sidebar + main split is the game layout.

---

## PARALLEL EXECUTION PATTERNS (PARA)

---

### PARA-001: Single-File Output Forces Sequential Execution
**Finding:** All 17 packets were designed to be executable, and the original PRD suggested 3 parallel groups. After file conflict analysis, all 3 groups were downgraded to sequential.
**Rule:** If N packets all write to the same output file, they MUST execute sequentially regardless of logical independence.
**Detection:** Before assigning parallel groups, perform file conflict analysis. List every file each packet modifies. Any two packets sharing a file cannot be parallel.
**Outcome:** Total project was 17 sequential steps, all on the critical path.

---

### PARA-002: Conflict Resolution Pattern (Parallel → Sequential Downgrade)
**Context:** PRD specifies parallel groups. File analysis reveals conflict.

| Original parallel pair | Conflict | Resolution |
|---|---|---|
| PACKET_1_2 / PACKET_1_3 | Both write App.jsx | 1_2 first (char select), 1_3 second (adventure select) |
| PACKET_3_2 / PACKET_3_3 | Both write App.jsx | 3_2 first (state mgr), 3_3 second (char sheet sidebar) |
| PACKET_4_2 / PACKET_5_1 | Both write App.jsx | 4_2 first (combat UI), 5_1 second (meta controls) |

**Sequential ordering criterion:** The packet whose output is a dependency of the other runs first. When neither depends on the other, pick the one with a cleaner interface boundary as the foundation.

---

### PARA-003: True Parallelism Scenarios (Future Projects)
**When parallelism IS possible:** Multiple output files, one per packet. Example: `api/routes/auth.js` (backend route) + `components/LoginForm.jsx` (frontend component) + `tests/auth.test.js` (test file). These can run in parallel because they write to separate files.
**Minimum for parallelism:** Each parallel packet must write to a unique file. Shared imports/exports must be frozen contracts (ASSUMES/PRODUCES verified).
**For this project:** Not applicable. Consider for multi-file projects.

---

## ESTIMATION CALIBRATION

**Project:** Astra Rising AI DM — 17 packets, single HTML file
**PRD estimate:** 226 hours total (sum of per-packet estimates)
**Actual execution:** Multiple AI Claude Code CLI sessions (exact wall-clock unknown, but substantially under 226h when AI-executed)

| Packet | PRD estimate | Relative complexity |
|---|---|---|
| PACKET_1_1 (Skeleton) | 10h | Low — boilerplate only |
| PACKET_1_2 (Char select) | 12h | Medium — 4 character data objects + UI |
| PACKET_1_3 (Adventure select) | 10h | Medium — 5 adventure objects + UI |
| PACKET_2_1 (API client) | 13h | High — core API plumbing, error handling |
| PACKET_2_2 (Session Zero) | 15h | High — multi-step async UI flow |
| PACKET_3_1 (Narrative engine) | 20h | Very high — main game loop |
| PACKET_3_2 (State manager) | 18h | High — 12-field immutable reducer |
| PACKET_3_3 (Char sheet) | 14h | Medium — read-only sidebar |
| PACKET_4_1 (Combat logic) | 18h | High — Astra Rising Core ruleset |
| PACKET_4_2 (Combat UI) | 16h | High — initiative tracker, combatant cards |
| PACKET_5_1 (Meta controls) | 14h | Medium — save/snapshot/export |
| PACKET_5_2 (Journal) | 12h | Medium — log display + filter |
| PACKET_6_1 (Compression) | 14h | Medium — second API call path |
| PACKET_6_2 (Continue) | 12h | Medium — JSON import/restore |
| PACKET_7_1 (Tooltips) | 13h | Medium — registry + hover overlay |
| PACKET_7_2 (Scene header) | 12h | Low-medium — display only |
| PACKET_8_1 (Polish) | 14h | Medium — 10 targeted polish areas |

**Key insight:** PRD human-hour estimates assume a human developer. When AI-executed via Claude Code CLI, the bottleneck shifts from implementation time to context management and verification. AI execution of each packet typically takes minutes, not hours. The 226h estimate is not meaningful for AI execution — it was useful for sequencing complexity (higher-estimate packets → more assertions, more edge cases to verify).

---

## DECISION OUTCOME LOG (DEC)

---

### DEC-001: Claude.ai Artifact → Self-Hosted index.html
**Decision:** Pivot from Claude.ai artifact renderer target to self-hosted `index.html` at `star.shawndata.com`.
**When:** Early in planning (before PACKET_1_1 execution).
**Why:** Claude.ai artifact renderer has sandboxing that blocks `fetch()` to external APIs, preventing direct Anthropic API calls. Self-hosted removes this restriction.
**Outcome:** POSITIVE. Browser-direct API calls work. Full Tailwind JIT available. No sandbox limitations.
**Side effects:** Testing workflow changed from "paste into artifact" to "open in browser / python3 -m http.server 8080". AssertionPanel became the primary QA mechanism since there's no artifact runner output.

---

### DEC-002: All 17 Packets Sequential (Critical Path)
**Decision:** Every packet is on the critical path; none can be parallelized.
**When:** File conflict analysis during packet planning.
**Why:** All packets write to `index.html`. Concurrent writes corrupt the file (see ANTI-004, PARA-001).
**Outcome:** POSITIVE. No merge conflicts. Clean sequential build. Each commit is an independently working state of the app.

---

### DEC-003: dev_mode Flag in INITIAL_STATE
**Decision:** Use `meta.dev_mode` boolean to gate the AssertionPanel, set true in PACKET_1_1 and false in PACKET_8_1.
**When:** PACKET_1_1 design.
**Why:** The AssertionPanel is a QA tool, not a feature. Users should never see it in production. A flag in INITIAL_STATE is the simplest gate — no build-time conditionals needed.
**Outcome:** POSITIVE. Clean production experience (no overlay). Dev sessions see all 56 assertions. PACKET_8_1 is the natural end of the QA lifecycle.
**Note:** PACKET_8_1 must set `dev_mode: false` as its FINAL act, after verifying all 56 assertions pass in browser.

---

### DEC-004: API Key in Separate React State (Not in GameState)
**Decision:** `apiKey` is `useState('')` in App, NOT a field inside `gameState`.
**When:** PACKET_1_2 / PACKET_2_1 design.
**Why:** GameState is exported/saved (JSON export feature). If apiKey were inside GameState, it would be included in saves, potentially exposing it. Also, apiKey is not game data.
**Outcome:** POSITIVE. Clean separation. JSON exports never contain the API key.

---

### DEC-005: Tailwind Full CDN (JIT + Arbitrary Values)
**Decision:** Use `https://cdn.tailwindcss.com` (full JIT) rather than a pre-built versioned stylesheet.
**When:** Corrected during PACKET_1_1 / discovered during audit.
**Why:** The pre-built stylesheet only includes classes that appear in Tailwind's bundled CSS. Dynamic JIT generation allows arbitrary values like `w-[123px]`, `pt-[3px]`, etc. The full CDN re-generates on load.
**Outcome:** POSITIVE. Full Tailwind utility range available. Arbitrary values work.
**Documented error:** MEMORY.md initially recorded "no arbitrary values." This was wrong — it reflected an earlier planning assumption, not the actual implementation. Corrected post-audit.

---

### DEC-006: Stateless API Strategy (Full State Every Call)
**Decision:** Send the full game state in every API call's system prompt. No server-side session.
**When:** PACKET_2_1 / PACKET_3_1 design.
**Why:** Claude is a stateless completion model. There is no persistent session. Sending full state every call is the only reliable way to ensure continuity.
**Outcome:** POSITIVE with caveat. Works well. Token usage grows with character progression. Mitigated by history compression at scene 15 (PAT-011).
**Token budget:** For DMResponse, a typical call with full state + 10 turns of history is ~3000-4000 tokens. Compression reduces this significantly after scene 15.

---

### DEC-007: AssertionPanel Accumulation Strategy
**Decision:** Each packet adds assertions to a growing pool; all assertions are rendered every render.
**When:** PACKET_1_1 design, confirmed through PACKET_8_1.
**Why:** Regression detection. If PACKET_3_1 breaks something from PACKET_1_2, the PACKET_1_2 assertions turn red immediately. No need to explicitly run a regression suite.
**Outcome:** POSITIVE. Caught 0 regressions (all 56 assertions stayed green throughout). The accumulation pattern is low-overhead and powerful.
**Total count:** 56 assertions across 17 packets (average ~3.3 per packet).

---

### DEC-008: Silent One-Retry on Network Error
**Decision:** On `catch(networkErr)` in `callDM`, silently retry once before surfacing the error to the user.
**When:** PACKET_2_1 design.
**Why:** Network glitches are common and transient. One silent retry eliminates ~80% of spurious error banners without meaningfully increasing latency.
**Outcome:** POSITIVE. Users rarely see NETWORK_ERROR in practice.
**Rule:** Only one silent retry. If the retry also fails, call `onError(...)` immediately. Do not loop.

---

## END OF CODEX.md
# Total entries: 14 PAT + 10 ANTI + 9 TRANS + 4 ENV + 3 PARA + 1 estimation block + 8 DEC
# Next step: /shawn-7-launch
