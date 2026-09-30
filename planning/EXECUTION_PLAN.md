# EXECUTION_PLAN.md
# Astra Rising AI DM
# Generated: 2026-03-09
# PRD: v2.0 (LOCKED)
# Packets: 17
# Groups: 17 (fully sequential)
# Output file: App.jsx (all packets write to this single file)

---

## EXECUTION MODE

All packets are sequential due to single App.jsx file constraint. No parallel execution.
Each CLI command must fully complete before the next begins.
Do not use & (background), wait, or xargs -P.

---

## CONTRACT VERIFICATION SUMMARY

All 16 dependency pairs verified [OK].

| Pair         | Verification                                              | Result |
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

## FILE CONFLICT ANALYSIS

Conflicts found: 3
Conflicts resolved: 3
Conflicts unresolved: 0

| Conflict | Packets              | Resolution                          |
|----------|----------------------|-------------------------------------|
| 1        | PACKET_1_2, PACKET_1_3 | Sequential: 1_2 then 1_3          |
| 2        | PACKET_3_2, PACKET_3_3 | Sequential: 3_2 then 3_3          |
| 3        | PACKET_4_2, PACKET_5_1 | Sequential: 4_2 then 5_1          |

All conflicts arose because the original PRD specified parallel groups for these pairs, but all write to the same App.jsx file. Converting to sequential resolves all conflicts with no feature impact.

---

## SEQUENTIAL EXECUTION GROUPS

### Group 1: PACKET_1_1 -- Skeleton + State Shell
- Depends on: (none)
- Estimated hours: 10
- PRD features: F001, F002, F019
- Key deliverable: App.jsx created with INITIAL_STATE, COLORS, LAYOUT, AssertionPanel

### Group 2: PACKET_1_2 -- Pre-Gen Character Data + Character Select UI
- Depends on: PACKET_1_1
- Estimated hours: 12
- PRD features: F006, F007
- Key deliverable: CHARACTER_ROSTER constant, character selection UI in SetupScreen

### Group 3: PACKET_1_3 -- Adventure Library Data + Adventure Select UI
- Depends on: PACKET_1_2
- Estimated hours: 10
- PRD features: F022
- Key deliverable: ADVENTURE_LIBRARY constant, adventure selection UI, Begin Adventure button enabled

### Group 4: PACKET_2_1 -- API Client Module (callDM + validator)
- Depends on: PACKET_1_3
- Estimated hours: 14
- PRD features: F019
- Key deliverable: callDM function, validateDMResponse, validateSessionZeroResponse, buildSystemPrompt

### Group 5: PACKET_2_2 -- Session Zero (init call + hook cards)
- Depends on: PACKET_2_1
- Estimated hours: 14
- PRD features: F021
- Key deliverable: LoadingTidbits, SessionZeroScreen, HookCard, initializeSession, 1.5s transition

### Group 6: PACKET_3_1 -- Narrative Engine (hook select, DM narration, choice menu)
- Depends on: PACKET_2_2
- Estimated hours: 18
- PRD features: F003, F008, F010
- Key deliverable: GameScreen, useDMTurn hook, MessageHistory, ChoiceMenu, PlayerInput

### Group 7: PACKET_3_2 -- State Manager (applyStateUpdates)
- Depends on: PACKET_3_1
- Estimated hours: 16
- PRD features: F011, F012, F013
- Key deliverable: applyStateUpdates, NPC/faction/journal helpers, wired into useDMTurn

### Group 8: PACKET_3_3 -- Character Sheet Sidebar
- Depends on: PACKET_3_2
- Estimated hours: 12
- PRD features: F002, F004
- Key deliverable: CharacterSheet, StaminaBar, SkillBadge, InventoryList in left sidebar

### Group 9: PACKET_4_1 -- Combat Engine
- Depends on: PACKET_3_3
- Estimated hours: 18
- PRD features: F009
- Key deliverable: rollD100, resolveAttack, rollInitiative, applyCombatStateUpdate, COMBAT_PHASES

### Group 10: PACKET_4_2 -- Combat UI (dice display, initiative, optional rules)
- Depends on: PACKET_4_1
- Estimated hours: 16
- PRD features: F005, F009
- Key deliverable: CombatPanel, DiceRollDisplay, InitiativeTracker, OptionalRulesPanel

