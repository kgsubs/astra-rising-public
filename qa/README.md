# Astra QA harness

One command plays the whole product and reports what worked.

```bash
npm run qa              # local app, fake AI, scratch database  (free, repeatable)
npm run qa -- --real    # the live site and the real providers   (spends quota)
npm run qa -- --keep    # keep the scratch database for poking at afterwards
```

Exit code is 0 only when every check passed. Each run writes
`qa/runs/<timestamp>/` containing `report.json`, the app's `server.log`,
and a screenshot of every screen at both viewports. That folder is gitignored.

Requires the `agent-browser` CLI (a headless-browser automation tool)
installed separately on the machine running this suite; it is not an npm
dependency, so `npm install` does not provide it. Defaults to
`~/.local/bin/agent-browser`; set `AGENT_BROWSER_BIN` to point at a
different install location.

## Why there is a fake AI

Real turns cost money, vary every time, and burn a metered free tier that the
live game needs. `fake-provider.js` speaks the same OpenAI chat-completions wire
format the real providers do, so `server.js` cannot tell the difference: the
runner just points `GEMINI_URL` and `GROQ_URL` at it. Answers come from
`fixtures/turns.json`, so a run is instant and identical every time.

It also fakes the ways a real provider misbehaves. `POST /__mode {"mode":"..."}`
switches behavior; `POST /__reset` rewinds to the first canned turn.

| mode | what it does |
|---|---|
| `ok` | canned, valid answers |
| `stall` | accepts the connection and never speaks |
| `stall_mid` | starts streaming, then goes quiet |
| `bad_request` | 400, the shape Gemini returns for an empty conversation |
| `busy` | 429 with a short retry window |
| `daily_limit` | 429 that reads as the day's quota being gone |
| `server_error` | 500 |
| `malformed` | 200 whose content is not the JSON the client expects |
| `truncated` | 200 whose JSON is cut off mid-object |
| `malformed_once` | like `malformed` for one call, then back to `ok` (drives the retry on the other provider) |

## The layers

| file | what it proves |
|---|---|
| `checks/api.js` | every route's success shape and every refusal: bad tokens, unknown ids, oversized bodies, empty conversations |
| `checks/journey.js` | the path a player walks, in a real browser, at phone and desktop size; each screen arrives, opens at the top, and does not scroll sideways |
| `checks/state.js` | what the DM said landed in the sheet, reached the server, and survived a reload |
| `checks/resilience.js` | each provider failure produces a specific message and a usable game, never an endless spinner; one unreadable reply is retried on the other provider |
| `checks/render.js` | the title really draws in Audiowide (measured, not trusted from `document.fonts`), the starfield covers the window at 390, 1280, 2560 and 3440 wide and after a resize, and a player refused a new game is told why and for how long |

## The four tiers

| command | what it runs | when |
|---|---|---|
| `npm run check` | Jest, then this QA harness against the fake AI | before every release; the live build's deploy script runs it first and stops on any failure |
| (inside `npm run qa`) | `checks/render.js` | every QA run |
| `npm run eval` | `evals/run.js`: real-AI scenarios through this checkout's own server (session zero parses, an attacking hostile starts combat, a fight the AI narrates starts combat and never hurts through hazard, stories carry no raw numbers, Ask GM changes nothing, replies parse); about 5 AI calls per repeat | before a release and weekly, at a quiet hour; needs `EVAL_ENV_FILE` pointing at an `.env` with the keys |
| `npm run smoke` | `smoke-live.js`: the live site's routes, one real new game and one real turn, and the render checks on the live page | after every deploy and daily; the live build reports both schedules to an uptime monitor that emails on a failure or a missed run |

Every run writes a dated folder under `runs/` with `report.json`. Exit codes:
0 all passed; 1 something is broken; 3 everything that ran passed, but the AI
allowance stopped the real-AI part (`lib/allowance.js`).

`npm run check` never touches a real AI: both providers point at the fake.
`npm run eval` and `npm run smoke` share the live site's Groq and Gemini keys
(Groq free tier: 1,000 requests and 200,000 tokens a day, 8,000 tokens a
minute; Gemini: 20 requests a day), and the live site's meter cannot see their
calls. So the evals refuse to start unless the live site reports at least
`EVAL_MIN_GROQ_TOKENS` (default 100,000) Groq tokens and, when Gemini is in
use, `EVAL_MIN_GEMINI_REQUESTS` (default 10) Gemini requests left; a spent
allowance mid-run stops the run with exit 3; and each run prints what it used.
The live build's deploy script treats a smoke exit 3 as passed, with the skip shown.

Standing rule: every bug found by hand gets a check in the right tier before
its fix ships.

## Adding a check

Inside any layer, call `r.check(name, condition, detail)`. The name is what
appears in the output and the report, so write it as the thing being claimed
("a typed turn is answered"), not as the mechanism. `detail` shows only on the
line and is where to put the observed value, which is what you will want when it
fails at three in the morning.

For anything that waits, use `b.waitForText(...)` or `b.waitFor(...)` rather
than a sleep: a fixed sleep is either slower than it needs to be or too short on
a loaded machine.

## Notes on driving this frontend

Three things bite anyone extending the browser layer, all handled in `lib/browser.js`:

- Every `eval` shares one scope, so a bare `const` collides across calls. All
  snippets are wrapped in an IIFE.
- The setup screens sit in a `zoom: 0.75` container, so coordinate clicks land
  in the wrong place. Clicks go through the DOM instead.
- `<html>` is `overflow: hidden` and `<body>` scrolls, so `window.scrollY` is
  always zero and tells you nothing. Scroll position comes from `body.scrollTop`.

The send control has no text label while a turn is in flight, so `clickSend()`
waits for it to become live rather than matching on its text.
