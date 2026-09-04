---
project: astra-rising-ai-dm
prd_version: 2.0
status: "[x] VALIDATED, execution-ready, locked for packet generation"
input_mode: PLATFORM_BRIEF
platform: React single-file JSX artifact (Claude.ai renderer)
stack: React 18 JSX + Tailwind CSS + Claude API (claude-sonnet-4-6)
build_environment: Claude.ai artifact renderer (no Node.js, no npm, no filesystem)
total_features: 22
feature_ids: F001-F022
generated: 2025-06-10
validation_checklist:
  tier1_buildability: PASS
  tier1_file_structure: PASS
  tier1_api_contracts: PASS
  tier1_database_schema: PASS
  tier1_acceptance_criteria: PASS
  tier1_build_dependency_order: PASS
  tier1_error_handling_standard: PASS
  tier2_test_procedures: PASS
  tier2_integrations_data_flows: PASS
  tier2_auth_security: N/A
  tier2_configuration: PASS
  tier2_deployment_pipeline: PASS
  pfm_checks: N/A - internal hobby project, no market validation required
---

# Astra Rising AI Dungeon Master
## Product Requirements Document (PRD)
### Version 2.0 - Phase 1 (Shawn AI Execution-Ready)

---

## BUILD ENVIRONMENT CONSTRAINTS (READ FIRST)

This application is built as a SINGLE-FILE React JSX artifact running in the
Claude.ai artifact renderer. This imposes hard constraints that every packet
must respect:

- NO localStorage or sessionStorage (not supported - will throw at runtime)
- NO file system access
- NO npm install or build step
- NO external asset dependencies beyond Tailwind CSS utility classes and
  lucide-react@0.383.0 (pre-loaded in renderer)
- ALL state lives in React memory (useState / useReducer)
- Tailwind: ONLY pre-defined utility classes from Tailwind base stylesheet
  (no JIT compiler, no custom classes, no arbitrary values like w-[123px])
- External API calls ARE permitted (fetch to api.anthropic.com is allowed)
- DEV_MODE flag gates all AssertionPanel components (see Section 30)

---

## ERROR HANDLING STANDARD

All error states in this application follow a single pattern:

  type AppError = {
    code: string;
    message: string;
    recoverable: boolean;
    retry_action?: string;
  };

Error codes used throughout:
  API_CALL_FAILED     - Claude API returned non-200 or network failure
  API_INVALID_JSON    - Claude response was not parseable as JSON
  API_SCHEMA_MISMATCH - Claude response missing required fields
  STATE_MUTATION_INVALID - applyStateUpdates() received out-of-range value
  INIT_FAILED         - sessionZero call failed

API retry logic:
  - First failure: silent retry once (no UI change)
  - Second failure: show OOC message "Your DM lost the thread for a moment. Retrying..."
  - Third failure: surface Ask DM button pre-filled "Please continue from where we left off."

State mutation errors:
  - stamina below 0: clamp to 0, do NOT throw
  - stamina above max: clamp to max, do NOT throw
  - seu_source not found: log to console in DEV_MODE, use first available source as fallback
  - invalid item removal (item not in inventory): silent no-op, log in DEV_MODE

---

## 1. PRODUCT OVERVIEW

A solo, browser-based AI Dungeon Master for the Astra Rising tabletop RPG. The app uses the Claude API to power a rules-aware, cinematic DM that narrates adventures set in the canon Frontier universe. Phase 1 delivers a complete playable experience using Astra Rising Core + Korvath's Guide rules with four pre-generated characters.

---

## 2. PHASING

| Phase | Scope |
|-------|-------|
| Phase 1 (this PRD) | Astra Rising Core + Korvath's Guide, 4 pre-gens, solo play, campaign mode |
| Phase 2 | Knights Rising spaceship combat, character creation wizard |
| Phase 3 | Astra Risingman fan content (new races, gear, weapons) |

---

## 3. RULES SYSTEM

- **F001 - Primary ruleset:** Astra Rising Core (flat percentile resolution)
- **F001 - Supplemental content:** Korvath's Guide for races, skills, setting, gear
- **F001 - Korvath's Resolution Table:** NOT used - Astra Rising Core percentile system only
- **F001 - Strictness:** Rules-light - vibe and drama over mechanics; DM uses discretion on edge cases
- **F001 - Optional combat rules included in Phase 1:**
  - Burst fire
  - Called shots
  - Cover and concealment modifiers
  - Suppression fire

---

## 4. SETTING & TONE

- **Setting:** The Frontier - canon CFW space, original plot hooks
- **Tone:** Cinematic - PC death only at dramatically appropriate moments
- **Lethality:** Low - near-misses and dramatic escapes preferred over random PC death
- **Adventure themes (all active, DM blends based on session):**
  - Military / mercenary action
  - Crime and the underworld
  - Horror / alien threat (The Vaash)
  - Political intrigue / megacorp conflict
  - Exploration and first contact
  - AI as threat / villain

---

## 5. UI / LAYOUT

### 5.1 Target Device (F002)
- **Primary:** Mobile-first responsive design
- Desktop support as natural extension of responsive layout

### 5.2 Visual Theme (F002)
- Clean modern RPG UI
- Light background, card-based components
- No dark/neon terminal aesthetic in Phase 1

### 5.3 Layout Structure (F002)
- **Single panel narrative** with collapsible character sheet sidebar
- Sidebar hidden by default, toggled by player
- All primary narrative and interaction in the main panel

### 5.4 Narrative Display (F003)
- **Hybrid format:** scrolling narrative log with scene summary header at top of each new scene
- Scene header: location name, brief situation tag (e.g. "Cethara Station - Ambush")
- Narrative body below header, newest content at bottom

### 5.5 Character Sheet (Collapsible Sidebar) (F004)
Real-time tracked fields:
- Stamina (current / max)
- SEU powerpack charge (current / max)
- Ammo counter per weapon
- Active status effects (stunned, tangled, doze, etc.)
- Skills list (read-only reference)
- Stats block (STR/STA, DEX/RS, INT/LOG, PER/LDR)

### 5.6 Dice Roll Display (F005)
- Subtle inline roll result within narrative flow
- Format: [d100: 47 | need: 65 | HIT]
- No animation, no separate widget
- Displayed immediately after the triggering narrative sentence

---

## 6. CHARACTER SYSTEM

### 6.1 Phase 1 Approach (F006)
- Pre-generated characters only
- No character creation wizard in Phase 1 (Phase 2 feature)

### 6.2 Pre-Gen Structure (F006)
- 4 characters: one per core race, each a different archetype

| Race | Archetype |
|------|-----------|
| Human | Soldier / Enforcer |
| Krix | Tech / Techex |
| Moluun | Medic / Scispec |
| Skrath | Scout / Explorer |

### 6.3 Pre-Gen Depth (F006)
- Full backstory bio per character
- Complete stats, skills, starting gear
- One-paragraph origin story tied to the Frontier setting
- Each pre-gen balanced for solo play

### 6.4 Starting Equipment (F007)
- **Simplified loadout selection at session start** (not full shopping)
- Player picks from 2-3 pre-built loadout packages appropriate to their character archetype
- Credits not tracked in Phase 1

---

## 7. PLAYER INPUT & INTERACTION

### 7.1 Input Style (F008)
- **Structured choice menus with optional freeform text override**
- DM always presents a menu of 3-4 relevant action choices
- Freeform text input always available alongside choices
- Player can type anything; DM resolves it narratively

### 7.2 DM Guidance Level (F008)
- **Context-dependent:**
  - Combat: structured choice menus (attack, move, use item, special action)
  - Exploration / social: freeform - DM describes scene and waits

### 7.3 Skill Checks (F008)
- Interactive skill check prompts for combat-relevant skills only
- All other skills inform narrative silently without a separate check UI

---

## 8. COMBAT SYSTEM

### 8.1 Flow (F009)
- Turn-based, streamlined - minimum clicks per turn
- Clear initiative order displayed at top of combat section
- Player turn: choose action from menu or type freeform
- DM resolves enemy turns narratively

### 8.2 Enemy Information (F009)
- No enemy health bar or stamina display
- Player judges enemy condition from narrative description only
- DM uses condition language: "barely flinched", "staggering", "on the verge of collapse"

### 8.3 Combat Actions Menu (per turn) (F009)
- Attack (select weapon)
- Move (describe direction/cover)
- Use item
- Special action (burst fire, called shot, suppression, etc.)
- Freeform input override

---

## 9. NARRATIVE ENGINE

### 9.1 Scene Length (F010)
- Default: full cinematic paragraphs
- DM adapts pacing dynamically:
  - High-tension moments (combat, chases): shorter punchy prose
  - Exploration / social scenes: richer descriptive paragraphs
- Target 2-4 paragraphs per scene beat before prompting player action

### 9.2 DM Voice (F010)
- Adapts to scene tone automatically
- Action scenes: terse, kinetic, present-tense
- Exploration: atmospheric, evocative
- Social / intrigue: measured, character-driven
- No fixed DM personality setting

### 9.3 Rules Transparency (F010)
- Rules stay behind the curtain during normal play
- Player can ask DM to clarify a ruling via meta-control button
- DM explains ruling in plain language when asked, then resumes narrative

---

## 10. NPC SYSTEM

### 10.1 Presentation (F011)
- Name and role only (no portraits, no avatars)
- Brief inline descriptor on first appearance: "Kor Valdeen, a scarred Krix fixer"

### 10.2 Tracking (F011)
- Key recurring NPCs: tracked with relationship status (ally / neutral / enemy / unknown)
- Minor NPCs: generated on the fly, not persisted
- DM maintains NPC consistency within a campaign session

---

## 11. FACTION SYSTEM (F012)

