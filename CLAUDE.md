# astra-rising

Express REST API with SQLite database. AI-assisted tabletop RPG rules engine.

## Commands

```bash
npm start          # Start server (node server.js)
npm run build:css  # Regenerate public/app.css (run after adding new Tailwind classes)
npm test           # Jest tests (--runInBand --forceExit)
```

Frontend source is `public/app.js` directly (pre-compiled `React.createElement`
form — the JSX era ended when it was extracted from index.html; `npm run build`
is defunct and errors). CSS is precompiled: the Tailwind runtime is gone, so any
frontend edit that introduces a class name not already used somewhere in
`public/` needs `npm run build:css` or the new class silently has no styling.
Icons come from `public/vendor/lucide-react.slim.js` (only the 19 icons app.js
destructures); regenerate it before destructuring a new icon.

## Architecture

```
server.js           # Main Express entry point (port 3500)
db.js               # SQLite init, all query functions
server/
  ruleLoader.js     # Rule loading + caching logic
  services/         # Business logic services
    promptRulesInjector.js  # Builds rules context for AI prompts
tests/
  server.test.js    # API integration tests (supertest)
  frontend.test.js  # Frontend tests
public/             # Static frontend
astra_rising.db   # SQLite database (WAL mode - active)
planning/            # Non-runtime files (planning, docs)
```

## Key Files

- `db.js` - All database access (sessions, messages, game state, active modules, save codes, API usage)
- `server/services/aiProviders.js` - Provider registry, free-tier limits, quota-day math
- `server/ruleLoader.js` - Rule caching with `BLOCKED_IDS` enforcement
- `server.js` - Routes, rate limiting, session management

## Environment

Required in `.env` (at least one provider key):
```
PORT=3500              # Optional, defaults to 3500
GEMINI_API_KEY=        # Preferred provider (free tier: 250 req/day)
GROQ_API_KEY=          # Fallback provider (free tier: 100k tokens/day)
AI_PROVIDER_ORDER=gemini,groq   # Optional, sets preference + fallback chain
GEMINI_MODEL= / GROQ_MODEL=     # Optional model overrides
GEMINI_REQUESTS_PER_DAY= / GROQ_TOKENS_PER_DAY=  # Optional quota overrides
TRUST_PROXY=1          # Set when behind nginx, so rate limits see the real client IP
```

Providers speak the OpenAI chat-completions format; `server/services/aiProviders.js`
holds the registry, the free-tier ceilings and the US/Pacific quota-day math.
`/api/quota` reports remaining budget; `/api/chat` falls back down the chain on
429/5xx and returns `429 QUOTA_EXHAUSTED` with a `resetAt` when everything is spent.

## Stack Notes

- SQLite via `better-sqlite3` (synchronous API - no async/await on DB calls)
- Tests use `--runInBand` (sequential) - the DB is shared state, parallelism breaks tests
- `express-rate-limit` on AI endpoints - check limits before load testing
- WAL files (`astra_rising.db-shm`, `astra_rising.db-wal`) are normal - do not delete

## Gotchas

- `better-sqlite3` is synchronous - never wrap in Promise or use with async patterns
- SQLite has no `ALTER COLUMN` - schema changes require recreate-and-copy migrations
- `BLOCKED_IDS` in ruleLoader are hardcoded exclusions - check before adding new rules
- Jest `--forceExit` is set because the SQLite connection does not close cleanly in tests
