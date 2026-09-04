# Tool requirements report: an AI-refereed tabletop role-playing game engine

**Measurement basis:** the author had full shell and file access to the project, its version history, its live database and the build tool's own configuration and session transcripts, and measured every figure below directly unless the row says otherwise.

**Summary.** This is a web application that runs a science-fiction tabletop role-playing campaign, with a language model acting as the game master and a deterministic rules layer supplying the numbers. It is 8,520 lines of production code and 138,152 words of planning and process documentation, built across 100 commits between 2026-03-09 and 2026-07-31. It exists because a solo operator wanted a playable game without a human referee, and because the build method under test needed a real project to prove itself on. Its heaviest dependencies on the build tool are unattended shell execution, an auto-loaded project instruction file, and single sessions long enough to hold 295,759 tokens of context without being compressed.

---

## 1. What the thing is

The application is a browser-based single-player role-playing game. A player picks a pre-generated character and a published adventure module, then plays by typing or by choosing from options the game master offers. A language model writes the narration and offers the choices; a separate rules layer computes the numbers that the fiction has to respect. State persists, so a player can leave and resume a campaign days later using a short save code.

Physically it is a Node.js web server, a single-page browser front end with no build step, and one embedded SQLite database file. It is served directly from the working copy on a single Linux host that is simultaneously the development machine and the production server, behind a reverse proxy on a public domain. There is no staging environment and no deploy artefact. Editing a front-end or data file changes production on the next request; editing a server file changes production only after the service is restarted.

The repository is 106 MB, of which 72 MB is installed third-party packages and 6.5 MB is the public web directory (mostly bundled front-end libraries, fonts and character portraits). Excluding installed packages, and excluding this report, there are 178 files: 46 documents, 30 configuration and data files, 30 JavaScript files, 41 image and font assets, and 10 pre-sanitisation backup copies. The code is 11,107 lines of JavaScript, split 8,520 production, 2,019 test, 568 tooling and experiments. The single largest source file is the front end at 5,005 lines. The written record around the code is larger than the code: 21,267 lines and 138,152 words of Markdown across 46 files, most of it the build process rather than user documentation.

The live database holds 122 game sessions, 20 stored messages, 4 saved game states and 2 rows of daily provider-usage accounting.

## 2. How it was built

**The construction.** Five parts, each measured:

| Part | What it does | Size |
|---|---|---|
| Web server | HTTP (Hypertext Transfer Protocol) routes, session lifecycle, rate limiting, model-provider fallback, quota accounting | 727 lines |
| Database layer | Every SQL (Structured Query Language) statement in the system: sessions, messages, game state, active rule modules, save codes, usage counters | 261 lines |
| Front end | Whole user interface, written directly in pre-compiled element-creation calls with no build step | 5,005 lines |
| Game data | Characters, adventures, races, skills, images manifest | 1,613 lines |
| Rules services | Rule loading and caching (109 lines), prompt-context assembly (314 lines), deterministic dice and skill maths (195 lines), provider registry and free-tier quota maths (182 lines), third-party-name sanitisation (70 lines) | 870 lines |

Correctness is enforced in three places, in descending strength. First, an automated test suite: 67 tests across 2 files, all passing as of 2026-08-22, running in 2.9 seconds against an in-memory database so it never touches production data. Second, 5 standalone verification scripts (regression, rule-engine, rule-injection, and two smoke scripts) totalling 758 lines, which are run by hand and are not wired into the automated suite. Third, a hard-coded allowlist in the rule loader: only 5 of the 7 rule files on disk are ever named for loading. A second, identifier-based exclusion set exists but is unreachable in the current configuration, because no file the loader reads carries a blocked identifier.

State persists in one SQLite file in write-ahead-logging mode. The write-ahead log is currently 2.9 MB against a 4 KB main file, meaning the working state lives almost entirely in the log; the project instruction file explicitly warns against deleting those side files.

**The build sequence.** Phase one, on 2026-03-09, produced no code at all. It produced a specification: a locked 136 KB packet document defining 17 work packets with a dependency graph, contract-verification log, acceptance criteria and per-packet test procedures; a 17-step execution plan; a session-startup guide; and a running build log. The 17 packets were deliberately made fully sequential because at that point the entire application was a single file and concurrent writes would have corrupted it.

Phase two executed those 17 packets over four days, 2026-03-09 to 2026-03-12, producing 82 of the project's 100 commits. Each packet appended a build-log entry recording what was built, a cumulative assertion count (the last packet reports 41 assertions passing), shell verification output, and hand-off notes for the next session.

Phase three abandoned the packet structure for a lighter numbered work-unit log: 15 entries in two separate series, each carrying a per-entry test count. Seven front-end entries dated 2026-03-11 overlap the tail of the packet phase; the remaining eight cover the later client-server rebuild.

Phase four, in late July 2026, was the rebuild. Three things were replaced:

- **The single-file architecture.** The original front end was one file combining markup, styling and logic, compiled in the browser at page load. It was split into a static page, a 5,005-line application file and a data file. The in-browser compiler and the styling runtime were removed and replaced with a pre-generated stylesheet and a trimmed icon bundle containing only the 19 icons actually used, cutting the icon payload from 738 KB to 7.5 KB. The cost of this is a standing trap, documented in the project instruction file: a new style name that is not already used somewhere in the public directory silently has no styling until a regeneration command is run.
- **The model provider.** The runtime model vendor was changed twice in March 2026, both times for cost, and then replaced entirely in July with a registry supporting an ordered preference chain, per-provider free-tier ceilings, timezone-correct quota-day arithmetic, and automatic fallback down the chain on rate-limit or server errors.
- **The intellectual-property surface.** A sanitisation service was added that rewrites third-party proprietary names in campaign and rules data on ingest, driven by a name registry. Ten pre-sanitisation backup files remain in the tree as evidence of the pass.

What the first version got wrong, stated plainly: it optimised for being demonstrable in a chat window (one file, compile-in-browser, no server) and that choice had to be undone entirely once the thing needed to persist state, protect API keys and load fast.

## 3. Why it was built

The stated problem is that playing this kind of game requires a human referee who knows several hundred pages of rules, and one is not always available. The application replaces that person.

The second reason is visible in the repository and is arguably the larger one. The project directory contains a complete, versioned, general-purpose build methodology: 15 process documents totalling 368 KB, defining a numbered pipeline from idea generation through requirements drafting, requirements review, packet decomposition, packet execution, quality-assurance audit, accessibility audit, knowledge harvest and launch planning, each phase with a named trigger, defined inputs and defined outputs. That methodology is not specific to this game. This project was the vehicle for proving it.

The measured split supports this, though the inference is the author's and not the record's. Of the 138,152 words of Markdown, 48,537 (35%) are the general-purpose methodology rather than anything about this game; the remaining 89,615 words are packet specifications, build logs and product documents. A project carrying a third of its written output as reusable process material is at minimum doubling as a vehicle for that process. No baseline for a comparable solo project was measured.

Three design changes have identifiable triggers rather than intentions:

- **Single file to client-server** was triggered by needing to keep API (application programming interface) credentials off the client and by needing state to survive a page reload.
- **Compile-in-browser to pre-compiled** was triggered by page-load latency; the commit message for the change says so directly, and the removed payload was 3.1 MB of in-browser compiler plus 407 KB of styling runtime.
- **One provider to a fallback chain** was triggered by cost and by daily free-tier ceilings. The system now blocks a provider until the next quota day when it returns a daily-limit error; this behaviour was observed firing during the 2026-08-22 test run.

## 4. What it does

**Starting a game.** The browser requests a new session. The server mints a session identifier and a short save code, writes both to the database, and returns them. This is the operation most recently repaired: two July fixes established that the server, not the browser, decides what session is in play, and that every new game mints a fresh session and code rather than reusing one. Triggered by the player, once per game.

**Taking a turn.** The player submits an action. The browser assembles the prompt: the persona, the required output schema, the campaign and character state and the recent message history all originate client-side. The server adds one block of its own, appending rule modules filtered to what is relevant plus deterministic reference values computed by the rules layer (dice targets, skill numbers) to whatever system prompt the browser sent. It sends that to the first available provider in the preference chain. On a rate-limit or server error it falls back to the next provider; when all are spent it returns a quota-exhausted error carrying the time the budget resets. The response is parsed as structured data, validated, repaired if truncated, and applied to game state. Triggered by the player, many times per session.

There is a documented weakness here, found by an adversarial review in July: the dice results are a field the model fills in, not a value the server computes and enforces. The rules layer supplies reference numbers as advice inside the prompt, and nothing checks the model's roll against them. The rules service contains no random number generation at all; the browser file does contain dice and initiative implementations, but they are called only by that file's own self-test, so the capability exists and is wired to nothing. Validation, truncation repair and narrative sanitisation likewise live in the browser file, not on the server.

**Resuming.** The player enters a save code. The server looks up the session, restores state and message history, and continues.

**Loading the rules.** At server start, the rule loader reads a hard-coded list of 5 in-scope rule files and caches them in memory. Two further rule files sit on disk and are never named in that list, so they are never read; a separate blocked-identifier set exists as defence in depth but never fires, because no file the loader reads carries a blocked identifier. Observed in the 2026-08-22 test run: 5 rulesets loaded. Triggered by process start.

**Sanitising third-party names.** Raw campaign and rules data is rewritten on ingest against a name registry, values only, never keys. Triggered on data load.

**Metering.** Every provider call records requests, total tokens, and input and output tokens separately against a provider-and-day key, with a block timestamp when a daily limit is hit. A separate spend-report script reads those rows. Triggered per call; report run by hand.

**Rebuilding the stylesheet and the icon bundle.** Both are manual, both are silent-failure traps if skipped, and both are documented in the project instruction file for exactly that reason. Run by the operator when a new style name or icon is introduced.

**Deploying.** No artefact moves: production already serves the working copy. The deploy script instead acts as a release gate. It refuses a dirty tree, runs the test suite, rebuilds the generated stylesheet and icon bundle and fails if the rebuild differs from what is committed, fast-forwards the trunk, pushes to the remote, and checks that the live site returns a page with compression active. The trunk and the working branch currently share a commit, which is the state that gate produces.