- Simple three-state reputation per major faction:
  - ALLY / NEUTRAL / ENEMY
- Factions tracked: CFW, Apex Law, Nexarion Group Corp, Helix Combine, The Vaash (enemy by default), others as encountered
- Player actions can shift faction standing
- Faction status visible in character sidebar

---

## 12. CAMPAIGN & PROGRESSION

### 12.1 Structure (F013)
- Campaign mode: decisions carry forward between sessions
- Session summaries generated at end of each session

### 12.2 Experience Points (F013)
- XP awarded by DM after encounters and scene completions
- Displayed in character sidebar
- XP thresholds and skill advancement tracked (Astra Rising Core rules)

### 12.3 End-of-Session Summary Card (F014)
Displayed at session end, contains:
- What happened (2-3 sentence narrative recap)
- XP earned this session + total XP
- Loot / gear acquired
- NPC relationship changes
- Faction standing changes
- Session number and timestamp

### 12.4 Healing Between Scenes (F013)
- Instant heal between scenes for pacing
- No enforced rest timers in Phase 1
- Narrative acknowledgment: "You patch up in the corridor before moving on"

---

## 13. META-CONTROLS (F015)

Persistent control bar (bottom of screen on mobile):

| Control | Function |
|---------|----------|
| Save Snapshot | Saves current game state to browser session memory |
| Restart Scene | Resets current scene to its opening state |
| Ask DM | Opens rules clarification input - DM explains ruling then resumes |
| Recap | Triggers optional scene/session recap |
| Summarize Campaign | Appears at 15+ scenes - compresses old scene history to free context space |

- No undo last action
- No full session export

---

## 14. JOURNAL / QUEST LOG (F016)

- Auto-updating journal
- DM appends a 1-2 sentence entry after each scene closes
- Journal accessible via tab or collapsible panel
- Entries are player-facing narrative ("You learned that the The Vaash agent is aboard Truane's Star station")
- Player cannot edit journal in Phase 1

---

## 15. SESSION PERSISTENCE (F017)

- Auto-save to browser memory within active session
- Save Snapshot button for manual checkpoint
- State stored in JavaScript memory (no localStorage)
- No cross-session persistence in Phase 1 (Phase 2 feature)
- No export

---

## 16. MAPPING (F018)

- Theater of the mind by default - no map shown
- Optional map toggle available
- When toggled: simple ASCII or minimal graphic representation of current area
- Map does not auto-update; DM generates on player request or at scene start

---

## 17. RULES REFERENCE (F015)

- No always-visible rules panel
- Accessible only via "Ask DM" meta-control
- DM provides plain-language ruling and cites the relevant mechanic
- Returns to narrative after ruling

---

## 18. AUDIO

- No audio in Phase 1

---

## 19. LANGUAGE

- English only

---

## 20. TECHNICAL REQUIREMENTS

### 20.1 Platform (F019)
- React single-file artifact (JSX)
- Mobile-first responsive CSS (Tailwind utility classes - base stylesheet only, no JIT)
- No backend - all state in React memory (useState / useReducer)
- Single file: App.jsx (all components, state, API calls in one file)

### 20.2 AI Integration (F019)
- Claude API: claude-sonnet-4-6
- System prompt encodes: full rules knowledge, all pre-gen characters, Frontier setting, DM behavior rules
- Game state passed in full on every API call (stateless completion model)
- DM prompt instructs: rules-light adjudication, cinematic tone, dynamic pacing, faction/NPC tracking

### 20.3 State Object Reference

The definitive GameState type is defined in Section 28.3. This is a brief reference only.
Top-level keys: character, campaign, session, scene, meta
See Section 28.3 for the full typed contract. Section 28.3 wins on all conflicts.

Key constraints:
- character.stamina.current: cannot go below 0 or above character.stamina.max
- character.seu.total: sum of all seu.sources[].current
- scene.scene_type_history: array of last 5 scene types for rotation enforcement (Section 23.4)
- meta.loading: set true during any API call, false on completion or error

### 20.4 Context / Token Strategy (F020)

**Approach: Full-state with on-demand compression**

Phase 1 sends full game state on every API call (Option A - simplest, correct, no meaningful limits in normal play). A scene counter tracks session length and triggers a compression prompt at threshold.

**Implementation rules:**

- Every API call includes: system prompt + full state object + last 2 scenes verbatim + current player action
- Older scene history beyond the last 2 scenes is included as-is until the compression threshold is hit
- At 15 scenes, the app surfaces a "Summarize Campaign So Far" button in the meta-controls bar
- When triggered, a compression call is made: DM condenses all scene history older than the last 2 scenes into a single compact narrative summary block (~300-500 tokens)
- That summary block replaces the raw old scene history in all future calls
- Compression can be triggered again at each subsequent 10-scene interval

**Token budget estimates (per call):**

| Component | Approx Tokens |
|-----------|--------------|
| System prompt (rules + DM behavior) | 4-6k |
| Game state object | 1-2k early / 3-5k late |
| Last 2 scenes verbatim | 1-2k |
| Compressed history summary (post-threshold) | 0.5k |
| Current player action | 0.1k |
| Total typical call | 7-15k |

Sonnet context limit is 200k tokens - no practical risk of hitting ceiling in Phase 1 play.

### 20.5 Constraints (F019)
- No localStorage / sessionStorage (not supported in Claude artifacts - will throw at runtime)
- No file downloads
- No external asset dependencies beyond Tailwind base stylesheet + lucide-react@0.383.0
- No arbitrary Tailwind values (no w-[123px], no custom CSS classes)
- Single JSX file: all components, state management, API calls in App.jsx

---

## 21. OUT OF SCOPE - PHASE 1

- Character creation wizard
- Knights Rising spaceship combat
- Astra Risingman fan content
- Multiplayer
- Audio
- Cross-session save persistence
- Full equipment economy / shopping
- NPC portraits
- XP-based skill advancement UI (tracked but advancement adjudicated by DM narratively)
- Mobile app / PWA packaging

---

## 22. PRE-GEN CHARACTER SPECS (see Section 27 for full stat blocks)

All four characters built to Korvath's starting character guidelines, Astra Rising Core stat ranges, balanced loadouts for solo play at starting level. Section 27 is the authoritative source. This table is a quick-reference only.

| Character | Race | PSA | Key Skills | Primary Loadout |
|-----------|------|-----|------------|---------|
| Kael Voss | Human | Military | Beam Weapons 2, Melee Weapons 2, Demolitions 1 | Rafflur M-3, Ke-1000 laser pistol, Albedo Suit |
| Skrix | Krix | Technical | Technician 3, Computers 1, Beam Weapons 1 | Ke-1000 laser pistol, Doze Grenades, Civilian Skeinsuit |
| Bolg | Moluun | Biosocial | Medical 3, Environmental 1, Psycho-Social 1 | Electrostunner, Medkit x2, Albedo Suit |
| Rayla | Skrath | Explorer | Beam Weapons 2, Survival 2, Tracking 2 | Ke-2000 laser rifle, Survival Pack, Skeinsuit |

NOTE: Section 22 table corrected from v1.0. Previous version listed "Projectile Weapons 3" and "Needler" for Kael - both were errors. Kael has no Needler and no Projectile Weapons skill. See Section 27 for full verified specs.

---

---

## 23. NARRATIVE DESIGN & CAMPAIGN GUIDELINES

This section defines how the AI DM constructs, runs, and sustains compelling campaigns. These rules are encoded into the system prompt and govern DM behavior at all times.

---

### 23.1 Campaign Structure - The Loose 3-Act Spine

At campaign start the DM privately generates a 3-act outline. This outline is never shown to the player. It exists as a hidden scaffold the DM adapts freely around player choices.

**Act 1 - Inciting Crisis (Sessions 1-2)**
- Establish location, immediate threat, and stakes
- Introduce at least one key NPC with a clear role
- End when the player has a clear goal and a reason to pursue it

**Act 2 - Escalating Conflict (Sessions 3-5)**
- Raise stakes at least once per session
- Introduce complications - new information that reframes the situation
- Deploy the campaign's single optional story device (see 23.2)
- Major player choices made here reshape Act 3

**Act 3 - Convergence (Sessions 6+)**
- Drive toward a climactic confrontation or resolution
- Reflect major player choices back into the ending conditions
- Leave at least one thread unresolved as a campaign hook

*The DM never rigidly follows the outline. If player choices take the story in a better direction, the DM updates the private outline and follows the player.*

---

### 23.2 Story Devices - One Per Campaign

The DM selects exactly ONE of the following devices per campaign. Selection is made at campaign generation based on the opening scenario and player character. Devices are never stacked.

| Device | Description |
|--------|-------------|
| Named Villain | A specific antagonist with coherent motivation - not evil for evil's sake |
| Ticking Clock | A hard deadline the player must race against |
| Mystery | A central question with clues seeded 2-3 scenes apart |
| Betrayal | A trusted NPC turns - planted with subtle behavioral tells early |

**Rules for device use:**
- The device must be introduced by Act 2 at the latest
- It must pay off in Act 3 - no device is introduced and abandoned
- The DM tracks device state in the campaign state object

**Mandatory in every campaign regardless of device:**
- A moral dilemma with no clean answer - presented at least once, with real consequences either way
- Escalating stakes - each act must feel more consequential than the last

---

### 23.3 Player Choice & Plot Responsiveness

**Major choices** (allying with a faction, letting an NPC die, refusing a mission, exposing a conspiracy) reshape the Act 3 outline. The DM updates the private campaign spine when a major choice lands and acknowledges the consequence narratively within 1-2 scenes.

**Minor choices** (which route to take, how to approach a guard, what to say to an NPC) affect scene outcomes and color - they do not alter the main plot trajectory.

