# EXE.md: Astra Rising AI DM -- Session Startup Guide
# Generated: 2026-03-09
# Project: Astra Rising AI DM
# Stack: React 18 JSX (CDN, no build step), Tailwind v3 CDN (full JIT), Claude API claude-sonnet-4-6
# Output: index.html (self-contained, served at star.shawndata.com)

---

## WARNING: ALWAYS READ BUILD_LOG.md FIRST

After reading this EXE.md, immediately read BUILD_LOG.md. It contains:
- What packets have been completed so far
- What is currently in progress or next up
- Design decisions and technical notes from previous sessions
- Current codebase state and any issues
- The last git commit hash

---

## BUILD_LOG.md Maintenance Rules

Key rules:
- Read BUILD_LOG.md FIRST every session
- APPEND after every packet completion (never overwrite)
- Include: what was built, decisions made, gotchas encountered, next packet
- Commit BUILD_LOG.md with the packet commit
- Compatible with Claude Code CLI (same protocol)

---

## Stack Reality Check

Project: Astra Rising AI DM
Type: Single-file index.html served at star.shawndata.com (self-hosted, not Claude.ai artifact renderer)

Key Points:
- There is NO npm, no build step, no package.json, no node_modules
- There is NO .env file -- API key is entered by the user in the UI
- There is ONLY ONE output file: index.html (self-contained HTML with embedded JSX)
- All 17 packets modify this single index.html file sequentially
- Served at star.shawndata.com (or tested locally via file:// or python3 -m http.server 8080)
- Full Tailwind v3 CDN: arbitrary values like w-[123px] ARE permitted (JIT included)

CDN dependencies (hardcoded in index.html <head>, do not change):
  https://cdn.tailwindcss.com                                           -- Tailwind v3
  https://unpkg.com/react@18/umd/react.production.min.js               -- React 18
  https://unpkg.com/react-dom@18/umd/react-dom.production.min.js       -- ReactDOM 18
  https://unpkg.com/@babel/standalone/babel.min.js                     -- JSX transform
  https://unpkg.com/lucide-react@0.383.0/dist/umd/lucide-react.js      -- Icons

Stack Translation:
- "Install dependency" -> no-op. All CDN. No other deps allowed.
- "Run dev server" -> python3 -m http.server 8080 then open localhost:8080, OR open index.html directly in browser
- "Run tests" -> open in browser, open DevTools, visually verify AssertionPanel shows all [PASS]
- "Build command" -> no build step. index.html IS the build output.
- "Environment variables" -> not applicable. API key stored in React state.
- "Routing" -> not applicable. Phase state variable handles screen switching.
- "import { X } from 'react'" -> const { X } = React; (UMD global, at top of babel script)
- "import { Icon } from 'lucide-react'" -> const { Icon } = LucideReact; (UMD global)
- "export default App" -> ReactDOM.createRoot(document.getElementById('root')).render(<App />);

Component architecture:
- All components in one file (App.jsx)
- No separate component files, no barrel exports
- State: React useState + useReducer (NO localStorage, NO sessionStorage)
- All API calls via fetch to https://api.anthropic.com/v1/messages

---

## Packet Files and Source of Truth

ALL_PACKETS_COMPLETE.md is canonical. Individual PACKET_X_Y.md files in ./packets/ are generated views.
Edit ALL_PACKETS_COMPLETE.md, regenerate individuals. Never edit PACKET files directly.

---

## Pre-Packet Environment Checklist

Before starting each packet, check BUILD_LOG.md "Notes for Next Session" for any special setup.

Phase 1 (PACKET_1_1 to PACKET_1_3):
- [OK] No npm install needed
- [OK] No .env file needed
- [OK] No external services needed
- [OK] index.html does not exist yet (PACKET_1_1 creates it)
- [ ] Verify you are in /path/to/astra-rising directory
- [ ] Verify packets/ directory exists and contains the packet .md files

Phase 2 (PACKET_2_1 to PACKET_2_2):
- [ ] Phase 1 complete (index.html opens in browser with 12+ assertions passing)
- [OK] API key: user-entered in UI, no .env needed
- [ ] Verify research_assets/ adventure JSON files are present (ADVENTURE_LIBRARY embeds their data)

Phase 3+ (PACKET_3_1 and beyond):
- [ ] All previous phases working (App.jsx renders, prior assertions [PASS])
- [ ] Check BUILD_LOG.md for any deferred items or known issues
- [OK] No new npm packages needed at any phase

Post-packet verification (every packet):
- Open index.html in browser (python3 -m http.server 8080 or file://)
- Open DevTools (F12) -> Console tab
- Verify: zero red console errors
- Verify: AssertionPanel shows all prior assertions as [PASS] (no regressions)
- Verify: new assertions from this packet show [PASS]

---

## Standard Dev Workflow

Every session follows this pattern:

1. Read BUILD_LOG.md (2 minutes) -- know where we are
2. Check git log (1 minute) -- see recent commits
   git log --oneline -10
3. Environment check (1 minute)
   - Verify you are in /path/to/astra-rising
   - Verify App.jsx exists (unless starting PACKET_1_1)
4. Read the packet file (./packets/PACKET_X_Y.md)
   - Read CONTEXT, DESIGN SPECIFICATION, DATA REQUIREMENTS fully
   - Review all Acceptance Criteria (must all be verified)
   - Review Execution Checklist (your task list)
5. Build the packet -- follow Execution Checklist step by step
6. Verify before commit
   - Paste App.jsx into Claude.ai artifact renderer
   - Verify no errors, all assertions [PASS]
   - Run through relevant HUMAN AC manually
7. Commit and update BUILD_LOG.md
   - git add App.jsx BUILD_LOG.md
   - git commit -m "PACKET_X_Y: [Name]"
   - Append new section to BUILD_LOG.md

---

## Parallel Execution Support

This project does NOT use parallel execution. All 17 packets are sequential.
Reason: All packets write to the same App.jsx file. Parallel writes would corrupt the file.

Execute one packet at a time, in group order (Group 1 through Group 17).

---

## Post-Packet Verification Checklist

Before marking any packet DONE:

- [ ] Read packet's Acceptance Criteria -- all items verified
- [ ] index.html opens in browser with zero console errors
- [ ] AssertionPanel shows all prior assertions [PASS] (no regressions)
- [ ] AssertionPanel shows all new assertions from this packet [PASS]
- [ ] All HUMAN AC verified by clicking/interacting in browser
- [ ] No localStorage or sessionStorage references added
- [ ] No hardcoded API key in code (apiKey comes from React state only)
- [ ] No new external CDN imports added beyond the 5 in index.html <head>
- [ ] git add index.html BUILD_LOG.md && git commit -m "PACKET_X_Y: [Name]"

---

## Automation Scripts (Adapted for Single-File Artifact)

Because there is no npm or build step, the standard automation scripts are replaced by Claude Code CLI invocations.

Primary execution command (sequential, one packet at a time):
```bash
claude --model claude-sonnet-4-6 -p "Read EXE.md and BUILD_LOG.md. Execute PACKET_X_Y from packets/PACKET_X_Y.md. Modify index.html as specified. Commit and update BUILD_LOG.md." --dangerously-skip-permissions
```

Full sequential run (see EXECUTION_PLAN.md for all 17 commands):
Run each command from EXECUTION_PLAN.md CLI Commands section, one at a time.
Wait for each to complete before running the next.

Monitor progress:
```bash
git log --oneline -20
```

Check current index.html size (as a rough completeness indicator):
```bash
wc -l index.html
```

---

## Environment Variables

There are NO environment variables for this project.

The only secret is the Anthropic API key:
- Entered by the user in the SetupScreen "Anthropic API Key" input field
- Stored in React state: const [apiKey, setApiKey] = useState('')
- Passed as a parameter to callDM(apiKey, ...)
- Never written to localStorage, sessionStorage, or any file
- Never committed to git
- Not included in JSON save exports

---

## Getting Started on Your Session

1. [OK] You just read EXE.md
2. -> Now read BUILD_LOG.md to see where we are
   - If BUILD_LOG.md exists: review completed packets and current notes
   - If you're starting fresh after this setup session: proceed to PACKET_1_1
3. -> Check git log: git log --oneline -10
4. -> No dev server to start -- all testing is done in Claude.ai artifact renderer
5. -> Open packet file: ./packets/PACKET_X_Y.md (use the next uncompleted packet)
6. -> Ask user what packet to work on, or proceed with next in sequence

When in doubt: Check BUILD_LOG.md. It's the source of truth for codebase state, decisions, and next steps.

---

## Critical Build Constraints (repeat from project spec)

These apply to EVERY packet. Violating any will cause the artifact to fail at runtime.

- NO localStorage or sessionStorage (PRD Phase 1 scopes out cross-session persistence; not a sandbox issue since star.shawndata.com supports it -- but the PRD feature spec says in-memory only for Phase 1)
- NOTE: If Phase 2 adds cross-session persistence, localStorage becomes available at star.shawndata.com
- NO npm, no build step, no package.json
- Tailwind CSS: full v3 CDN (cdn.tailwindcss.com). Arbitrary values like w-[123px] ARE permitted (JIT included).
- lucide-react@0.383.0: the ONLY external dependency. All icons must be from this version.
- All state in React memory (useState, useReducer)
- External API calls ONLY to https://api.anthropic.com -- no other fetch targets
- Single file output: App.jsx (everything in one file, all components inline)
- Model: claude-sonnet-4-6 (hardcoded in API_CONSTANTS)
- Header required: anthropic-dangerous-direct-browser-access: true (enables browser CORS)

Remember: Build fast, build right. Each packet commits. BUILD_LOG.md is your memory.
