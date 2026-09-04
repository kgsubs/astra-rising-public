# Astra Rising

Astra Rising is a browser-based science-fiction tabletop RPG run by an AI game master. It narrates a live session with a language model, computes every rule, dice roll and character state on the server rather than in the prompt, and persists progress to SQLite so a player can resume with a save code and no account.

This repository is a hands-on case study in dividing a problem between what a language model does well and what it must never be trusted with, choosing a model by measurement rather than reputation, and running a production AI feature inside free-tier quotas.

**Live: [astrarising.com](https://astrarising.com)**

| | |
|---|---|
| ![Landing](planning/screenshots/landing.png) | ![Campaign select](planning/screenshots/campaigns.png) |
| Session entry, with save-code resume | Campaign selection |

---

## Problem Framing

Tabletop role-playing needs a game master: one person to prepare the scenario, arbitrate the rules and improvise the world. That person is the scarcest resource at any table, hard to find and harder to schedule, so games stall between sessions or never start at all.

A language model is well suited to half of that job and badly suited to the other half. Improvised narration is what these models do best. Arithmetic under a rulebook is what they do worst, and percentile checks, initiative order, stamina thresholds and weapon damage are deterministic and unforgiving. A model that gets them subtly wrong produces a game that feels arbitrary, which is worse than no game.

Astra Rising splits on exactly that line. The model narrates and offers choices. A server-side rules engine computes every number, and the results enter the prompt as settled facts rather than as something for the model to work out.

---

## System Architecture

Two paths through every turn, split by whether the answer must be exact.

```
                     [ Player action ]
                             |
              +--------------+--------------+
              |                             |
              v                             v
   [ Rules engine, deterministic ]   [ Session state, SQLite ]
   initiative modifier                character, inventory
   skill target numbers               message history
   stamina thresholds                 active rule modules
   weapon damage parsing
              |                             |
              +--------------+--------------+
                             |
                             v
              [ Prompt rules injector ]
              computed facts first, ~800 token budget
                             |
                             v
              [ Provider chain: gemini -> groq ]
              quota checked before the call
              429 / 5xx falls through to the next
                             |
                             v
              [ Narration + choices returned to the player ]
```

**Design decisions.**

- **The model never computes a number that matters.** Initiative, skill targets, stamina thresholds and damage are calculated in `server/services/ruleEngine.js` and handed to the model as settled facts. Narration is the model's only job.
- **Rules are injected by relevance, not in bulk.** `promptRulesInjector.js` assembles a context under roughly an 800-token budget, in priority order: computed state first and never truncated, then dice basics, stamina, racial abilities, skill definitions, weapon formulas, and the combat table only when combat is active.
- **Rulesets are loaded once and gated.** `ruleLoader.js` caches five rulesets at startup and enforces a blocklist by ruleset id, so out-of-scope content cannot enter a prompt even if the file is present.
- **Content is sanitised on ingest.** A substitution registry of 78 mappings rewrites proper nouns from third-party source material into this project's own setting before anything is stored or shown, so no external property reaches a player verbatim.
- **No accounts.** A session is a token plus a ten-character save code. Players resume by typing the code, which removes the entire authentication surface from a game nobody wants to sign up for.

---

### Project structure

```
.
|-- server.js                          Express entry, routing, rate limiting, sessions
|-- db.js                              SQLite schema, migrations, every query
|-- build.js                           Legacy JSX compiler, superseded (see Trade-offs)
|-- server/
|   |-- ruleLoader.js                  Ruleset loading, in-memory cache, id blocklist
|   `-- services/
|       |-- ruleEngine.js              Deterministic game mechanics
|       |-- promptRulesInjector.js     Assembles the rules context for each prompt
|       |-- aiProviders.js             Provider registry, free-tier ceilings, quota math
|       `-- ipSanitizer.js             Applies the substitution registry on ingest
|-- public/
|   |-- index.html                     Loads React and the precompiled bundle
|   |-- app.js                         Frontend, pre-compiled React.createElement calls
|   |-- app.css                        Precompiled Tailwind output, no runtime
|   |-- data/rules/                    Five rulesets loaded at startup
|   |-- data/ip-registry.json          78 proper-noun substitutions
|   `-- vendor/                        React, ReactDOM, slimmed icon bundle
|-- tests/                             Jest: API integration and frontend
|-- server/tests/                      Rules engine, prompt injection, smoke and regression
`-- planning/                          Specification, build packets, experiments, deploy
```

---

## Safety, Cost and Reliability

**Model behaviour**

| Risk | Control |
|---|---|
| Model inventing or miscalculating game mechanics | Every number is computed server-side and injected as fact; the model is asked to narrate, not to adjudicate |
| Out-of-scope rules leaking into prompts | Ruleset blocklist enforced by id inside the loader, independent of which files exist on disk |
| Third-party source material reaching players | 78-mapping substitution registry applied on ingest |
| Unbounded prompt growth | Rules context held to roughly 800 tokens, with priority tiers deciding what survives truncation |

**Cost**

| Control | Detail |
|---|---|
| Quota accounting | Requests and tokens recorded per provider per day, on a US/Pacific quota day |
| Pre-flight check | Remaining budget is checked before a call, not discovered by a rejection |
| Failover | 429 or 5xx falls through the chain; when all providers are spent the API returns `429 QUOTA_EXHAUSTED` with a `resetAt` timestamp |
| Abuse limits | 100 requests per session per hour, and 20 new sessions per IP address per hour |
| Free-tier fit | Gemini at 250 requests a day, Groq at 100,000 tokens a day, both selected to keep running cost at zero |

**Reliability**

Rule files that fail to load produce a `503` on the affected endpoints rather than a degraded game. The server refuses to answer with partial rules. Session state lives in SQLite in WAL mode, and the server is the source of truth for resuming a game, so a stale browser cannot revive a session the server has moved past.

---

## Model Selection

Provider choice was decided by measurement. `planning/experiments/model-bakeoff/` holds the harness, the prompt and the raw results: **46 models across OpenAI, Google and Groq**, each given the same in-game turn and scored on whether it returned valid structured output and how long it took.

The result overturned the obvious choice. Frontier models were unusable for this product:

| Model class | Latency | Verdict |
|---|---|---|
| GPT-5, GPT-5-mini, GPT-5-nano | 23s to 27s | Unusable for turn-based play |
| GPT-5.1 to GPT-5.6 | 7s to 17s | Still too slow for a game turn |
| gemini-2.5-flash | 3.7s | Selected as primary |
| llama-3.3-70b-versatile | 1.0s | Selected as fallback |
| gemini-2.5-flash-lite | 1.1s | Fast, weaker narration |

The Groq fallback did not survive the provider. `llama-3.3-70b-versatile` was decommissioned in September 2026 and began answering every call with `404 model_not_found`, which silently emptied the fallback chain whenever the primary was busy. The measurement above stands as it was taken; the running fallback is now `openai/gpt-oss-120b`.

Four models failed outright, returning nothing usable. A player waiting on a dice roll will tolerate a few seconds and abandon at twenty, so latency and free-tier economics decided this, not benchmark scores.

---

## Execution and Iteration

**Framing first.** The specification, its revision, and its decomposition into build packets are in `planning/`, unedited.

**Build pace.** 101 commits, 89 of them in March 2026, with the remainder covering a performance pass and the campaign work through August.

**Iteration against real failure modes.**

1. **The frontend build was removed rather than fixed.** JSX compilation was dropped in favour of pre-compiled `React.createElement` calls, and Tailwind's runtime was replaced by a precompiled stylesheet. The icon bundle was cut to the 19 icons actually used, taking it to 8 KB. The trade-off is documented in `CLAUDE.md` so the constraint is not rediscovered later.
2. **Session resumption was wrong in a way only real use exposed.** The client was treated as authoritative when resuming, which let a stale tab resurrect a finished game. The server became the source of truth, and a fresh save code is now minted on every new game.
3. **Rules loading fails loudly.** An earlier version served whatever rules had loaded successfully. It now returns `503` rather than run a game on partial rules.

---

## Delivery and Performance

- **Build velocity:** 101 commits, 89 in a single month, one person
- **Codebase:** ~6,900 lines of JavaScript across server, rules engine and frontend
- **Test suite:** 67 tests in 1.4s, covering the rules engine, prompt injection, API and frontend
- **Model evaluation:** 46 models, 3 providers, one harness
- **Client payload:** 204 KB application, 28 KB precompiled CSS, 8 KB icon bundle
- **Landing response:** 21 ms, 6.2 KB of HTML
- **Rules startup:** 5 rulesets cached, each loading in under 1 ms
- **Running cost:** zero, by construction, inside two free tiers

---

## Stack

| Layer | Choice | Notes |
|---|---|---|
| **Runtime** | Node, Express 5 | Single process, no worker tier |
| **Database** | SQLite via better-sqlite3, WAL mode | Synchronous API, so the data layer carries no async plumbing |
| **Frontend** | React, pre-compiled | `React.createElement` calls committed directly; no JSX step at build or runtime |
| **Styling** | Tailwind, precompiled output | The runtime was removed; a new class needs `npm run build:css` or it does nothing |
| **Icons** | lucide-react, slimmed | Cut to the 19 icons actually used, taking the bundle to 8 KB |
| **Primary model** | Google Gemini 2.5 Flash | 250 requests a day on the free tier |
| **Fallback model** | Groq, gpt-oss-120b | 100,000 tokens a day; the chain falls through on 429 or 5xx |
| **Provider interface** | OpenAI chat-completions format | Both providers speak it, so adding a third is a registry entry |
| **Rules** | Five JSON rulesets | Loaded and cached at startup, gated by an id blocklist |
| **Sessions** | Token plus a 10-character save code | No accounts, no passwords, no authentication surface |
| **Testing** | Jest, plus standalone smoke and regression scripts | Sequential, since the database is shared state |
| **Web server** | nginx reverse proxy | Terminates TLS, forwards to the app on 3500 |
| **Process supervision** | systemd unit | Restarts on failure |
| **TLS** | Let's Encrypt | Issued and renewed by certbot |

### Deliberate omissions

- **No SPA build step.** JSX compilation was removed rather than maintained; the frontend ships as pre-compiled calls.
- **No bundler.** No Webpack, no Vite. The only build command left compiles the stylesheet.
- **No ORM.** Every query is written out in `db.js`, which keeps the SQL visible and the test mocks trivial.
- **No cache server.** Rules live in process memory from startup; nothing waits on disk or on Redis.
- **No paid tier.** Model choice, the roughly 800-token rules budget and the request limits all exist to keep running cost at zero.

---

## Planning Docs

Everything written before and around the code. Kept unedited.

| Path | Contents |
|---|---|
| `planning/prd/` | Product specification, versions 2 and 3 |
| `planning/packets/` | The build packets the specification was decomposed into |
| `planning/experiments/model-bakeoff/` | The 46-model evaluation: harness, prompt, raw results |
| `planning/deploy/` | nginx vhost, systemd unit, setup script |
| `CLAUDE.md` | Working notes on the project's constraints |
| `public/data/ip-registry.json` | The 78-mapping substitution registry |

---

## Trade-offs

- **The JSX build step was removed, not fixed.** `build.js` still exists but errors: the frontend was extracted from an inline Babel block into `public/app.js` as pre-compiled `React.createElement` calls, which removed a build stage from every change at the cost of readability in the frontend source. `npm run build:css` remains, and any new Tailwind class needs it or the class silently does nothing.
- **SQLite rather than a client-server database.** `better-sqlite3` is synchronous, which keeps the data layer free of async plumbing and makes the tests fast, but it ties the application to one machine. A second instance would need the database moved before anything else.
- **Free-tier ceilings as a design constraint, not an afterthought.** Provider selection, the roughly 800-token rules budget and the request limits all exist to keep this running at zero cost. A paid tier would justify a slower, stronger model and a larger rules context, and the provider layer is structured so that swap is a configuration change.
- **Rules cached at startup, not hot-reloaded.** All five rulesets load into memory once and stay there, so a rules edit needs a restart. For a rule set that changes rarely this trades operational flexibility for a guarantee that no request ever waits on disk.
- **Tests run sequentially.** The suite shares one database, so `--runInBand` is required. That caps the suite at 1.4 seconds today and would need per-test isolation before it could grow much further.