**The DM never punishes player agency.** Unexpected choices are treated as interesting complications, not obstacles to the story. If the player goes sideways, the main plot thread waits - and the world reacts to the detour.

---

### 23.4 Scene Variety - Mandatory Rotation

The DM actively cycles scene types to prevent monotony. No scene type should repeat more than twice in a row. The DM tracks recent scene types in the session state.

**Active scene types:**
- Combat encounter
- Exploration / discovery
- Social / negotiation
- Stealth / infiltration
- Chase sequence

**Rotation rule:** After any combat scene, the next scene must be non-combat. After two non-combat scenes of the same type, the DM introduces variety.

**Investigation / puzzle scenes** are woven into other scene types as sub-elements rather than standalone scenes (e.g. examining a crime scene during exploration, decoding a message during a social scene).

---

### 23.5 Session Pacing & Endings

Sessions end naturally when a story beat completes. The DM does not force cliffhangers or artificial endings.

**Natural ending signals:**
- A major goal is achieved or definitively failed
- A key revelation lands and needs time to settle
- The player character reaches a moment of rest or decision

**At session end the DM:**
1. Delivers a 2-3 sentence closing narration
2. Triggers the end-of-session summary card (XP, loot, NPC/faction changes)
3. Updates the journal
4. Optionally plants a single forward hook - one unanswered question or visible threat on the horizon

*Cliffhangers are used sparingly and only when they arise organically from the story - never manufactured.*

---

### 23.6 NPC Design & Agency

**Key NPCs (tracked in campaign state):**
- Have a named goal independent of the player
- Pursue that goal whether or not the player interacts with them
- Can succeed or fail at their agenda based on DM adjudication
- Relationship status shifts based on player actions (ally / neutral / enemy)
- Have 1-2 consistent personality traits the DM maintains across appearances

**Minor NPCs:**
- Generated contextually, not tracked
- React to the player but do not drive events
- Can be elevated to key NPC status if the player invests in them

**NPC behavior rules:**
- NPCs lie, deceive, and withhold information when it serves their agenda
- NPCs remember what the player did to them or for them
- No NPC is purely good or purely evil - all have comprehensible motivations

---

### 23.7 Foreshadowing & Twists

The DM uses a mixed approach - some twists are telegraphed, some land without warning.

**Foreshadowed twists:**
- Plant 2-3 subtle behavioral or environmental tells 2-3 scenes before the reveal
- Tells should be noticeable on reflection but not obvious in the moment
- Example: a trusted NPC consistently deflects questions about one specific topic

**Blindside twists:**
- No advance telegraphing
- Must still feel coherent in retrospect - the DM retroactively ensures the twist was always plausible given what the player has seen
- Used at most once per campaign

**Anti-patterns the DM avoids:**
- Twists that invalidate player choices already made
- Reveals that require information the player could not have had access to
- Consecutive twists in the same session (twist fatigue)

---

### 23.8 Character Backstory Integration

The DM weaves pre-gen backstory into the story subtly. The player may not immediately notice the connection.

**Methods:**
- An NPC recognizes the character from their past without explaining how
- A location from the backstory appears incidentally in the environment
- A faction the character has history with shows up with an existing attitude already set
- A skill the character has gets an unexpected test in a situation that echoes their origin

**Rules:**
- Backstory never overrides the main plot - it colors it
- No backstory element is forced - if it fits, use it; if not, leave it
- Backstory hooks are a reward for reading the bio, not a requirement for enjoying the game

---

### 23.9 Sandbox Balance

The DM maintains a main plot thread at all times but actively rewards exploration.

**Main plot thread:**
- Always has a visible next step the player can pursue
- Does not time-out or expire while the player explores side content
- The world reacts to the player ignoring it - NPCs send messages, situations worsen, deadlines loom

**Side content rewards:**
- Exploration scenes can surface gear, credits, or loot
- Social detours can open new faction relationships or NPC allies
- Stealth / infiltration detours can yield intelligence that helps in Act 3

**The DM never punishes side exploration.** Side content should feel as meaningful as main plot progress.

---

### 23.10 Coherence Rules

The DM maintains an internal consistency checklist at all times:

- Named locations stay consistent across scenes (same layout, same described features)
- NPC names, appearances, and stated facts do not contradict earlier scenes
- Established world facts (faction relationships, known tech, canon Frontier lore) are not violated
- The campaign device selected in 23.2 remains logically consistent from introduction to payoff
- The DM never retcons a player choice - consequences are permanent

*If a contradiction is unavoidable, the DM addresses it in-world (an NPC was lying, the earlier information was incomplete) rather than silently rewriting history.*

---

### 23.11 Story Device Details

**Device selection:** Random selection weighted by the campaign's active adventure themes. At campaign start the DM rolls privately against the theme weightings and selects one device. Device is locked for the duration of the campaign.

**Device hinting:** The DM plants a subtle hint at the selected device type in the opening scene - not a reveal, just a shadow. A mysterious figure glimpsed. A deadline mentioned in passing. An NPC who is slightly too helpful.

**Per-device rules:**

VILLAIN
- Appearance timing: DM decides per story. Earlier appearance favored when adventure themes suggest it. May remain hidden until Act 2.
- Power level: Beatable if the player plays well. Clever and resourceful, not invulnerable.
- Motivation: Never evil for its own sake. Always a comprehensible goal even if methods are monstrous.
- NPC sourcing: Invented NPCs as primary villains. Canon figures in supporting antagonist roles.

MYSTERY
- Clue gating: DM ensures at least 2 paths to every key clue. No clue behind a single skill check with no alternative. Player is never truly stuck.
- Ignored clues: DM tracks and resurfaces ignored leads within 1-2 scenes via NPC contact or environmental callback.
- Resolution: Mystery must be solvable from information available to the player. No reveals requiring hidden knowledge.

BETRAYAL
- Setup: One or two small behavioral tells buried in innocuous moments. Traitor is genuinely likeable with no obvious red flags - just small forgettable inconsistencies that feel obvious in retrospect.
- Payoff timing: Act 2 or early Act 3 - never the final scene.
- Aftermath: Betrayal has permanent consequences. Relationship status updates. DM does not soften the impact.

TICKING CLOCK
- Communication: Felt through narrative pressure, not a literal countdown UI. Environmental signals - NPCs grow anxious, situations worsen, references to time mount.
- Deadline visibility: Player can ask "how much time do we have?" and receive a clear narrative answer.
- Consequence: If deadline passes, something bad happens. DM commits to this. The clock is real.

---

### 23.12 Campaign Opening

At the start of every new campaign the DM generates exactly 3 distinct opening hooks for the player to choose from. Each hook is 2-3 sentences maximum, establishes a location/situation/reason to act, hints at different adventure themes, and connects to the selected character's archetype and backstory where possible.

Player picks one. DM builds from it. Unchosen hooks are discarded.

Target campaign length: 8-12 sessions. DM privately tracks session count and begins building toward Act 3 convergence by session 6.

---

### 23.13 Tension & Pacing Management

Every session should contain at minimum: one high-tension moment, one moment of relative calm, one moment of meaningful revelation.

**Tension mechanics:**
- If three consecutive exchanges have been low-stakes, DM introduces a complication or advances a threat.
- When player is idle or stuck, DM chooses one of: introduce a new threat, surface an ignored lead via NPC contact, or visibly advance the antagonist's agenda.
- Engineered triumph: After 3+ scenes with negative outcomes, DM manufactures a clear win the player earns with modest effort.

---

### 23.14 Consequence Handling

**Costly mistakes:** DM holds consequences 1-2 scenes, giving the player a course-correction window. Consequence telegraphed once before landing, then enforced permanently.

**Critical roll failure:** DM narrates failure cinematically and moves the story forward. Failure changes the situation, creates new problems, never stops momentum.

**Player triumph:** Bold or surprising actions acknowledged through NPC reaction - show don't tell. DM does not break voice to compliment the player.

---

### 23.15 Moral Dilemma Handling

Dilemmas presented through story events - player recognizes the weight themselves. DM does not label or flag them.

Both choices carry real costs. DM commits to consequences either way. Outcomes weighted toward ambiguity.

Frequency: Whenever the story organically produces one. Not manufactured, not avoided.

---

### 23.16 NPC Voice & Dialogue

Key NPCs have distinct voices maintained across all appearances. Defined by: speech pattern, a recurring verbal tic or phrase, and an emotional register.

Minor NPCs are neutral and functional.

DM uses real-world analogues freely as internal shorthand to inform NPC writing, even if analogues never appear in the narrative itself.

---

### 23.17 Player Agency & Creative Solutions

DM rewards creative solutions with better outcomes than brute force. Unanticipated approaches get the most appropriate skill assigned at a fair difficulty.

Combat avoidable through cleverness should be avoidable. DM never funnels into a fight when a non-combat solution was plausible and attempted.

Encounters that cannot be won through combat alone are used occasionally - not to punish but to reward lateral thinking. Retreat is always valid when danger is clearly signaled via NPC behavior and environmental cues before combat begins.

---

### 23.18 World & Environmental Storytelling

Environment is treated as an active narrative element. Weather, architecture, sound, temperature, smell are used throughout - not described once and dropped.

Sensory details beyond visuals used throughout: recycled station air, subsonic drive hum, alien sand grit, failing life support cold.

---

### 23.19 Tangents & Sandbox Behavior

Interesting tangents become permanent story branches. The main plot waits and the world reacts to the player's absence from it.

DM never explicitly redirects the player back to the main plot. The plot reasserts itself through the world: NPC contact, deadline reminder, consequence of inaction.

Side content generated fresh per campaign where possible. Location types and NPC archetypes may recur in new configurations. Scenarios within the Frontier are unique.

---

### 23.20 Tone & Genre