## 5. How the AI tool and its features were used

### Building it

The construction method was specification-first and the tool was the executor, not the designer. The 17-packet specification was written before any code and locked; each packet was then handed to a command-line session that read the packet file and the build log, implemented it, ran the assertions, and appended its own entry to the build log. The build log is the mechanism that made the sessions composable: because each session wrote what it had done and what the next one needed to know, work survived the end of a session without the operator re-explaining anything.

Within the sessions themselves, four mechanisms carried the work, measured across the 4 recorded project sessions (829 assistant turns, 53 human prompts, 495 tool calls). A fifth recorded session is the one that produced this report and is excluded from the build figures.

- **Shell execution**, 314 calls, by far the dominant tool. Test runs, database queries, file measurement, deploy scripting, DNS (Domain Name System) checks against an authoritative nameserver.
- **File editing and writing**, 103 edits and 30 writes.
- **File and web reading**, 21 file reads, 11 web fetches, 3 web searches.
- **Delegation to sub-sessions**, 12 sub-session transcripts on disk, 5 dispatched directly from a main session and the rest nested one level deeper. All fall in the two 2026-07-24 sessions and all serve the research spin-off rather than the game: 9 evidence-gathering tasks routed to a mid-tier model, 2 adversarial critiques routed to a frontier model, 1 unlabelled. The record substantiates the two critiques directly: the research document says outright that a review corrected two load-bearing errors in its first draft, and names the specific false claim (that the codebase enforced a hard separation between fiction and mechanics, which it does not) with file and line references.

Without the tool, the equivalent construction is the specification work by hand plus 8,520 lines of code by hand plus the verification scripts by hand. The specific thing that would be hardest to replace is not the code generation; it is that a single agent could read a packet, write the code, run the shell command that verifies it, read the failure and iterate, without a human relaying between steps.

### Using it

The operator is technical: the sessions include hand-written SQL, nameserver debugging, reverse-proxy configuration and system-service files. The work split is heavily authoring rather than reviewing during the packet phase, and shifts toward reviewing and correcting later; 33 of the 100 commits are fixes against 11 features, which is the signature of a build where correctness arrives after function.

Human decisions that were not delegated: which architecture to abandon, which model vendor to run on, which third-party names to sanitise, whether to accept the adversarial review's corrections, and the scoping decisions in the research document. Errors surface three ways in practice: the automated suite (fast, narrow), the standalone verification scripts (run by hand), and the operator noticing in the running application. A defect class the automated suite cannot catch is the silent styling failure, because a missing style name produces valid markup.

Long sessions behave well. The longest recorded session ran 434 assistant turns and reached a peak single-request context of 295,759 tokens with no compaction event recorded in any transcript. Session-start overhead was measured at 35,564 to 43,565 tokens across the 5 sessions, before any work happens.

Cost is dominated by cached context reads, not by generation. Across the 4 project sessions: 105,490,612 cached-context tokens read, 2,344,166 cached-context tokens written, and 649,552 tokens generated. Generation is 0.6% of the total token flow. The step that dominates is long iterative shell-and-edit loops inside a large session, where the whole conversation is re-read on every turn.

### Dependency checklist

| # | Capability | Dependency | What breaks without it |
|---|---|---|---|
| 1 | Instruction file loaded automatically at session start | **Hard** | The project instruction file records 6 constraints, 3 of which fail silently: a new style name has no styling until a manual rebuild, a new icon is missing until the bundle is regenerated, and deleting the database side files destroys state. A session without it is unguarded against regenerating the abandoned front-end style, wrapping synchronous database calls in asynchronous code, or running the test suite in parallel against shared state. |
| 2 | That file surviving context compaction | **Soft** | Never exercised: no compaction occurred in 862 recorded turns. Would become hard the moment a session compacts, because the silent-failure constraints in item 1 would drop out mid-work. |
| 3 | Automatic compaction with coherent continuation | **Not exercised** | Enabled in configuration, never triggered in 829 recorded project turns. Peak context reached 295,759 tokens without it. |
| 4 | Delegating to sub-sessions with their own context | **Soft** | 12 dispatches, all in the research phase, none in the game build. Without it the same research runs inline, at the cost of loading 12 tasks' worth of source material into the main context. |
| 5 | Choosing a different model per delegated task | **Soft** | 9 of 12 dispatches were routed to a mid-tier model and 2 critiques to a frontier model. Without it, everything runs at one tier: either the critiques get a weaker model or the bulk research gets an expensive one. |
| 6 | Reusable named commands or skills | **Hard for the method, soft for the code** | The 15-document build methodology is written entirely as named phase triggers. 32 are installed. Without them the phases are copy-paste of 368 KB of process documents. |
| 7 | Lifecycle hooks | **Convenience** | 7 hooks across 6 events, all general-purpose rather than project-specific: an edit guard, a stale-file check, two response guards, a display filter and two routing hooks. Nothing in this project depends on them. |
| 8 | External tool servers | **Soft** | 3 configured. One built an 8.7 MB structural index of this specific repository, so it was used here. Without it, code navigation falls back to search. |
| 9 | File read, write, edit and shell execution with a permission model | **Hard** | 314 shell calls, 133 file writes and edits. The permission mode in use is unattended: the tool acts without per-call approval. Without shell execution the verify-and-iterate loop that carried all 17 packets does not exist. |
| 10 | Background or asynchronous tasks | **Not used** | No evidence in any transcript. |
| 11 | Publishing a hosted page at a stable URL (uniform resource locator) | **Not used** | The product self-hosts behind its own reverse proxy. |
| 12 | Configurable persona or output style applied to every response | **Convenience** | One custom output style plus 856 words of global response rules are in force. Affects how the operator is spoken to, not what is built. |
| 13 | Persistent per-project memory across sessions | **Soft, high value** | 1 memory recorded, 83 words, and it is a safety fact: production serves the working copy, so edits are live. Without it that has to be re-learned or re-stated, and the failure mode of not knowing it is editing production unaware. |
| 14 | Long sessions without restart | **Hard for the method** | 434 turns and 295,759 peak tokens in one session. The packet method assumes a session can hold a packet's full implement-verify-iterate loop. |
| 15 | Retained, machine-readable session transcripts | **Convenience** | Every operational figure in Table C of this report came from them. Nothing in the product depends on them. |
| 16 | Sending a file to the operator from inside the session | **Convenience** | 6 uses. |
| 17 | Web fetch and search from inside the session | **Soft** | 11 fetches, 3 searches, concentrated in the research phase. |

