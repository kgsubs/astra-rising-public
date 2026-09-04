# ALL_PACKETS_COMPLETE.md
# Astra Rising AI DM -- Complete Packet Set (Canonical)
# Generated: 2026-03-09
# PRD: v2.0 (LOCKED)
# Packets: 17 (Groups 1-17, fully sequential)
# Output file: index.html (single HTML file, CDN React/Tailwind, hosted at star.shawndata.com)
# DEPLOYMENT NOTE (2026-03-09): Target changed from Claude.ai artifact to self-hosted at star.shawndata.com.
# Output is index.html with CDN script tags + <script type="text/babel"> block.
# All "App.jsx" references in packets = the babel script block inside index.html.
# Imports replaced by UMD globals: const { useState } = React; const { X } = LucideReact;
# Full Tailwind v3 CDN available -- arbitrary values like w-[123px] ARE allowed.
# Testing: open index.html in browser (not Claude.ai artifact renderer).
# DO NOT edit individual PACKET_X_Y.md files. Edit here and regenerate.

---

## DEPENDENCY GRAPH

| Packet      | Depends On  | Blocks      | Critical Path | Parallel With |
|-------------|-------------|-------------|---------------|---------------|
| PACKET_1_1  | (none)      | PACKET_1_2  | YES           | none          |
| PACKET_1_2  | PACKET_1_1  | PACKET_1_3  | YES           | none          |
| PACKET_1_3  | PACKET_1_2  | PACKET_2_1  | YES           | none          |
| PACKET_2_1  | PACKET_1_3  | PACKET_2_2  | YES           | none          |
| PACKET_2_2  | PACKET_2_1  | PACKET_3_1  | YES           | none          |
| PACKET_3_1  | PACKET_2_2  | PACKET_3_2  | YES           | none          |
| PACKET_3_2  | PACKET_3_1  | PACKET_3_3  | YES           | none          |
| PACKET_3_3  | PACKET_3_2  | PACKET_4_1  | YES           | none          |
| PACKET_4_1  | PACKET_3_3  | PACKET_4_2  | YES           | none          |
| PACKET_4_2  | PACKET_4_1  | PACKET_5_1  | YES           | none          |
| PACKET_5_1  | PACKET_4_2  | PACKET_5_2  | YES           | none          |
| PACKET_5_2  | PACKET_5_1  | PACKET_6_1  | YES           | none          |
| PACKET_6_1  | PACKET_5_2  | PACKET_6_2  | YES           | none          |
| PACKET_6_2  | PACKET_6_1  | PACKET_7_1  | YES           | none          |
| PACKET_7_1  | PACKET_6_2  | PACKET_7_2  | YES           | none          |
| PACKET_7_2  | PACKET_7_1  | PACKET_8_1  | YES           | none          |
| PACKET_8_1  | PACKET_7_2  | (none)      | YES           | none          |

---

## FILE CONFLICT ANALYSIS

Three conflicts were identified from the original PRD parallel groupings. All resolved by converting to sequential execution. The single-file App.jsx constraint makes true parallelism impossible -- concurrent writes would corrupt the file.

### Conflict 1: PACKET_1_2 and PACKET_1_3
- Original PRD: parallel group
- Conflict: both write to App.jsx (character data + adventure data sections)
- Resolution: PACKET_1_2 runs first (Group 2), PACKET_1_3 runs second (Group 3)
- Rationale: Character Select UI must exist before Adventure Select references shared layout patterns

### Conflict 2: PACKET_3_2 and PACKET_3_3
- Original PRD: parallel group
- Conflict: both write to App.jsx (State Manager + Character Sheet Sidebar)
- Resolution: PACKET_3_2 runs first (Group 7), PACKET_3_3 runs second (Group 8)
- Rationale: Character Sheet Sidebar reads from state structures that PACKET_3_2 establishes

### Conflict 3: PACKET_4_2 and PACKET_5_1
- Original PRD: parallel group
- Conflict: both write to App.jsx (Combat UI + Meta Controls)
- Resolution: PACKET_4_2 runs first (Group 10), PACKET_5_1 runs second (Group 11)
- Rationale: Meta Controls include combat-aware save/snapshot behavior requiring PACKET_4_2 combat state

---

## CONTRACT VERIFICATION LOG

All 16 dependency pairs verified against GameState contract (PRD Section 28).

| Pair         | Check                                                     | Result |
|--------------|-----------------------------------------------------------|--------|
| 1_1 -> 1_2   | INITIAL_STATE.character shape matches character contract   | [OK]   |
| 1_2 -> 1_3   | CHARACTER_ROSTER exported, adventure select reads it      | [OK]   |
| 1_3 -> 2_1   | ADVENTURE_LIBRARY exported, callDM reads adventure_id     | [OK]   |
| 2_1 -> 2_2   | callDM(messages, systemPrompt) signature stable           | [OK]   |
| 2_2 -> 3_1   | SessionZeroResponse shape: story_device, hooks[3]         | [OK]   |
| 3_1 -> 3_2   | DMResponse.state_updates passed to applyStateUpdates      | [OK]   |
| 3_2 -> 3_3   | gameState.character shape read by CharacterSheet sidebar  | [OK]   |
| 3_3 -> 4_1   | Sidebar layout stable; combat adds to scene layer         | [OK]   |
| 4_1 -> 4_2   | CombatState contract: round, phase, initiative_order      | [OK]   |
| 4_2 -> 5_1   | Combat UI complete; meta controls overlay without conflict | [OK]   |
| 5_1 -> 5_2   | Snapshot shape in meta.snapshots[] stable                 | [OK]   |
| 5_2 -> 6_1   | journal[] shape stable; compression reads scene history   | [OK]   |
| 6_1 -> 6_2   | history_compressed in scene contract stable               | [OK]   |
| 6_2 -> 7_1   | Returning player flow stable; tooltips overlay on top     | [OK]   |
| 7_1 -> 7_2   | Tooltip registry stable; scene header reads scene contract| [OK]   |
| 7_2 -> 8_1   | All UI components stable for polish pass                  | [OK]   |

---

## ATOMIC UNIT RULE

Each packet is the smallest independently committable unit of work. A packet must:
1. Produce a renderable App.jsx (no broken JSX, no undefined references)
2. Pass all its own AUTO AC in the artifact renderer
3. Not break any prior packet's AssertionPanel checks
4. Be committed to git before the next packet begins

---

## SCOPE CREEP PREVENTION

Rules:
1. Do not implement features assigned to later packets
2. Do not refactor prior packet code unless fixing a regression
3. Do not add UI not specified in the packet's AC
4. If an unspecified need is discovered, document in BUILD_LOG.md under "Deferred Items" and continue
5. Polish (animations, color refinement, spacing) belongs exclusively in PACKET_8_1

---

## AMBIGUITY RESOLUTION

### Race-specific stat generation
PRD specifies fixed pre-gen characters only. No random generation. Use exact stats from PRD Section 27.

### Tailwind CSS version
Base stylesheet only. No JIT. No arbitrary values (no brackets). Use only standard Tailwind utility classes.

### API key storage
Stored in a separate React state variable `apiKey` (string). NOT inside GameState. NOT in localStorage.

### AssertionPanel visibility
PACKET_1_1 sets dev_mode = true. PACKET_8_1 sets dev_mode = false. Always rendered when dev_mode is true.

### DMResponse vs SessionZeroResponse
Init call returns SessionZeroResponse. All gameplay calls return DMResponse. PACKET_2_1 handles both shapes.

---

## INTEGRATION TESTING STRATEGY

1. PRIMARY: AssertionPanel -- inline React component, renders green [PASS] / red [FAIL] badges
2. SECONDARY: Human AC -- require human to click/interact and verify
3. REGRESSION: Each packet verifies prior AssertionPanel badges before committing
4. FINAL: PACKET_8_1 runs full regression sweep before setting dev_mode false

---

## PACKETS

---

## PACKET_1_1: Skeleton + State Shell

```yaml
packet_id: PACKET_1_1
parallel_group: 1
depends_on: []
blocks: [PACKET_1_2]
critical_path: YES
estimated_hours: 10
prd_features: [F001, F002, F019]
codex_patterns: []
codex_guards: []
```

### CONTEXT
This is the foundation packet. It establishes index.html -- a self-contained HTML file served from star.shawndata.com. The file uses CDN-loaded React 18, Tailwind v3, Babel standalone (for JSX transform), and lucide-react UMD. All component code lives inside a <script type="text/babel"> block. This replaces the Claude.ai artifact model: index.html IS the artifact. Every subsequent packet appends to the babel script block. The skeleton renders placeholder content so the page is always viewable after this commit.

### PRODUCES
Files created: index.html (new)
Files modified: none
Schema created: none
Schema modified: none
API routes: none
Env vars added: none
Env vars needed: none
Exports: INITIAL_STATE constant, App (default export), AssertionPanel component, COLORS constant, LAYOUT constant

### ASSUMES
Files exist: none (first packet)
Schema exists: none
API routes: none
Env vars set: none
State: none (this packet creates all state)

### DESIGN SPECIFICATION

index.html structure:

OUTER SHELL (HTML boilerplate):
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Astra Rising AI DM</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://unpkg.com/lucide-react@0.383.0/dist/umd/lucide-react.js"></script>
</head>
<body class="bg-gray-900 min-h-screen">
  <div id="root"></div>
  <script type="text/babel">
    // ALL COMPONENT CODE GOES HERE (sections 1-4 below)
    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  </script>