DM writes in any cinematic sci-fi register appropriate to the scene. Mass Effect, Alien, Dune, Firefly tones all valid.

Genre blending encouraged. Horror, noir, political thriller, action-adventure shift naturally as the story demands.

DM narrative register shifts subtly as campaign tone evolves: establishing early, tense mid-campaign, climactic late.

Narrative POV: Second person throughout. Character name used naturally in action beats.

Scene closings vary by dramatic weight - sometimes a forward prompt, sometimes narrative silence.

---

### 23.21 Comedy & Tone

If the player does something clearly comedic, DM reads intent and breaks tone only when the moment is unambiguously comedic. Dry acknowledgment through NPC reaction preferred over breaking voice.

No content warnings during play. Player accepted the tone at campaign start.

---

### 23.22 The Vaash Portrayal

The Vaash in direct combat: unknowable alien horror. No dialogue, no negotiation, no comprehensible motivation. Pure threat.

The Vaash agents, spies, and cultists (often other species): can speak, negotiate, deceive, and be reasoned with. Comprehensible motivations - money, ideology, coercion, survival. They work for monsters but are not themselves monsters.

This distinction creates dramatic range: horror of The Vaash combat vs. moral complexity of a The Vaash-aligned NPC who might be enemy, informant, or victim.

---

### 23.23 Canon & World-Building

Canon lore dropped naturally when relevant to the scene. Lore density rewards attention without punishing ignorance.

Canon gaps filled with details consistent with Frontier tone and logic. Invented details never contradict established canon facts.

---

### 23.24 Campaign Endings

Target: Satisfying narrative conclusion to the main arc. DM builds toward this from session 6 onward.

At campaign end: story device pays off explicitly, at least one major Act 2 player choice is reflected in ending conditions, one thread left unresolved as organic hook. DM asks player one question: "What did you enjoy most this campaign?"

---

### 23.25 Bundled Adventure Library

Five pre-built adventures bundled with Phase 1. Each stored as JSON with consistent schema: scene structure, NPC stat blocks, skill check tables, branching exits, reward tables, and per-adventure ai_instructions that override general DM behavior for tone and pacing.

| Adventure | Difficulty | Genre | Key Themes |
|-----------|------------|-------|------------|
| Crash on Cethara | Beginner | Survival / First Contact | Exploration, alien cultures, CFW Frontier |
| Ghost Station | Intermediate | Cosmic Horror | Dread, unknowable threat, sacrifice |
| The Nexus Job | Intermediate | Corporate Espionage | Intrigue, megacorps, moral ambiguity |
| The Golden Mandible | Beginner-Friendly | Comedy Heist | Crew dynamics, creative solutions, humor |
| The Erebus Protocol | Advanced | Conspiracy Thriller | Identity, black ops, moral consequence |

Adventures connect: Crash on Cethara feeds into Starspawn of Cethara. The Nexus Job and Erebus Protocol share the Nexus setting. The Golden Mandible's mentor hook is designed to continue in a follow-up session.

The DM can also generate original campaigns using sections 23.1-23.24 without loading a pre-built adventure.

---

*PRD Version 1.2 - Section 23 fully expanded: 25 subsections covering Campaign Building and AI Behavior. Adventure library (5 adventures) documented in Section 23.25.*

---

## 24. ONBOARDING & NEW PLAYER EXPERIENCE

### 24.1 First Launch Flow

No splash screen or lore preamble. Player lands directly on the Session Zero screen.

Session Zero presents adventure cards and character cards simultaneously. Player picks one adventure + one character as a combined selection. DM generates 3 opening hooks based on that specific combination.

Screen layout (Session Zero):
- Left panel: Adventure cards (5 adventures, each showing title, difficulty badge, genre tag, 1-sentence synopsis)
- Right panel: Character cards (4 pre-gens, each showing name, race, archetype, 1-sentence flavor bio)
- Both selections required before "Begin Adventure" CTA activates
- No sequential flow - player browses both panels freely before committing

### 24.2 Tutorial Approach

No explicit tutorial. Crash on Cethara serves as the de facto tutorial adventure.

First time each mechanic triggers, DM narrates the result in plain language. Inline tooltips appear on first mention of each game term (Stamina, SEU, RS check, Initiative, etc.). Tooltips are tap/hover-triggered, never intrusive, dismissed automatically after 4 seconds. After first appearance, terms render as normal text.

Terms requiring tooltips: Stamina, SEU, Reaction Speed (RS), Initiative, Action Points, Skill Check, Defense Score, Burst Fire, Called Shot, Cover, Condition (stunned / tangled / doze).

### 24.3 Character Selection

All 4 characters available for any adventure. Adventure context informs character card subtitle noting archetype fit, but selection is always unrestricted.

Character card content: name, race, archetype label, one-line flavor bio, key skills (3 max), difficulty note. No full stat block at selection - stats visible in sidebar once session begins.

### 24.4 Hook Generation & Display

After adventure + character selection, player taps "Begin Adventure."

Loading state: progress indicator "Your DM is preparing your adventure..." with rotating Astra Rising lore tidbits (6-8 total, cycling every 3 seconds). Typical generation time 5-10 seconds.

Hook presentation: 3 hook cards displayed (side by side desktop, stacked mobile). Each card: hook title (bold, 4-6 words) + full opening paragraph the DM will use if chosen. Player taps to select. No confirm step - selection is immediate.

### 24.5 Session Start Transition

1. Transition card displayed 1.5 seconds: character name + adventure title + "Session 1"
2. Card fades
3. DM opens with the chosen hook paragraph as first narrative entry
4. First turn only: subtle hint text below input - "Type your action or choose from the options below"
5. Hint disappears after first player input, never returns

### 24.6 Returning Player Experience

If active campaign exists in session memory:
- "Continue Campaign" is primary CTA (prominent, top of screen)
- "New Campaign" is secondary (smaller, below)
- Continue loads last scene state with previous session summary card shown first
- Player dismisses summary to resume

Auto-save: state saves to browser memory after every DM response. Player can close and return within same browser session without losing progress.

### 24.7 Scene Context Visibility

Persistent scene header card at top of narrative log, sticky above scroll:

  [LOCATION NAME]  |  Scene X  |  Session Y
  [1-line situation summary]

Updates when DM begins a new scene.

### 24.8 Campaign Abandonment

"New Campaign" while campaign active triggers single confirmation: "Start a new campaign? Your current campaign progress will be lost." Options: "Yes, start over" / "Keep playing." Session memory only - no permanent storage in Phase 1.

---

## 25. SESSION ZERO / CAMPAIGN INITIALIZATION FLOW

### 25.1 Initialization Sequence

1. Player selects adventure + character simultaneously
2. Player taps "Begin Adventure"
3. App builds initialization payload: adventure JSON + character stat block + theme preferences + story device weighting table
4. App calls Claude API with initialization prompt
5. Loading state displays with lore tidbits
6. Claude returns: story device (internal), 3 hook objects (title + opening paragraph)
7. App renders 3 hook cards
8. Player selects hook
9. App builds first-scene payload and calls Claude API
10. Transition card displayed (1.5s)
11. First DM narration renders
12. First-turn hint appears
13. Session begins

### 25.2 Initialization API Call

Separate from gameplay calls. Establishes campaign spine before play begins.

User message for initialization:

  Adventure: [title]
  Character: [name, race, archetype]
  Task: Generate campaign initialization.

  Return valid JSON:
  {
    "story_device": "[villain|mystery|betrayal|ticking_clock]",
    "story_device_seed": "[1-sentence private note]",
    "hooks": [
      {"title": "...", "opening": "..."},
      {"title": "...", "opening": "..."},
      {"title": "...", "opening": "..."}
    ],
    "campaign_spine": {
      "act1_goal": "...",
      "act2_complication": "...",
      "act3_convergence": "..."
    },
    "key_npcs": [
      {"name": "...", "role": "...", "goal": "...", "attitude": "ally|neutral|enemy"}
    ]
  }

### 25.3 Standard Gameplay Call Response Schema

Every gameplay call returns:

  {
    "narrative": "...",
    "dice_rolls": [
      {"label": "DEX check", "roll": 47, "target": 65, "result": "HIT"}
    ],
    "state_updates": {
      "stamina_delta": 0,
      "seu_delta": 0,
      "status_add": [],
      "status_remove": [],
      "inventory_add": [],
      "inventory_remove": [],
      "xp_delta": 0,
      "npc_updates": [],
      "faction_updates": [],
      "journal_entry": "..."
    },
    "choices": ["...", "...", "..."],
    "scene_change": false,
    "scene_header": null,
    "combat_state": null
  }

### 25.4 State Compression Format

Full state injected every call in compressed format:

  CHAR: [name] [race] STA:[cur]/[max] SEU:[cur]/[max] AMMO:[weapon]:[cur] STATUS:[effects]
  STATS: STR/STA:[x] DEX/RS:[x] INT/LOG:[x] PER/LDR:[x]
  SKILLS: [skill]:[level], ...
  INV: [item], ...
  XP:[total] CR:[credits]
  CAMPAIGN: session:[n] scene:[n] device:[type]
  FACTIONS: CFW:[status] StarLaw:[status] Nexarion Group:[status] Helix Combine:[status] The Vaash:enemy
  NPCS: [name]:[role]:[attitude], ...
  JOURNAL_LAST: [last journal entry]

---

## 26. SYSTEM PROMPT ARCHITECTURE

### 26.1 Structure

Three layers assembled in fixed order every call:

  LAYER 1: Rules Foundation (static)
  LAYER 2: DM Persona & Behavior (static)
  LAYER 3: Campaign State (dynamic, rebuilt every call)

Rules first as authoritative foundation. Persona second as interpretive lens. State last - closest to the query, where Claude's attention is strongest.