### Failure modes that actually occurred

- **A confidently wrong architectural claim.** The first draft of the July research document asserted that the codebase enforced a hard separation between fiction and mechanics. It does not. Caught by an adversarial critique run as a separate sub-session with a frontier model. Result: the document was revised twice and the false claim was replaced with file-and-line evidence of the actual behaviour.
- **Session identity handled by the wrong side.** Two fixes on 2026-07-31 establish that the browser had been deciding which session was in play, and that a new game could reuse a stale session and save code. Caught by the operator in the running application. Result: the server became the source of truth and every new game mints fresh identifiers.
- **A test suite that had stopped working.** Repaired in the same 2026-07-31 commit that added the save-code display, meaning the suite was broken and unnoticed for some period. Caught during feature work, not by the suite itself.
- **A daily provider quota exhausting mid-run.** Observed live during the 2026-08-22 test run: a provider returned a daily-limit error and was blocked until the next quota day. Handled automatically by the fallback chain. This is a runtime failure of the product, not of the build tool.
- **A crashing test runner and a blank game screen**, both fixed in March 2026 commits during the provider migrations.

---

## Capability specification

Every requirement below is derived from something this project actually used. No alternative tool is named, described or scored anywhere in this section.

Row numbers are an index for cross-reference from the two lists that follow; the five specified columns are the remainder.