### Group 11: PACKET_5_1 -- Meta Controls
- Depends on: PACKET_4_2
- Estimated hours: 12
- PRD features: F015, F017
- Key deliverable: MetaControlsBar, SnapshotButton, AskDmButton, OocNote, createSnapshot, restoreSnapshot

### Group 12: PACKET_5_2 -- Session Journal + Summary Card
- Depends on: PACKET_5_1
- Estimated hours: 12
- PRD features: F013, F014, F016
- Key deliverable: JournalPanel, JournalEntry, SummaryCard, EndSessionButton, JSON export

### Group 13: PACKET_6_1 -- Context Compression
- Depends on: PACKET_5_2
- Estimated hours: 14
- PRD features: F020
- Key deliverable: compressCampaignHistory, buildCompressedSystemPrompt, SummarizeButton (scene >= 15)

### Group 14: PACKET_6_2 -- Continue Campaign + Returning Player Flow
- Depends on: PACKET_6_1
- Estimated hours: 12
- PRD features: F017
- Key deliverable: ContinueCampaignPanel, parseAndLoadSave, validateSaveData

### Group 15: PACKET_7_1 -- Tooltip System
- Depends on: PACKET_6_2
- Estimated hours: 10
- PRD features: (none specific)
- Key deliverable: TOOLTIP_GLOSSARY (20+ entries), Tooltip component, wrapTextWithTooltips

### Group 16: PACKET_7_2 -- Scene Header Card + Context Bar
- Depends on: PACKET_7_1
- Estimated hours: 10
- PRD features: F018
- Key deliverable: SceneHeader, ContextBar, MapToggle, MAP_DATA (5 adventures)

### Group 17: PACKET_8_1 -- Polish Pass
- Depends on: PACKET_7_2
- Estimated hours: 16
- PRD features: (all)
- Key deliverable: Full UX polish, error states, dev_mode = false, production-ready artifact

---

## TOTAL TIME ESTIMATE

| Packets      | Hours |
|--------------|-------|
| Group 1-4    | 46    |
| Group 5-8    | 60    |
| Group 9-12   | 58    |
| Group 13-16  | 46    |
| Group 17     | 16    |
| TOTAL        | 226   |

Sequential wall clock estimate: 226 hours of Claude Code CLI execution time.
(Claude Code runs at much faster-than-human speed -- actual clock time will be significantly less.)

---

## CLI COMMANDS

Execute sequentially. Wait for each to fully complete before running the next.
All commands use --dangerously-skip-permissions because the agent must write App.jsx.