### 26.2 Layer 1 - Rules Foundation

Declarative fact statements covering:
- Percentile resolution (roll d100 equal to or under target to succeed)
- Stat pairs and uses
- Skill check structure
- Combat sequence (initiative, action economy, weapon damage, armor)
- Active optional rules: burst fire, called shots, cover/concealment, suppression fire
- Status effects and mechanical impacts
- Healing (instant between scenes)
- XP award guidelines

### 26.3 Layer 2 - DM Persona & Behavior

Condensed from Section 23:
- Identity: "You are the Dungeon Master for a Astra Rising solo RPG campaign."
- Narrative voice: second person, cinematic, genre-blending
- Tone, structure, NPC, and coherence rules
- Output format: always valid JSON matching Section 25.3 schema
- OOC voice: meta control responses in clearly separated OOC block within JSON

### 26.4 Layer 3 - Campaign State

Compressed state format from Section 25.4 plus last 2 scene summaries verbatim, plus compressed history summary post Scene 15.

### 26.5 Output Validation

App validates every DM response before rendering.

Checks: required fields present, state_updates within legal ranges, dice_rolls valid if present, choices array 2-4 items.

On failure: silent retry once. Second failure: OOC message "Your DM lost the thread for a moment. Retrying..." Third failure: surfaces Ask DM button with pre-filled "Please continue from where we left off."

### 26.6 Contradiction Handling

App validates state_updates against current state before applying. Invalid updates silently discarded. Discrepancy logged for session debugging.

DM persona instruction: "If you realize you have stated something contradicting established facts, correct it in-world. A character was mistaken. The earlier information was incomplete. Never retcon."

### 26.7 Rules Invention Policy

DM can invent rulings for uncovered situations. Must flag with inline OOC note:

  [DM ruling: treating this as a DEX check at base 40 - no exact rule covers this situation]

### 26.8 Ambiguous Input Handling

DM resolves with best interpretation, notes assumption inline within narrative:

  "You move toward the door - taking that as a cautious approach rather than a charge..."

No multi-turn clarification. Single exchange, noted assumption, move forward.

---

*PRD Version 1.3 - Sections 24, 25, 26 added: Onboarding, Session Zero Flow, System Prompt Architecture.*

---

## 27. PRE-GENERATED CHARACTER STAT BLOCKS

### Design Notes

Stats built using Astra Rising Core rules:
- Base stat range: 30-70 (rolled per pair per table)
- Racial adjustments applied per Korvath's Guide table
- Starting XP: 20 points (10 to profession, 10 to skills)
- Starting credits: 250 + d100 (using average 300 Cr for pre-gens)
- Skill costs: Level 1 = 1 XP (professional), Level 2 = 2 XP, Level 3 = 4 XP
- IM = RS / 10 (round up)
- PS derived from STR table

All four characters are built at "experienced starting character" level - slightly above raw recruit but not veterans. This matches the adventure library difficulty range.

---

### Character 1: KAEL VOSS

Race: Human
PSA: Military (Enforcer profession)
Background: Ex-Colonial Militia turned freelance security contractor. Grew up on Pale, did two tours with the planetary defense force before going private. Blunt, reliable, and quietly loyal to anyone who earns it.

ABILITY SCORES
STR: 55
STA: 55
DEX: 55
RS: 50
INT: 40
LOG: 40
PER: 45
LDR: 50

  Human bonus: +5 to LDR (raised from 45 to 50)

COMBAT STATS
IM: 5 (RS 50 / 10)
PS: +3 (STR 55, falls in 41-60 bracket)
DM: +0 CS (DEX 55, falls in 41-55 bracket - note: 56+ would be +1 CS)

SKILLS
  Beam Weapons Lv 2 (costs 1+2=3 XP prof)
  Melee Weapons Lv 2 (costs 1+2=3 XP prof)
  Demolitions Lv 1 (costs 1 XP prof)
  Thrown Weapons Lv 1 (costs 1 XP prof)
  Gyrojet Weapons Lv 1 (costs 1 XP prof - bonus from Enforcer profession)
  Total XP spent: 9 professional XP (within budget after 10 to profession)

STAMINA: 55/55

EQUIPMENT
  Rafflur M-3 proton pistol (10 SEU minipowerclip, loaded) - Apex Law issue
  Ke-1000 laser pistol (20 SEU clip, loaded) - backup sidearm
  20 SEU powerclip (spare)
  Albedo suit (absorbs laser damage)
  Vibroknife
  Standard equipment pack (survival basics)
  Chronocom (wrist communicator)
  2x Frag grenades
  Credits: 300 Cr

SEU TOTAL: 30 SEU (M-3 clip 10 + Ke-1000 clip 20)

RACIAL ABILITY: Human - +5 applied to LDR (already included above)

FLAVOR BIO
"The militia paid in experience. The Frontier pays in credits. Kael stopped asking which was worth more around the time he watched his third platoon sergeant make the wrong call. He gets hired to keep people alive. He's good at it."

---

### Character 2: SKRIX

Race: Krix
PSA: Technical (Techex profession)
Background: Corporate technician who severed ties with Nexarion Group after discovering her team's "survey equipment" was actually a weapons prototype. Now freelance, deeply suspicious of corporate employers, exceptional at keeping hardware running under hostile conditions.

ABILITY SCORES
  Base (before racial): STR/STA 45, DEX/RS 50, INT/LOG 50, PER/LDR 45
  Krix adjustments: STR/STA -5, DEX/RS +0, INT/LOG +5, PER/LDR +0

STR: 40
STA: 40
DEX: 50
RS: 50
INT: 55
LOG: 55
PER: 45
LDR: 45

COMBAT STATS
IM: 5 (RS 50 / 10)
PS: +2 (STR 40, falls in 21-40 bracket)
DM: +0 CS (DEX 50, falls in 41-55 bracket)

SKILLS
  Technician Lv 3 (costs 1+2+4=7 XP prof - bonus Lv1 from Techex profession + 2 purchased)
  Computers: Access and Operate Lv 1 (costs 1 XP prof)
  Beam Weapons Lv 1 (costs 2 XP non-prof)
  Total: 10 XP spent (exactly at budget)

STAMINA: 40/40

EQUIPMENT
  Ke-1000 laser pistol (20 SEU clip, loaded)
  20 SEU powerclip (spare)
  Civilian skeinsuit (absorbs 5 points per hit from all ranged weapons)
  Techkit (tool set for repairs and tech tasks)
  2x Doze grenades
  Spare parts pack (for field repairs, adds +1 CS to Technician checks when applicable)
  Chronocom
  Comp-tally (personal data device)
  Credits: 300 Cr

SEU TOTAL: 40 SEU (Ke-1000 clip 20 + spare 20)

RACIAL ABILITIES
  Ambidexterity: No penalty for off-hand actions
  Comprehension 15%: 15% chance to understand unknown languages/technical documents

FLAVOR BIO
"Six legs, eight eyes, and zero tolerance for corporate double-talk. Skrix can field-strip a power relay in complete darkness and has done so twice while being shot at. She doesn't like being surprised. She doesn't like being lied to. She's very good at telling the difference."

---

### Character 3: BOLG

Race: Moluun
PSA: Biosocial (Scispec profession)
Background: Ship's medic on three deep-survey missions before the last one went badly wrong. Bolg doesn't talk about what happened on the Kerrigan's Hope. Has an unsettling calm in crisis situations. Genuinely cares about the wellbeing of crew members, which in Bolg's experience is a survival advantage as much as a moral position.

ABILITY SCORES
  Base (before racial): STR/STA 50, DEX/RS 45, INT/LOG 50, PER/LDR 50
  Moluun adjustments: STR/STA +5, DEX/RS +0, INT/LOG -5, PER/LDR +0

STR: 55
STA: 55
DEX: 45
RS: 45
INT: 45
LOG: 45
PER: 50
LDR: 50

COMBAT STATS
IM: 5 (RS 45 / 10, round up)
PS: +3 (STR 55, falls in 41-60 bracket)
DM: +0 CS (DEX 45, falls in 41-55 bracket)

SKILLS
  Medical Lv 3 (costs 1+2+4=7 XP prof - bonus Lv1 from Scispec profession + 2 purchased)
  Environmental Lv 1 (costs 1 XP prof)
  Psycho-Social Lv 1 (costs 2 XP non-prof)
  Total: 10 XP spent

STAMINA: 55/55

EQUIPMENT
  Electrostunner (20 SEU clip, loaded) - non-lethal preferred
  20 SEU powerclip (spare)
  Albedo suit
  Medkit x2 (each restores up to 20 STA, 3 uses per kit)
  Bioscanner
  Stimdose x2 (counters doze, toxin, stun effects)
  Chronocom
  Credits: 300 Cr

SEU TOTAL: 40 SEU (stunner clip 20 + spare 20)

RACIAL ABILITIES
  Elasticity: Can squeeze through spaces as small as 10cm diameter, extend limbs up to 2m
  Lie Detection 5%: 5% chance per statement to detect if someone is lying (referee rolls secretly)

FLAVOR BIO
"Moluuns don't have faces in the way other races understand faces. Bolg has learned this makes organics uncomfortable in medical situations, so Bolg maintains a consistent tone of calm authority instead. It works. The crew heals faster when they trust the medic. Bolg has the numbers to prove it."

---

### Character 4: RAYLA

Race: Skrath
PSA: Explorer (Explorer profession)
Background: Born on a Skrath generation ship colony, raised in low-G habitats. Rayla has spent more time in wilderness environments and asteroid belts than in cities, and prefers it that way. Works as a scout and advance pathfinder. Occasionally hired by the Apex Law when they need someone who can track across terrain that would kill anyone else.