| # | Requirement (answerable yes or no from a tool's documentation) | Class | What it was used for here | Consequence of absence | How common |
|---|---|---|---|---|---|
| 1 | Does it execute arbitrary shell commands and read their output back into the same reasoning turn? | Hard | 314 calls: test runs, database queries, DNS checks, deploy scripting | The implement-verify-iterate loop that produced all 17 work packets becomes a human relay between the tool and a terminal | Ordinary |
| 2 | Does it read, write and edit files in place at an absolute path? | Hard | 30 file writes, 103 edits | No code can be produced without copy-paste | Ordinary |
| 3 | Can it run unattended, without a per-call approval prompt, for a long working session? | Hard | Unattended mode; 495 tool calls across 4 sessions | 495 approval prompts. The method assumes the operator is reviewing outcomes, not authorising steps | Common, but the granularity of control varies widely |
| 4 | Does it read a named instruction file from the project root at every session start, without the user pasting it? | Hard | 452-word project file recording 6 build constraints, 3 of which fail silently | Silent breakage: unstyled interface elements, missing icons, corrupted database state, parallel tests against shared state | Ordinary |
| 5 | Do those instructions remain in force after the session's context is compressed? | Soft | Not exercised; no compaction in 862 turns | Becomes hard on any session long enough to compact: the silent-failure constraints drop out mid-work | Varies; frequently unstated in published documentation |
| 6 | Does a single session hold roughly 300,000 tokens of working context without truncation or compression? | Hard | Peak observed 295,759 tokens on one request | The packet method breaks into sub-packets; more hand-offs, more re-reading, more drift | Unusual at this size; published figures and measured figures diverge |
| 7 | Does it cache conversation context between turns so that re-reading it is cheap? | Hard | 105,490,612 cached tokens read against 2,344,166 written | Every turn in a long session re-pays full price for the whole conversation. On the observed volume this is the difference between a viable and an unviable method | Common among mature tools; the pricing terms differ enough to matter |
| 8 | Does it start sessions with a working context floor under about 45,000 tokens after all configuration is loaded? | Soft | Measured 35,564 to 43,565 tokens across 5 sessions | Every session starts closer to its ceiling. Cost is per-session and unavoidable | This is a property of how much configuration is installed, not of the tool alone |
| 9 | Can it delegate a task to a sub-session with its own separate context and return only the result? | Soft | 12 dispatches during the research phase | Research runs inline; 12 tasks' worth of source material lands in the main context and crowds out the work | Common |
| 10 | Can a different model be chosen per delegated task? | Soft | 9 bulk tasks to a mid-tier model, 2 critiques to a frontier model | One tier for everything: either weak critiques or expensive bulk work. Cost impact scales with delegation volume | Common |
| 11 | Can an independent critique of the tool's own output be run as a separate task that does not inherit the first session's reasoning? | Soft, high value | Caught a false architectural claim in a research document, with file and line evidence | The specific defect it caught is the class a self-review misses: a confident, plausible, wrong claim | Ordinary as a mechanism; the value depends on the critic model's strength |
| 12 | Can named, reusable, project-definable commands be invoked by name to trigger a defined workflow phase? | Hard for the build method | The entire 15-document, 368 KB build methodology is written as named phase triggers | The methodology becomes copy-paste of process documents; the phases stop being repeatable | Ordinary |
| 13 | Does it persist facts about a project across sessions without the user restating them? | Soft, high value | 1 memory: production serves the working copy, so edits are live | The fact must be re-learned. The failure mode is editing production unaware | Varies; often present in name but not in reliability |
| 14 | Does it run scripts automatically on session start, before or after a tool call, or on stop? | Convenience | 7 hooks over 6 events, all general-purpose | Guardrails go away. Nothing in this project depends on them | Uncommon |
| 15 | Does it connect to external tool servers that expose additional capabilities? | Soft | 3 configured; one indexed this repository structurally, 8.7 MB | Code navigation falls back to text search | Increasingly ordinary |
| 16 | Can it fetch and search the web from inside a working session? | Soft | 11 fetches, 3 searches, concentrated in the research phase | Research moves to a browser and back by copy-paste | Ordinary |
| 17 | Can a persona or output style be configured once and applied to every response? | Convenience | One custom style plus 856 words of global response rules | Verbosity and register drift. No effect on what gets built | Common |
| 18 | Can it hand a produced file directly to the operator? | Convenience | 6 uses | Copy-paste out of the terminal | Common |
| 19 | Are session transcripts retained in a machine-readable form the operator can query? | Convenience | Every operational figure in Table C below | No operational measurement of the build is possible after the fact. This report could not have been written | Uncommon; retention location and format vary |

### The minimum viable set

A tool that misses any one of these cannot do this work.

1. Shell execution with output returned into the same reasoning turn.
2. In-place file read, write and edit.
3. Unattended operation across a long session without per-call approval.
4. An auto-loaded project instruction file.
5. Roughly 300,000 tokens of single-session working context.
6. Context caching between turns.
7. Named, reusable, project-definable workflow commands (required by the build methodology, not by the application).

### The substitution cost

Every soft requirement, with the cost of working around it.

| Requirement | Workaround | Observed cost |
|---|---|---|
| Instructions surviving compaction (5) | Re-paste the instruction file after each compaction | Not yet paid: zero compactions in 862 turns. Cost on first occurrence is a silent-failure class defect |
| Low session-start floor (8) | Trim installed configuration | 35,564 to 43,565 tokens per session, paid before any work |
| Sub-session delegation (9) | Run research inline | 12 tasks' source material in the main context; on this project that is most of a session's headroom |
| Per-task model choice (10) | One tier for everything | 11 of 12 dispatches mispriced in one direction or the other |
| Independent critique (11) | Self-review, or a human reviewer | One confirmed false architectural claim reached a second draft before being caught. A self-review missing it is the expected outcome, not the unlucky one |
| Cross-session memory (13) | Restate the fact each session | 1 fact, 83 words, per session; the failure mode if forgotten is editing live production |
| External tool servers (15) | Text search instead of a structural index | Slower navigation of an 8,520-line codebase; no measured figure |
| Web access in session (16) | Browser plus copy-paste | 14 retrievals |

---

## Table A: what it required