```bash
claude --model claude-sonnet-4-6 -p "Read EXE.md and BUILD_LOG.md. Execute PACKET_1_1 from packets/PACKET_1_1.md. Write App.jsx as specified. Commit with message 'PACKET_1_1: Skeleton + State Shell'. Update BUILD_LOG.md." --dangerously-skip-permissions

claude --model claude-sonnet-4-6 -p "Read EXE.md and BUILD_LOG.md. Execute PACKET_1_2 from packets/PACKET_1_2.md. Modify App.jsx as specified. Commit with message 'PACKET_1_2: Pre-Gen Character Data + Character Select UI'. Update BUILD_LOG.md." --dangerously-skip-permissions

claude --model claude-sonnet-4-6 -p "Read EXE.md and BUILD_LOG.md. Execute PACKET_1_3 from packets/PACKET_1_3.md. Modify App.jsx as specified. Commit with message 'PACKET_1_3: Adventure Library Data + Adventure Select UI'. Update BUILD_LOG.md." --dangerously-skip-permissions

claude --model claude-sonnet-4-6 -p "Read EXE.md and BUILD_LOG.md. Execute PACKET_2_1 from packets/PACKET_2_1.md. Modify App.jsx as specified. Commit with message 'PACKET_2_1: API Client Module (callDM + validator)'. Update BUILD_LOG.md." --dangerously-skip-permissions

claude --model claude-sonnet-4-6 -p "Read EXE.md and BUILD_LOG.md. Execute PACKET_2_2 from packets/PACKET_2_2.md. Modify App.jsx as specified. Commit with message 'PACKET_2_2: Session Zero (init call + hook cards)'. Update BUILD_LOG.md." --dangerously-skip-permissions

claude --model claude-sonnet-4-6 -p "Read EXE.md and BUILD_LOG.md. Execute PACKET_3_1 from packets/PACKET_3_1.md. Modify App.jsx as specified. Commit with message 'PACKET_3_1: Narrative Engine (hook select, DM narration, choice menu)'. Update BUILD_LOG.md." --dangerously-skip-permissions

claude --model claude-sonnet-4-6 -p "Read EXE.md and BUILD_LOG.md. Execute PACKET_3_2 from packets/PACKET_3_2.md. Modify App.jsx as specified. Commit with message 'PACKET_3_2: State Manager (applyStateUpdates)'. Update BUILD_LOG.md." --dangerously-skip-permissions

claude --model claude-sonnet-4-6 -p "Read EXE.md and BUILD_LOG.md. Execute PACKET_3_3 from packets/PACKET_3_3.md. Modify App.jsx as specified. Commit with message 'PACKET_3_3: Character Sheet Sidebar'. Update BUILD_LOG.md." --dangerously-skip-permissions

claude --model claude-sonnet-4-6 -p "Read EXE.md and BUILD_LOG.md. Execute PACKET_4_1 from packets/PACKET_4_1.md. Modify App.jsx as specified. Commit with message 'PACKET_4_1: Combat Engine'. Update BUILD_LOG.md." --dangerously-skip-permissions

claude --model claude-sonnet-4-6 -p "Read EXE.md and BUILD_LOG.md. Execute PACKET_4_2 from packets/PACKET_4_2.md. Modify App.jsx as specified. Commit with message 'PACKET_4_2: Combat UI (dice display, initiative, optional rules)'. Update BUILD_LOG.md." --dangerously-skip-permissions

claude --model claude-sonnet-4-6 -p "Read EXE.md and BUILD_LOG.md. Execute PACKET_5_1 from packets/PACKET_5_1.md. Modify App.jsx as specified. Commit with message 'PACKET_5_1: Meta Controls'. Update BUILD_LOG.md." --dangerously-skip-permissions

claude --model claude-sonnet-4-6 -p "Read EXE.md and BUILD_LOG.md. Execute PACKET_5_2 from packets/PACKET_5_2.md. Modify App.jsx as specified. Commit with message 'PACKET_5_2: Session Journal + Summary Card'. Update BUILD_LOG.md." --dangerously-skip-permissions

claude --model claude-sonnet-4-6 -p "Read EXE.md and BUILD_LOG.md. Execute PACKET_6_1 from packets/PACKET_6_1.md. Modify App.jsx as specified. Commit with message 'PACKET_6_1: Context Compression'. Update BUILD_LOG.md." --dangerously-skip-permissions

claude --model claude-sonnet-4-6 -p "Read EXE.md and BUILD_LOG.md. Execute PACKET_6_2 from packets/PACKET_6_2.md. Modify App.jsx as specified. Commit with message 'PACKET_6_2: Continue Campaign + Returning Player Flow'. Update BUILD_LOG.md." --dangerously-skip-permissions

claude --model claude-sonnet-4-6 -p "Read EXE.md and BUILD_LOG.md. Execute PACKET_7_1 from packets/PACKET_7_1.md. Modify App.jsx as specified. Commit with message 'PACKET_7_1: Tooltip System'. Update BUILD_LOG.md." --dangerously-skip-permissions

claude --model claude-sonnet-4-6 -p "Read EXE.md and BUILD_LOG.md. Execute PACKET_7_2 from packets/PACKET_7_2.md. Modify App.jsx as specified. Commit with message 'PACKET_7_2: Scene Header Card + Context Bar'. Update BUILD_LOG.md." --dangerously-skip-permissions

claude --model claude-sonnet-4-6 -p "Read EXE.md and BUILD_LOG.md. Execute PACKET_8_1 from packets/PACKET_8_1.md. Modify App.jsx as specified. This is the final packet. Set INITIAL_STATE.meta.dev_mode = false. Commit with message 'PACKET_8_1: Polish Pass -- Astra Rising AI DM complete'. Update BUILD_LOG.md." --dangerously-skip-permissions
```

---

## EXECUTION SUMMARY

Total packets: 17
Total groups: 17 (all sequential)
Estimated hours: 226
Parallelism: None (single App.jsx constraint)
Starting packet: PACKET_1_1
Ending packet: PACKET_8_1
Output: App.jsx (single React JSX file, paste into Claude.ai artifact renderer)
Verification method: AssertionPanel inline component (visible until PACKET_8_1)

Before running: ensure you are in the /path/to/astra-rising directory.
After each packet: verify App.jsx renders in Claude.ai artifact renderer with all prior assertions [PASS].