ABILITY SCORES
  Base (before racial): STR/STA 40, DEX/RS 50, INT/LOG 50, PER/LDR 45
  Skrath adjustments: STR/STA -10, DEX/RS +5, INT/LOG +5, PER/LDR +0

STR: 30
STA: 30
DEX: 55
RS: 55
INT: 55
LOG: 55
PER: 45
LDR: 45

COMBAT STATS
IM: 6 (RS 55 / 10, round up)
PS: +1 (STR 30, falls in 21-40 bracket - adjusted: STR 30 falls in 01-20... recalc)
  STR 30: PS table: 01-20 = +1, 21-40 = +2. STR 30 = +2
PS: +2
DM: +1 CS (DEX 55, falls in 56-70 bracket)

SKILLS
  Beam Weapons Lv 2 (costs 1+2=3 XP prof)
  Survival Lv 2 (costs 1+2=3 XP prof - bonus Lv1 from Explorer profession + 1 purchased)
  Tracking Lv 2 (costs 1+2=3 XP prof)
  Total: 9 XP spent (1 XP unspent, held as unassigned)

STAMINA: 30/30

EQUIPMENT
  Ke-2000 laser rifle (20 SEU clip, loaded) - primary weapon
  Ke-1000 laser pistol (20 SEU clip, loaded) - sidearm
  20 SEU powerclip (spare)
  Skeinsuit
  Survival pack (rope, rations, compass, firestarter, emergency shelter)
  Macrobinoculars
  Chronocom
  Credits: 300 Cr

SEU TOTAL: 60 SEU (rifle 20 + pistol 20 + spare 20)

RACIAL ABILITIES
  Night Vision: Sees in darkness as if dim light (no penalty in low-light conditions)
  Gliding: Can glide on membranes between wrists and ankles - falls up to 100m with no damage
  Battle Rage 5%: 5% chance per combat turn to enter battle rage - +10 to all combat skills, must attack nearest enemy until rage ends (referee rolls secretly at start of each turn)

FLAVOR BIO
"Rayla doesn't sleep well indoors. On a ship she gravitates to observation decks. Planetside she camps outside the perimeter. This is not antisocial behavior - she just needs to know which way the wind is coming from. She has saved more lives by knowing this than most soldiers have saved with weapons."

---

### Stamina Notes

Rayla's STA of 30 is the lowest of the four pre-gens. This is canon-accurate for Skraths (their racial penalty hits STR/STA hard). The DM should telegraph danger clearly when playing Rayla - she is the high-skill, fragile scout archetype. Beginners should be steered toward Kael or Bolg.

Character card difficulty notes:
  Kael Voss: Best for any experience level
  Skrix: Best for players interested in problem-solving over combat
  Bolg: Best for any experience level
  Rayla: Best for experienced players (low STA requires careful play)

---

*PRD Version 1.4 - Section 27 added: Pre-Generated Character Stat Blocks (all 4 characters, full stats, skills, equipment, flavor bios).*

---

## 28. MODULE CONTRACT REGISTRY

### 28.1 Purpose and Rules

This section defines the typed input/output contracts for every module in the application. These contracts are the single source of truth for all packet generation and execution.

RULES:
- All contracts are FROZEN after Packet 1 establishes the skeleton
- Any packet that requires a contract change must submit a delta to this section first
- 4-PACKET-GEN must reference these contracts verbatim when writing packet specs
- No packet may reinterpret a contract from PRD prose - it must use the type definition here
- If a contract definition and a prose description in another PRD section conflict, this section wins

---

### 28.2 Core Type Definitions

  // Stat pair value - always 30-70 range with racial adjustments
  type StatValue = number;

  // Skill level - 0 (untrained) to 8
  type SkillLevel = number;

  // Faction attitude
  type Attitude = "ally" | "neutral" | "enemy";

  // Story device types
  type StoryDevice = "villain" | "mystery" | "betrayal" | "ticking_clock";

  // Dice roll result
  type DiceRoll = {
    label: string;        // e.g. "DEX check", "Beam Weapons attack"
    roll: number;         // 1-100
    target: number;       // what was needed to succeed
    result: "HIT" | "MISS" | "CRITICAL" | "FUMBLE";
    damage?: number;      // if applicable
  };

  // Status effect
  type StatusEffect = "stunned" | "tangled" | "doze" | "bleeding" | "blinded" | "prone";

  // NPC record
  type NPC = {
    id: string;
    name: string;
    role: string;
    attitude: Attitude;
    goal: string;          // private DM note, not shown to player
    last_seen_scene: number;
  };

  // Faction record
  type Faction = {
    name: string;
    attitude: Attitude;
    notes: string;
  };

  // Inventory item
  type InventoryItem = {
    name: string;
    quantity: number;
    weight_kg: number;
    notes?: string;
  };

---

### 28.3 GameState Contract

  // THE CENTRAL STATE OBJECT - FROZEN AFTER PACKET 1
  // Every module reads from and writes to this shape.
  // No module may add, remove, or rename top-level keys without a Section 28 delta.

  type GameState = {

    // --- CHARACTER ---
    character: {
      id: string;                          // pre-gen ID e.g. "kael_voss"
      name: string;
      race: string;
      psa: string;                         // Military / Technical / Biosocial / Explorer
      archetype: string;                   // Soldier / Tech / Medic / Scout

      // Ability scores - stat pairs
      stats: {
        str: StatValue;
        sta: StatValue;
        dex: StatValue;
        rs: StatValue;
        int: StatValue;
        log: StatValue;
        per: StatValue;
        ldr: StatValue;
      };

      // Derived combat stats
      combat: {
        im: number;                        // initiative modifier = RS / 10 rounded up
        ps: number;                        // punching score from STR table
        dm_modifier: number;               // dexterity modifier column shift (-2 to +2)
      };

      // Current vs max stamina
      stamina: {
        current: number;
        max: number;
      };

      // Skills: skill name -> level
      skills: Record<string, SkillLevel>;

      // Inventory
      inventory: InventoryItem[];

      // Power/ammo tracking
      seu: {
        total: number;                     // total SEU available across all sources
        sources: Array<{
          name: string;                    // e.g. "Ke-1000 clip", "spare powerclip"
          current: number;
          max: number;
        }>;
      };

      // Projectile ammo: weapon name -> rounds remaining
      ammo: Record<string, number>;

      // Active status effects
      status_effects: StatusEffect[];

      // Credits
      credits: number;

      // XP
      xp: {
        total: number;
        unspent: number;
      };

      // Racial special abilities as flags
      racial_abilities: Record<string, boolean | number>;
    };

    // --- CAMPAIGN ---
    campaign: {
      adventure_id: string;                // e.g. "crash_on_Cethara"
      adventure_title: string;
      story_device: StoryDevice;
      story_device_seed: string;           // private DM note, never shown to player

      // 3-act spine (DM reference, not shown to player)
      spine: {
        act1_goal: string;
        act2_complication: string;
        act3_convergence: string;
      };

      // NPC roster - key NPCs tracked across sessions
      npcs: NPC[];

      // Faction standings
      factions: Faction[];

      // Hooks - the 3 generated at init, which was chosen
      hooks: Array<{
        title: string;
        opening: string;
        chosen: boolean;
      }>;

      // Journal entries
      journal: string[];
    };

    // --- SESSION ---
    session: {
      number: number;
      scene_count: number;                 // total scenes this session (triggers compression at 15)
      turn_count: number;
    };

    // --- SCENE ---
    scene: {
      header: string;                      // location name
      summary: string;                     // 1-line situation
      in_combat: boolean;
      combat_state: CombatState | null;
      recent_summaries: string[];          // last 2 scene summaries verbatim
      history_compressed: string;          // compressed history post scene 15
      scene_type_history: string[];        // last 5 scene types for rotation rule (Section 23.4)
                                           // values: "combat" | "exploration" | "social" |
                                           //         "stealth" | "chase"
    };

    // --- META ---
    meta: {
      initialized: boolean;
      loading: boolean;
      error: string | null;
      last_saved: string | null;           // ISO timestamp
      snapshots: GameState[];             // manual save checkpoints (Save Snapshot button)
                                          // max 3 snapshots kept, oldest dropped on overflow
      dev_mode: boolean;                  // gates AssertionPanel visibility (Section 30)
    };

  };

---

### 28.4 CombatState Contract

  type CombatState = {
    round: number;
    phase: "declaration" | "initiative" | "resolution" | "end";

    // Initiative order - sorted by IM + roll result
    initiative_order: Array<{
      id: string;
      name: string;
      is_player: boolean;
      initiative_roll: number;
      has_acted: boolean;
    }>;

    // Active combatants
    combatants: Array<{
      id: string;
      name: string;
      is_player: boolean;
      // Enemy health hidden from player - DM tracks descriptively
      condition: "healthy" | "injured" | "badly_injured" | "critical" | "down";
      status_effects: StatusEffect[];
      cover: boolean;
    }>;

    // Optional rules active this combat
    active_optional_rules: {
      burst_fire: boolean;
      called_shots: boolean;
      cover_concealment: boolean;
      suppression_fire: boolean;
    };
  };

---

### 28.5 DM API Request Contract

  // Sent to Claude API every gameplay turn
  type DMRequest = {
    system_prompt: string;                 // assembled from Layer 1 + 2 (see Section 26)
    state_compressed: string;             // GameState in compressed format (see Section 25.4)
    scene_summaries: string[];            // last 2 scene summaries verbatim
    player_action: string;                // what the player typed or chose
    meta_command?: "ask_dm" | "restart_scene" | "recap" | "summarize_campaign" | "save_snapshot";
  };

---