| Measured | Value | How obtained | When |
|---|---|---|---|
| Total repository size | 106 MB | Measured, disk usage | 2026-08-22 |
| Installed third-party packages | 72 MB | Measured | 2026-08-22 |
| Public web directory | 6.5 MB | Measured | 2026-08-22 |
| Planning and process documents directory | 2.0 MB | Measured | 2026-08-22 |
| Server services directory | 120 KB | Measured | 2026-08-22 |
| Automated test directory | 40 KB | Measured | 2026-08-22 |
| Working data (live database plus write-ahead log) | 2.9 MB | Measured | 2026-08-22 |
| Structural code index built by an external tool server | 8.7 MB | Measured | 2026-08-22 |
| Total files excluding version-control internals | 6,960, excluding this report | Counted | 2026-08-22 |
| Files excluding installed packages | 178, excluding this report | Counted | 2026-08-22 |
| File mix excluding installed packages | 46 documents, 30 configuration/data, 30 code, 41 images and fonts, 10 pre-sanitisation backups, 21 other | Counted | 2026-08-22 |
| Ten largest files | Structural code index 3.8 MB plus 5.0 MB log; in-browser compiler bundle 3.1 MB; write-ahead log 2.9 MB; full icon library 738 KB; styling runtime 407 KB; dependency lockfile 215 KB; front-end application 206 KB; model-comparison results 195 KB; archived original single-file application 186 KB | Measured | 2026-08-22 |
| Longest single source file | 5,005 lines (front-end application) | Counted | 2026-08-22 |
| Total lines of code, one language | 11,107 JavaScript | Counted | 2026-08-22 |
| Production against test code | 8,520 production, 2,019 test, 568 tooling and experiments | Counted | 2026-08-22 |
| Document volume | 46 files, 21,267 lines, 138,152 words | Counted | 2026-08-22 |
| Standing context: instruction files loaded automatically | 5 files, 1,308 words, 9,002 bytes (project file 452 words; global files 856 words) | Counted | 2026-08-22 |
| Standing context: measured session-start prompt size | 35,564 / 36,145 / 36,843 / 38,909 / 43,565 tokens | Measured from 5 session transcripts | 2026-07-24 to 2026-08-22 |
| Working context: peak single-request size | 295,759 tokens | Measured from transcript | 2026-07-24 |
| Working context: compaction events | 0 across 829 project turns and 33 reporting turns | Measured from 5 transcripts | 2026-07-24 to 2026-08-22 |
| Configuration: settings entries | 22 top-level keys | Counted | 2026-08-22 |
| Configuration: hooks | 7 hooks across 6 lifecycle events | Counted | 2026-08-22 |
| Configuration: external tool servers | 3 | Counted | 2026-08-22 |
| Configuration: sub-session definitions | 25 | Counted | 2026-08-22 |
| Configuration: reusable named commands | 32 installed, 1 project-local | Counted | 2026-08-22 |
| Configuration: permission rules | 2 explicit allowances; default mode unattended | Counted | 2026-08-22 |
| Configuration: environment variables set | 6 | Counted | 2026-08-22 |
| Product configuration entries | 8 named settings in the example environment file | Counted | 2026-08-22 |
| Model consumption: generated tokens | 649,552 across the 4 project sessions | Measured from transcripts | 2026-07-24 to 2026-08-14 |
| Model consumption: cached context read | 105,490,612 tokens | Measured from transcripts | 2026-07-24 to 2026-08-14 |
| Model consumption: cached context written | 2,344,166 tokens | Measured from transcripts | 2026-07-24 to 2026-08-14 |
| Model consumption by session | 300,413 / 150,069 / 135,181 / 63,889 generated tokens | Measured | 2026-07-24 to 2026-08-14 |
| Model consumption: this report's own session | 17,630 generated, 426,390 cached read, 209,154 cached written | Measured | 2026-08-22 |
| Model tiers used to build | Frontier for all main sessions (two different frontier models); mid-tier for 9 of 12 delegated tasks; frontier for 2 delegated critiques | Measured from transcripts | 2026-07-24 to 2026-08-22 |
| Build-tool usage limits hit | 0 recorded | Measured from transcripts | 2026-07-24 to 2026-08-22 |
| Human time: recorded sessions | 5, of which 4 are project work and 1 produced this report | Counted | 2026-07-24 to 2026-08-22 |
| Human time: sessions before 2026-07-24 | Not measured. The March 2026 build ran from a different directory and its transcripts are not present | Verified absent | 2026-08-22 |
| Human time: calendar span of the code | 2026-03-09 to 2026-07-31, 144 days elapsed, 11 active commit days | Measured from version history | 2026-08-22 |
| Human time: prompts and turns | 53 human prompts, 829 assistant turns, in the 4 project sessions | Counted | 2026-07-24 to 2026-08-14 |
| Runtime dependencies: production packages | 5 direct | Counted | 2026-08-22 |
| Runtime dependencies: build and test packages | 5 direct | Counted | 2026-08-22 |
| Runtime dependencies: external model providers | 2 configured, each with a published free-tier ceiling (one request-capped in the low hundreds per day, one token-capped in the low hundreds of thousands per day), ordered preference chain with automatic fallback | Read from configuration and project documentation | 2026-08-22 |
| External paid services | None. Both providers run on free tiers | Read from configuration | 2026-08-22 |

## Table B: what it produced

