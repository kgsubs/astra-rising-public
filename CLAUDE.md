# astra-rising

Express REST API with a SQLite database. An AI dungeon-master service for a
tabletop-style RPG: the server resolves dice and rules locally and only asks
the AI provider to narrate, never to adjudicate.

## Commands

```bash
npm start          # Start server (node server.js)
npm run build:css  # Regenerate public/app.css (run after adding new Tailwind classes)
npm test           # Jest suites + the standalone verification suites (--runInBand --forceExit)
npm run qa         # Play the whole game in a browser against a fake provider
```

## Testing

Two tiers, and both must be green before anything ships.

`npm test` is the fast one, a few seconds, no network. It runs the Jest suites
in `tests/` (16 suites) plus every standalone verification suite in
`server/tests/`, which `tests/verification-suites.test.js` shells out to so
nothing that looks like a test sits outside the runner. Every suite starts
its own server on an ephemeral port and blanks the real provider keys before
`server.js` (and its `dotenv.config()`) loads, so a real key in a local
`.env` can never be reached; none of them may target port 3500, which may be
a real deployment.

`npm run qa` is the slow one (roughly two minutes). It boots the app on a
scratch port against a scratch database and a scripted stand-in for the AI
provider (`qa/fake-provider.js`), then drives a real browser through
the whole product at phone and desktop size, checks the state the turns
produced survives a reload, and induces every provider failure to confirm
the player gets a message and a retry rather than a spinner. It makes no
calls to a real provider, so it costs nothing and never varies.
`qa/README.md` covers how to add a check.

Frontend source is `public/app.js` directly (pre-compiled `React.createElement`
form, from when it was extracted from index.html; `build.js`
remains as the record of that stage but no longer has an npm script, because
running it errors). CSS is precompiled: the Tailwind runtime is gone, so any
frontend edit that introduces a class name not already used somewhere in
`public/` needs `npm run build:css` or the new class silently has no styling.
Icons come from `public/vendor/lucide-react.slim.js` (only the icons app.js
destructures); regenerate it before destructuring a new icon.

## Architecture

```
server.js           # Express entry point (port 3500), routes, rate limiting, session management
db.js               # SQLite init, all query functions
server/
  ruleLoader.js     # Rule loading + caching
  services/
    aiProviders.js       # Provider registry, free-tier limits, quota-day math
    providerChain.js     # Fallback across the configured provider order, streaming
    dice.js               # Server-rolled dice (protocol v2: the client never rolls)
    ruleEngine.js         # Pure rules math (to-hit, damage, ability modifiers)
    resolveTurn.js        # Applies a resolved turn's mechanical effects to state
    outcomeSheet.js        # Builds the per-turn outcome sheet the prompt is built around
    promptBuilder.js       # Assembles the system/turn prompts sent to the provider
    promptRulesInjector.js # Selects and formats rules context for a prompt
    modelSchema.js          # Validates/repairs the JSON shape the model must return
    gameData.js              # Character roster, adventure modules, scenes
    stateStore.js             # Saved-state load/commit, legacy-save migration, id aliasing
server/tests/        # Standalone verification suites, run through tests/verification-suites.test.js
tests/                # Jest suites (API integration, unit, migration, QA-adjacent)
public/               # Static frontend (app.js, app.css, vendor assets, game data)
data/rules/            # The 5 rules JSON files ruleLoader.js loads at startup
qa/                     # Browser QA harness and its fake AI provider
planning/                # Non-runtime: planning docs, deploy reference, screenshots
astra_rising.db          # SQLite database (WAL mode - active), path set by DB_PATH
```

## Protocol v2 (`/api/turn`)

The server is the sole authority over game state: `POST /api/turn` reads the
player's saved state, rolls its own dice (`server/services/dice.js`), asks
the provider only to narrate a turn against the outcome sheet it was given,
then applies the mechanical result itself (`resolveTurn.js`). The client
never sends `game_state` and never rolls. `PUT /api/session/:token/state`
and `POST /api/chat` are retired (410); routing and rate-limiter code for
them is gone, only the 410 responses remain, for any client still pointed at
the old paths.

A saved game is versioned (`schema_version`); `stateStore.js` migrates an
older save lazily on read and applies an id-alias map so a save made before
an adventure or rules id was renamed still resolves to the current id.
`/api/turn` and `/api/game/new` return 503 if the rules the outcome sheet
depends on failed to load at startup, rather than silently falling back to
an empty ruleset.

## AI providers

Groq is primary (faster, and the larger free daily allowance: 1000
requests/day, 200k tokens/day on `openai/gpt-oss-120b`, from
console.groq.com/docs/rate-limits). Gemini (`gemini-2.5-flash`, 20
requests/day free, measured) is the backup, for per-minute bursts and
provider outages. `AI_PROVIDER_ORDER` (default `groq,gemini`) sets the
fallback chain; `server/services/providerChain.js` walks it on a 429/5xx/
timeout. `/api/quota` reports remaining budget for whichever provider is
active.

## Environment

See `.env.example` for the full list, every optional line commented out so
copying it never sets an accidental empty string. At least one provider key
is required.

## Stack notes

- SQLite via `better-sqlite3`: synchronous API, no async/await on DB calls.
- Tests run `--runInBand` (sequential): the DB is shared state, parallel test files collide.
- `express-rate-limit` on AI endpoints: check limits before load testing.
- WAL files (`astra_rising.db-shm`, `astra_rising.db-wal`) are normal: do not delete.
- Jest `--forceExit` is set because the SQLite connection does not close cleanly in tests.