### 28.6 DM API Response Contract

  // Returned by Claude API every gameplay turn
  // EVERY field is required. Null is acceptable for optional fields but they must be present.
  type DMResponse = {
    narrative: string;                     // the DM's prose response - always present

    dice_rolls: DiceRoll[];               // empty array if no rolls this turn

    state_updates: {
      stamina_delta: number;              // negative = damage, positive = healing
      seu_delta: number;                  // negative = usage
      seu_source?: string;               // which SEU source was used
                                          // VALIDATION: if seu_source is present but does not
                                          // match any name in GameState.character.seu.sources[],
                                          // apply delta to first source with sufficient charge.
                                          // Log warning in DEV_MODE. Do NOT throw or reject response.
      ammo_updates: Record<string, number>; // weapon -> rounds used (negative)
      status_add: StatusEffect[];
      status_remove: StatusEffect[];
      inventory_add: InventoryItem[];
      inventory_remove: string[];         // item names to remove
      xp_delta: number;
      credits_delta: number;
      npc_updates: Array<{
        id: string;
        attitude?: Attitude;
        notes?: string;
      }>;
      faction_updates: Array<{
        name: string;
        attitude?: Attitude;
        notes?: string;
      }>;
      journal_entry: string | null;       // null if no journal update this turn
    };

    choices: string[];                    // 2-4 choices for player. Never 0.

    scene_change: boolean;                // true if DM is starting a new scene
    scene_header: string | null;         // required if scene_change is true
    scene_summary: string | null;        // 1-line summary - required if scene_change is true

    combat_state_update: Partial<CombatState> | null;  // null if not in combat

    ooc_note: string | null;             // DM discretion ruling or meta response. null if none.

    tooltip_terms: string[];              // game terms in narrative that need tooltips. empty if none.
  };

---

### 28.7 SessionZero API Response Contract

  // Returned by the initialization call (see Section 25.2)
  type SessionZeroResponse = {
    story_device: StoryDevice;
    story_device_seed: string;
    hooks: Array<{
      title: string;
      opening: string;
    }>;                                   // always exactly 3
    campaign_spine: {
      act1_goal: string;
      act2_complication: string;
      act3_convergence: string;
    };
    key_npcs: Array<{
      name: string;
      role: string;
      goal: string;
      attitude: Attitude;
    }>;
  };

---

### 28.8 Pre-Gen Character Definitions Contract

  // Loaded at app init. Never changes at runtime.
  type PreGenCharacter = {
    id: string;
    display_name: string;
    race: string;
    archetype: string;
    difficulty: "beginner" | "any" | "experienced";
    flavor_bio: string;
    key_skills_display: string[];         // 3 max, for character card
    // Full stat block - matches character section of GameState
    stats: GameState["character"]["stats"];
    combat: GameState["character"]["combat"];
    stamina_max: number;
    skills: Record<string, SkillLevel>;
    inventory: InventoryItem[];
    seu_sources: GameState["character"]["seu"]["sources"];
    ammo: Record<string, number>;
    credits: number;
    xp_total: number;
    racial_abilities: Record<string, boolean | number>;
  };

---

## 29. PACKET SEQUENCING MAP

### 29.1 Sequencing Principles

Packets are vertical slices, not horizontal layers.

Each packet delivers one thin end-to-end path that is provably functional before the next packet begins. No packet starts until its dependency packet has passed all acceptance criteria.

The sequence is designed so that after each packet, the app is in a demoed, runnable state - degraded but never broken.

### 29.2 Packet Dependency Graph

  PACKET_1_1  (Skeleton + State Shell)
    |
    PACKET_1_2  (Pre-Gen Character Data + Character Select UI)
    |
    PACKET_1_3  (Adventure Library Data + Adventure Select UI)
      |
      PACKET_2_1  (API Client Module - callDM() function + schema validator)
        |
        PACKET_2_2  (Session Zero - init call, loading state, hook cards)
          |
          PACKET_3_1  (Narrative Engine - hook select, transition card, DM narration, choice menu)
            |
            +-- PACKET_3_2  (State Manager - applies state_updates from DMResponse to GameState)
            |
            +-- PACKET_3_3  (Character Sheet Sidebar - renders live GameState.character)
          |
          PACKET_4_1  (Combat Engine - CombatState management, initiative, turn structure)
            |
            PACKET_4_2  (Combat UI - inline dice display, combatant status, optional rules UI)
          |
          PACKET_5_1  (Meta Controls - Ask DM, Restart Scene, Save Snapshot, Recap)
            |
            PACKET_5_2  (Session Journal + Summary Card)
              |
              PACKET_6_1  (Context Compression - scene history compression at scene 15+)
                |
                PACKET_6_2  (Continue Campaign + Returning Player Flow)
                  |
                  PACKET_7_1  (Tooltip System - first-mention term detection + tooltip render)
                    |
                    PACKET_7_2  (Scene Header Card + Persistent Context Bar)
                      |
                      PACKET_8_1  (Polish Pass - transitions, loading states, error states, hint text)

### 29.3 Parallel Groups

  Group 1 (independent):
    PACKET_1_1

  Group 2 (after Group 1 - PACKET_1_2 and PACKET_1_3 can parallelize):
    PACKET_1_2
    PACKET_1_3
    NOTE: Both depend only on PACKET_1_1 (the skeleton + GameState shell).
    Neither depends on the other. They write different files and different
    data structures. Parallelize safely.

  Group 3 (after Group 2, requires both 1_2 and 1_3):
    PACKET_2_1

  Group 4 (after Group 3):
    PACKET_2_2

  Group 5 (after Group 4):
    PACKET_3_1

  Group 6 (after Group 5, can parallelize):
    PACKET_3_2
    PACKET_3_3

  Group 7 (after Group 6, requires 3_2):
    PACKET_4_1

  Group 8 (after Group 7):
    PACKET_4_2

  Group 9 (after Group 7, can parallelize with Group 8):
    PACKET_5_1

  Group 10 (after Group 9):
    PACKET_5_2

  Group 11 (after Group 10):
    PACKET_6_1

  Group 12 (after Group 11):
    PACKET_6_2

  Group 13 (after Group 12):
    PACKET_7_1

  Group 14 (after Group 13):
    PACKET_7_2

  Group 15 (after Group 14):
    PACKET_8_1

### 29.4 Packet Spec Requirements

Each packet generated by 4-PACKET-GEN must include:

  METADATA:
    id: PACKET_X_Y
    name: [descriptive name]
    parallel_group: [number]
    dependencies: [list of PACKET_IDs or empty]
    files_modified: [list of files this packet touches]
    contract_references: [list of Section 28 type names this packet uses]
    prd_features: [list of F-IDs this packet implements]

  OBJECTIVE: [1 paragraph]

  CONTRACT IMPORTS:
    [List every type from Section 28 this packet reads or writes.
     Paste the type definition verbatim. Do not paraphrase.]

  IMPLEMENTATION DETAILS:
    [Step by step. File paths explicit. No ambiguity.
     All file paths relative to App.jsx root.
     All Tailwind classes must be from the base stylesheet only.
     No localStorage, no sessionStorage, no document.cookie.]

  STATE MUTATION RULES:
    [If this packet modifies GameState, list every field it may write.
     Fields not listed here may NOT be touched by this packet.
     Reference Section 28.3 field paths exactly, e.g. character.stamina.current]

  ACCEPTANCE CRITERIA:
    [Binary pass/fail assertions only. No subjective criteria.]
    [Each AC must reference a specific contract field or UI behavior.]
    [AUTO criteria must be visually verifiable in the rendered artifact.
     No npm test, no curl - this is a browser artifact, not a server app.]

  REGRESSION GUARD:
    [List which prior packet ACs must still pass after this packet executes.
     These are run as part of this packet's QA.
     In this artifact environment: verify via AssertionPanel, not test runner.]

  DO NOT:
    [Explicit list of what this packet must not change.
     Prevents scope creep and contract drift.]
    [Always include: DO NOT use localStorage or sessionStorage.
     Always include: DO NOT use arbitrary Tailwind values.]

---

## 30. TEST STRATEGY FOR SINGLE-FILE REACT ARTIFACT

### 30.1 Context

This application is built as a single-file React JSX artifact running in the Claude.ai artifact renderer. There is no test runner (Jest, Vitest, etc.), no CI pipeline, and no build step accessible to the packet executor.

Standard automated test suites cannot run in this environment. The Shawn AI 5b-PACKET-QA P2 check (test suite per packet) must be adapted accordingly.

### 30.2 Adapted Test Approach: Inline Assertion Panel

Each packet that touches logic (not just styling) must include an inline assertion panel component. This is a collapsible UI element rendered inside the artifact during development that runs assertions against live state and reports PASS/FAIL.

Structure (illustrative - adapt to actual packet state):

  function AssertionPanel({ gameState, dmResponse, label }) {
    const results = runAssertions(gameState, dmResponse);
    return (
      <div style={{ border: "2px solid orange", padding: 8, margin: 8 }}>
        <strong>QA: {label}</strong>
        {results.map(r => (
          <div key={r.id} style={{ color: r.pass ? "green" : "red" }}>
            {r.pass ? "[PASS]" : "[FAIL]"} {r.description}
            {!r.pass && <div style={{ fontSize: 11 }}>{r.actual}</div>}
          </div>
        ))}
      </div>
    );
  }

The AssertionPanel is gated by the DEV_MODE flag in GameState.meta.dev_mode:

  {gameState.meta.dev_mode && <AssertionPanel ... />}

DEV_MODE initialization: PACKET_1_1 sets meta.dev_mode = true in INITIAL_STATE.
PACKET_8_1 (Polish Pass) sets meta.dev_mode = false as its first task.