| Measured | Value | How obtained | When |
|---|---|---|---|
| Production code | 8,520 lines across 11 files | Counted | 2026-08-22 |
| Test and verification code | 2,019 lines: 874 in the wired-up automated suite, 758 in 5 hand-run verification scripts, 387 in 2 test files that the runner's match pattern excludes and that nothing runs | Counted | 2026-08-22 |
| Tooling and experiment code | 568 lines across 4 scripts | Counted | 2026-08-22 |
| Documents written | 46 Markdown files, 138,152 words | Counted | 2026-08-22 |
| Of which build methodology | 15 documents, 368 KB | Counted | 2026-08-22 |
| Of which packet specifications | 17 packet files, 164 KB, plus a 136 KB locked master specification | Counted | 2026-08-22 |
| Of which build and change logs | 60 KB build log, 24 KB change log | Counted | 2026-08-22 |
| Of which research spin-off documents | 3 files, 594 lines, 9,187 words | Counted | 2026-08-22 |
| Deployment artefacts | 4: reverse-proxy configuration, host setup script, system service unit, spend-report script | Counted | 2026-08-22 |
| Operational scripts | 3 operator-run scripts (two shell, one JavaScript): production deploy, compression enabler, icon-bundle generator | Counted | 2026-08-22 |
| Game data assets | 5 loaded rule modules (2 more blocked), 10 campaign data files, 41 images and fonts | Counted | 2026-08-22 |
| Pages published to a hosted URL by the build tool | 0 | Verified absent | 2026-08-22 |
| Records created in the live database | 122 sessions, 20 messages, 4 saved states, 2 usage rows | Queried read-only | 2026-08-22 |
| Commits | 100 | Counted | 2026-08-22 |
| File changes across all commits | 410 change events over 236 distinct paths | Counted | 2026-08-22 |
| Lines added and removed | 88,442 added, 8,375 removed | Counted | 2026-08-22 |
| Commit type mix | 33 fixes, 33 packet commits, 11 features, 3 chores, 2 build-log updates, 2 performance, 2 user-experience, 2 infrastructure, 12 other | Counted | 2026-08-22 |
| Branches | 2 present: the trunk and a research branch, currently checked out and at the same commit as the trunk. A third, intellectual-property sanitisation branch was merged and deleted; only its merge commit survives | Counted | 2026-08-22 |
| Automated checks that exist | 2 suites, 67 tests: 50 server and API integration, 17 front-end | Counted and run | 2026-08-22 |
| Automated check coverage | Server scaffolding, health endpoint, chat proxy, database layer, session endpoints, rate limiting, front-end rendering | Read from test files | 2026-08-22 |
| Automated check pass rate | 67 of 67 passing, 2.9 seconds | Run | 2026-08-22 |
| Hand-run verification scripts | 5, not wired into the automated suite, 758 lines | Counted | 2026-08-22 |
| Assertions recorded during the packet build | Cumulative to 41 passing at the final packet | Read from build log | 2026-08-22 |
| Defects: fixed | 33 fix commits | Counted | 2026-08-22 |
| Defects by cause | Provider migration breakage, session-identity errors, page-load latency, third-party name leakage, user-interface correctness, a crashing test runner, security hardening | Read from commit history | 2026-08-22 |
| Defects by who caught them | Operator in the running application: session identity, blank game screen, latency. Automated suite: not the source of any recorded fix. Independent critique sub-session: 1 false architectural claim in a document. Hand-run scripts: the packet-era assertion failures | Read from history and documents | 2026-08-22 |
| Defects outstanding | 3 found. 1 documented: dice results are a model output field, not a server-computed and enforced value, and response validation and repair live only in the browser file, recorded in the research document with file and line references and not yet fixed. 2 found while writing this report and not previously recorded: the rule loader's blocked-identifier check is unreachable dead code because a separate allowlist already excludes those files, and 2 test files totalling 387 lines are excluded by the test runner's match pattern and are run by nothing | Read from documents and verified against source | 2026-08-22 |
| Rework: single-file to client-server | Whole front end restructured; a 17-packet architecture built around a single-file constraint had that constraint removed | Read from build log and history | 2026-08-22 |
| Rework: compile-in-browser to pre-compiled | 3.1 MB compiler and 407 KB styling runtime removed; icon bundle cut from 738 KB to 7.5 KB; cost is a permanent manual rebuild step with a silent failure mode | Measured and read from history | 2026-08-22 |
| Rework: model provider | Changed 3 times; final version is a registry with a fallback chain, per-provider ceilings and quota-day arithmetic, 182 lines | Read from history and source | 2026-08-22 |
| Rework: research document | Revised twice, once after an adversarial review corrected two load-bearing errors, once after four scoping decisions | Read from the document | 2026-08-22 |

## Table C: how it runs

Observed figures unless a row says design intent.