</body>
</html>
```

SECTION 1 -- UMD DESTRUCTURING (inside babel script, at top)
const { useState, useEffect, useCallback, useRef, useMemo } = React;
const { AlertCircle, ChevronRight, Loader, BookOpen, Shield, Zap, User, Menu, X, Check, RefreshCw } = LucideReact;

SECTION 2 -- CONSTANTS
INITIAL_STATE: full GameState with all keys at zero/null/empty defaults. meta.dev_mode = true. meta.initialized = false.
COLORS: Tailwind class strings for Astra Rising theme (dark space, yellow accent). Full Tailwind v3 CDN -- arbitrary values permitted.
LAYOUT: Tailwind class strings for primary layout zones (sidebar, main, full_screen).

SECTION 3 -- ASSERTION PANEL
function AssertionPanel({ assertions }) -- fixed bottom-right overlay, bg-gray-900 bg-opacity-90, rounded, small text, scrollable. Header: "DEV ASSERTIONS". Each row: colored dot + label. Green for pass, red for fail.

SECTION 4 -- APP COMPONENT
function App():
  const [gameState, setGameState] = useState(INITIAL_STATE);
  const [apiKey, setApiKey] = useState('');

  p1_1_assertions: 5 static checks against INITIAL_STATE values.

  Phase discriminator: !gameState.meta.initialized -> SetupScreen placeholder, else GameScreen placeholder.

  SetupScreen placeholder: full-height centered dark div. Title "Astra Rising AI DM" in yellow-400 text. Subtitle line. PRD v2.0 badge. Notice: "Character + Adventure Selection arrives in PACKET_1_2 / 1_3". API key input placeholder (not wired yet -- PACKET_2_1 wires it).

  GameScreen placeholder: flex row. Left sidebar w-64 bg-gray-800 full-height -- "Character Sheet coming in PACKET_3_3". Right main flex-1 bg-gray-900 -- "Narrative Engine coming in PACKET_3_1".

  Render: {gameState.meta.dev_mode && <AssertionPanel assertions={p1_1_assertions} />}

The file must open in browser with zero console errors. No localStorage. No sessionStorage. No fetch calls yet.

### DATA REQUIREMENTS

INITIAL_STATE full shape:
```
character: null
campaign: null
session: { number: 1, scene_count: 0, turn_count: 0 }
scene: {
  header: '',
  summary: '',
  in_combat: false,
  combat_state: null,
  recent_summaries: [],
  history_compressed: false,
  scene_type_history: []
}
meta: {
  initialized: false,
  loading: false,
  error: null,
  last_saved: null,
  snapshots: [],
  dev_mode: true
}
```

Character shape reference (null in INITIAL_STATE):
id, name, race, psa, archetype,
stats: { str, sta, dex, rs, int, log, per, ldr },
combat: { im, ps, dm_modifier },
stamina: { current, max },
skills: [{ name, level }],
inventory: [string],
seu: { total, sources: [{ name, seu }] },
ammo: {},
status_effects: [],
credits: 0,
xp: { total: 0, unspent: 0 },
racial_abilities: []

Campaign shape reference (null in INITIAL_STATE):
adventure_id, adventure_title, story_device, story_device_seed,
spine: { act1_goal, act2_complication, act3_convergence },
npcs: [], factions: [], hooks: [], journal: []

COLORS constant (full Tailwind v3 CDN -- arbitrary values permitted):
bg_primary: 'bg-gray-900', bg_secondary: 'bg-gray-800', bg_card: 'bg-gray-800',
accent_primary: 'text-yellow-400', accent_info: 'text-blue-400', accent_danger: 'text-red-400',
text_primary: 'text-gray-100', text_secondary: 'text-gray-400', border: 'border-gray-700',
cta_btn: 'bg-yellow-400 text-gray-900 hover:bg-yellow-300 font-bold',
danger_btn: 'bg-red-600 text-white hover:bg-red-500 font-bold'

AssertionPanel assertion shape: { label: string, pass: boolean }

PACKET_1_1 assertions (5, all static checks against INITIAL_STATE):
1. "INITIAL_STATE.character is null" -- INITIAL_STATE.character === null
2. "INITIAL_STATE.campaign is null" -- INITIAL_STATE.campaign === null
3. "meta.dev_mode is true" -- INITIAL_STATE.meta.dev_mode === true
4. "session.number is 1" -- INITIAL_STATE.session.number === 1
5. "meta.initialized is false" -- INITIAL_STATE.meta.initialized === false

### ACCEPTANCE CRITERIA

AUTO:
- AC-1: Open index.html in browser. No console errors (F12 -> Console tab shows zero red errors).
- AC-2: AssertionPanel overlay visible in bottom-right corner of page.
- AC-3: All 5 assertions show green dots/labels (none red).
- AC-4: "Astra Rising AI DM" title visible in SetupScreen center.
- AC-5: grep returns zero matches: grep -i "localStorage\|sessionStorage" index.html
HUMAN:
- AC-H1: SetupScreen is centered and readable at 1280px and 375px viewport widths.
- AC-H2: Temporarily edit INITIAL_STATE to meta.initialized: true, reload -- GameScreen two-column layout visible. Revert.

### REGRESSION SCOPE
Not applicable -- this is the first packet. No prior AssertionPanel to verify.

### TESTING PROCEDURE
1. Open index.html in browser (file:// or python3 -m http.server 8080, then localhost:8080).
2. Open browser DevTools (F12). Verify Console tab shows zero red errors.
3. Verify "Astra Rising AI DM" title displayed center screen.
4. Verify AssertionPanel overlay visible bottom-right.
5. Verify all 5 assertion rows show green (no red).
6. Inspect source: confirm UMD destructuring at top of babel script (no ES import statements).
7. Inspect source: confirm meta.dev_mode: true in INITIAL_STATE.
8. Inspect source: confirm no localStorage, sessionStorage, or fetch() calls.
9. Temporarily set meta.initialized: true, reload, verify two-column GameScreen. Revert.
10. git add index.html BUILD_LOG.md
11. git commit -m "PACKET_1_1: Skeleton + State Shell"
12. Update BUILD_LOG.md with commit hash and outcome.

### EXECUTION CHECKLIST
- [ ] index.html created with correct CDN script tags and babel script block
- [ ] UMD destructuring at top of babel block (no ES import statements)
- [ ] INITIAL_STATE has all GameState contract keys
- [ ] COLORS and LAYOUT constants defined (full Tailwind v3, arbitrary values permitted)
- [ ] AssertionPanel component renders with green assertions
- [ ] All 5 AUTO AC verified [PASS] in browser
- [ ] No localStorage/sessionStorage/fetch in file
- [ ] REGRESSION SCOPE: N/A (first packet)
- [ ] git commit with message "PACKET_1_1: Skeleton + State Shell"

---

## PACKET_1_2: Pre-Gen Character Data + Character Select UI

```yaml
packet_id: PACKET_1_2
parallel_group: 2
depends_on: [PACKET_1_1]
blocks: [PACKET_1_3]
critical_path: YES
estimated_hours: 12
prd_features: [F006, F007]
codex_patterns: []
codex_guards: []
```

### CONTEXT
This packet adds the four pre-gen character definitions as constants and builds the character selection UI within the SetupScreen. It runs after PACKET_1_1 (needs the App shell and INITIAL_STATE) and before PACKET_1_3 (adventure select UI sits beside character select in the same screen). Character data is hardcoded from PRD Section 27 -- no API call, no dynamic generation. The UI lets the player browse four characters, view stats and loadout, and see a difficulty badge.

### PRODUCES
Files created: none
Files modified: App.jsx
Schema created: none
Schema modified: none
API routes: none
Env vars added: none
Env vars needed: none
Exports: CHARACTER_ROSTER constant, CharacterSelectPanel component, CharacterCard component

### ASSUMES
Files exist: App.jsx with INITIAL_STATE, COLORS, LAYOUT, AssertionPanel, App skeleton from PACKET_1_1
Schema exists: none
API routes: none
Env vars set: none
State: gameState.character null, gameState.meta.initialized false

### DESIGN SPECIFICATION

CHARACTER_ROSTER: array of 4 character objects. Each matches the full character GameState shape from the contract. Also includes ui_meta: { description, difficulty, color_accent }.

CharacterSelectPanel: receives { selectedCharId, onSelect }. Renders 2x2 grid (grid-cols-2) of CharacterCard components. Heading: "Select Your Operative". Panel fills the left half of SetupScreen.

CharacterCard: receives { character, selected, onSelect }. Card style: bg-gray-800, rounded-lg, border, cursor-pointer, p-4. Selected state: border-yellow-400 with ring effect. Shows: name (bold, text-gray-100), race + archetype in a small gray badge, difficulty badge (bg-green-700 text-white for 'any', bg-orange-600 text-white for 'experienced'). STA current/max as a thin bar. Top 3 skills listed. First 3 inventory items listed. Click calls onSelect(character.id).

CharacterDetailPanel: renders inline below the grid when a character is selected. Full 8-stat block in a 4x2 labeled grid (STR STA DEX RS / INT LOG PER LDR). Full skills list with levels as badges. Full inventory as bullet list. SEU sources. Racial abilities. Flavor description in italic text.

SetupScreen after this packet: left 50% = CharacterSelectPanel, right 50% = adventure placeholder text. Begin Adventure button at very bottom -- disabled with muted styling. API key text input (type password, label "Anthropic API Key") wired to apiKey state from App.

PACKET_1_2 must NOT set gameState.meta.initialized to true. That happens in PACKET_2_2.

### DATA REQUIREMENTS

CHARACTER_ROSTER (4 entries, exact PRD Section 27 values):

KAEL VOSS: id=kael_voss, race=Human, psa=Military, archetype=Soldier/Enforcer
stats: str=55, sta=55, dex=55, rs=50, int=40, log=40, per=45, ldr=50
combat: im=5, ps=+3, dm_modifier=0; stamina: current=55, max=55
skills: Beam Weapons 2, Melee Weapons 2, Demolitions 1, Thrown Weapons 1, Gyrojet Weapons 1
inventory: Rafflur M-3 proton pistol, Ke-1000 laser pistol, Albedo suit, Vibroknife, Frag grenade x2
seu: total=30, sources=[{name:M-3 clip, seu:10},{name:Ke-1000 clip, seu:20}]
credits=500, xp={total:0,unspent:0}, racial_abilities=[], status_effects=[], ammo={}
ui_meta: difficulty=any, color_accent=border-blue-500

SKRIX: id=skrix, race=Krix, psa=Technical, archetype=Techex
stats: str=40, sta=40, dex=50, rs=50, int=55, log=55, per=45, ldr=45
combat: im=5, ps=+2, dm_modifier=0; stamina: current=40, max=40
skills: Technician 3, Computers 1, Beam Weapons 1
inventory: Ke-1000 laser pistol, Civilian skeinsuit, Techkit, Doze grenade x2
seu: total=40, sources=[{name:Ke-1000 clip,seu:20},{name:spare,seu:20}]
credits=500, xp={total:0,unspent:0}, racial_abilities=[Ambidexterity,Comprehension 15%]
ui_meta: difficulty=any, color_accent=border-green-500

BOLG: id=bolg, race=Moluun, psa=Biosocial, archetype=Scispec/Medic
stats: str=55, sta=55, dex=45, rs=45, int=45, log=45, per=50, ldr=50
combat: im=5, ps=+3, dm_modifier=0; stamina: current=55, max=55
skills: Medical 3, Environmental 1, Psycho-Social 1
inventory: Electrostunner, Albedo suit, Medkit x2, Bioscanner, Stimdose x2
seu: total=40, sources=[{name:Electrostunner,seu:20},{name:spare,seu:20}]
credits=500, xp={total:0,unspent:0}, racial_abilities=[Elasticity,Lie Detection 5%]
ui_meta: difficulty=any, color_accent=border-purple-500

RAYLA: id=rayla, race=Skrath, psa=Military, archetype=Scout/Explorer
stats: str=30, sta=30, dex=55, rs=55, int=55, log=55, per=45, ldr=45
combat: im=6, ps=+2, dm_modifier=1; stamina: current=30, max=30
skills: Beam Weapons 2, Survival 2, Tracking 2
inventory: Ke-2000 laser rifle, Ke-1000 laser pistol, Skeinsuit, Survival pack, Macrobinoculars
seu: total=60, sources=[{name:rifle,seu:20},{name:pistol,seu:20},{name:spare,seu:20}]
credits=500, xp={total:0,unspent:0}, racial_abilities=[Night Vision,Gliding,Battle Rage 5%]
ui_meta: difficulty=experienced, color_accent=border-red-500

PACKET_1_2 assertions (add to AssertionPanel, assertion indexes 6-9):
6. "CHARACTER_ROSTER has 4 entries" -- CHARACTER_ROSTER.length === 4
7. "All characters have stamina.max > 0" -- CHARACTER_ROSTER.every(c => c.stamina.max > 0)
8. "Rayla difficulty is experienced" -- CHARACTER_ROSTER.find(c => c.id === 'rayla').ui_meta.difficulty === 'experienced'
9. "All characters have skills array" -- CHARACTER_ROSTER.every(c => Array.isArray(c.skills))

### ACCEPTANCE CRITERIA

AUTO:
- AC-1: CHARACTER_ROSTER constant exists with exactly 4 entries
- AC-2: All 4 PACKET_1_2 AssertionPanel assertions show [PASS]
- AC-3: All 5 PACKET_1_1 assertions still show [PASS] (no regression)
- AC-4: CharacterSelectPanel renders 4 cards visible in SetupScreen
HUMAN:
- AC-H1: Clicking a character card highlights it with yellow border and shows detail panel below
- AC-H2: Difficulty badge shows orange "Experienced" for Rayla, green "Any" for other three
- AC-H3: API key input field is visible and accepts text input

### REGRESSION SCOPE
Baseline (verify before starting work):
  Open App.jsx in artifact renderer. Verify no rendering errors. All 5 PACKET_1_1 assertions show [PASS].

Regression checks (verify after implementation):
  - All 5 PACKET_1_1 AssertionPanel assertions still show [PASS]
  - SetupScreen still renders (not broken by character panel changes)

If any regression check fails: this packet broke prior work. Do not commit. Rollback and fix.

### TESTING PROCEDURE
1. Open App.jsx in Claude.ai artifact renderer. Verify PACKET_1_1 baseline: 5 green [PASS].
2. Add CHARACTER_ROSTER constant above the App component in App.jsx.
3. Add CharacterCard component function.
4. Add CharacterSelectPanel component function with CharacterDetailPanel inline.
5. Update SetupScreen in App to render CharacterSelectPanel in left half.
6. Add API key input field wired to apiKey state.
7. Repaste artifact. Verify 4 character cards render in a 2x2 grid.
8. Click Kael Voss card. Verify yellow border appears. Verify stat block shown below grid.
9. Click Rayla card. Verify orange "Experienced" badge visible.
10. Verify Kael, Skrix, Bolg show green "Any" badges.
11. Verify AssertionPanel shows 9 total assertions (5 + 4), all green.
12. Verify Begin Adventure button is disabled/grayed (no adventure selected).
13. Inspect code: confirm no localStorage/sessionStorage calls added.
14. git add App.jsx && git commit -m "PACKET_1_2: Pre-Gen Character Data + Character Select UI"
15. Update BUILD_LOG.md with commit hash and outcome.

### EXECUTION CHECKLIST
- [ ] CHARACTER_ROSTER constant with 4 full character objects (exact PRD values)
- [ ] CharacterCard and CharacterSelectPanel components implemented
- [ ] SetupScreen updated: left half = character select, right half = adventure placeholder
- [ ] API key input field wired to apiKey state
- [ ] CharacterDetailPanel shows full stats when card selected
- [ ] 4 new assertions added (indexes 6-9), all [PASS]
- [ ] All 9 AUTO AC verified [PASS] in rendered artifact
- [ ] REGRESSION: All 5 PACKET_1_1 assertions still [PASS]
- [ ] git commit with message "PACKET_1_2: Pre-Gen Character Data + Character Select UI"

---

## PACKET_1_3: Adventure Library Data + Adventure Select UI

```yaml
packet_id: PACKET_1_3
parallel_group: 3
depends_on: [PACKET_1_2]
blocks: [PACKET_2_1]
critical_path: YES
estimated_hours: 10
prd_features: [F022]
codex_patterns: []
codex_guards: []
```

### CONTEXT
This packet adds the five adventure definitions as inline constants (derived from research_assets/ JSON files, embedded in App.jsx since file reads are impossible in the artifact renderer). It builds the adventure selection UI that occupies the right half of SetupScreen beside the character select panel. After this packet, the "Begin Adventure" CTA becomes activatable when both character and adventure are chosen. It runs after PACKET_1_2 because it slots into the right-half placeholder that PACKET_1_2 established.

### PRODUCES
Files created: none
Files modified: App.jsx
Schema created: none
Schema modified: none
API routes: none
Env vars added: none
Env vars needed: none
Exports: ADVENTURE_LIBRARY constant, AdventureSelectPanel component, AdventureCard component

### ASSUMES
Files exist: App.jsx with PACKET_1_1 + PACKET_1_2 content (skeleton, characters, character select UI)
Schema exists: none
API routes: none
Env vars set: none
State: selectedCharId in SetupScreen local state; selectedAdventureId will be added to SetupScreen local state

### DESIGN SPECIFICATION

ADVENTURE_LIBRARY: array of 5 adventure objects, each with: id, title, tagline, genre, difficulty, act_summary, setting, tone (string array), recommended_characters (array or 'any'), cover_icon (lucide icon name).

AdventureSelectPanel: receives { selectedAdventureId, onSelect }. Vertical list (not grid) of 5 AdventureCard components stacked vertically. Heading: "Choose Your Mission". Fills right half of SetupScreen.

AdventureCard: receives { adventure, selected, onSelect }. Card style: bg-gray-800, rounded-lg, border, cursor-pointer, p-3. Selected: border-yellow-400. Shows: title (bold), genre badge (small, gray), difficulty badge (color: green=Beginner/Beginner-Friendly, yellow=Intermediate, red=Advanced), tagline in italic, 2-3 tone chips as small rounded badges. Clicking calls onSelect(adventure.id).

AdventureDetailPanel (inline, below list when selected): shows act_summary as three labeled rows (Act 1 / Act 2 / Act 3), setting field, recommended_characters note.

SetupScreen finalization: left 50% = CharacterSelectPanel, right 50% = AdventureSelectPanel. "Begin Adventure" button at bottom -- ENABLED when both selectedCharId and selectedAdventureId are set. Button style: cta_btn from COLORS. onClick is a console.log stub (wired in PACKET_2_2). API key input field remains from PACKET_1_2.

Begin Adventure button enabled condition: selectedCharId && selectedAdventureId && apiKey.trim().length > 0

### DATA REQUIREMENTS

ADVENTURE_LIBRARY (5 entries, derived from research_assets/ JSON files):

id=crash_on_Cethara, title=Crash on Cethara
  tagline=Stranded on a hostile alien world, survival is just the beginning.
  genre=Survival / First Contact, difficulty=Beginner
  act_summary: Act 1: Survive the crash site and make first contact with Cethara natives. Act 2: Navigate tribal politics while uncovering a The Vaash scouting operation. Act 3: Destroy the The Vaash beacon before reinforcements arrive.
  setting=Planet Cethara, Korvath system, tone=[Survival,Discovery,Desperate], recommended_characters=any, cover_icon=Globe

id=ghost_station, title=Ghost Station
  tagline=The crew went silent. The station did not.
  genre=Cosmic Horror, difficulty=Intermediate
  act_summary: Act 1: Board the silent research station and discover what happened to the crew. Act 2: Something is still aboard -- and it is hunting you. Act 3: Survive long enough to broadcast a warning and escape.
  setting=Abandoned orbital research station, tone=[Dread,Mystery,Claustrophobic], recommended_characters=any, cover_icon=AlertCircle

id=the_Nexus_job, title=The Nexus Job
  tagline=Three megacorps. One data package. Zero margin for error.
  genre=Corporate Espionage, difficulty=Intermediate
  act_summary: Act 1: Accept a data extraction contract from a mysterious broker on Tessavar. Act 2: Navigate rival corporate security and a double-cross mid-heist. Act 3: Escape the megacity with the package and your lives.
  setting=Tessavar, megacity arcologies, tone=[Tense,Political,High-Stakes], recommended_characters=any, cover_icon=Briefcase

id=the_golden_mandible, title=The Golden Mandible
  tagline=Steal a priceless Krix artifact from the galaxy's worst security team.
  genre=Comedy Heist, difficulty=Beginner-Friendly
  act_summary: Act 1: Learn that a legendary Krix relic is on display at Waystation Pell's most underfunded museum. Act 2: Execute a heist that goes wrong in increasingly comedic ways. Act 3: Escape with the artifact and somehow everyone's friendship intact.
  setting=Waystation Pell, Procyus Prime, tone=[Comedic,Chaotic,Heist], recommended_characters=any, cover_icon=Star

id=the_erebus_protocol, title=The Erebus Protocol
  tagline=The conspiracy goes deeper than the Frontier itself.
  genre=Conspiracy Thriller, difficulty=Advanced
  act_summary: Act 1: A dead CFW agent's final message leads to a black-site installation. Act 2: Unravel a Apex Law cover-up that implicates the Assembly of Worlds. Act 3: Choose -- expose the truth and shatter the Frontier's illusion of safety, or bury it forever.
  setting=Deep space, multiple systems, tone=[Paranoid,Cerebral,Lethal], recommended_characters=[kael_voss,skrix,rayla], cover_icon=Eye

PACKET_1_3 assertions (add to AssertionPanel, indexes 10-12):
10. "ADVENTURE_LIBRARY has 5 entries" -- ADVENTURE_LIBRARY.length === 5
11. "All adventures have id and title" -- ADVENTURE_LIBRARY.every(a => a.id && a.title)
12. "Difficulties span Beginner to Advanced" -- ADVENTURE_LIBRARY.some(a => a.difficulty === 'Beginner') && ADVENTURE_LIBRARY.some(a => a.difficulty === 'Advanced')

Lucide icons needed for AdventureCards (add imports if not already present):
Globe, Briefcase, Star, Eye (AlertCircle already imported in PACKET_1_1)

### ACCEPTANCE CRITERIA

AUTO:
- AC-1: ADVENTURE_LIBRARY constant exists with exactly 5 entries
- AC-2: All 3 PACKET_1_3 AssertionPanel assertions show [PASS]
- AC-3: All 9 prior assertions still show [PASS] (no regression)
- AC-4: AdventureSelectPanel renders 5 adventure cards in SetupScreen right panel
HUMAN:
- AC-H1: Clicking an adventure card highlights it with yellow border
- AC-H2: Difficulty badges use correct colors (green Beginner, yellow Intermediate, red Advanced)
- AC-H3: Begin Adventure button enables when character AND adventure both selected AND API key entered

### REGRESSION SCOPE
Baseline (verify before starting work):
  Open App.jsx in artifact renderer. Verify no rendering errors. All 9 assertions (PACKET_1_1 + 1_2) show [PASS].

Regression checks (verify after implementation):
  - All 9 prior AssertionPanel assertions still show [PASS]
  - CharacterSelectPanel still renders and selection still works

If any regression check fails: this packet broke prior work. Do not commit. Rollback and fix.

### TESTING PROCEDURE
1. Open App.jsx in Claude.ai artifact renderer. Verify PACKET_1_1+1_2 baseline: 9 green [PASS].
2. Add missing lucide icon imports (Globe, Briefcase, Star, Eye).
3. Add ADVENTURE_LIBRARY constant above App component.
4. Add AdventureCard component function.
5. Add AdventureSelectPanel component function.
6. Replace right-half adventure placeholder in SetupScreen with AdventureSelectPanel.
7. Wire Begin Adventure button enabled state to: selectedCharId && selectedAdventureId && apiKey.length > 0.
8. Repaste artifact. Verify 5 adventure cards render in right panel.
9. Click "Ghost Station". Verify yellow border appears. Verify act_summary detail shows below.
10. Verify difficulty colors: Crash on Cethara green, Ghost Station yellow, Erebus Protocol red.
11. Select a character AND an adventure AND enter any text in API key field. Verify Begin Adventure button activates.
12. Verify AssertionPanel shows 12 total assertions, all green.
13. Inspect code: confirm no localStorage/sessionStorage calls added.
14. git add App.jsx && git commit -m "PACKET_1_3: Adventure Library Data + Adventure Select UI"
15. Update BUILD_LOG.md with commit hash and outcome.

### EXECUTION CHECKLIST
- [ ] ADVENTURE_LIBRARY constant with 5 full adventure objects
- [ ] AdventureCard and AdventureSelectPanel components implemented
- [ ] SetupScreen right half replaced with AdventureSelectPanel
- [ ] Begin Adventure button enabled condition wired correctly
- [ ] 3 new assertions added (indexes 10-12), all [PASS]
- [ ] All 12 AUTO AC verified [PASS] in rendered artifact
- [ ] REGRESSION: All 9 prior assertions still [PASS]
- [ ] git commit with message "PACKET_1_3: Adventure Library Data + Adventure Select UI"

---

## PACKET_2_1: API Client Module (callDM + validator)

```yaml
packet_id: PACKET_2_1
parallel_group: 4
depends_on: [PACKET_1_3]
blocks: [PACKET_2_2]
critical_path: YES
estimated_hours: 14
prd_features: [F019]
codex_patterns: []
codex_guards: []
```

### CONTEXT
This packet implements the core API client: the callDM function that sends messages to the Anthropic API and the validator functions for both DMResponse and SessionZeroResponse shapes. This is the most technically critical packet in the build -- every subsequent packet that touches the API depends on the contract established here. It runs after PACKET_1_3 (needs adventure/character data that will be embedded in system prompts) and before PACKET_2_2 (Session Zero init call uses callDM). Error handling follows the AppError standard: silent retry once, then OOC error message, then expose retry button.

### PRODUCES
Files created: none
Files modified: App.jsx
Schema created: none
Schema modified: none
API routes: none
Env vars added: none
Env vars needed: none
Exports: callDM function, validateDMResponse function, validateSessionZeroResponse function, buildSystemPrompt function

### ASSUMES
Files exist: App.jsx with PACKET_1_1 through 1_3 content
Schema exists: none
API routes: none
Env vars set: none
State: apiKey in React state, CHARACTER_ROSTER and ADVENTURE_LIBRARY available as constants

### DESIGN SPECIFICATION

callDM(apiKey, messages, systemPrompt, onError): async function. Parameters:
- apiKey: string (from React state, NOT env var)
- messages: array of {role, content} objects (the conversation history)
- systemPrompt: string (the 3-layer system prompt)
- onError: callback function(AppError) for error propagation to UI

Implementation:
1. POST to https://api.anthropic.com/v1/messages
2. Headers: Content-Type application/json, x-api-key: apiKey, anthropic-version: 2023-06-01, anthropic-dangerous-direct-browser-access: true
3. Body: { model: 'claude-sonnet-4-6', max_tokens: 4096, system: systemPrompt, messages }
4. On success: parse response.content[0].text as JSON. Return parsed object.
5. On network error: retry once silently. If retry fails, call onError with recoverable AppError.
6. On non-200 HTTP: call onError with { code: HTTP_ERROR, message, recoverable: status !== 401, retry_action }.
7. On JSON parse error: call onError with { code: JSON_PARSE_ERROR, message, recoverable: true, retry_action }.
8. Do NOT throw -- all errors go through onError callback.

validateDMResponse(obj): function. Checks that obj has: narrative (string), choices (array), state_updates (object). Returns { valid: boolean, errors: string[] }.

validateSessionZeroResponse(obj): function. Checks that obj has: story_device (string), hooks (array of length 3), campaign_spine (object with act1_goal, act2_complication, act3_convergence), key_npcs (array). Returns { valid: boolean, errors: string[] }.

buildSystemPrompt(gameState): function. Constructs the 3-layer system prompt:
- Layer 1: Rules Foundation (static text -- Astra Rising Core percentile rules, combat basics, optional rules list)
- Layer 2: DM Persona (static text -- cinematic narrator, 2nd person, genre-blending tone)
- Layer 3: Campaign State (dynamic, compressed format from gameState) -- format: CHAR: [name/race/archetype] STATS: [str/sta/dex/rs/int/log/per/ldr] STA: [current/max] SKILLS: [list] INV: [list] XP: [total/unspent] CAMPAIGN: [adventure_title/story_device] FACTIONS: [summary] NPCS: [summary] JOURNAL_LAST: [last entry or none]

The system prompt instructs Claude to respond in JSON with the exact DMResponse or SessionZeroResponse shape. Include the full JSON schema in the system prompt as a reference block so Claude produces parseable output.

API_CONSTANTS: { BASE_URL: 'https://api.anthropic.com/v1/messages', MODEL: 'claude-sonnet-4-6', MAX_TOKENS: 4096, API_VERSION: '2023-06-01' }

### DATA REQUIREMENTS

callDM function signature:
  callDM(apiKey: string, messages: {role,content}[], systemPrompt: string, onError: function) -> Promise<object|null>

DMResponse shape (what callDM must return for gameplay turns):
  narrative: string (DM prose)
  dice_rolls: [] (array of {description, target, roll, success})
  state_updates: { stamina_delta, seu_delta, seu_source, ammo_updates, status_add, status_remove, inventory_add, inventory_remove, xp_delta, credits_delta, npc_updates, faction_updates, journal_entry }
  choices: [] (array of {id, text, action_type})
  scene_change: boolean
  scene_header: string|null
  scene_summary: string|null
  combat_state_update: object|null
  ooc_note: string|null
  tooltip_terms: [] (array of {term, definition})

SessionZeroResponse shape (what callDM returns for init call):
  story_device: string
  story_device_seed: string
  hooks: [{title, opening}] (exactly 3)
  campaign_spine: { act1_goal, act2_complication, act3_convergence }
  key_npcs: [{name, role, goal, attitude}]

AppError shape:
  { code: string, message: string, recoverable: boolean, retry_action: function|null }

Error codes used by callDM:
  HTTP_401: API key invalid or missing
  HTTP_429: Rate limit exceeded
  HTTP_500: Anthropic server error
  NETWORK_ERROR: fetch failed
  JSON_PARSE_ERROR: response not valid JSON
  VALIDATION_ERROR: response missing required fields

PACKET_2_1 assertions (indexes 13-16):
13. "callDM is a function" -- typeof callDM === 'function'
14. "validateDMResponse is a function" -- typeof validateDMResponse === 'function'
15. "validateSessionZeroResponse is a function" -- typeof validateSessionZeroResponse === 'function'
16. "buildSystemPrompt is a function" -- typeof buildSystemPrompt === 'function'

### ACCEPTANCE CRITERIA

AUTO:
- AC-1: callDM, validateDMResponse, validateSessionZeroResponse, buildSystemPrompt all defined
- AC-2: All 4 PACKET_2_1 assertions show [PASS] in AssertionPanel
- AC-3: All 12 prior assertions still show [PASS] (no regression)
- AC-4: No localStorage or sessionStorage calls in API client functions
HUMAN:
- AC-H1: With a valid API key entered, clicking Begin Adventure (once wired in PACKET_2_2) will not throw
- AC-H2: buildSystemPrompt(gameState) returns a non-empty string (can test manually in browser console)

### REGRESSION SCOPE
Baseline (verify before starting work):
  Open App.jsx in artifact renderer. Verify no rendering errors. All 12 assertions (1_1 + 1_2 + 1_3) show [PASS].

Regression checks (verify after implementation):
  - All 12 prior AssertionPanel assertions still show [PASS]
  - SetupScreen and character/adventure selection still functional

If any regression check fails: this packet broke prior work. Do not commit. Rollback and fix.

### TESTING PROCEDURE
1. Open App.jsx in artifact renderer. Verify PACKET_1_1-1_3 baseline: 12 green [PASS].
2. Add API_CONSTANTS object above App component.
3. Implement callDM async function above App component.
4. Implement validateDMResponse function.
5. Implement validateSessionZeroResponse function.
6. Implement buildSystemPrompt function with all 3 layers.
7. Repaste artifact. Verify no render errors.
8. Verify AssertionPanel shows 16 total assertions (12 + 4), all green.
9. Inspect code: confirm fetch URL points to api.anthropic.com (not localhost).
10. Inspect code: confirm anthropic-dangerous-direct-browser-access: true header present.
11. Inspect code: confirm apiKey comes from parameter, not hardcoded or env var.
12. Inspect code: confirm no localStorage/sessionStorage/throw statements in callDM.
13. Inspect buildSystemPrompt: verify it includes all 3 layer sections in output.
14. git add App.jsx && git commit -m "PACKET_2_1: API Client Module (callDM + validator)"
15. Update BUILD_LOG.md with commit hash and outcome.

### EXECUTION CHECKLIST
- [ ] API_CONSTANTS defined (BASE_URL, MODEL, MAX_TOKENS, API_VERSION)
- [ ] callDM function: fetch, retry once, onError callback, never throw
- [ ] validateDMResponse: checks narrative, choices, state_updates presence
- [ ] validateSessionZeroResponse: checks story_device, hooks[3], campaign_spine
- [ ] buildSystemPrompt: 3-layer output, includes JSON schema reference
- [ ] 4 new assertions added (indexes 13-16), all [PASS]
- [ ] All 16 AUTO AC verified [PASS] in rendered artifact
- [ ] REGRESSION: All 12 prior assertions still [PASS]
- [ ] git commit with message "PACKET_2_1: API Client Module (callDM + validator)"

---

## PACKET_2_2: Session Zero (init call + hook cards)

```yaml
packet_id: PACKET_2_2
parallel_group: 5
depends_on: [PACKET_2_1]
blocks: [PACKET_3_1]
critical_path: YES
estimated_hours: 14
prd_features: [F021]
codex_patterns: []
codex_guards: []
```

### CONTEXT
This packet wires the "Begin Adventure" button to the Session Zero API init call, implements the loading state with cycling lore tidbits, receives the SessionZeroResponse, and renders the 3 hook cards for the player to choose from. After the player selects a hook, a 1.5-second transition card shows before transitioning to the GameScreen. This packet also initializes the campaign in gameState from the SessionZeroResponse. After this packet, the full setup-to-game flow is operational end-to-end (though narrative engine comes in PACKET_3_1).

### PRODUCES
Files created: none
Files modified: App.jsx
Schema created: none
Schema modified: none
API routes: none
Env vars added: none
Env vars needed: none
Exports: SessionZeroScreen component, HookCard component, LoadingTidbits component, initializeSession function

### ASSUMES
Files exist: App.jsx with PACKET_1_1 through 2_1 content
Schema exists: none
API routes: none
Env vars set: none
State: apiKey in React state, selectedCharId and selectedAdventureId in SetupScreen local state, callDM and validateSessionZeroResponse available

### DESIGN SPECIFICATION

LoadingTidbits component: receives no props. Displays a cycling array of 7 Astra Rising lore tidbits. Each tidbit is a 1-2 sentence fact about the Astra Rising universe (Frontier space, CFW, the four races, The Vaash, etc.). Cycles every 3 seconds using useEffect + useState. Shows Loader icon spinning. Dark background. Text in yellow-400. Used during the API init call.

Lore tidbits array (7 items, embedded in component):
1. The Frontier spans seventeen inhabited star systems united under the Concordat of Free Worlds.
2. The four major races -- Human, Krix, Moluun, and Skrath -- each bring unique biological advantages to field operations.
3. The The Vaash are a serpentine race of unknown origin whose only known motivation is the destruction of all civilization.
4. Apex Law is the CFW's elite law enforcement agency, operating in the shadows between political systems.
5. Credits are the universal currency of the Frontier -- one credit buys a basic meal, one thousand buys a used skimmer.
6. Stamina Points represent a character's ability to absorb punishment. When they reach zero, the character falls unconscious.
7. The Korvath system, home of planet Cethara, sits on the frontier of explored space -- and beyond it lies the unknown.

initializeSession(selectedChar, selectedAdventure, sessionZeroResponse): function. Takes the selected character object (from CHARACTER_ROSTER), selected adventure object (from ADVENTURE_LIBRARY), and the parsed SessionZeroResponse. Returns a new gameState delta to be merged: { character: selectedChar (with stamina reset to max), campaign: { adventure_id, adventure_title, story_device, story_device_seed, spine: campaign_spine, npcs: key_npcs, factions: [], hooks: response.hooks, journal: [] }, meta: { ...current meta, initialized: true, loading: false } }.

HookCard component: receives { hook, index, onSelect }. Renders a card with hook.title as heading and hook.opening as narrative text. "Choose this hook" button at bottom. Style: bg-gray-800 border, rounded-xl, p-6. Hover: border-yellow-400 transition.

SessionZeroScreen component: the intermediate screen between SetupScreen and GameScreen. Has 3 states:
  - LOADING: shows LoadingTidbits while API call in flight
  - HOOKS: shows 3 HookCard components side by side (flex row, gap-4)
  - TRANSITION: shows a 1.5s "Preparing your adventure..." card with Loader icon, then fires onComplete callback

Begin Adventure flow:
  1. User clicks Begin Adventure in SetupScreen
  2. App sets gameState.meta.loading = true, phase = SESSION_ZERO
  3. Construct the init system prompt (Layer 1 + 2 static + Layer 3 with character + adventure basics)
  4. Build init messages: [{ role: 'user', content: initPromptText }] where initPromptText asks Claude to produce a SessionZeroResponse JSON for the selected adventure and character
  5. Call callDM(apiKey, messages, systemPrompt, onError)
  6. On success: validateSessionZeroResponse, then call initializeSession, update gameState
  7. Render SessionZeroScreen with hooks
  8. On hook select: show TRANSITION state for 1.5s, then set phase = GAME (renders GameScreen)

App phase states: SETUP | SESSION_ZERO | GAME (use a separate phase useState variable, not gameState)

### DATA REQUIREMENTS

Lore tidbits (7 items, exact content):
  1. The Frontier spans seventeen inhabited star systems united under the Concordat of Free Worlds.
  2. The four major races -- Human, Krix, Moluun, and Skrath -- each bring unique biological advantages to field operations.
  3. The The Vaash are a serpentine race of unknown origin whose only known motivation is the destruction of all civilization.
  4. Apex Law is the CFW's elite law enforcement agency, operating in the shadows between political systems.
  5. Credits are the universal currency of the Frontier -- one credit buys a basic meal, one thousand buys a used skimmer.
  6. Stamina Points represent a character's ability to absorb punishment. When they reach zero, the character falls unconscious.
  7. The Korvath system, home of planet Cethara, sits on the frontier of explored space.

SessionZeroResponse validation (from PACKET_2_1 validateSessionZeroResponse):
  Required: story_device (string), story_device_seed (string), hooks (array length 3),
            campaign_spine (object: act1_goal, act2_complication, act3_convergence),
            key_npcs (array)

initializeSession return shape:
  {
    character: { ...selectedChar, stamina: { current: selectedChar.stamina.max, max: selectedChar.stamina.max } },
    campaign: {
      adventure_id: selectedAdventure.id,
      adventure_title: selectedAdventure.title,
      story_device: response.story_device,
      story_device_seed: response.story_device_seed,
      spine: response.campaign_spine,
      npcs: response.key_npcs,
      factions: [],
      hooks: response.hooks,
      journal: []
    },
    meta: { ...currentMeta, initialized: true, loading: false }
  }

Phase states: 'SETUP' | 'SESSION_ZERO' | 'GAME'

Hook card display: hook.title (h3), hook.opening (paragraph), "Begin with this hook" button.

PACKET_2_2 assertions (indexes 17-19):
17. "initializeSession is a function" -- typeof initializeSession === 'function'
18. "LoadingTidbits renders without error" -- visual check (AC only)
19. "Phase variable exists in App state" -- verified by HookCard rendering conditional

### ACCEPTANCE CRITERIA

AUTO:
- AC-1: LoadingTidbits component renders lore tidbit text (visual)
- AC-2: All 3 PACKET_2_2 numeric assertions in AssertionPanel show [PASS]
- AC-3: All 16 prior assertions still show [PASS] (no regression)
- AC-4: With valid API key + character + adventure selected, clicking Begin Adventure triggers loading state
HUMAN:
- AC-H1: LoadingTidbits cycles through different lore text every 3 seconds
- AC-H2: After successful API call, 3 hook cards render side by side with titles and opening text
- AC-H3: Clicking a hook shows 1.5s transition card, then transitions to GameScreen placeholder

### REGRESSION SCOPE
Baseline (verify before starting work):
  Open App.jsx in artifact renderer. Verify no rendering errors. All 16 assertions (1_1 through 2_1) show [PASS].

Regression checks (verify after implementation):
  - All 16 prior AssertionPanel assertions still show [PASS]
  - Begin Adventure button still shows disabled when no character/adventure selected

If any regression check fails: this packet broke prior work. Do not commit. Rollback and fix.

### TESTING PROCEDURE
1. Open App.jsx in artifact renderer. Verify PACKET_2_1 baseline: 16 green [PASS].
2. Add lore tidbits array constant.
3. Implement LoadingTidbits component with 3s cycling effect.
4. Implement HookCard component.
5. Implement SessionZeroScreen component with LOADING / HOOKS / TRANSITION states.
6. Implement initializeSession function.
7. Add phase useState ('SETUP') to App component.
8. Wire Begin Adventure onClick to: set loading=true, set phase='SESSION_ZERO', call callDM init.
9. In App render: phase==='SETUP' show SetupScreen, phase==='SESSION_ZERO' show SessionZeroScreen.
10. Repaste artifact. Verify SetupScreen still shows.
11. Select character + adventure + enter test API key. Click Begin Adventure. Verify loading spinner appears.
12. (With real API key) Verify 3 hook cards appear after API responds.
13. Click a hook card. Verify 1.5s transition card shows. Verify GameScreen placeholder appears after.
14. Verify AssertionPanel shows all prior assertions [PASS].
15. git add App.jsx && git commit -m "PACKET_2_2: Session Zero (init call + hook cards)"
16. Update BUILD_LOG.md.

### EXECUTION CHECKLIST
- [ ] LoadingTidbits component with 7 lore tidbits cycling every 3s
- [ ] HookCard component renders hook.title and hook.opening
- [ ] SessionZeroScreen manages LOADING/HOOKS/TRANSITION states
- [ ] initializeSession function merges SessionZeroResponse into gameState shape
- [ ] Begin Adventure button wired to init flow
- [ ] Phase state variable added to App ('SETUP'/'SESSION_ZERO'/'GAME')
- [ ] 1.5s transition delay before switching to GAME phase
- [ ] All 19 AUTO AC verified [PASS] in rendered artifact
- [ ] REGRESSION: All 16 prior assertions still [PASS]
- [ ] git commit with message "PACKET_2_2: Session Zero (init call + hook cards)"

---

## PACKET_3_1: Narrative Engine (hook select, DM narration, choice menu)

```yaml
packet_id: PACKET_3_1
parallel_group: 6
depends_on: [PACKET_2_2]
blocks: [PACKET_3_2]
critical_path: YES
estimated_hours: 18
prd_features: [F003, F008, F010]
codex_patterns: []
codex_guards: []
```

### CONTEXT
This is the largest and most complex packet. It builds the core gameplay loop: the narrative display area, the player input/choice system, and the message handling that drives the DM conversation turn by turn. After this packet the game is playable in a basic form. It runs after PACKET_2_2 (needs the initialized gameState with campaign data) and before PACKET_3_2 (state manager applies DMResponse updates to gameState). The narrative engine sends player input to callDM and displays the returned narrative text with DMResponse choices rendered as clickable buttons.

### PRODUCES
Files created: none
Files modified: App.jsx
Schema created: none
Schema modified: none
API routes: none
Env vars added: none
Env vars needed: none
Exports: GameScreen component (replaces placeholder), NarrativePanel component, ChoiceMenu component, PlayerInput component, MessageHistory component, useDMTurn hook

### ASSUMES
Files exist: App.jsx with PACKET_1_1 through 2_2 content
Schema exists: none
API routes: none
Env vars set: none
State: gameState fully initialized after Session Zero, phase='GAME', campaign.hooks, session, scene all populated

### DESIGN SPECIFICATION

GameScreen component: replaces the placeholder. Full-width layout. Left column: character sheet placeholder (width w-64, replaced in PACKET_3_3). Right column: flex-1, flex-col. Right column contains: SceneHeader placeholder (top bar, replaced PACKET_7_2), MessageHistory (scrollable middle, flex-1), ChoiceMenu (bottom of scrollable area, appears when choices available), PlayerInput (fixed bottom bar).

MessageHistory component: receives { messages } array. Each message: { role ('dm'|'player'), content (string), timestamp }. DM messages: dark card, left-aligned, with "DM" badge. Player messages: right-aligned, lighter color. Scrolls to bottom on new message. useRef + useEffect to auto-scroll.

NarrativePanel: a styled div wrapping DM narrative text. Uses prose-friendly Tailwind: leading-relaxed, text-gray-100, text-base. DM text is rendered with preserved paragraph breaks (split on newlines, map to p tags).

ChoiceMenu component: receives { choices, onChoiceSelect, disabled }. Each choice is { id, text, action_type }. Renders as a vertical stack of buttons. Style: dark bg, border, full-width, text-left, px-4 py-2 rounded. On click: calls onChoiceSelect(choice). Disabled during API loading.

PlayerInput component: receives { onSubmit, disabled, firstTurnHint }. Text input + Send button. Pressing Enter also submits. firstTurnHint: string shown as placeholder when it's the first turn, disappears after first submission. Disabled during API loading. On submit: calls onSubmit(inputText), clears input.

useDMTurn hook: manages a gameplay turn:
  1. Takes player input (text or choice selection)
  2. Builds message array: prior conversation history + new player message
  3. Calls callDM with current system prompt (buildSystemPrompt(gameState))
  4. On response: validates with validateDMResponse
  5. Calls a state update callback (to be implemented in PACKET_3_2, stub here as console.log)
  6. Adds DM response narrative to message history
  7. Updates scene.turn_count in gameState

Message format for API:
  Each turn produces two messages added to history: { role: 'user', content: playerText } and { role: 'assistant', content: JSON.stringify(dmResponse) }
  Full history is sent each call (stateless model).

First-turn hint text: "Type your action or click a choice above. Example: I examine the area carefully." -- disappears after first player submission.

gameState updates from this packet: session.turn_count incremented, scene.recent_summaries updated if scene_change in DMResponse.

### DATA REQUIREMENTS

Message history item shape: { id: string, role: 'dm'|'player', content: string, timestamp: number }

useDMTurn hook input: { gameState, apiKey, onStateUpdate, onError, onNewMessage }
useDMTurn hook output: { submitTurn: function(text), loading: boolean, currentChoices: [] }

ChoiceMenu choice shape (subset of DMResponse.choices): { id, text, action_type }

PlayerInput firstTurnHint: shown as input placeholder until gameState.session.turn_count > 0.

Scene type tracking: on each turn, if DMResponse.scene_change is true, push new scene_header to scene.scene_type_history. scene.scene_count++ in session.

GameScreen layout Tailwind classes:
  Outer: flex h-screen bg-gray-900 text-gray-100 overflow-hidden
  Left sidebar: w-64 bg-gray-800 flex-shrink-0 (character sheet, PACKET_3_3)
  Right main: flex-1 flex flex-col min-h-0
  SceneHeader bar: h-12 bg-gray-800 border-b border-gray-700 (PACKET_7_2)
  MessageHistory: flex-1 overflow-y-auto p-4
  ChoiceMenu: px-4 pb-2
  PlayerInput: px-4 py-3 bg-gray-800 border-t border-gray-700

PACKET_3_1 assertions (indexes 20-23):
20. "useDMTurn submitTurn is a function" -- verified by hook export
21. "MessageHistory renders empty without error" -- visual check
22. "ChoiceMenu renders choices array" -- visual check with mock data
23. "session.turn_count starts at 0" -- gameState.session.turn_count === 0 before first turn

### ACCEPTANCE CRITERIA

AUTO:
- AC-1: GameScreen renders with correct 3-zone layout (sidebar, header bar, message area)
- AC-2: AssertionPanel shows all 23 assertions [PASS] (4 new + 19 prior)
- AC-3: PlayerInput renders with text field and Send button visible
- AC-4: No regression in prior assertions
HUMAN:
- AC-H1: After transitioning to GameScreen, narrative text from DM appears in message history
- AC-H2: Choice buttons render below DM narrative and clicking one sends the choice as player input
- AC-H3: First-turn hint text appears in input field placeholder and disappears after first submission
- AC-H4: PlayerInput disables during API call and re-enables after response

### REGRESSION SCOPE
Baseline (verify before starting work):
  Open App.jsx in artifact renderer. Verify no rendering errors. All 19 assertions (1_1 through 2_2) show [PASS].

Regression checks (verify after implementation):
  - All 19 prior AssertionPanel assertions still show [PASS]
  - Session Zero flow still works end-to-end

If any regression check fails: this packet broke prior work. Do not commit. Rollback and fix.

### TESTING PROCEDURE
1. Open App.jsx in artifact renderer. Verify PACKET_2_2 baseline: 19 green [PASS].
2. Implement useDMTurn hook above App component.
3. Implement MessageHistory component.
4. Implement ChoiceMenu component.
5. Implement PlayerInput component.
6. Implement GameScreen component replacing the placeholder.
7. Wire useDMTurn into GameScreen.
8. Repaste artifact. Verify GameScreen renders for phase='GAME'.
9. Complete Session Zero flow with real API key. Verify GameScreen appears after hook selection.
10. Verify DM opening narrative text is visible in MessageHistory.
11. Verify ChoiceMenu shows the choices returned by first DM response.
12. Click a choice. Verify it is added to message history as player message and new DM response appears.
13. Type a free-form action in PlayerInput. Press Enter. Verify it submits and DM responds.
14. Verify first-turn hint disappears after first submission.
15. Verify AssertionPanel shows 23 assertions, all green.
16. git add App.jsx && git commit -m "PACKET_3_1: Narrative Engine (hook select, DM narration, choice menu)"
17. Update BUILD_LOG.md.

### EXECUTION CHECKLIST
- [ ] useDMTurn hook implemented with submitTurn, loading, currentChoices
- [ ] MessageHistory component with auto-scroll
- [ ] ChoiceMenu component with disabled state during loading
- [ ] PlayerInput component with first-turn hint and Enter key support
- [ ] GameScreen component with correct 3-zone layout
- [ ] callDM wired for gameplay turns (not just init)
- [ ] First-turn hint disappears after first submission
- [ ] 4 new assertions added (indexes 20-23), all [PASS]
- [ ] All 23 AUTO AC verified [PASS] in rendered artifact
- [ ] REGRESSION: All 19 prior assertions still [PASS]
- [ ] git commit with message "PACKET_3_1: Narrative Engine (hook select, DM narration, choice menu)"

---

## PACKET_3_2: State Manager (applyStateUpdates)

```yaml
packet_id: PACKET_3_2
parallel_group: 7
depends_on: [PACKET_3_1]
blocks: [PACKET_3_3]
critical_path: YES
estimated_hours: 16
prd_features: [F011, F012, F013]
codex_patterns: []
codex_guards: []
```

### CONTEXT
This packet implements the state manager: the applyStateUpdates function that takes a DMResponse.state_updates object and mutates the gameState accordingly. It also implements NPC tracking, faction tracking, and campaign journal updates. This is purely a logic packet -- no new UI components. It runs after PACKET_3_1 (needs the DMResponse flowing from the narrative engine) and before PACKET_3_3 (CharacterSheet sidebar reads the state that this packet updates). The state manager follows the error-handling contract: clamp stamina, SEU fallback, invalid inventory = silent no-op.

### PRODUCES
Files created: none
Files modified: App.jsx
Schema created: none
Schema modified: none
API routes: none
Env vars added: none
Env vars needed: none
Exports: applyStateUpdates function, clampStamina helper, applySeuDelta helper, applyInventory helpers, applyNpcUpdates function, applyFactionUpdates function, applyJournalEntry function

### ASSUMES
Files exist: App.jsx with PACKET_1_1 through 3_1 content
Schema exists: none
API routes: none
Env vars set: none
State: gameState fully initialized with character, campaign, session, scene

### DESIGN SPECIFICATION

applyStateUpdates(gameState, stateUpdates): pure function (no side effects). Takes current gameState and DMResponse.state_updates. Returns new gameState (immutable update -- spread operator pattern, never mutate in place). Applies in this order:

1. stamina_delta: clamp result to [0, character.stamina.max]. If delta would push below 0, set to 0. Never throw.
2. seu_delta: reduce SEU from sources in order. If seu_source specified and valid, use that source. If not found, fall back to first source with remaining SEU. If total SEU already 0, no-op.
3. ammo_updates: for each key in ammo_updates, update character.ammo[key]. Clamp to 0 minimum.
4. status_add: push to character.status_effects if not already present.
5. status_remove: filter out from character.status_effects.
6. inventory_add: push string items to character.inventory. If item is empty string or null, no-op.
7. inventory_remove: filter out by string match. If item not in inventory, no-op (no error).
8. xp_delta: add to character.xp.total and character.xp.unspent.
9. credits_delta: add to character.credits. Clamp to 0 minimum.
10. npc_updates: call applyNpcUpdates.
11. faction_updates: call applyFactionUpdates.
12. journal_entry: if non-null string, call applyJournalEntry.

applyNpcUpdates(campaign, npc_updates): for each update in npc_updates, find NPC in campaign.npcs by name. If found, merge update fields. If not found, add new NPC object to campaign.npcs.

applyFactionUpdates(campaign, faction_updates): same pattern as NPC. Merge or add faction by name.

applyJournalEntry(campaign, entry): push { timestamp: Date.now(), entry } to campaign.journal.

clampStamina(current, delta, max): pure function. Returns Math.max(0, Math.min(max, current + delta)).

applySeuDelta(seu, delta, seu_source): pure function. Reduces SEU from sources. Returns updated seu object.

Wire applyStateUpdates into useDMTurn hook (replacing the console.log stub from PACKET_3_1). After callDM returns a valid DMResponse, call applyStateUpdates(gameState, response.state_updates) and use the result to update gameState via setGameState.

Also update scene from DMResponse:
  If scene_change: set scene.header = response.scene_header, push response.scene_summary to recent_summaries, increment session.scene_count.
  Always: set scene.summary = response.scene_summary if non-null.

### DATA REQUIREMENTS

DMResponse.state_updates shape (all fields optional, all should be null/[] if not used):
  stamina_delta: int (negative = damage, positive = heal)
  seu_delta: int (negative = SEU used)
  seu_source: string|null (name of SEU source, e.g. 'M-3 clip')
  ammo_updates: object { [weapon_id]: delta } | null
  status_add: string[] | null
  status_remove: string[] | null
  inventory_add: string[] | null
  inventory_remove: string[] | null
  xp_delta: int | null
  credits_delta: int | null
  npc_updates: [{name, role, goal, attitude, condition}] | null
  faction_updates: [{name, standing_delta, note}] | null
  journal_entry: string | null

NPC object shape in campaign.npcs:
  { name: string, role: string, goal: string, attitude: string, condition: string }

Faction object shape in campaign.factions:
  { name: string, standing: int, notes: string[] }

Error handling rules for state updates:
  - clamp stamina to [0, max] -- never throw, never go negative
  - SEU delta: if sum of all seu sources would go negative, clamp sources to 0
  - Missing inventory item on remove: no-op, no error
  - Missing NPC on update: add as new NPC
  - Null/undefined state_updates: return gameState unchanged

PACKET_3_2 assertions (indexes 24-27):
24. "applyStateUpdates is a function" -- typeof applyStateUpdates === 'function'
25. "clampStamina(50, -60, 55) === 0" -- clampStamina(50, -60, 55) === 0
26. "clampStamina(50, 10, 55) === 55" -- clampStamina(50, 10, 55) === 55
27. "applyStateUpdates returns new object (immutable)" -- verified by !== identity check on mock call

### ACCEPTANCE CRITERIA

AUTO:
- AC-1: applyStateUpdates function defined and exported
- AC-2: All 4 PACKET_3_2 assertions show [PASS] in AssertionPanel
- AC-3: All 23 prior assertions still show [PASS] (no regression)
- AC-4: stamina_delta clamp logic is present in applyStateUpdates code
HUMAN:
- AC-H1: After taking damage in game, character stamina decreases correctly in UI (once PACKET_3_3 renders it)
- AC-H2: Stamina cannot go below 0 (test with large negative delta)
- AC-H3: Journal entries appear in campaign.journal after DM returns journal_entry

### REGRESSION SCOPE
Baseline (verify before starting work):
  Open App.jsx in artifact renderer. Verify no rendering errors. All 23 assertions (1_1 through 3_1) show [PASS].

Regression checks (verify after implementation):
  - All 23 prior AssertionPanel assertions still show [PASS]
  - Narrative engine (PACKET_3_1) still processes DM turns

If any regression check fails: this packet broke prior work. Do not commit. Rollback and fix.

### TESTING PROCEDURE
1. Open App.jsx in artifact renderer. Verify PACKET_3_1 baseline: 23 green [PASS].
2. Implement clampStamina pure function at module level.
3. Implement applySeuDelta pure function.
4. Implement applyNpcUpdates function.
5. Implement applyFactionUpdates function.
6. Implement applyJournalEntry function.
7. Implement applyStateUpdates orchestrating all helpers.
8. Wire applyStateUpdates into useDMTurn (replace console.log stub).
9. Repaste artifact. Verify no render errors.
10. Verify AssertionPanel shows 27 assertions (23 + 4), all green.
11. Verify clampStamina assertion checks pass.
12. Run a gameplay turn. Verify gameState.campaign.journal is updated if DM returns journal_entry.
13. Verify scene_change handling: if DM returns scene_change=true, scene.header updates.
14. git add App.jsx && git commit -m "PACKET_3_2: State Manager (applyStateUpdates)"
15. Update BUILD_LOG.md.

### EXECUTION CHECKLIST
- [ ] clampStamina pure function with unit-test-ready logic
- [ ] applySeuDelta with source-ordered deduction and clamping
- [ ] applyNpcUpdates with find-or-add pattern
- [ ] applyFactionUpdates with find-or-add pattern
- [ ] applyJournalEntry pushes to campaign.journal
- [ ] applyStateUpdates is immutable (spread pattern, no mutation)
- [ ] useDMTurn wired to call applyStateUpdates after each DMResponse
- [ ] 4 new assertions added (indexes 24-27), all [PASS]
- [ ] All 27 AUTO AC verified [PASS] in rendered artifact
- [ ] REGRESSION: All 23 prior assertions still [PASS]
- [ ] git commit with message "PACKET_3_2: State Manager (applyStateUpdates)"

---

## PACKET_3_3: Character Sheet Sidebar

```yaml
packet_id: PACKET_3_3
parallel_group: 8
depends_on: [PACKET_3_2]
blocks: [PACKET_4_1]
critical_path: YES
estimated_hours: 12
prd_features: [F002, F004]
codex_patterns: []
codex_guards: []
```

### CONTEXT
This packet replaces the left sidebar placeholder with the real CharacterSheet component. It reads live data from gameState.character (which is now being updated by PACKET_3_2's applyStateUpdates). The sidebar shows all character vitals, skills, inventory, SEU, and status effects. It is read-only during gameplay (no edits allowed by player). It runs after PACKET_3_2 so that the character state is being properly maintained before the sidebar displays it.

### PRODUCES
Files created: none
Files modified: App.jsx
Schema created: none
Schema modified: none
API routes: none
Env vars added: none
Env vars needed: none
Exports: CharacterSheet component, StaminaBar component, SkillBadge component, InventoryList component

### ASSUMES
Files exist: App.jsx with PACKET_1_1 through 3_2 content
Schema exists: none
API routes: none
Env vars set: none
State: gameState.character fully populated after Session Zero init

### DESIGN SPECIFICATION

CharacterSheet component: receives { character } prop. Full left sidebar component. Scrollable internally (overflow-y-auto). Sections in order:

HEADER: character name (large bold text-yellow-400), race + archetype on second line (text-gray-400). IM value badge inline.

STAMINA SECTION: "Stamina" label. StaminaBar component. Current / Max numbers. If current < 25% of max: text-red-400 warning.

StaminaBar: a horizontal progress bar. Width proportional to current/max. Color: green > 50%, yellow 25-50%, red < 25%. Standard Tailwind height class h-2, rounded-full.

STATS SECTION: "Stats" label. 4x2 grid of stat abbreviations + values. STR STA DEX RS / INT LOG PER LDR. Small text, monospace-friendly.

SKILLS SECTION: "Skills" label. List of { name, level } with level shown as small numbered badge (bg-gray-700).

STATUS EFFECTS: "Status" label (hidden if empty). Chip badges for each status effect string. Red badge for negative statuses (wound, stunned), yellow for neutral.

SEU SECTION: "SEU" label. Total remaining. Breakdown: each source name + current seu. Simple text list.

INVENTORY SECTION: "Inventory" label. Bullet list of inventory strings.

CREDITS/XP FOOTER: Credits (cr symbol), XP total / unspent. Small text at bottom.

The CharacterSheet replaces the left sidebar placeholder div in GameScreen. No changes to GameScreen layout logic -- just replace the placeholder content.

### DATA REQUIREMENTS

CharacterSheet input (gameState.character):
  name, race, archetype, stats (8 fields), combat.im,
  stamina: { current, max },
  skills: [{ name, level }],
  status_effects: [string],
  seu: { total, sources: [{ name, seu }] },
  inventory: [string],
  credits: int,
  xp: { total, unspent }

StaminaBar color thresholds:
  > 50% max: bg-green-500
  25-50% max: bg-yellow-500
  < 25% max: bg-red-500

Stat abbreviations: STR, STA, DEX, RS, INT, LOG, PER, LDR
Stat grid order: STR STA DEX RS (top row), INT LOG PER LDR (bottom row)

PACKET_3_3 assertions (indexes 28-30):
28. "CharacterSheet renders when character is not null" -- visual check
29. "StaminaBar is a function" -- typeof StaminaBar === 'function'
30. "SkillBadge is a function" -- typeof SkillBadge === 'function'

### ACCEPTANCE CRITERIA

AUTO:
- AC-1: CharacterSheet component defined
- AC-2: All 3 PACKET_3_3 assertions show [PASS]
- AC-3: All 27 prior assertions still show [PASS] (no regression)
- AC-4: CharacterSheet renders in GameScreen left sidebar when game is active
HUMAN:
- AC-H1: Character name, race, and archetype visible in left sidebar
- AC-H2: StaminaBar changes color based on current stamina percentage
- AC-H3: Taking damage in game updates stamina bar in real time

### REGRESSION SCOPE
Baseline (verify before starting work):
  Open App.jsx in artifact renderer. Verify no rendering errors. All 27 assertions (1_1 through 3_2) show [PASS].

Regression checks (verify after implementation):
  - All 27 prior AssertionPanel assertions still show [PASS]
  - GameScreen layout not broken (sidebar + main area still correct proportions)

If any regression check fails: this packet broke prior work. Do not commit. Rollback and fix.

### TESTING PROCEDURE
1. Open App.jsx in artifact renderer. Verify PACKET_3_2 baseline: 27 green [PASS].
2. Implement StaminaBar component.
3. Implement SkillBadge component.
4. Implement InventoryList component.
5. Implement CharacterSheet component using all sub-components.
6. Replace left sidebar placeholder in GameScreen with <CharacterSheet character={gameState.character} />.
7. Add null guard: if !gameState.character render null or slim placeholder.
8. Repaste artifact. Verify no render errors in SetupScreen (character null = safe).
9. Complete Session Zero flow. Verify CharacterSheet renders with selected character data.
10. Verify StaminaBar is visible with correct color.
11. Verify skills, inventory, SEU sections render.
12. Simulate stamina damage via a test turn. Verify StaminaBar updates.
13. Verify AssertionPanel shows 30 assertions, all green.
14. git add App.jsx && git commit -m "PACKET_3_3: Character Sheet Sidebar"
15. Update BUILD_LOG.md.

### EXECUTION CHECKLIST
- [ ] StaminaBar with color thresholds (green/yellow/red)
- [ ] SkillBadge component for skill list rendering
- [ ] InventoryList component
- [ ] CharacterSheet with all sections (header, stamina, stats, skills, status, seu, inventory, credits/xp)
- [ ] Null guard: CharacterSheet handles character=null safely
- [ ] GameScreen left sidebar updated to use CharacterSheet
- [ ] 3 new assertions added (indexes 28-30), all [PASS]
- [ ] All 30 AUTO AC verified [PASS] in rendered artifact
- [ ] REGRESSION: All 27 prior assertions still [PASS]
- [ ] git commit with message "PACKET_3_3: Character Sheet Sidebar"

---

## PACKET_4_1: Combat Engine

```yaml
packet_id: PACKET_4_1
parallel_group: 9
depends_on: [PACKET_3_3]
blocks: [PACKET_4_2]
critical_path: YES
estimated_hours: 18
prd_features: [F009]
codex_patterns: []
codex_guards: []
```

### CONTEXT
This packet implements the Astra Rising Core combat system logic: initiative rolling, attack resolution (percentile roll under target), damage calculation, optional rules flags, and the CombatState management. When DMResponse.scene.in_combat becomes true, the combat engine activates. The engine does not render combat UI (that is PACKET_4_2) but exposes all the functions and state that PACKET_4_2 will display. The Astra Rising Core rules: roll d100 equal to or under skill target to hit. Damage: weapon damage + PS modifier. Optional rules tracked as flags in CombatState.

### PRODUCES
Files created: none
Files modified: App.jsx
Schema created: none
Schema modified: none
API routes: none
Env vars added: none
Env vars needed: none
Exports: rollD100 function, resolveAttack function, rollInitiative function, applyCombatStateUpdate function, COMBAT_PHASES constant, OPTIONAL_RULES_DEFAULT constant

### ASSUMES
Files exist: App.jsx with PACKET_1_1 through 3_3 content
Schema exists: none
API routes: none
Env vars set: none
State: gameState.scene.in_combat, gameState.scene.combat_state, applyStateUpdates available

### DESIGN SPECIFICATION

rollD100(): function. Returns Math.floor(Math.random() * 100) + 1. Returns integer 1-100.

resolveAttack(skillLevel, modifiers): function. Calculates target number = base skill target (10 * skillLevel) + sum(modifiers). Calls rollD100(). Returns { roll, target, success: roll <= target, margin: target - roll }.

rollInitiative(im, rs): function. IM stat determines base. Roll 1d10, add IM. Returns initiative value. Lower IM = faster. Formula from Astra Rising Core: initiative = (10 - IM) + d10 roll, lower is faster.

applyCombatStateUpdate(scene, combatStateUpdate): function. Takes current scene and a CombatState update from DMResponse. Returns updated scene with scene.combat_state merged/replaced. Also updates scene.in_combat = true if combatants present, false if combat_state_update has an empty or null combatants field (combat ended).

COMBAT_PHASES constant: { INITIATIVE: 'initiative', PLAYER_TURN: 'player_turn', ENEMY_TURN: 'enemy_turn', END: 'end' }

OPTIONAL_RULES_DEFAULT constant: { burst_fire: false, called_shots: false, cover_concealment: false, suppression_fire: false }

CombatState management: when DMResponse includes combat_state_update, call applyCombatStateUpdate and merge result into gameState.scene. Wire this call in the applyStateUpdates flow from PACKET_3_2 (add combat state handling after the existing state_updates logic).

Combat state ends: if DMResponse.combat_state_update has combatants array = [] or null, set scene.in_combat = false and scene.combat_state = null.

Astra Rising Core percentile rules encoded as constants:
  BASE_SKILL_TARGET: level => level * 10 (Beam Weapons 2 = 20% base, modified by range, cover, etc.)
  POINT_BLANK_MODIFIER: +20
  SHORT_RANGE_MODIFIER: +10
  MEDIUM_RANGE_MODIFIER: 0
  LONG_RANGE_MODIFIER: -10
  EXTREME_RANGE_MODIFIER: -20

### DATA REQUIREMENTS

CombatState shape (from PRD Section 28):
  round: int
  phase: string (one of COMBAT_PHASES values)
  initiative_order: [{ id, name, is_player, initiative_roll, has_acted }]
  combatants: [{ id, name, is_player, condition, status_effects, cover }]
  active_optional_rules: { burst_fire, called_shots, cover_concealment, suppression_fire }

resolveAttack return shape:
  { roll: int, target: int, success: boolean, margin: int }

rollInitiative parameters:
  im: int (character's Initiative Modifier stat)
  rs: int (character's Reaction Speed stat, used as tiebreaker)
  Returns: int (initiative value, lower = acts first)

applyCombatStateUpdate input:
  scene: current scene object from gameState
  combatStateUpdate: DMResponse.combat_state_update (CombatState or null)
  Returns: updated scene object

PACKET_4_1 assertions (indexes 31-34):
31. "rollD100 returns int in [1,100]" -- rollD100() >= 1 && rollD100() <= 100
32. "resolveAttack is a function" -- typeof resolveAttack === 'function'
33. "COMBAT_PHASES has 4 keys" -- Object.keys(COMBAT_PHASES).length === 4
34. "applyCombatStateUpdate is a function" -- typeof applyCombatStateUpdate === 'function'

### ACCEPTANCE CRITERIA

AUTO:
- AC-1: rollD100, resolveAttack, rollInitiative, applyCombatStateUpdate all defined
- AC-2: All 4 PACKET_4_1 assertions show [PASS]
- AC-3: All 30 prior assertions still show [PASS] (no regression)
- AC-4: COMBAT_PHASES and OPTIONAL_RULES_DEFAULT constants defined
HUMAN:
- AC-H1: In a combat encounter (when DM activates combat), scene.in_combat becomes true in gameState
- AC-H2: Combat ends and scene.in_combat returns to false when DM sends empty combatants

### REGRESSION SCOPE
Baseline (verify before starting work):
  Open App.jsx in artifact renderer. Verify no rendering errors. All 30 assertions (1_1 through 3_3) show [PASS].

Regression checks (verify after implementation):
  - All 30 prior AssertionPanel assertions still show [PASS]
  - State manager (PACKET_3_2) still functions correctly for non-combat updates

If any regression check fails: this packet broke prior work. Do not commit. Rollback and fix.

### TESTING PROCEDURE
1. Open App.jsx in artifact renderer. Verify PACKET_3_3 baseline: 30 green [PASS].
2. Add COMBAT_PHASES constant.
3. Add OPTIONAL_RULES_DEFAULT constant.
4. Add range modifier constants.
5. Implement rollD100 function.
6. Implement resolveAttack function.
7. Implement rollInitiative function.
8. Implement applyCombatStateUpdate function.
9. Wire applyCombatStateUpdate into applyStateUpdates (after existing update logic).
10. Repaste artifact. Verify no render errors.
11. Verify AssertionPanel shows 34 assertions, all green.
12. Verify rollD100 assertion (31) passes -- value in [1,100].
13. Run a gameplay turn where DM returns combat_state_update. Verify scene.in_combat = true.
14. git add App.jsx && git commit -m "PACKET_4_1: Combat Engine"
15. Update BUILD_LOG.md.

### EXECUTION CHECKLIST
- [ ] COMBAT_PHASES constant with 4 phases
- [ ] OPTIONAL_RULES_DEFAULT constant
- [ ] rollD100 pure function (1-100 integer)
- [ ] resolveAttack with percentile target calculation
- [ ] rollInitiative function
- [ ] applyCombatStateUpdate with in_combat flag management
- [ ] Combat update wired into applyStateUpdates flow
- [ ] 4 new assertions added (indexes 31-34), all [PASS]
- [ ] All 34 AUTO AC verified [PASS] in rendered artifact
- [ ] REGRESSION: All 30 prior assertions still [PASS]
- [ ] git commit with message "PACKET_4_1: Combat Engine"

---

## PACKET_4_2: Combat UI (dice display, initiative tracker, optional rules)

```yaml
packet_id: PACKET_4_2
parallel_group: 10
depends_on: [PACKET_4_1]
blocks: [PACKET_5_1]
critical_path: YES
estimated_hours: 16
prd_features: [F005, F009]
codex_patterns: []
codex_guards: []
```

### CONTEXT
This packet builds the combat UI: the dice roll display, the initiative order tracker, and the optional rules toggle panel. These components are only visible when scene.in_combat is true. The dice display shows each roll that occurred in a DMResponse.dice_rolls array. The initiative tracker shows the current turn order. Optional rules toggles allow the DM (AI) to flag which rules are active for the current combat encounter. This packet runs after PACKET_4_1 (needs CombatState data and combat engine functions) and before PACKET_5_1 (meta controls need to know if combat is active).

### PRODUCES
Files created: none
Files modified: App.jsx
Schema created: none
Schema modified: none
API routes: none
Env vars added: none
Env vars needed: none
Exports: CombatPanel component, DiceRollDisplay component, InitiativeTracker component, OptionalRulesPanel component

### ASSUMES
Files exist: App.jsx with PACKET_1_1 through 4_1 content
Schema exists: none
API routes: none
Env vars set: none
State: gameState.scene.in_combat, gameState.scene.combat_state, DMResponse.dice_rolls available in turn history

### DESIGN SPECIFICATION

CombatPanel component: receives { combatState, diceRolls, onToggleOptionalRule }. Container for all combat UI sub-components. Only renders when scene.in_combat is true. Position: between MessageHistory and ChoiceMenu in GameScreen right column. Collapsible with a toggle button (Show/Hide Combat Stats).

DiceRollDisplay component: receives { diceRolls } -- array of { description, target, roll, success }. Renders each roll as a small card: die icon (use a d20 representation with a Shield or Zap icon), roll number (large), target number, success/fail badge (green/red). If diceRolls is empty or null, renders nothing. Horizontal scroll if many rolls.

InitiativeTracker component: receives { initiativeOrder } -- array of { id, name, is_player, initiative_roll, has_acted }. Renders as a vertical list. Active combatant (first has_acted=false) highlighted in yellow. Player row has a User icon. Enemy rows have different styling. Show round number from combatState.round.

OptionalRulesPanel component: receives { activeOptionalRules, onToggle }. Renders 4 toggle switches or checkboxes (one per optional rule): Burst Fire, Called Shots, Cover/Concealment, Suppression Fire. Each has a brief tooltip label. Toggles update local display state -- they are read from combatState.active_optional_rules (DM sets them, player can see but not override). Display only -- no player-controlled toggles. Just show which rules the DM has activated.

Integration into GameScreen: insert CombatPanel between MessageHistory area and ChoiceMenu when scene.in_combat is true. CombatPanel should not push PlayerInput off screen -- keep overall layout using overflow-y-auto correctly.

Dice roll history: store the last 5 dice_rolls arrays from DMResponses in a diceRollHistory local state in GameScreen. Pass most recent to DiceRollDisplay.

### DATA REQUIREMENTS

DiceRoll item shape (from DMResponse.dice_rolls):
  { description: string, target: int, roll: int, success: boolean }

InitiativeOrder item shape (from CombatState.initiative_order):
  { id: string, name: string, is_player: boolean, initiative_roll: int, has_acted: boolean }

CombatState.active_optional_rules shape:
  { burst_fire: bool, called_shots: bool, cover_concealment: bool, suppression_fire: bool }

Optional rule display names:
  burst_fire -> "Burst Fire"
  called_shots -> "Called Shots"
  cover_concealment -> "Cover & Concealment"
  suppression_fire -> "Suppression Fire"

CombatPanel visibility: {gameState.scene.in_combat && <CombatPanel ... />}

Dice roll card styling: bg-gray-700 rounded p-2, roll number text-2xl font-bold, success text-green-400, fail text-red-400.

PACKET_4_2 assertions (indexes 35-37):
35. "CombatPanel is a function" -- typeof CombatPanel === 'function'
36. "DiceRollDisplay is a function" -- typeof DiceRollDisplay === 'function'
37. "InitiativeTracker is a function" -- typeof InitiativeTracker === 'function'

### ACCEPTANCE CRITERIA

AUTO:
- AC-1: CombatPanel, DiceRollDisplay, InitiativeTracker, OptionalRulesPanel all defined
- AC-2: All 3 PACKET_4_2 assertions show [PASS]
- AC-3: All 34 prior assertions still show [PASS] (no regression)
- AC-4: CombatPanel does not render when scene.in_combat is false
HUMAN:
- AC-H1: When DM activates combat, CombatPanel appears above choices and shows initiative order
- AC-H2: Dice rolls from DM response are visible as cards with roll/target/success display
- AC-H3: Optional rules panel shows which rules the DM has activated for current combat

### REGRESSION SCOPE
Baseline (verify before starting work):
  Open App.jsx in artifact renderer. Verify no rendering errors. All 34 assertions (1_1 through 4_1) show [PASS].

Regression checks (verify after implementation):
  - All 34 prior AssertionPanel assertions still show [PASS]
  - GameScreen layout not broken by CombatPanel insertion

If any regression check fails: this packet broke prior work. Do not commit. Rollback and fix.

### TESTING PROCEDURE
1. Open App.jsx in artifact renderer. Verify PACKET_4_1 baseline: 34 green [PASS].
2. Implement DiceRollDisplay component.
3. Implement InitiativeTracker component.
4. Implement OptionalRulesPanel component.
5. Implement CombatPanel wrapping all combat sub-components.
6. Insert CombatPanel into GameScreen between MessageHistory and ChoiceMenu.
7. Add diceRollHistory local state in GameScreen, updated from useDMTurn.
8. Repaste artifact. Verify no render errors. Verify CombatPanel hidden in non-combat state.
9. Test with a combat scenario (real API): verify CombatPanel appears, initiative order shown.
10. Verify dice rolls display as cards with correct color coding.
11. Verify CombatPanel collapse toggle works (show/hide).
12. Verify AssertionPanel shows 37 assertions, all green.
13. git add App.jsx && git commit -m "PACKET_4_2: Combat UI (dice display, initiative, optional rules)"
14. Update BUILD_LOG.md.

### EXECUTION CHECKLIST
- [ ] DiceRollDisplay with success/fail color coding
- [ ] InitiativeTracker with active combatant highlight
- [ ] OptionalRulesPanel showing DM-controlled rule flags
- [ ] CombatPanel wrapping all three, collapsible
- [ ] CombatPanel only renders when scene.in_combat is true
- [ ] diceRollHistory stored in GameScreen local state
- [ ] 3 new assertions added (indexes 35-37), all [PASS]
- [ ] All 37 AUTO AC verified [PASS] in rendered artifact
- [ ] REGRESSION: All 34 prior assertions still [PASS]
- [ ] git commit with message "PACKET_4_2: Combat UI (dice display, initiative, optional rules)"

---

## PACKET_5_1: Meta Controls

```yaml
packet_id: PACKET_5_1
parallel_group: 11
depends_on: [PACKET_4_2]
blocks: [PACKET_5_2]
critical_path: YES
estimated_hours: 12
prd_features: [F015, F017]
codex_patterns: []
codex_guards: []
```

### CONTEXT
This packet adds the meta-game control layer: session snapshots (manual save points stored in meta.snapshots), the ability to restore a snapshot, an "Ask DM" escape hatch button that pre-fills a player input with a help request, and the OOC (out-of-character) note display when DMResponse.ooc_note is non-null. These controls are combat-aware: snapshot is disabled during combat (to avoid snapshotting mid-combat state). This packet runs after PACKET_4_2 (needs combat state visibility for the snapshot disable logic) and before PACKET_5_2 (journal and summary card use snapshot triggers).

### PRODUCES
Files created: none
Files modified: App.jsx
Schema created: none
Schema modified: none
API routes: none
Env vars added: none
Env vars needed: none
Exports: MetaControlsBar component, SnapshotButton component, AskDmButton component, OocNote component, createSnapshot function, restoreSnapshot function

### ASSUMES
Files exist: App.jsx with PACKET_1_1 through 4_2 content
Schema exists: none
API routes: none
Env vars set: none
State: gameState.meta.snapshots array, gameState.scene.in_combat, gameState.session.turn_count

### DESIGN SPECIFICATION

createSnapshot(gameState): function. Returns a snapshot object: { id: Date.now().toString(), timestamp: Date.now(), turn_count: gameState.session.turn_count, scene_count: gameState.session.scene_count, state_snapshot: JSON.parse(JSON.stringify(gameState)) }. Deep clones gameState to avoid reference issues. Snapshots are stored in gameState.meta.snapshots (push to array). Max 5 snapshots kept (slice to last 5).

restoreSnapshot(snapshot): function. Returns the state_snapshot from the snapshot object to be set as the new gameState via setGameState.

MetaControlsBar component: a horizontal bar of meta control buttons. Rendered in the GameScreen header area or as a floating bar. Contains: SnapshotButton, AskDmButton, and a snapshot history dropdown (list of last 5 snapshots with timestamps).

SnapshotButton: "Save Checkpoint" button. Disabled when scene.in_combat is true. On click: calls createSnapshot, adds to meta.snapshots (via setGameState), shows brief success toast ("Checkpoint saved").

AskDmButton: "Ask DM" button. On click: pre-fills PlayerInput text field with "OOC: I need clarification about...". Uses a shared inputRef or callback to set the player input value. Does NOT submit -- just fills the field so the player can complete and send.

OocNote component: receives { oocNote } string. Renders a yellow info box (bg-yellow-900 border-yellow-600) above the ChoiceMenu when oocNote is non-null. Shows the DM's out-of-character note. Dismissable (X button sets local dismissed state).

Snapshot dropdown: shows list of up to 5 snapshots. Each entry: "Turn N -- Scene N (HH:MM:SS)". Clicking one shows a confirmation modal: "Restore to Turn N? This will undo all progress since this checkpoint." Confirm button calls restoreSnapshot.

Toast notification: a simple timed div (3s auto-dismiss) in the top-right or bottom-center of the screen. Used for "Checkpoint saved" confirmation. No external library -- simple useState + setTimeout.

### DATA REQUIREMENTS

Snapshot shape (stored in meta.snapshots[]):
  { id: string, timestamp: int (ms), turn_count: int, scene_count: int, state_snapshot: GameState }

Max snapshots: 5 (oldest removed when 6th created)

AskDmButton pre-fill text: "OOC: I have a question for the DM -- "

OocNote display: only shown when DMResponse.ooc_note is non-null and not yet dismissed. Dismissed state resets each turn (new turn may bring new ooc_note).

SnapshotButton disabled condition: gameState.scene.in_combat === true

MetaControlsBar placement: render in GameScreen as a row below the SceneHeader bar, above MessageHistory. Or as a floating toolbar -- implementation choice as long as it doesn't overlap message content.

PACKET_5_1 assertions (indexes 38-41):
38. "createSnapshot is a function" -- typeof createSnapshot === 'function'
39. "restoreSnapshot is a function" -- typeof restoreSnapshot === 'function'
40. "meta.snapshots is an array" -- Array.isArray(INITIAL_STATE.meta.snapshots)
41. "MetaControlsBar is a function" -- typeof MetaControlsBar === 'function'

### ACCEPTANCE CRITERIA

AUTO:
- AC-1: createSnapshot, restoreSnapshot, MetaControlsBar all defined
- AC-2: All 4 PACKET_5_1 assertions show [PASS]
- AC-3: All 37 prior assertions still show [PASS] (no regression)
- AC-4: MetaControlsBar renders in GameScreen without breaking layout
HUMAN:
- AC-H1: "Save Checkpoint" button is visible and creates a snapshot (dropdown shows entry)
- AC-H2: "Save Checkpoint" is grayed/disabled during active combat
- AC-H3: Clicking "Ask DM" pre-fills player input field with OOC text
- AC-H4: OOC note box appears in yellow above choices when DM sends ooc_note

### REGRESSION SCOPE
Baseline (verify before starting work):
  Open App.jsx in artifact renderer. Verify no rendering errors. All 37 assertions (1_1 through 4_2) show [PASS].

Regression checks (verify after implementation):
  - All 37 prior AssertionPanel assertions still show [PASS]
  - CombatPanel still renders correctly when in_combat is true

If any regression check fails: this packet broke prior work. Do not commit. Rollback and fix.

### TESTING PROCEDURE
1. Open App.jsx in artifact renderer. Verify PACKET_4_2 baseline: 37 green [PASS].
2. Implement createSnapshot function.
3. Implement restoreSnapshot function.
4. Implement SnapshotButton component.
5. Implement AskDmButton component with PlayerInput pre-fill.
6. Implement OocNote component.
7. Implement MetaControlsBar component.
8. Add MetaControlsBar to GameScreen.
9. Repaste artifact. Verify no render errors.
10. Click "Save Checkpoint". Verify toast appears and snapshot dropdown shows entry.
11. Click "Ask DM". Verify player input is filled with OOC text.
12. Trigger a DM response with ooc_note field populated. Verify OocNote box appears.
13. Click X on OocNote. Verify it dismisses.
14. Verify SnapshotButton disabled state during combat scenario.
15. Verify AssertionPanel shows 41 assertions, all green.
16. git add App.jsx && git commit -m "PACKET_5_1: Meta Controls"
17. Update BUILD_LOG.md.

### EXECUTION CHECKLIST
- [ ] createSnapshot deep-clones gameState into snapshot object
- [ ] restoreSnapshot returns stored state_snapshot
- [ ] MetaControlsBar with SnapshotButton and AskDmButton
- [ ] OocNote component with dismiss behavior
- [ ] Toast notification (3s auto-dismiss) for checkpoint confirmation
- [ ] SnapshotButton disabled during combat
- [ ] Max 5 snapshots enforced
- [ ] 4 new assertions added (indexes 38-41), all [PASS]
- [ ] All 41 AUTO AC verified [PASS] in rendered artifact
- [ ] REGRESSION: All 37 prior assertions still [PASS]
- [ ] git commit with message "PACKET_5_1: Meta Controls"

---

## PACKET_5_2: Session Journal + Summary Card

```yaml
packet_id: PACKET_5_2
parallel_group: 12
depends_on: [PACKET_5_1]
blocks: [PACKET_6_1]
critical_path: YES
estimated_hours: 12
prd_features: [F013, F014, F016]
codex_patterns: []
codex_guards: []
```

### CONTEXT
This packet adds the session journal panel (accessible via a tab or sidebar toggle) and the end-of-session summary card. The journal renders entries from gameState.campaign.journal (populated by applyJournalEntry in PACKET_3_2). The summary card appears when the player clicks "End Session" and shows a formatted recap of the session: scenes visited, XP earned, key events from journal, current campaign spine status. This packet runs after PACKET_5_1 because the End Session trigger is part of the meta controls layer.

### PRODUCES
Files created: none
Files modified: App.jsx
Schema created: none
Schema modified: none
API routes: none
Env vars added: none
Env vars needed: none
Exports: JournalPanel component, JournalEntry component, SummaryCard component, EndSessionButton component

### ASSUMES
Files exist: App.jsx with PACKET_1_1 through 5_1 content
Schema exists: none
API routes: none
Env vars set: none
State: gameState.campaign.journal populated, gameState.session metrics, gameState.character.xp

### DESIGN SPECIFICATION

JournalPanel component: receives { journal, campaign }. A slide-in or tabbed panel accessible from the MetaControlsBar. Toggle button: "Journal" with BookOpen icon. When open, renders a scrollable list of JournalEntry components. Shows adventure title + campaign spine progress (act1/2/3 goals with checkboxes -- checkboxes are DM-controlled via journal entries, not player-toggled).

JournalEntry component: receives { entry: { timestamp, entry } }. Renders timestamp (formatted as scene/turn number or time), entry text. Styled as a log entry (monospace-ish font, left border yellow-400).

EndSessionButton component: "End Session" button in MetaControlsBar. On click: generates SummaryCard and displays it as a modal overlay. Button style: danger_btn from COLORS (but label it "End Session" not danger-styled -- use a neutral secondary button style: bg-gray-600 text-white).

SummaryCard component: receives { gameState }. Renders as a large centered modal overlay (bg-gray-900 bg-opacity-95, rounded-xl, max-w-2xl). Sections:
  - Header: "Session Summary -- [adventure_title]"
  - Stats bar: Turns played, Scenes visited, XP earned this session, Credits gained
  - Campaign Spine status: act1/2/3 goals shown
  - Journal Highlights: last 5 journal entries
  - Character Status: current stamina, status effects, SEU remaining
  - Two buttons: "Save & Continue Later" (creates snapshot then shows a text export prompt) and "New Adventure" (resets to SetupScreen -- sets gameState back to INITIAL_STATE and phase to 'SETUP').

"Save & Continue Later" in this packet: creates a snapshot, then renders the full gameState as a JSON string in a textarea (player can copy it). Label: "Copy this text to resume later." Note: PACKET_6_2 implements the actual Continue Campaign flow; this is the export step.

Journal panel toggle: add to MetaControlsBar a "Journal" button that sets a local showJournal boolean. When true, JournalPanel renders as a sliding panel or right-side drawer overlay.

### DATA REQUIREMENTS

JournalEntry shape: { timestamp: int (ms), entry: string }
Displayed as: "[Turn N] entry text" or "[HH:MM] entry text"

SummaryCard stats to display:
  Turns: gameState.session.turn_count
  Scenes: gameState.session.scene_count
  XP: gameState.character.xp.total
  Credits: gameState.character.credits
  Stamina: gameState.character.stamina.current + '/' + gameState.character.stamina.max

Campaign spine display: show act1_goal, act2_complication, act3_convergence as three labeled rows. No completion state tracking yet (just display the text).

"New Adventure" behavior: sets phase = 'SETUP', sets gameState = INITIAL_STATE. Confirmation modal first: "Start a new adventure? All progress will be lost unless you saved a checkpoint."

PACKET_5_2 assertions (indexes 42-44):
42. "JournalPanel is a function" -- typeof JournalPanel === 'function'
43. "SummaryCard is a function" -- typeof SummaryCard === 'function'
44. "EndSessionButton is a function" -- typeof EndSessionButton === 'function'

### ACCEPTANCE CRITERIA

AUTO:
- AC-1: JournalPanel, SummaryCard, EndSessionButton all defined
- AC-2: All 3 PACKET_5_2 assertions show [PASS]
- AC-3: All 41 prior assertions still show [PASS] (no regression)
- AC-4: JournalPanel toggle renders/hides journal entries
HUMAN:
- AC-H1: Clicking "Journal" opens a panel listing all journal entries with timestamps
- AC-H2: Clicking "End Session" shows SummaryCard modal with correct session stats
- AC-H3: "New Adventure" button in SummaryCard returns to SetupScreen after confirmation

### REGRESSION SCOPE
Baseline (verify before starting work):
  Open App.jsx in artifact renderer. Verify no rendering errors. All 41 assertions (1_1 through 5_1) show [PASS].

Regression checks (verify after implementation):
  - All 41 prior AssertionPanel assertions still show [PASS]
  - MetaControlsBar still shows SnapshotButton and AskDmButton

If any regression check fails: this packet broke prior work. Do not commit. Rollback and fix.

### TESTING PROCEDURE
1. Open App.jsx in artifact renderer. Verify PACKET_5_1 baseline: 41 green [PASS].
2. Implement JournalEntry component.
3. Implement JournalPanel component with toggle behavior.
4. Implement SummaryCard modal component.
5. Implement EndSessionButton.
6. Add Journal toggle button to MetaControlsBar.
7. Add EndSessionButton to MetaControlsBar.
8. Repaste artifact. Verify no render errors.
9. Play a few turns so journal entries are created. Click Journal toggle. Verify entries appear.
10. Click "End Session". Verify SummaryCard modal opens with session stats.
11. Click "New Adventure". Verify confirmation dialog appears.
12. Confirm and verify return to SetupScreen.
13. Verify AssertionPanel shows 44 assertions, all green.
14. git add App.jsx && git commit -m "PACKET_5_2: Session Journal + Summary Card"
15. Update BUILD_LOG.md.

### EXECUTION CHECKLIST
- [ ] JournalEntry with timestamp display
- [ ] JournalPanel with toggle via MetaControlsBar Journal button
- [ ] SummaryCard modal with all required sections
- [ ] EndSessionButton triggers SummaryCard
- [ ] "New Adventure" resets to INITIAL_STATE with confirmation
- [ ] "Save & Continue Later" exports gameState as JSON to textarea
- [ ] 3 new assertions added (indexes 42-44), all [PASS]
- [ ] All 44 AUTO AC verified [PASS] in rendered artifact
- [ ] REGRESSION: All 41 prior assertions still [PASS]
- [ ] git commit with message "PACKET_5_2: Session Journal + Summary Card"

---

## PACKET_6_1: Context Compression

```yaml
packet_id: PACKET_6_1
parallel_group: 13
depends_on: [PACKET_5_2]
blocks: [PACKET_6_2]
critical_path: YES
estimated_hours: 14
prd_features: [F020]
codex_patterns: []
codex_guards: []
```

### CONTEXT
This packet implements the context compression system. At scene 15 or greater, a "Summarize Campaign" button appears in MetaControlsBar. Clicking it triggers a special API call that asks Claude to compress the accumulated scene history into a 300-500 token summary. The compressed summary is stored in gameState.scene.history_compressed (boolean flag) and a new field gameState.scene.compressed_summary (string). Subsequent API calls use the compressed summary in place of the full raw history in the system prompt Layer 3. This keeps the context window manageable for long campaigns.

### PRODUCES
Files created: none
Files modified: App.jsx
Schema created: none
Schema modified: none
API routes: none
Env vars added: none
Env vars needed: none
Exports: compressCampaignHistory function, buildCompressedSystemPrompt function, SummarizeButton component

### ASSUMES
Files exist: App.jsx with PACKET_1_1 through 5_2 content
Schema exists: none
API routes: none
Env vars set: none
State: gameState.session.scene_count, gameState.campaign.journal, gameState.scene.recent_summaries, callDM available

### DESIGN SPECIFICATION

compressCampaignHistory(gameState, apiKey, onError): async function. Triggers when called (button click). Builds a compression prompt: "Summarize the following Astra Rising campaign history in 300-500 tokens, preserving: active NPCs and their attitudes, faction standings, current campaign spine status, most important events, current character equipment/health status. Campaign data: [JSON.stringify of relevant gameState sections]." Calls callDM with this as the user message and a simplified system prompt (no DM persona, just instruction to compress). Response is plain text (not JSON). Stores result in gameState.scene.compressed_summary. Sets gameState.scene.history_compressed = true.

buildCompressedSystemPrompt(gameState): function. Replaces buildSystemPrompt for calls when history_compressed is true. Layer 3 uses compressed_summary instead of full journal/npc/faction data. Format: "COMPRESSED HISTORY: [compressed_summary] CURRENT CHAR: [name/stamina/status_effects] CURRENT SCENE: [header/in_combat status]". Layer 1 and Layer 2 remain static.

SummarizeButton component: "Summarize Campaign" button. Only visible when gameState.session.scene_count >= 15. Style: secondary button (bg-gray-600). Shows loading state during compression call. On completion: shows success toast "Campaign history compressed. Context optimized."

Integration: in useDMTurn, check if gameState.scene.history_compressed is true. If true, use buildCompressedSystemPrompt instead of buildSystemPrompt.

Update buildSystemPrompt: add a check -- if gameState.scene.history_compressed, delegate to buildCompressedSystemPrompt.

Also add scene.compressed_summary to the INITIAL_STATE.scene shape (null default). Update scene contract in INITIAL_STATE: compressed_summary: null.

### DATA REQUIREMENTS

gameState.scene additions (add to INITIAL_STATE.scene and character contract reference):
  history_compressed: false (already in spec)
  compressed_summary: null (new field, add to INITIAL_STATE.scene)

Compression prompt system message: "You are a campaign historian. Your task is to compress campaign history into a concise summary preserving all game-mechanically relevant information. Do not use JSON. Write flowing prose. Maximum 500 tokens."

Compression trigger condition: gameState.session.scene_count >= 15

Compression API call format (not DMResponse, plain text response):
  messages: [{ role: 'user', content: compressionPromptText }]
  model: claude-sonnet-4-6, max_tokens: 600
  Response: response.content[0].text (plain text, no JSON parsing needed)

buildCompressedSystemPrompt Layer 3 format:
  COMPRESSED_HISTORY: [compressed_summary]
  CURRENT_STATE: CHAR=[name] STA=[current/max] STATUS=[status_effects] SCENE=[scene.header] COMBAT=[in_combat]

PACKET_6_1 assertions (indexes 45-47):
45. "compressCampaignHistory is a function" -- typeof compressCampaignHistory === 'function'
46. "buildCompressedSystemPrompt is a function" -- typeof buildCompressedSystemPrompt === 'function'
47. "scene.compressed_summary initialized to null" -- INITIAL_STATE.scene.compressed_summary === null

### ACCEPTANCE CRITERIA

AUTO:
- AC-1: compressCampaignHistory and buildCompressedSystemPrompt defined
- AC-2: All 3 PACKET_6_1 assertions show [PASS]
- AC-3: All 44 prior assertions still show [PASS] (no regression)
- AC-4: INITIAL_STATE.scene.compressed_summary === null (added to state shape)
HUMAN:
- AC-H1: SummarizeButton becomes visible at scene 15 (can test by manually setting scene_count=15)
- AC-H2: Clicking "Summarize Campaign" triggers loading state and then shows success toast
- AC-H3: After compression, subsequent DM calls use compressed history (shorter system prompt)

### REGRESSION SCOPE
Baseline (verify before starting work):
  Open App.jsx in artifact renderer. Verify no rendering errors. All 44 assertions (1_1 through 5_2) show [PASS].

Regression checks (verify after implementation):
  - All 44 prior AssertionPanel assertions still show [PASS]
  - buildSystemPrompt still works correctly for non-compressed sessions

If any regression check fails: this packet broke prior work. Do not commit. Rollback and fix.

### TESTING PROCEDURE
1. Open App.jsx in artifact renderer. Verify PACKET_5_2 baseline: 44 green [PASS].
2. Add compressed_summary: null to INITIAL_STATE.scene.
3. Implement compressCampaignHistory function.
4. Implement buildCompressedSystemPrompt function.
5. Update buildSystemPrompt to delegate to buildCompressedSystemPrompt when history_compressed.
6. Update useDMTurn to use the correct system prompt builder.
7. Implement SummarizeButton component.
8. Add SummarizeButton to MetaControlsBar (hidden until scene_count >= 15).
9. Repaste artifact. Verify no render errors. Verify assertion 47 passes.
10. Manually set scene_count = 15 in state. Verify SummarizeButton appears.
11. With a real API key, click SummarizeButton. Verify compression call fires and success toast appears.
12. Verify gameState.scene.history_compressed = true after compression.
13. Verify AssertionPanel shows 47 assertions, all green.
14. git add App.jsx && git commit -m "PACKET_6_1: Context Compression"
15. Update BUILD_LOG.md.

### EXECUTION CHECKLIST
- [ ] compressed_summary: null added to INITIAL_STATE.scene
- [ ] compressCampaignHistory makes compression API call and stores result
- [ ] buildCompressedSystemPrompt uses compressed_summary in Layer 3
- [ ] buildSystemPrompt delegates when history_compressed = true
- [ ] SummarizeButton hidden until scene_count >= 15
- [ ] useDMTurn uses correct system prompt based on compression state
- [ ] 3 new assertions added (indexes 45-47), all [PASS]
- [ ] All 47 AUTO AC verified [PASS] in rendered artifact
- [ ] REGRESSION: All 44 prior assertions still [PASS]
- [ ] git commit with message "PACKET_6_1: Context Compression"

---

## PACKET_6_2: Continue Campaign + Returning Player Flow

```yaml
packet_id: PACKET_6_2
parallel_group: 14
depends_on: [PACKET_6_1]
blocks: [PACKET_7_1]
critical_path: YES
estimated_hours: 12
prd_features: [F017]
codex_patterns: []
codex_guards: []
```

### CONTEXT
This packet implements the returning player flow: loading a previously exported gameState JSON to resume a campaign. From the SetupScreen, a "Continue Campaign" button opens a text area where the player pastes their exported JSON. The JSON is parsed, validated, and loaded into gameState to resume from where they left off. This completes the session persistence loop started in PACKET_5_2 (where the JSON export textarea was built). It runs after PACKET_6_1 (compression state must be in the contract) and before PACKET_7_1 (tooltip system is the final overlay feature).

### PRODUCES
Files created: none
Files modified: App.jsx
Schema created: none
Schema modified: none
API routes: none
Env vars added: none
Env vars needed: none
Exports: ContinueCampaignPanel component, parseAndLoadSave function, validateSaveData function

### ASSUMES
Files exist: App.jsx with PACKET_1_1 through 6_1 content
Schema exists: none
API routes: none
Env vars set: none
State: INITIAL_STATE shape defined (validate against it), phase state variable

### DESIGN SPECIFICATION

ContinueCampaignPanel component: renders in SetupScreen, toggled by a "Continue Campaign" button. When open, shows: a textarea labeled "Paste your saved campaign JSON here", a "Load Campaign" button, and a "Cancel" button. On Load: calls parseAndLoadSave with the textarea content.

parseAndLoadSave(jsonString, setGameState, setPhase, setApiKey): function. Parses jsonString as JSON. Calls validateSaveData on the result. If valid: calls setGameState(parsed), setPhase('GAME'). If the parsed data includes an apiKey field (if user exported it), calls setApiKey with it -- but show a warning label in the panel: "API key not included in export for security reasons. Re-enter your API key above." If invalid: shows error message inline in the panel.

validateSaveData(data): function. Checks that data has all required top-level GameState keys: character (not null), campaign (not null), session, scene, meta. Checks meta.initialized === true. Checks character.name is a non-empty string. Returns { valid: boolean, errors: string[] }.

SetupScreen update: add "Continue Campaign" toggle button below the "Begin Adventure" button (or in a footer area). When ContinueCampaignPanel is open, it replaces or overlays the character/adventure select area.

Error display in ContinueCampaignPanel: if validateSaveData returns errors, show them as a red error list below the textarea.

After successful load: the API key is NOT stored in the save JSON (by design). The player must re-enter it. The API key input field is still present in SetupScreen for this reason. When continuing a campaign, only the API key is needed (character/adventure are embedded in the loaded state).

Note: The "Save & Continue Later" JSON export from PACKET_5_2 should NOT include apiKey in the exported object for security. Update that export if it currently includes apiKey -- strip it before serializing.

### DATA REQUIREMENTS

parseAndLoadSave input: raw string from textarea
parseAndLoadSave output: void (side effects via callbacks)

validateSaveData required fields:
  character: object (not null, has name string)
  campaign: object (not null, has adventure_id string)
  session: object (has number, scene_count, turn_count)
  scene: object (has in_combat boolean)
  meta: object (has initialized === true, has dev_mode field)

Error messages for validateSaveData:
  "Invalid JSON: [parse error message]" (from try/catch on JSON.parse)
  "Missing required field: character"
  "Missing required field: campaign"
  "Save data not fully initialized (meta.initialized is false)"
  "Character data is incomplete"

API key exclusion note: when exporting in PACKET_5_2, use:
  const exportData = { ...gameState }  -- apiKey is not in gameState, so it is automatically excluded.
  This is safe by design -- apiKey is a separate React state variable.

PACKET_6_2 assertions (indexes 48-50):
48. "parseAndLoadSave is a function" -- typeof parseAndLoadSave === 'function'
49. "validateSaveData is a function" -- typeof validateSaveData === 'function'
50. "ContinueCampaignPanel is a function" -- typeof ContinueCampaignPanel === 'function'

### ACCEPTANCE CRITERIA

AUTO:
- AC-1: parseAndLoadSave, validateSaveData, ContinueCampaignPanel all defined
- AC-2: All 3 PACKET_6_2 assertions show [PASS]
- AC-3: All 47 prior assertions still show [PASS] (no regression)
- AC-4: "Continue Campaign" button visible in SetupScreen
HUMAN:
- AC-H1: Pasting valid exported JSON and clicking "Load Campaign" restores the game state and transitions to GameScreen
- AC-H2: Pasting invalid JSON shows error message inline
- AC-H3: API key field remains visible for the player to re-enter after loading a save

### REGRESSION SCOPE
Baseline (verify before starting work):
  Open App.jsx in artifact renderer. Verify no rendering errors. All 47 assertions (1_1 through 6_1) show [PASS].

Regression checks (verify after implementation):
  - All 47 prior AssertionPanel assertions still show [PASS]
  - SetupScreen still renders character and adventure selection correctly

If any regression check fails: this packet broke prior work. Do not commit. Rollback and fix.

### TESTING PROCEDURE
1. Open App.jsx in artifact renderer. Verify PACKET_6_1 baseline: 47 green [PASS].
2. Implement validateSaveData function.
3. Implement parseAndLoadSave function.
4. Implement ContinueCampaignPanel component.
5. Add "Continue Campaign" toggle button to SetupScreen.
6. Repaste artifact. Verify no render errors.
7. Click "Continue Campaign". Verify ContinueCampaignPanel opens with textarea.
8. Paste invalid JSON ("not json"). Click Load. Verify error message appears.
9. Export a save from a completed Session Zero flow. Paste it. Click Load. Verify GameScreen appears.
10. Verify API key field is still present (not auto-filled from save).
11. Click Cancel. Verify panel closes and SetupScreen returns to normal.
12. Verify AssertionPanel shows 50 assertions, all green.
13. git add App.jsx && git commit -m "PACKET_6_2: Continue Campaign + Returning Player Flow"
14. Update BUILD_LOG.md.

### EXECUTION CHECKLIST
- [ ] validateSaveData with all required field checks and error messages
- [ ] parseAndLoadSave with try/catch JSON.parse and validation
- [ ] ContinueCampaignPanel with textarea, Load, Cancel buttons
- [ ] "Continue Campaign" toggle in SetupScreen
- [ ] Error display for invalid saves
- [ ] Confirm apiKey NOT included in JSON export (security)
- [ ] 3 new assertions added (indexes 48-50), all [PASS]
- [ ] All 50 AUTO AC verified [PASS] in rendered artifact
- [ ] REGRESSION: All 47 prior assertions still [PASS]
- [ ] git commit with message "PACKET_6_2: Continue Campaign + Returning Player Flow"

---

## PACKET_7_1: Tooltip System

```yaml
packet_id: PACKET_7_1
parallel_group: 15
depends_on: [PACKET_6_2]
blocks: [PACKET_7_2]
critical_path: YES
estimated_hours: 10
prd_features: []
codex_patterns: []
codex_guards: []
```

### CONTEXT
This packet adds the tooltip system: a glossary of Astra Rising terms that appear as hover tooltips when the DM uses them in narrative text. The DMResponse.tooltip_terms array provides per-turn terms and definitions. The narrative text is post-processed to wrap recognized terms in tooltip-enabled spans. A persistent TOOLTIP_GLOSSARY is maintained as a module-level constant covering common rules terms. This runs after PACKET_6_2 (all major gameplay features complete) and before PACKET_7_2 (scene header uses the same term-recognition infrastructure).

### PRODUCES
Files created: none
Files modified: App.jsx
Schema created: none
Schema modified: none
API routes: none
Env vars added: none
Env vars needed: none
Exports: TOOLTIP_GLOSSARY constant, Tooltip component, wrapTextWithTooltips function, TooltipRegistry state/context

### ASSUMES
Files exist: App.jsx with PACKET_1_1 through 6_2 content
Schema exists: none
API routes: none
Env vars set: none
State: DMResponse.tooltip_terms available from narrative engine turns

### DESIGN SPECIFICATION

TOOLTIP_GLOSSARY: a module-level constant object. Keys are lowercase term strings. Values are definition strings. Contains at minimum 20 terms covering: Astra Rising Core rules terms (Stamina, SEU, Initiative Modifier, Reaction Speed, Percentile Roll, Proficiency Level), weapons (Rafflur M-3, Ke-1000, Ke-2000, Electrostunner, Gyrojet), equipment (Albedo suit, Skeinsuit, Medkit, Techkit, SEU clip), races (Krix, Moluun, Skrath, Human), factions (CFW, Apex Law, The Vaash, Mega-Corps), and status terms (Stunned, Suppressed, Bleeding).

Tooltip component: receives { term, definition, children }. On hover: shows a small floating tooltip box (absolute positioned, dark bg, white text, max-w-xs, rounded, p-2, text-sm, z-50). Children is the text span that triggers the tooltip. Tooltip position: above the span, centered.

wrapTextWithTooltips(text, tooltipRegistry): function. Takes a string of DM narrative text and a registry object (merged TOOLTIP_GLOSSARY + current turn's tooltip_terms). Returns an array of React elements: text spans interspersed with Tooltip-wrapped spans for recognized terms. Case-insensitive matching. Wrap the first occurrence of each term per paragraph, not every occurrence. Return as a JSX fragment or array.

TooltipRegistry: a React state variable in the GameScreen component (useState). Initialized from TOOLTIP_GLOSSARY. Each turn, merge DMResponse.tooltip_terms (array of {term, definition}) into the registry. Registry persists across turns (accumulates definitions).

Integration: in NarrativePanel, instead of rendering raw DM narrative text, pass it through wrapTextWithTooltips. Render the resulting array.

### DATA REQUIREMENTS

TOOLTIP_GLOSSARY minimum 20 entries (examples):
  'stamina': 'A character\'s total hit points. Reaching 0 means unconscious.',
  'seu': 'Standardized Energy Unit -- fuel for energy weapons and equipment.',
  'im': 'Initiative Modifier -- determines turn order in combat. Lower is faster.',
  'rs': 'Reaction Speed -- governs defensive rolls and initiative tiebreakers.',
  'percentile roll': 'Roll 1d100. Success if roll is equal to or under the target number.',
  'albedo suit': 'Reflective personal armor that reduces laser weapon damage by 50.',
  'skeinsuit': 'Flexible body armor providing general damage reduction.',
  'CFW': 'Concordat of Free Worlds -- the governing body of the Frontier.',
  'Apex Law': 'CFW\'s elite interstellar law enforcement agency.',
  'The Vaash': 'Serpentine alien race; the primary antagonist faction of the Frontier.',
  'Krix': 'Insectoid race known for business acumen and multiple limbs.',
  'Moluun': 'Amorphous blob-like race with lie detection and shape-shifting.',
  'Skrath': 'Winged ape-like race with night vision, gliding, and battle rage.',
  'medkit': 'Standard medical kit. Used to heal stamina outside of combat.',
  'techkit': 'Standard technician kit. Required for most Technician skill checks.',
  'stunned': 'Character cannot act for 1d10 turns.',
  'suppressed': 'Character must make RS roll or take cover instead of attacking.',
  'proficiency level': 'Skill rank 1-6. Higher = higher base chance to succeed.',
  'ke-1000': 'Ke-1000 laser pistol. Medium-range energy weapon, uses SEU.',
  'gyrojet': 'Rocket-propelled projectile weapon. Does not use SEU.'

tooltip_terms item shape (from DMResponse): { term: string, definition: string }

wrapTextWithTooltips output: React element array safe to render as JSX children.

PACKET_7_1 assertions (indexes 51-53):
51. "TOOLTIP_GLOSSARY has >= 20 entries" -- Object.keys(TOOLTIP_GLOSSARY).length >= 20
52. "wrapTextWithTooltips is a function" -- typeof wrapTextWithTooltips === 'function'
53. "Tooltip is a function" -- typeof Tooltip === 'function'

### ACCEPTANCE CRITERIA

AUTO:
- AC-1: TOOLTIP_GLOSSARY, Tooltip, wrapTextWithTooltips all defined
- AC-2: All 3 PACKET_7_1 assertions show [PASS]
- AC-3: All 50 prior assertions still show [PASS] (no regression)
- AC-4: TOOLTIP_GLOSSARY has at least 20 entries
HUMAN:
- AC-H1: Hovering over a recognized term (e.g. "SEU") in DM narrative text shows a tooltip definition
- AC-H2: Tooltip appears above the term and disappears when mouse leaves
- AC-H3: New terms from DMResponse.tooltip_terms are added to registry and work in subsequent turns

### REGRESSION SCOPE
Baseline (verify before starting work):
  Open App.jsx in artifact renderer. Verify no rendering errors. All 50 assertions (1_1 through 6_2) show [PASS].

Regression checks (verify after implementation):
  - All 50 prior AssertionPanel assertions still show [PASS]
  - NarrativePanel still renders DM text correctly (tooltip wrapping does not break text)

If any regression check fails: this packet broke prior work. Do not commit. Rollback and fix.

### TESTING PROCEDURE
1. Open App.jsx in artifact renderer. Verify PACKET_6_2 baseline: 50 green [PASS].
2. Add TOOLTIP_GLOSSARY constant with 20+ entries.
3. Implement Tooltip component with hover show/hide logic.
4. Implement wrapTextWithTooltips function.
5. Add TooltipRegistry state to GameScreen.
6. Wire DMResponse.tooltip_terms into TooltipRegistry update logic in useDMTurn.
7. Update NarrativePanel to use wrapTextWithTooltips on DM narrative text.
8. Repaste artifact. Verify no render errors.
9. Verify AssertionPanel shows 53 assertions, all green.
10. Play a turn and look for a known glossary term in the DM narrative. Hover over it. Verify tooltip appears.
11. Verify tooltip shows correct definition text.
12. Verify tooltip disappears on mouse leave.
13. git add App.jsx && git commit -m "PACKET_7_1: Tooltip System"
14. Update BUILD_LOG.md.

### EXECUTION CHECKLIST
- [ ] TOOLTIP_GLOSSARY with 20+ entries covering rules, weapons, equipment, races, factions
- [ ] Tooltip component with hover behavior (no flicker, z-50)
- [ ] wrapTextWithTooltips: case-insensitive, first occurrence per paragraph only
- [ ] TooltipRegistry state in GameScreen merges GLOSSARY + per-turn tooltip_terms
- [ ] NarrativePanel uses wrapTextWithTooltips
- [ ] 3 new assertions added (indexes 51-53), all [PASS]
- [ ] All 53 AUTO AC verified [PASS] in rendered artifact
- [ ] REGRESSION: All 50 prior assertions still [PASS]
- [ ] git commit with message "PACKET_7_1: Tooltip System"

---

## PACKET_7_2: Scene Header Card + Context Bar

```yaml
packet_id: PACKET_7_2
parallel_group: 16
depends_on: [PACKET_7_1]
blocks: [PACKET_8_1]
critical_path: YES
estimated_hours: 10
prd_features: [F018]
codex_patterns: []
codex_guards: []
```

### CONTEXT
This packet replaces the SceneHeader placeholder in GameScreen with the real SceneHeader component and adds a context bar showing session metrics. The scene header shows the current scene name (from gameState.scene.header), the scene type, and an optional map toggle button (F018 -- shows a simple ASCII or placeholder map for the adventure). The context bar shows: current adventure title, act progress, scene number, and turn number. This packet runs after PACKET_7_1 (tooltip system is complete and scene headers can use term highlighting) and before PACKET_8_1 (final polish pass).

### PRODUCES
Files created: none
Files modified: App.jsx
Schema created: none
Schema modified: none
API routes: none
Env vars added: none
Env vars needed: none
Exports: SceneHeader component, ContextBar component, MapToggle component

### ASSUMES
Files exist: App.jsx with PACKET_1_1 through 7_1 content
Schema exists: none
API routes: none
Env vars set: none
State: gameState.scene.header, gameState.session.scene_count, gameState.campaign.adventure_title, gameState.campaign.spine

### DESIGN SPECIFICATION

SceneHeader component: receives { scene, campaign, session }. Replaces the h-12 placeholder bar at the top of GameScreen right column. Content: scene.header text (truncated with ellipsis if too long, full text in title attribute), a scene type icon based on in_combat state (Shield icon if combat, BookOpen if narrative), and a MapToggle button on the right side.

ContextBar component: receives { campaign, session }. Renders a slim bar below SceneHeader (or integrated into it). Shows: adventure title (truncated), "Act 1/2/3" indicator (show Act 1 by default -- act tracking logic is heuristic based on scene count: Act 1 = scenes 1-5, Act 2 = scenes 6-12, Act 3 = scenes 13+), scene count as "Scene N", turn count as "Turn N".

Act determination heuristic:
  scene_count <= 5: "Act 1"
  scene_count <= 12: "Act 2"
  scene_count > 12: "Act 3"

MapToggle component: a button in the SceneHeader. Toggle shows/hides a MapPanel. MapPanel: a simple overlay or sidebar panel showing placeholder map content. For all 5 adventures, show a text-based ASCII art layout or a plain text description of the current location. The map content is static per adventure (embedded in ADVENTURE_LIBRARY or a separate MAP_DATA constant). The button shows a Map icon (use Grid or Map from lucide if available, else use a placeholder icon).

MAP_DATA constant: a lookup by adventure_id, providing a simple text/ASCII description for each adventure. If no map data, show "No map available for this location." Each entry is a string -- ASCII art or text description.

Context bar styling: slim row (h-8), text-sm, text-gray-400, bg-gray-800, border-b border-gray-700. Between SceneHeader and MessageHistory.

SceneHeader styling: h-12 (from PACKET_3_1 layout spec), bg-gray-800, border-b border-gray-700, flex items-center px-4.

### DATA REQUIREMENTS

MAP_DATA (5 entries, text-based maps):
  crash_on_Cethara: "CRASH SITE\n[Wreckage] [Supply Cache] [Radio Tower]\nSurrounding Jungle --> The Vaash Camp (3km NE)"
  ghost_station: "GHOST STATION OMEGA\n[Docking Bay] -- [Corridor A] -- [Lab Section]\n                              |\n                         [Command Deck]"
  the_Nexus_job: "TESSAVAR MEGACITY LEVEL 47\n[Elevator Shaft] [Server Room] [Guard Post]\n     |                |              |\n[Street Level] ......[Extraction Point]"
  the_golden_mandible: "WAYSTATION PELL MUNICIPAL MUSEUM\n[Lobby] [Gift Shop] [Security Office]\n   |         |            |\n[Exhibit Hall -- THE GOLDEN MANDIBLE]"
  the_erebus_protocol: "INSTALLATION EREBUS\n[Airlock] [Decontamination] [Core Access]\n[CLASSIFIED LEVEL] -- [Director's Suite]"

Act indicator display: "Act 1 -- [campaign.spine.act1_goal truncated to 40 chars]"

SceneHeader null guard: if scene.header is empty string, show "Unknown Location" as fallback.

ContextBar session metrics: format as compact chips: "Sc. N" and "Trn. N"

PACKET_7_2 assertions (indexes 54-56):
54. "SceneHeader is a function" -- typeof SceneHeader === 'function'
55. "ContextBar is a function" -- typeof ContextBar === 'function'
56. "MAP_DATA has 5 entries" -- Object.keys(MAP_DATA).length === 5

### ACCEPTANCE CRITERIA

AUTO:
- AC-1: SceneHeader, ContextBar, MapToggle, MAP_DATA all defined
- AC-2: All 3 PACKET_7_2 assertions show [PASS]
- AC-3: All 53 prior assertions still show [PASS] (no regression)
- AC-4: SceneHeader renders in GameScreen header area (not placeholder)
HUMAN:
- AC-H1: Scene name appears in the header bar and updates when DM changes scenes
- AC-H2: Clicking Map toggle shows a text map panel for the current adventure
- AC-H3: ContextBar shows correct act indicator, scene count, and turn count

### REGRESSION SCOPE
Baseline (verify before starting work):
  Open App.jsx in artifact renderer. Verify no rendering errors. All 53 assertions (1_1 through 7_1) show [PASS].

Regression checks (verify after implementation):
  - All 53 prior AssertionPanel assertions still show [PASS]
  - GameScreen layout not broken by SceneHeader replacement

If any regression check fails: this packet broke prior work. Do not commit. Rollback and fix.

### TESTING PROCEDURE
1. Open App.jsx in artifact renderer. Verify PACKET_7_1 baseline: 53 green [PASS].
2. Add MAP_DATA constant.
3. Implement MapToggle component with panel toggle.
4. Implement SceneHeader component replacing placeholder h-12 bar.
5. Implement ContextBar component.
6. Update GameScreen to use SceneHeader and ContextBar.
7. Repaste artifact. Verify no render errors.
8. Verify scene header shows "Unknown Location" when scene.header is empty.
9. Complete a Session Zero and first turn. Verify SceneHeader updates with DM scene header text.
10. Click Map toggle. Verify text map appears for selected adventure.
11. Verify ContextBar shows Act 1, scene count 0 (or current count), turn count.
12. Verify AssertionPanel shows 56 assertions, all green.
13. git add App.jsx && git commit -m "PACKET_7_2: Scene Header Card + Context Bar"
14. Update BUILD_LOG.md.

### EXECUTION CHECKLIST
- [ ] MAP_DATA constant with 5 adventure text maps
- [ ] SceneHeader replaces placeholder with scene.header display
- [ ] MapToggle shows/hides MapPanel with text map
- [ ] ContextBar with act heuristic, scene count, turn count
- [ ] SceneHeader null guard: fallback to "Unknown Location"
- [ ] 3 new assertions added (indexes 54-56), all [PASS]
- [ ] All 56 AUTO AC verified [PASS] in rendered artifact
- [ ] REGRESSION: All 53 prior assertions still [PASS]
- [ ] git commit with message "PACKET_7_2: Scene Header Card + Context Bar"

---

## PACKET_8_1: Polish Pass

```yaml
packet_id: PACKET_8_1
parallel_group: 17
depends_on: [PACKET_7_2]
blocks: []
critical_path: YES
estimated_hours: 16
prd_features: []
codex_patterns: []
codex_guards: []
```

### CONTEXT
This is the final packet. It performs a comprehensive polish pass across the entire App.jsx: spacing improvements, color consistency, loading state animations, error state UX, mobile-equivalent viewport handling, typography refinements, and the final regression sweep of all 17 packets. After this packet, dev_mode is set to false (AssertionPanel disappears from production view). This packet does not add new features -- it only refines what exists. Any deferred items from BUILD_LOG.md "Deferred Items" entries that are UI-only (not feature additions) may be addressed here.

### PRODUCES
Files created: none
Files modified: App.jsx
Schema created: none
Schema modified: none
API routes: none
Env vars added: none
Env vars needed: none
Exports: none (refinements only); final act: sets INITIAL_STATE.meta.dev_mode = false

### ASSUMES
Files exist: App.jsx with all 16 prior packets complete and all 56 assertions passing
Schema exists: none
API routes: none
Env vars set: none
State: Complete, stable gameState with all features operational

### DESIGN SPECIFICATION

POLISH AREAS (apply in this order):

1. LOADING STATES: Ensure every async operation (callDM, compressCampaignHistory) shows a Loader spinner from lucide-react. Add aria-label="Loading" to spinner containers. Disabled state for all interactive elements during loading -- no double-submits.

2. ERROR DISPLAY: Ensure AppError is rendered consistently. When gameState.meta.error is non-null: render a dismissable error banner at the top of the active screen (red bg, AlertCircle icon, error.message text, dismiss X button, "Retry" button if error.recoverable and error.retry_action exists).

3. TYPOGRAPHY: Audit all text sizes. DM narrative: text-base leading-relaxed. Headers: appropriate hierarchy (text-xl for screen headings, text-lg for section headings, text-sm for metadata). Ensure text-gray-100 / text-gray-400 contrast is consistent.

4. BUTTON CONSISTENCY: All primary CTAs use cta_btn from COLORS. All destructive actions use danger_btn. Secondary actions use bg-gray-700 text-gray-100 hover:bg-gray-600. All buttons have cursor-pointer and focus:outline-none focus:ring-2 focus:ring-yellow-400.

5. CARD CONSISTENCY: All cards bg-gray-800 rounded-lg border border-gray-700 p-4. Selected state: border-yellow-400. Hover: border-gray-600 transition-colors duration-150.

6. SCROLLBAR STYLING: add custom scrollbar Tailwind utilities where available. If not, ensure overflow-y-auto containers are not clipping content.

7. EMPTY STATES: All lists (inventory, journal, skills) show a muted placeholder when empty (e.g. "No items" in text-gray-500 italic).

8. TRANSITION POLISH: The 1.5s hook-to-game transition card: add a fade-in effect (use CSS opacity transition via className toggling with useEffect). The SessionZeroScreen loading state: ensure it fills the screen correctly.

9. FINAL REGRESSION SWEEP: Manually verify all 56 prior assertions still pass. Verify all HUMAN ACs from all 17 packets are satisfied in a real end-to-end playthrough.

10. DEV_MODE OFF: Change INITIAL_STATE.meta.dev_mode from true to false. AssertionPanel will no longer render. The file is production-ready.

### DATA REQUIREMENTS

Error banner shape (rendered from gameState.meta.error):
  code: displayed as small badge
  message: main text
  recoverable: if true, show Retry button
  retry_action: function called on Retry click

Button class audit -- ensure these three patterns are the only button styles used:
  Primary (CTA): bg-yellow-400 text-gray-900 hover:bg-yellow-300 font-bold px-4 py-2 rounded
  Secondary: bg-gray-700 text-gray-100 hover:bg-gray-600 px-4 py-2 rounded
  Danger: bg-red-600 text-white hover:bg-red-500 font-bold px-4 py-2 rounded
  Disabled (any): opacity-50 cursor-not-allowed

PACKET_8_1 assertions: NONE added. Instead, this packet verifies all 56 prior assertions pass before setting dev_mode = false.

### ACCEPTANCE CRITERIA

AUTO:
- AC-1: All 56 prior assertions show [PASS] before dev_mode is set false
- AC-2: After setting INITIAL_STATE.meta.dev_mode = false, AssertionPanel does not render
- AC-3: Error banner renders when gameState.meta.error is set to a non-null AppError
- AC-4: All buttons in the artifact use one of the three canonical button styles
HUMAN:
- AC-H1: End-to-end playthrough: SetupScreen -> Session Zero -> Hook select -> 5 gameplay turns -- no visual errors
- AC-H2: All cards, buttons, and text elements look visually consistent and follow the Astra Rising dark space theme
- AC-H3: Loading spinners appear during all API calls
- AC-H4: Error banner appears and is dismissable when an API error occurs
- AC-H5: AssertionPanel is NOT visible in the final artifact (dev_mode = false)

### REGRESSION SCOPE
Baseline (verify before starting work):
  Open App.jsx in artifact renderer. Verify no rendering errors. All 56 assertions (1_1 through 7_2) show [PASS].

Regression checks (verify after implementation):
  - All 56 prior assertions verified [PASS] before setting dev_mode = false
  - End-to-end flow tested: setup -> session zero -> gameplay -> combat -> journal -> end session

This is the final packet. Any regression here requires tracing back to the introducing packet and fixing it before re-running PACKET_8_1.

### TESTING PROCEDURE
1. Open App.jsx in artifact renderer. Verify PACKET_7_2 baseline: 56 green [PASS].
2. Apply loading state improvements to all async operations.
3. Implement error banner component and wire to gameState.meta.error.
4. Audit and standardize all button classes to three canonical styles.
5. Audit all card components for consistent bg-gray-800 / border-gray-700 / rounded-lg styling.
6. Add empty state messages to all empty list components.
7. Polish transition timing (hook-to-game transition card fade).
8. Fix any typography inconsistencies found during audit.
9. Run a complete end-to-end test with a real API key: Setup -> Session Zero -> 5+ turns -> combat -> journal -> end session.
10. Verify all HUMAN ACs from all 17 packets are satisfied.
11. Verify all 56 AssertionPanel assertions still show [PASS].
12. Change INITIAL_STATE.meta.dev_mode from true to false.
13. Repaste artifact. Verify AssertionPanel is gone.
14. Do a final visual review of the complete artifact.
15. git add App.jsx && git commit -m "PACKET_8_1: Polish Pass -- Astra Rising AI DM complete"
16. Update BUILD_LOG.md with final status.

### EXECUTION CHECKLIST
- [ ] Loading spinners on all async operations
- [ ] Error banner wired to gameState.meta.error
- [ ] All buttons use canonical 3-class system
- [ ] All cards use consistent styling
- [ ] Empty state messages on all lists
- [ ] Transition polish applied
- [ ] Typography audit complete
- [ ] Full end-to-end test passed
- [ ] All 56 prior assertions [PASS] before dev_mode change
- [ ] INITIAL_STATE.meta.dev_mode set to false
- [ ] AssertionPanel no longer renders in final artifact
- [ ] git commit with message "PACKET_8_1: Polish Pass -- Astra Rising AI DM complete"

---

No CODEX available -- first project. Run /shawn-6-harvest after completion to begin the compound learning loop.