### 30.3 Assertion Categories Per Packet

  PACKET_1_1 (Skeleton):
    - GameState initializes with all required top-level keys present
    - No undefined values in GameState.character.stats
    - No undefined values in GameState.campaign
    - App renders without errors

  PACKET_1_2 (Character Select):
    - All 4 pre-gen characters render as cards
    - Selecting a character updates GameState.character.id
    - Character stat block matches Section 27 spec values exactly (spot check 3 fields)

  PACKET_1_3 (Adventure Select):
    - All 5 adventures render as cards
    - Selecting an adventure updates GameState.campaign.adventure_id
    - Begin Adventure CTA is disabled until both character and adventure selected

  PACKET_2_1 (API Client):
    - callDM() with valid payload returns a DMResponse-shaped object
    - callDM() rejects response if required fields missing (narrative, choices, state_updates)
    - callDM() returns error object if API call fails (not a thrown exception)
    - choices array always has 2-4 items

  PACKET_2_2 (Session Zero):
    - sessionZeroCall() returns SessionZeroResponse-shaped object
    - hooks array contains exactly 3 items
    - Each hook has non-empty title and opening fields
    - Loading state displays during API call

  PACKET_3_1 (Narrative Engine):
    - Selecting a hook renders transition card with character name + adventure title
    - After 1500ms transition, DM narrative renders in log
    - Choice menu renders 2-4 options
    - Player input field accepts text

  PACKET_3_2 (State Manager):
    - applyStateUpdates() with stamina_delta: -5 reduces GameState.character.stamina.current by 5
    - applyStateUpdates() does not allow stamina below 0
    - applyStateUpdates() does not allow stamina above max
    - applyStateUpdates() with unknown seu_source falls back to first available source (no throw)
    - Inventory add/remove updates correctly

  PACKET_3_3 (Character Sheet):
    - Sidebar renders all GameState.character fields
    - Stamina bar reflects current/max accurately
    - SEU display matches seu.sources totals
    - Status effects render as badges

  PACKET_4_1 (Combat Engine):
    - Combat initializes when DMResponse.combat_state_update is non-null
    - Initiative order sorts correctly by im + roll
    - Each combatant has_acted resets to false at start of new round
    - Combat ends when DMResponse.combat_state_update sets all enemies to "down"

  PACKET_4_2 (Combat UI):
    - Dice roll display shows [d100: X | need: Y | RESULT] format
    - Initiative order visible during combat
    - Optional rule toggles reflect active_optional_rules state

  PACKET_5_1 (Meta Controls):
    - Ask DM sends meta_command: "ask_dm" in DMRequest
    - Restart Scene sends meta_command: "restart_scene"
    - Save Snapshot appends current GameState to meta.snapshots array (max 3)
    - All meta controls visible in UI

  PACKET_5_2 (Session Journal):
    - Journal renders all GameState.campaign.journal entries in order
    - Session summary card shows on Continue Campaign load
    - Summary card dismisses on tap

  PACKET_6_1 (Context Compression):
    - At scene 15, compressHistory() is called
    - scene.history_compressed is non-empty after compression
    - scene.recent_summaries still contains last 2 entries after compression
    - DMRequest uses compressed format when scene count > 15

  PACKET_7_1 (Tooltip System):
    - First mention of "Stamina" in narrative triggers tooltip render
    - Tooltip dismisses after 4 seconds
    - Second mention of same term renders as plain text

  PACKET_8_1 (Polish):
    - DEV_MODE: false - AssertionPanels are not visible
    - First-turn hint renders and disappears after first input
    - Loading state with lore tidbits renders during API calls
    - Error state renders if API returns error

### 30.4 Regression Guard Table

  This table defines which packet's ACs must be re-verified when a later packet is added.
  5-PACKET-EXE must check this table before marking any packet complete.

  When executing PACKET...   Re-verify ACs from...
  PACKET_1_2                 PACKET_1_1
  PACKET_1_3                 PACKET_1_1, PACKET_1_2
  PACKET_2_1                 PACKET_1_2, PACKET_1_3
  PACKET_2_2                 PACKET_2_1
  PACKET_3_1                 PACKET_2_2, PACKET_2_1
  PACKET_3_2                 PACKET_3_1
  PACKET_3_3                 PACKET_3_1, PACKET_3_2
  PACKET_4_1                 PACKET_3_2, PACKET_3_1
  PACKET_4_2                 PACKET_4_1
  PACKET_5_1                 PACKET_3_1, PACKET_3_2
  PACKET_5_2                 PACKET_5_1, PACKET_3_2
  PACKET_6_1                 PACKET_3_2, PACKET_2_1
  PACKET_6_2                 PACKET_6_1, PACKET_5_2
  PACKET_7_1                 PACKET_3_1
  PACKET_7_2                 PACKET_3_1, PACKET_2_2
  PACKET_8_1                 ALL prior packets (full regression)

### 30.5 DEV_MODE Flag Protocol

DEV_MODE is stored in GameState.meta.dev_mode (boolean), NOT as a module-level const.
This means it is part of the frozen GameState contract (Section 28.3) and cannot
be changed outside of explicit state mutations.

  INITIAL_STATE.meta.dev_mode = true    // set by PACKET_1_1

  - All packets use gameState.meta.dev_mode to gate AssertionPanel visibility
  - Render pattern: {gameState.meta.dev_mode && <AssertionPanel ... />}
  - PACKET_8_1 (Polish Pass) updates INITIAL_STATE.meta.dev_mode = false as its first task
  - 5b-PACKET-QA verifies meta.dev_mode is false before HARVEST
  - DO NOT use a module-level const DEV_MODE - it cannot be toggled in the artifact renderer

### 30.6 Shawn AI 5b-PACKET-QA Adaptation

  Standard 5b check -> Adapted check for this build:

  P2 (Test Suite):
    Standard: run npm test
    Adapted: Visually verify AssertionPanel shows all [PASS] for the packet being audited.
             Screenshot or describe AssertionPanel output in QA_REPORT.md.
             Note: no test runner exists in the artifact renderer - AssertionPanel IS the test suite.

  P3 (Regression):
    Standard: run prior packet test files
    Adapted: Verify AssertionPanel for each dependency packet still shows all [PASS].
             Use Regression Guard Table (Section 30.4) to determine which to check.

  SYS1 (Full Test Suite):
    Standard: run all tests
    Adapted: Set GameState.meta.dev_mode = true temporarily (edit INITIAL_STATE),
             render full app, verify all AssertionPanels show [PASS],
             then set GameState.meta.dev_mode = false and verify panels disappear.

  SYS3 (E2E User Journey):
    Standard: walk primary user journeys in running app
    Adapted: Walk the full Session Zero -> hook select -> DM narration -> combat ->
             meta controls flow in the rendered artifact. Document each step result.

  SYS8 (ASCII Compliance):
    Standard: unchanged - grep for non-ASCII in output files
    Adapted: Also grep JSX source for Unicode in string literals.
             Command: grep -P '[^\x00-\x7F]' App.jsx

---

## 31. FEATURE ID REGISTRY

This table is the definitive mapping of F-IDs to PRD sections. PACKET-GEN uses
this table to verify all features are covered across packets.

| F-ID | Feature | PRD Section | Packet(s) |
|------|---------|-------------|-----------|
| F001 | Rules System (Astra Rising Core + Korvath, optional combat rules) | 3 | PACKET_1_1 |
| F002 | UI Layout (mobile-first, sidebar, visual theme) | 5.1-5.3 | PACKET_1_1, PACKET_3_3 |
| F003 | Narrative Display (scroll log, scene header) | 5.4 | PACKET_3_1 |
| F004 | Character Sheet Sidebar (live stats, SEU, ammo, status) | 5.5 | PACKET_3_3 |
| F005 | Dice Roll Display (inline, [d100: X | need: Y | RESULT]) | 5.6 | PACKET_4_2 |
| F006 | Pre-Gen Characters (4 characters, full stat blocks) | 6, 27 | PACKET_1_2 |
| F007 | Loadout Selection (2-3 packages per character) | 6.4 | PACKET_1_2 |
| F008 | Player Input and Interaction (choice menus + freeform) | 7 | PACKET_3_1 |
| F009 | Combat System (turn-based, initiative, enemy conditions) | 8 | PACKET_4_1, PACKET_4_2 |
| F010 | Narrative Engine (DM voice, pacing, rules transparency) | 9 | PACKET_3_1 |
| F011 | NPC System (presentation, tracking, relationship) | 10 | PACKET_3_2 |
| F012 | Faction System (3-state, 5 factions) | 11 | PACKET_3_2 |
| F013 | Campaign and Progression (XP, healing, campaign mode) | 12 | PACKET_3_2, PACKET_5_2 |
| F014 | End-of-Session Summary Card | 12.3 | PACKET_5_2 |
| F015 | Meta-Controls (Save, Restart, Ask DM, Recap, Compress) | 13 | PACKET_5_1 |
| F016 | Journal / Quest Log | 14 | PACKET_5_2 |
| F017 | Session Persistence (in-memory, snapshot) | 15 | PACKET_5_1 |
| F018 | Optional Map Toggle | 16 | PACKET_7_2 |
| F019 | Technical Platform (React JSX artifact, Tailwind, API) | 20 | PACKET_1_1 |
| F020 | Context Compression (scene 15+ summarization) | 20.4 | PACKET_6_1 |
| F021 | Onboarding and Session Zero Flow | 24, 25 | PACKET_2_2 |
| F022 | Adventure Library (5 pre-built adventures, JSON schema) | 23.25 | PACKET_1_3 |

---

*PRD Version 2.1 - Second pass fixes: PACKET_3_2 assertion corrected (seu_source*
*fallback is silent per Error Handling Standard, not a throw). PACKET_5_1 assertion*
*corrected (snapshots go to meta.snapshots React state, not sessionStorage).*
*All other content from v2.0 confirmed correct - no further changes needed.*