| Measured | Value | How obtained | When |
|---|---|---|---|
| Duration: automated test suite | 2.9 seconds, 67 tests | Run | 2026-08-22 |
| Duration: rule loading at server start | 5 rulesets, sub-second, no measurable delay in the test run | Observed | 2026-08-22 |
| Duration: one game turn end to end | Not measured in production. Nearest evidence is a controlled comparison of 46 model runs on one real game turn: fastest 453 ms, median 4,405 ms, slowest 31,135 ms | Measured from experiment results | 2026-07-25 |
| Duration: full end-to-end build session | 2 hours 9 minutes for a 111-turn session; 6 hours 2 minutes for a 217-turn session; 8 minutes for a 67-turn session; one session spans 25 hours 15 minutes from its first to its last message, including idle time | Measured from message timestamps in transcripts | 2026-07-24 to 2026-08-22 |
| Frequency: game turn | Many per play session | Design intent | 2026-08-22 |
| Frequency: rule load | Once per server start | Read from source | 2026-08-22 |
| Frequency: stylesheet and icon rebuild | On demand, manual, only when a new style name or icon is introduced | Read from project instruction file | 2026-08-22 |
| Frequency: spend report | On demand, manual | Read from source | 2026-08-22 |
| Built and never used | The published-page capability and background tasks. Neither appears in any transcript | Verified absent from transcripts | 2026-08-22 |
| Throughput: model comparison experiment | 46 model runs in one batch across 3 providers, 305 seconds of cumulative model time, total spend 0.11 US dollars | Measured from experiment results | 2026-07-25 |
| Throughput: rule modules per load | 5 of 7 files on disk, the other 2 excluded by a hard-coded allowlist rather than by the blocked-identifier check | Observed in the test run and read from source | 2026-08-22 |
| Concurrency: build-time | All 17 packets deliberately sequential because they wrote to one file. 12 delegated tasks concentrated in 2 sessions; whether any ran concurrently is not recorded in the retained metadata | Read from build log and transcripts | 2026-08-22 |
| Concurrency: run-time | Two rate limiters, on the chat endpoint and on session creation, configurable by 4 environment settings | Read from source | 2026-08-22 |
| Contention between parallel workers | None observed. The one documented contention risk is the automated suite, which is forced to run sequentially because the database is shared state | Read from project instruction file | 2026-08-22 |
| Delegation profile | 12 delegated tasks, 5 dispatched from a main session and the rest nested; all inside 2 of the 4 project sessions, 0 in the other 2 | Counted from transcripts and sub-session files | 2026-08-22 |
| Delegation: share usable first time | Not measured. Return durations and outcomes are not recorded in the retained metadata | Verified absent | 2026-08-22 |
| Turn economics: turns per human prompt | 15.6 assistant turns per human prompt across 829 turns and 53 prompts; by session 24.1, 18.1, 9.6, 6.9 | Calculated from transcripts | 2026-08-22 |
| Turn economics: tool calls | 495 across the 4 project sessions: 314 shell, 103 edits, 30 writes, 21 reads, 11 web fetches, 6 file hand-offs, 5 delegations, 3 web searches, 2 tool lookups | Counted from transcripts | 2026-08-22 |
| Turn economics: correcting against requesting | Not separable from the transcript record. The nearest proxy is the commit mix: 33 fixes against 11 features | Calculated | 2026-08-22 |
| Intervention rate | 53 human prompts against 495 tool calls, one human input per 9.3 tool calls. The permission mode is unattended, so none of these are approvals; they are direction and correction | Calculated from transcripts | 2026-08-22 |
| Error and retry: build-tool errors | 0 recorded across 829 turns | Measured from transcripts | 2026-08-22 |
| Error and retry: product runtime | In the controlled comparison, 5 of 46 model runs failed outright and 4 more returned structured output that failed schema validation: 9 of 46, a 20% failure rate at the response level | Measured from experiment results | 2026-07-25 |
| Error detection and recovery in the product | Automatic: rate-limit and server errors fall through to the next provider; a daily-limit error blocks that provider until the next quota day; truncated structured responses are repaired in the browser | Read from source, observed firing | 2026-08-22 |
| Blocking events: build tool | None recorded | Measured from transcripts | 2026-08-22 |
| Blocking events: product | One provider hit its daily free-tier ceiling and was blocked until the next quota day, observed live during the test run. Recorded provider usage totals 10 requests and 26,839 tokens across 2 days | Observed and queried | 2026-08-22 |
| State and resumability: the product | A player resumes a campaign from a short save code; the server is the source of truth. This was broken until 2026-07-31 and is now fixed | Read from source and history | 2026-08-22 |
| State and resumability: the build | Carried by the build log. Each session appended what it built, its assertion results and hand-off notes, so the next session resumed without the operator re-explaining. One 83-word cross-session memory holds the one fact the log does not: production serves the working copy | Read from build log and memory | 2026-08-22 |
| What is lost if a session ends mid-operation | Uncommitted front-end and data edits are live in production on the next request, because the server reads those files from the working copy. Server-side edits wait for a service restart. There is no staging buffer between an unfinished front-end edit and a player | Read from memory note, service unit and deployment configuration | 2026-08-22 |
| Maintenance of the thing itself | 3 recorded: a crashing test runner fixed in March, a test suite found broken and repaired on 2026-07-31, and a page-load latency rebuild in March. All triggered by the operator noticing, none by an automated check | Read from history | 2026-08-22 |

---

**Footnote on naming.** The tool used to build this project is referred to throughout as PLATFORM A. Its product name, its vendor and its model names have been replaced everywhere they appeared, including in file paths, configuration keys, directory names, commit messages and command output. Models are described by tier only: frontier, mid-tier, small. External tool servers are reported by count, not by name, because their names identify the ecosystem. The names of the model vendors the product itself calls at runtime have also been withheld, because naming them narrows the ecosystem the project was built in. The project's own name and the name of the published game it adapts have been replaced with a description of what it does, for the same reason the file name carries a descriptive slug: the report is judged on its requirements, not on what it is called.
