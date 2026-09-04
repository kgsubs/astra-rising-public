# Astra Rising AI DM — Product Requirements Document

**Document Status:** Final (Shipped Product)
**Product Version:** 1.0
**Date:** 2026-03-10
**Audience:** Product managers, stakeholders, designers, QA

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [User Personas](#2-user-personas)
3. [User Stories](#3-user-stories)
4. [Feature Inventory](#4-feature-inventory)
5. [Gameplay Mechanics](#5-gameplay-mechanics)
6. [UX Flows](#6-ux-flows)
7. [Screen Definitions](#7-screen-definitions)
8. [Content Inventory](#8-content-inventory)
9. [Responsive Design Behavior](#9-responsive-design-behavior)
10. [Error States](#10-error-states)
11. [Rules Fidelity](#11-rules-fidelity)

---

## 1. Executive Summary

Astra Rising AI DM is a browser-based interactive narrative game that places an AI Game Master (DM) in charge of running the classic Astra Rising tabletop RPG setting. Players select a pre-built character and one of ten adventures, then engage in freeform text-driven play. The AI narrator generates dynamic story content, adjudicates player actions against the game's rules, manages turn-based combat, and continuously tracks campaign state — all within a single web page with no installation required.

The product targets fans of tabletop RPGs who want an accessible, solo, on-demand play experience without needing a human Game Master or other players. It also serves as a discoverable entry point for players new to the Astra Rising universe.

The shipped product covers a complete play loop from character selection through a three-act campaign, including combat, inventory management, session journaling, and the ability to save and restore checkpoints.

---

## 2. User Personas

### Persona A — The Returning Tabletop Veteran

**Name:** Marcus, 38
**Background:** Played Astra Rising in the 1980s. No longer has a gaming group. Limited free time; wants to revisit the setting on his own schedule.
**Goals:** Recapture nostalgia; experience canonical adventures; see the setting through a modern lens.
**Frustrations:** Most solo RPG tools are too abstract or require extensive setup. He wants to just play.
**Comfort level:** Familiar with dice-based resolution, character sheets, and genre conventions. Needs no tutorialization of RPG concepts.

### Persona B — The Curious Newcomer

**Name:** Priya, 24
**Background:** Enjoys narrative video games and has heard about tabletop RPGs but has never played. Interested in sci-fi.
**Goals:** Experience an RPG story without learning complex rules upfront. Discover whether she enjoys the format.
**Frustrations:** Dense rulebooks and unfamiliar terminology are a barrier to entry.
**Comfort level:** Needs contextual definitions for game terms. Prefers guided choices over open-ended prompts, at least initially.

### Persona C — The Casual Lunch-Break Player

**Name:** Devon, 31
**Background:** Active tabletop player who wants a quick session during a break or commute. No prep time available.
**Goals:** Play a meaningful session in 20–40 minutes. Pick up exactly where they left off next time.
**Frustrations:** Campaign continuity is lost if sessions are interrupted.
**Comfort level:** RPG-literate. Values speed, reliability, and session persistence.

### Persona D — The Accessibility-First Player

**Name:** Sam, 29
**Background:** Interested in the genre but finds coordinating with groups difficult due to schedule or social anxiety.
**Goals:** Play at their own pace, re-read narrative at leisure, make decisions without time pressure.
**Frustrations:** Real-time or multiplayer formats create anxiety.
**Comfort level:** Moderate. Benefits from suggested actions and in-line glossary definitions.

---

## 3. User Stories

### Onboarding

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| US-01 | new player | see a clear landing screen with obvious next steps | I can start playing without confusion |
| US-02 | returning player | resume my previous game from the landing screen | I do not have to repeat setup |
| US-03 | new player | browse adventure descriptions before committing | I can choose a story that matches my mood |
| US-04 | new player | see difficulty ratings on adventure cards | I can avoid an experience that is too challenging |
| US-05 | returning player | import a previously exported campaign | I can continue a save I transferred from another device |
| US-06 | new player | read character descriptions and stats before choosing | I can pick a role that suits my playstyle |
| US-07 | new player | choose from multiple opening hooks for my adventure | I feel ownership over how my story begins |

### Gameplay

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| US-08 | player | submit free-text actions to the AI DM | I can express any intention, not just preset options |
| US-09 | player | see suggested actions after each DM response | I have guidance when I am unsure what to do next |
| US-10 | player | trigger suggested actions with a single click or keypress | I can act quickly without retyping |
| US-11 | player | see my character's stamina update in real time | I always know how close I am to incapacitation |
| US-12 | player | see dice roll results displayed after combat actions | I understand how the AI resolved my action |
| US-13 | player | track initiative order during combat | I know when my turn is and what enemies remain |
| US-14 | player | see my inventory and credits update as I acquire or spend items | My character sheet reflects the current game state |
| US-15 | player | hover or tap on highlighted terms in the narrative | I can get a definition without leaving the screen |
| US-16 | player | dismiss meta-commentary notes from the DM | I can keep the interface clean after reading them |

### Persistence & Session Management

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| US-17 | player | save a checkpoint at any point during play | I can restore to that moment if I make a bad decision |
| US-18 | player | view a list of my recent checkpoints with timestamps | I can identify which save point to restore |
| US-19 | player | restore a checkpoint with a confirmation step | I do not accidentally overwrite progress |
| US-20 | player | read a running journal of story events | I can recall what happened without re-reading all messages |
| US-21 | player | view a campaign summary with NPC and faction status | I have a high-level view of campaign progress |

### Accessibility & UX

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| US-22 | mobile player | use the app comfortably on a small screen | I can play without horizontal scrolling or tiny tap targets |
| US-23 | keyboard user | submit input and trigger actions without touching the mouse | I can play efficiently at a keyboard |
| US-24 | player | see lore tidbits while the AI is generating a response | Waiting feels immersive, not empty |
| US-25 | player | receive clear feedback when an error occurs | I know whether to retry or take another action |

---

## 4. Feature Inventory

### 4.1 Adventure Library

A curated set of ten playable adventures spanning three difficulty tiers and multiple genre tones. Adventures are displayed in a browsable grid sorted from easiest to hardest. Each adventure card provides enough context — title, tagline, genre, and difficulty — for a player to make an informed selection. Difficulty ratings are color-coded for at-a-glance comprehension.

### 4.2 Pre-Built Character Roster

Four ready-to-play characters, one per playable race (Human, Krix, Moluun, Skrath), each with a distinct archetype and playstyle. Characters are fully statted and equipped. Character names are drawn from race-specific name pools and randomized each session, giving each playthrough a fresh identity while preserving the underlying character build. All characters are available for all difficulty levels except Rayla (Skrath Scout), which is flagged for experienced players due to lower stamina and advanced combat mechanics.

### 4.3 Session Zero Hook Selection

Before play begins, the AI generates three unique opening hooks tailored to the selected character and adventure combination. Each hook includes a short cinematic title and a brief opening passage. The player selects one, and this hook becomes the canonical opening scene of their campaign, directly influencing the AI's narrative framing throughout play.

### 4.4 AI-Driven Narrative Engine

The core product experience. The AI acts as a Game Master, responding to player input with prose narrative, environmental description, NPC dialogue, and consequence resolution. The AI maintains awareness of:

- The selected adventure's plot structure (three-act spine)
- The player's character build (stats, skills, equipment)
- The evolving game state (stamina, inventory, location, XP, NPCs encountered)
- All prior events in the session

Narrative streams to the screen via a typewriter effect, giving the response a cinematic feel.

### 4.5 Suggested Actions

After each AI response, up to three contextually relevant suggested actions are presented as clickable buttons. These are not exhaustive — the player is always free to type a custom action — but they lower the barrier to engagement and help less experienced players understand what kinds of actions the game supports. Suggested actions glow and animate on arrival to draw attention. They can be triggered by clicking or by pressing the corresponding number key (1, 2, or 3).

### 4.6 Dice Roll Display

All mechanical resolutions are surfaced to the player visually. When the AI resolves an action against the game's percentile system, the result is displayed as a structured entry: the action description, the roll value, the target number, and a HIT or MISS result. This transparency ensures players understand outcomes and maintains trust that the AI is applying the game's rules rather than narrating freely.

### 4.7 Combat Panel

A dedicated panel appears whenever combat is active. It contains:

- A round counter with a prominent "COMBAT ACTIVE" header
- A scrollable dice roll log for the current encounter
- An initiative tracker showing all combatants in turn order, with the active combatant highlighted and completed turns marked
- An optional rules panel indicating which special combat modifiers are currently in effect (such as Burst Fire, Called Shots, Cover, or Suppression Fire)

The combat panel is collapsible so players can reclaim screen space when reviewing narrative.

### 4.8 Character Sidebar

A persistent panel displaying the player's full character state at all times. Contents update in real-time as the game progresses. The sidebar includes stamina, all eight core stats, skill badges, status effects, energy unit counts, inventory, credits, and experience points. It also contains a scene map showing discovered and undiscovered locations. The sidebar is collapsible on tablet and acts as a full-height drawer on mobile.

### 4.9 Tooltip Glossary

Over 30 game-specific terms are annotated inline within the AI's narrative text, indicated by a dotted yellow underline. Tapping or clicking a term opens a tooltip with the term's name and a plain-language definition. Only one tooltip is visible at a time; clicking a new term closes any open one. Tooltips auto-dismiss after ten seconds. This feature supports new players and eliminates the need to consult an external rulebook.

### 4.10 Journal

A timestamped log of key story beats and completed act goals. The journal provides a narrative summary of the campaign so far, allowing players to orient themselves after a break without re-reading the entire chat history. Entries are organized chronologically with timestamps.

### 4.11 Snapshots (Save Checkpoints)

Players can manually save up to three checkpoint snapshots at any time. Each snapshot captures the full campaign state and is labeled with a timestamp, turn count, and scene count. Players can restore or delete any snapshot, with a confirmation step before any destructive action. A toast notification confirms when a checkpoint is saved.

### 4.12 OOC Notes

When the AI needs to communicate outside the fiction — for example, to clarify a rule, correct a misunderstanding, or provide a player-facing aside — it delivers this as a visually distinct "Out of Character" note. The note appears as a yellow alert box with a dismissal control. This prevents meta-commentary from breaking narrative immersion by making the tonal shift explicit.

### 4.13 Act Structure and Progress Tracking

Campaigns follow a three-act structure. Act 1 covers the opening five scenes (setup), Act 2 covers scenes six through twelve (confrontation), and Act 3 covers scene thirteen onward (resolution). The current act, scene number, and turn count are displayed in the chat header at all times. When an act concludes, a context bar appears in the chat with a milestone marker and the act's story goal.

### 4.14 Campaign Summary

An on-demand summary view displaying the adventure title, character status, key NPCs encountered, faction standings, and overall act and scene progress. This gives players and observers a structured overview of where the campaign stands.

### 4.15 Scene Map

A grid embedded in the sidebar representing the campaign's spatial structure. Discovered locations are shown with their names; undiscovered locations are rendered as faded placeholders. The player's current location is highlighted. The map updates automatically as the AI introduces new locations.

### 4.16 Campaign Import

A toggle on the campaign selection screen reveals a text area where players can paste a previously exported campaign JSON. This allows a campaign in progress to be continued — for example, after moving to a new device or browser.

### 4.17 Loading Experience with Lore Tidbits

While the AI is generating a response, a loading state is shown. During longer waits, rotating lore tidbits about the Astra Rising universe are displayed. This keeps the wait feeling immersive and delivers incidental worldbuilding to the player.

### 4.18 Toast Notifications

Lightweight non-blocking notifications appear at the bottom center of the screen to confirm transient events (for example, "Checkpoint saved!"). Toasts dismiss automatically after three seconds.

### 4.19 Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| 1, 2, 3 | Trigger suggested action 1, 2, or 3 |
| Ctrl/Cmd + Enter | Submit player input |
| Ctrl/Cmd + K | Focus the player input field |

### 4.20 Scroll-to-Bottom Control

A button appears in the chat area if the player has scrolled up to review earlier messages. Clicking it returns the view to the latest message.

---

## 5. Gameplay Mechanics

### 5.1 The Percentile Resolution System

All action outcomes in Astra Rising are resolved against percentile (1–100) rolls. The player rolls under their relevant stat or skill percentage to succeed. The AI applies this system to all contested and uncertain actions. Results are always shown to the player.

### 5.2 Stamina

Stamina represents a character's capacity to absorb physical damage. Every character has a current and maximum stamina value. Damage from combat or hazards reduces current stamina. The sidebar displays both values and a fill bar that shifts from green to red as stamina depletes. At zero stamina, the character falls unconscious, which carries story consequences narrated by the AI.

### 5.3 Initiative and Turn Order

When combat begins, all participants (player character and adversaries) are assigned initiative values based on their Initiative Modifier (IM) stat. The combat panel displays the resulting order. On each round, each combatant acts in sequence. The current actor is highlighted in the initiative tracker. The round counter increments when all combatants have acted.

### 5.4 Skills

Characters have skills at numbered proficiency levels (for example, "Beam Weapons 2"). A higher level indicates greater proficiency and a more favorable resolution threshold. Skills are displayed in the sidebar as labeled badges. The tooltip glossary defines the "Proficiency Level" term for new players.

### 5.5 Status Effects

Conditions applied to the character during play appear as colored badges in the sidebar. Negative conditions (wound, stunned, poisoned, blind, unconscious) appear in red. Positive or special conditions appear in yellow. Effects are applied and removed in real time as the AI resolves actions and story events.

### 5.6 SEU (Standardized Energy Units)

Energy is a consumable resource tracked in the sidebar. The total SEU count is displayed alongside a breakdown by source (for example, by weapon or device). Energy depletes as energy-based equipment is used.

### 5.7 Credits and Experience Points

Credits (the in-universe currency) and Experience Points are tracked in the sidebar. Both values update in real time as the AI awards credits, charges for purchases, or grants XP for story milestones and combat victories. Unspent XP is tracked separately.

### 5.8 Optional Combat Rules

Certain advanced combat modifiers may become active during an encounter. These include Burst Fire, Called Shots, Cover, and Suppression Fire. When active, they appear in the optional rules panel within the combat interface. These rules affect how the AI resolves actions and may present additional player choices.

### 5.9 Character Racial Abilities

Each character race has passive or conditional abilities that the AI applies during play.

| Race | Racial Abilities |
|---|---|
| Human | No passive racial abilities |
| Krix | Ambidexterity; Comprehension bonus (15%) |
| Moluun | Elasticity (shapeshifting); Lie Detection (5%) |
| Skrath | Night Vision; Gliding; Battle Rage (5% chance triggers combat bonus) |

### 5.10 The Three-Act Campaign Spine

Each adventure is structured around a three-act narrative arc established at the start of the campaign. Act 1 (scenes 1–5) establishes the situation and stakes. Act 2 (scenes 6–12) escalates conflict and complications. Act 3 (scene 13 onward) drives toward resolution. The AI tracks the player's scene count and adjusts narrative pacing and content accordingly. Act transitions are announced in the interface.

---

## 6. UX Flows

### 6.1 New Game Flow

```
Landing Screen
  └── Click "New Game"
        └── Setup Screen: Step 1 — Campaign Selection
              └── Browse adventure grid
              └── Click an adventure card (pulse animation)
                    └── Setup Screen: Step 2 — Character Selection
                          └── Adventure banner displayed at top
                          └── Browse character cards
                          └── Click a character card (pulse animation)
                                └── Session Zero Screen
                                      └── AI generates 3 opening hooks
                                      └── Loading state: spinner + "Preparing your adventure..."
                                      └── Player selects a hook (click, pulse animation)
                                            └── Game Screen opens
                                            └── First DM narration pre-populated
```

### 6.2 Resume Game Flow

```
Landing Screen
  └── "Resume Game" button visible (only if a save exists)
  └── Click "Resume Game"
        └── Game Screen opens at last saved state
```

### 6.3 Campaign Import Flow

```
Setup Screen: Step 1 — Campaign Selection
  └── Click "Continue a previous campaign" toggle
        └── Textarea revealed
        └── Player pastes exported campaign JSON
        └── Proceeds through normal campaign and character selection
              └── Game Screen opens with imported state
```

### 6.4 Standard Turn Flow (In-Game)

```
DM narration streams to screen (typewriter effect)
  └── Suggested actions panel appears (glows, up to 3 buttons)
  └── Player selects suggested action (click or keypress 1/2/3)
      OR
      Player types custom action in text input
        └── Send button clicked or Ctrl/Cmd+Enter pressed
              └── Player message bubble appears (right-aligned, blue)
              └── Loading state: bouncing dots
              └── Loading state: lore tidbit displayed (if wait is longer)
              └── DM response streams in (typewriter effect)
              └── Sidebar updates: stamina, inventory, status effects, etc.
              └── Dice roll display appears (if action was contested)
              └── Combat panel updates (if in combat)
              └── New suggested actions appear
```

### 6.5 Combat Entry Flow

```
Player action or story event triggers combat
  └── Combat panel appears in center area with red "COMBAT ACTIVE" header
  └── Initiative order established and displayed
  └── Round 1 begins; active combatant highlighted
  └── Player takes their turn (via suggested action or free text)
  └── AI resolves action; dice roll displayed
  └── Next combatant's turn
  └── Round counter increments after all combatants act
  └── Combat ends when all enemies are defeated or combat-ending condition is met
        └── Combat panel collapses
        └── Narrative resumes
```

### 6.6 Checkpoint Save / Restore Flow

```
Player clicks "Snapshots" button in sidebar
  └── Snapshots panel opens
  └── Player clicks "Save checkpoint"
        └── Snapshot created with timestamp, turn count, scene count
        └── Toast: "Checkpoint saved!"
        └── Snapshot appears in list (up to 3 shown)

Player clicks "Restore" on a snapshot
  └── Confirmation prompt
  └── On confirm: game state restored to that point

Player clicks "Delete" on a snapshot
  └── Confirmation prompt
  └── On confirm: snapshot removed from list
```

### 6.7 Tooltip Flow

```
Player sees dotted yellow underline on a term in DM narrative
  └── Player clicks or taps the term
        └── Tooltip opens with term name + definition
        └── Any previously open tooltip closes
        └── Tooltip auto-dismisses after 10 seconds
            OR
            Player clicks a different term (previous closes, new opens)
```

### 6.8 OOC Note Flow

```
AI sends a meta-commentary message
  └── Yellow OOC alert box appears below or within the message
  └── Player reads the note
  └── Player clicks X to dismiss
        └── Alert box removed from view
```

### 6.9 Error Flow

```
Error occurs (network, API, invalid data)
  └── Error banner or message appears with error description
  └── If recoverable: "Retry" button offered
  └── If not recoverable: explanation shown with appropriate next step
```

---

## 7. Screen Definitions

### 7.1 Landing Screen

The entry point for all users. Designed to orient new players and get returning players back into their game with zero friction.

**Elements:**

- Large "Astra Rising" title
- Subtitle: "AI Game Master"
- "Resume Game" button — visible only when a save exists
- "New Game" button — always visible

**Behavior:** If no save exists, only "New Game" is shown. If a save exists, both buttons appear.

---

### 7.2 Setup Screen — Step 1: Campaign Selection

**Heading:** "Pick Your Story"

**Adventure Grid:**

- 2-column layout (1-column on mobile)
- Sorted by difficulty: Beginner first, Advanced last
- Each card contains: title, tagline, genre label, difficulty badge

**Difficulty badge colors:**

| Difficulty | Badge Color |
|---|---|
| Beginner | Green |
| Intermediate | Yellow |
| Advanced | Red |

**Additional controls:**

- "Continue a previous campaign" toggle — expands a textarea for JSON import on click

**Interaction:** Clicking a card triggers a pulse animation and advances to Step 2.

---

### 7.3 Setup Screen — Step 2: Character Selection

**Context banner:** Displays the selected adventure title and tagline at the top of the screen.

**Heading:** "Choose Your Player"

**Character Grid:**

- 4-column layout (2-column on tablet, 1-column on mobile)
- One card per character

**Each character card shows:**

- Name (randomized from race-specific pool each session)
- Race and archetype
- Difficulty recommendation
- Flavor description
- Stamina and IM stats
- Top three skills with proficiency levels
- Racial abilities (where applicable)
- Equipment list

**All game terms on character cards are tooltip-enabled.**

**Navigation:** "Back to campaign selection" link returns to Step 1 without losing the adventure selection. Clicking a character card triggers a pulse animation and advances to Session Zero.

---

### 7.4 Session Zero Screen

**Heading:** "Once upon a time..."
**Subheading:** "Select the opening that calls to you."

**Loading state:** Spinner + "Preparing your adventure..." shown while AI generates hooks.

**Hook cards (3):**

- Title (bold)
- Opening passage (cinematic prose, under 35 words)

**Interaction:** Clicking a hook triggers a pulse animation. The Game Screen then opens with the first DM narration derived from the selected hook already populated.

---

### 7.5 Game Screen

The primary play surface. Persists for the entire duration of a campaign session.

#### 7.5.1 Left Sidebar

Fixed-width panel, collapsible. On mobile, renders as a full-height drawer.

| Section | Contents |
|---|---|
| Header | Character name (yellow, bold); race, archetype, IM; close button |
| Stamina | Current / Max values; color-coded fill bar (green to red) |
| Stats Grid | STR, STA, DEX, RS (row 1); INT, LOG, PER, LDR (row 2) |
| Skills | Labeled badges with skill name and level |
| Status Effects | Red badges (negative); yellow badges (special/positive) |
| SEU | Total energy count; breakdown by source |
| Inventory | Equipment and consumable items |
| Credits & XP | Credit total (Cr); XP total and unspent XP |
| Scene Map | Grid of locations; current location highlighted yellow; undiscovered faded |
| Control Buttons | Summary, Journal, Snapshots, New Adventure |

#### 7.5.2 Chat Header (Sticky)

Always visible above the message area.

- "Location: [CURRENT LOCATION NAME]" — location name in all-caps
- Act badge (Act 1 / Act 2 / Act 3)
- Scene counter badge
- Turn counter badge
- Menu button (opens sidebar on mobile and tablet)

#### 7.5.3 Message History

| Message Type | Visual Treatment |
|---|---|
| Empty state | "Your adventure awaits..." centered placeholder |
| DM message | Dark background bubble, full-width, multiline; text streams via typewriter effect; tooltip terms underlined in dotted yellow |
| Player message | Blue bubble, right-aligned |
| Loading state | Three bouncing dots, transitions to typewriter stream when AI begins responding |

#### 7.5.4 Combat Panel

Appears only when combat is active. Collapsible.

- Red header bar: "COMBAT ACTIVE — Round X"
- Dice roll log: scrollable, per-roll entries with description, roll value, target, and HIT/MISS in green or red
- Initiative tracker: combatants listed in order; active combatant highlighted yellow; completed turns grayed with checkmark
- Optional rules panel: active special rules listed

#### 7.5.5 Suggested Actions Panel

Located below the message history, above the input bar. Collapsible with animation.

- "Suggested Actions" label
- Panel glows when new choices arrive
- Up to 3 numbered buttons (1, 2, 3)
- Each button pulses with a gold animation on click, then submits the action

#### 7.5.6 Player Input Bar

Located at the bottom of the screen.

- Text input field with placeholder: "What do you do?"
- Auto-expands as the player types (height capped at a maximum)
- Send button (yellow); shows loading dots while AI is generating
- Keyboard: Ctrl/Cmd+Enter to submit; Ctrl/Cmd+K to focus the input field

---

## 8. Content Inventory

### 8.1 Adventure Library

| # | Title | Difficulty | Genre |
|---|---|---|---|
| 1 | Crash on Cethara | Beginner | Survival / First Contact |
| 2 | Ghost Station | Intermediate | Cosmic Horror |
| 3 | The Nexus Job | Intermediate | Corporate Espionage |
| 4 | The Golden Mandible | Beginner | Comedy Heist |
| 5 | The Erebus Protocol | Advanced | Conspiracy Thriller |
| 6 | Bugs in the System | Advanced | Sci-Fi Horror |
| 7 | Mission to Glacivaar | Intermediate | Corporate Noir |
| 8 | Sundown on Vashara | Intermediate | Ancient Mystery |
| 9 | Kelvarn Run | Intermediate | Space Western Noir |
| 10 | Cethara, Planet of Mystery | Intermediate | Exploration & Discovery |

### 8.2 Character Roster

| Character | Race | Archetype | Stamina | IM | Recommended For |
|---|---|---|---|---|---|
| Kael Voss | Human | Soldier / Enforcer | 55 | 5 | Any difficulty |
| Skrix | Krix | Techex | 40 | 5 | Any difficulty |
| Bolg | Moluun | Scispec / Medic | 55 | 5 | Any difficulty |
| Rayla | Skrath | Scout / Explorer | 30 | 6 | Experienced players |

**Character equipment by character:**

| Character | Equipment |
|---|---|
| Kael Voss | Proton pistol, Laser pistol, Albedo suit, Vibroknife, 2 Frag grenades |
| Skrix | Laser pistol, Skeinsuit, Techkit, 2 Doze grenades |
| Bolg | Electrostunner, Albedo suit, 2 Medkits, Bioscanner, 2 Stimdoses |
| Rayla | Laser rifle, Laser pistol, Skeinsuit, Survival pack, Macrobinoculars |

### 8.3 Tooltip Glossary (30+ Terms)

**Stats:** Stamina, IM (Initiative Modifier), RS (Reaction Speed), Percentile Roll

**Races:** Human, Krix, Moluun, Skrath

**Equipment:** Albedo suit, Skeinsuit, Ke-1000, Ke-2000, Gyrojet, Electrostunner, Doze Grenade, Frag Grenade, Medkit, Techkit

**Status Conditions:** Stunned, Suppressed, Proficiency Level

**World & Lore:** CFW (Concordat of Free Worlds), Apex Law, The Vaash, Mega-Corps, Frontier, Cethara, Procyus Prime, Tessavar

### 8.4 Loading Screen Lore Tidbits

Seven rotating facts displayed during AI generation:

1. "The Frontier spans seventeen inhabited star systems united under the Concordat of Free Worlds."
2. "The four major races — Human, Krix, Moluun, and Skrath — each bring unique biological advantages to field operations."
3. "The The Vaash are a serpentine race of unknown origin whose only known motivation is the destruction of all civilization."
4. "Apex Law is the CFW's elite law enforcement agency, operating in the shadows between political systems."
5. "Credits are the universal currency of the Frontier — one credit buys a basic meal, one thousand buys a used skimmer."
6. "Stamina Points represent a character's ability to absorb punishment. When they reach zero, the character falls unconscious."
7. "The Korvath system, home of planet Cethara, sits on the frontier of explored space — and beyond it lies the unknown."

### 8.5 Status Effect Labels

| Type | Conditions |
|---|---|
| Negative (red) | Wound, Stunned, Poisoned, Blind, Unconscious |
| Special / Positive (yellow) | Character-specific or situational (e.g., Battle Rage) |

---

## 9. Responsive Design Behavior

### 9.1 Desktop (1024px and above)

- Adventure grid: 2-column
- Character grid: 4-column
- Sidebar: always visible, fixed width
- Chat content: constrained to a maximum width (approximately 1280px), centered on very wide monitors
- All chat header badges visible: Act, Scene, Turn
- Full message bubble widths

### 9.2 Tablet (640px to 1023px)

- Adventure grid: 2-column
- Character grid: 2-column
- Sidebar: floats over content area when open, with a dimmed backdrop behind it
- Chat header: Act, Scene, and Turn badges hidden on smaller tablet sizes to conserve header space
- Menu button in chat header opens the sidebar

### 9.3 Mobile (below 640px)

- Adventure grid: 1-column
- Character grid: 1-column
- Sidebar: full-height drawer, slides in from the side
- DM message bubbles: full width
- Player message bubbles: 88% width, right-aligned
- Padding reduced throughout all screens
- Font size normalized (no browser zoom enlargement behavior)
- Menu button always visible in chat header

---

## 10. Error States

All errors are surfaced to the user with plain-language descriptions. Recoverable errors include a Retry action. Non-recoverable errors provide an explanation and a suggested next step.

| Error Condition | User-Facing Message | Recoverable | Action Offered |
|---|---|---|---|
| Network failure | Error banner in red with description | Yes | Retry button |
| Session expired | "Session expired" | Yes | Option to restart |
| Invalid API key | "Invalid API key" | No | None (no retry) |
| Invalid save data | "Cannot load save" + specific field description | No | None |

Error banners appear in a red styled block within the relevant screen context. They do not block navigation to unaffected parts of the interface where applicable.

---

## 11. Rules Fidelity

### 11.1 Governing Philosophy

Astra Rising AI DM is built on the **Astra Rising Core** ruleset (TSR, 1982) as its sole mechanical foundation. Astra Rising Core is the original, core tabletop rulebook that introduced the setting, the eight-stat percentile system, the skill structure, and the turn-based combat framework. It is the edition most familiar to returning players and the most comprehensively documented by the fan community.

**Knights Rising** (starship combat, 1983) is a separate expansion module. None of its starship combat mechanics are present in the app. The setting references ships and space travel narratively, but no ship-vs-ship combat system, hull point tracking, ADF/MR ratings, or spaceship skills have been implemented. This is an intentional scope decision — all adventures in the current library are ground-based or station-based scenarios.

**Korvath's Guide to the Frontier** (SFAC3, 1985) is treated as setting reference material only. Its Universal Table resolution system — the most significant mechanical revision in that supplement — is explicitly **not used**. The Astra Rising Core percentile system is the app's resolution mechanic throughout. Korvath's new playable races (Grak, Chiivari, Ossivaan, Mechanon) and its psionic rules are also not implemented. The lore, factions, and setting elements from Korvath's Guide may appear in AI-generated narrative at the DM's discretion, but no mechanical rules from that supplement are in force.

This means: **a player who knows Astra Rising Core will recognize how the game works. A player who only knows Korvath's Guide will need to adjust their expectations.**

---

### 11.2 Astra Rising Core — Followed Rules

The following Astra Rising Core rules are implemented and enforced by the app either mechanically in code or as firm instructions embedded in the AI DM's system prompt.

#### 11.2.1 The Eight Stats

All eight core statistics from Astra Rising Core are present and tracked:

| Stat | Astra Rising Core Function | App Implementation |
|---|---|---|
| STR (Strength) | Raw physical power; melee damage modifier (Punching Score) | Present; used by AI for melee resolution |
| STA (Stamina) | Hit point pool; damage threshold | Fully tracked; current/max displayed; drives unconscious/death logic |
| DEX (Dexterity) | Base for all ranged and melee attack rolls | Present; AI uses as base for attack resolution |
| RS (Reaction Speed) | Determines Initiative Modifier; defensive rolls | Present; IM derived from RS correctly (RS ÷ 10, rounded up) |
| INT (Intuition) | Alertness; surprise checks; gut-feeling tasks | Present; AI uses for relevant checks |
| LOG (Logic) | Analytical reasoning; paired with INT | Present |
| PER (Personality) | Charisma and social likability | Present; AI uses for social encounters |
| LDR (Leadership) | Command and persuasion | Present |

Stats use the 1–100 percentile scale exactly as specified in Astra Rising Core. Pre-generated character stat ranges (30–55 across most stats) are consistent with the Astra Rising Core table-roll and point-allocation methods.

#### 11.2.2 Percentile Resolution System

The core mechanic is implemented as written:
- Roll 1d100. Success if the result is equal to or **under** the target number.
- All mechanical resolutions are surfaced to the player as structured roll displays (description → roll → target → HIT/MISS).
- Skill levels add +10% per level to the base stat check, exactly matching Astra Rising Core's formula: *base stat + (10 × skill level) = target number*.
- The AI DM is instructed to apply range modifiers to ranged attack rolls matching Astra Rising Core's scale: Point Blank +20%, Short +10%, Medium 0%, Long −10%, Extreme −20%.

#### 11.2.3 Initiative System

The Astra Rising Core initiative system is followed:
- Each combatant's Initiative Modifier (IM) is derived from RS ÷ 10, rounded up.
- At the start of each combat turn, d10 is rolled and IM is applied to determine order.
- The initiative order is displayed visually in the combat panel; the current actor is highlighted.
- Lower initiative values act sooner (matching the Astra Rising Core convention where higher IM = faster, lower turn-order number = first to act).

#### 11.2.4 Stamina as Hit Points

Astra Rising Core's stamina system is implemented:
- Stamina functions as a direct hit point pool.
- Damage subtracts from current STA.
- At 0 STA: character falls unconscious.
- At negative STA equal to maximum STA: character dies.
- The visual bar and color coding (green → yellow → red) communicate health state at a glance.
- Damage from combat is applied via the AI's state updates, which the app processes and displays in real time.

#### 11.2.5 Skill System — Structure

The Astra Rising Core skill structure is followed:
- Skills advance from Level 1 to Level 6.
- Each level adds +10% to the relevant stat check.
- The three Primary Skill Areas (PSAs) — Military, Technological, and Biosocial — are the organizing framework for the four pre-generated characters.
- Skills are assigned to characters consistent with their PSA:
  - Kael Voss (Military PSA): Beam Weapons, Melee Weapons, Demolitions, Thrown Weapons, Gyrojet Weapons
  - Skrix (Technological PSA): Technician, Computers, Beam Weapons
  - Bolg (Biosocial PSA): Medical, Environmental, Psycho-Social
  - Rayla (Military PSA, Scout variant): Beam Weapons, Survival, Tracking

#### 11.2.6 SEU (Standardized Energy Units)

SEU tracking follows the Astra Rising Core framework:
- Energy weapons consume SEU per shot.
- SEU is tracked per source (individual weapon clips and spare power sources separately).
- When a source is depleted, consumption rolls over to the next available source.
- The app's SEU display shows total and source-level breakdown in the sidebar.

#### 11.2.7 Armor Types

The two primary armor types from Astra Rising Core are present:
- **Albedo Suit:** Protects against laser weapon damage. The app's tooltip accurately notes laser damage reduction.
- **Skeinsuit:** Flexible general-purpose armor. Reduces damage from physical attacks (projectile, melee, fragmentation).

Both armor types are assigned to pre-generated characters as specified in Astra Rising Core equipment lists. Protection effects are factored in by the AI DM during damage resolution.

#### 11.2.8 Status Effects

The following Astra Rising Core status conditions are tracked:
- **Stunned:** Character cannot act for a duration following a stun-type attack. Applied by electrostunners, stunsticks (stun setting), and doze grenades.
- **Unconscious:** Result of reaching 0 STA or a critical stun hit.
- **Suppressed:** Character must pass an RS check or take cover rather than attack (consistent with the suppression fire optional rule).
- **Wounded:** General injury state below half maximum STA.
- **Poisoned, Blind:** Tracked as string flags; mechanically enforced by the AI DM.

#### 11.2.9 Combat Optional Rules

Four optional combat modifiers from Astra Rising Core are implemented as toggleable flags in the combat state:
- **Burst Fire:** Rapid-fire mode for automatic weapons; increases hit chance and damage against a single target or spreads damage across a group.
- **Called Shots:** Targeting specific body parts or equipment; higher difficulty, more precise outcomes.
- **Cover and Concealment:** Environmental bonuses for characters behind cover; penalty to attack rolls against covered targets.
- **Suppression Fire:** Creates the Suppressed status on targeted characters who fail their RS roll.

When these rules are active, they appear in the combat panel and the AI DM applies them to resolution.

#### 11.2.10 Racial Abilities

All four core Astra Rising Core races are present with their canonical abilities:

| Race | Astra Rising Core Ability | App Tracking |
|---|---|---|
| Human | +5 to any one stat (at character creation) | Pre-gen stat values reflect this bonus |
| Krix | Ambidexterity (no off-hand penalty); Comprehension 15% | Listed; AI applies |
| Moluun | Elasticity (variable limb count); Lie Detection 5% | Listed; AI applies |
| Skrath | Gliding; Night Vision; Battle Rage 5% | Listed; AI applies; Battle Rage has a starting 5% chance as per canon |

#### 11.2.11 Experience Points

XP is tracked as specified in Astra Rising Core:
- Awarded by the AI DM for objectives completed, encounters resolved, and clever play.
- Displayed as total earned and unspent.
- The XP amounts awarded are consistent with Astra Rising Core's published adventure award ranges.

#### 11.2.12 Equipment and Weapons

Starting equipment for all four pre-generated characters matches or is consistent with Astra Rising Core equipment lists:
- **Ke-1000 Laser Pistol:** Standard sidearm. SEU-powered. All characters except Kael carry one.
- **Ke-2000 Laser Rifle:** Rayla's primary weapon. Longer range, higher SEU consumption.
- **Rafflur M-3 Proton Pistol:** Kael's specialty weapon. Energy-based.
- **Vibroknife:** Kael's melee weapon. Tracked in inventory.
- **Electrostunner:** Bolg's non-lethal primary weapon. Inflicts Stunned on hit.
- **Fragmentation Grenade:** Kael carries two. Area-effect explosive.
- **Doze Grenade:** Skrix carries two. Sedative gas; RS check to resist unconsciousness.
- **Medkit:** Bolg carries two. Required for Medical skill checks (per Astra Rising Core rules).
- **Techkit:** Skrix carries one. Required for Technician skill checks (per Astra Rising Core rules).
- **Survival Pack, Macrobinoculars:** Rayla's scouting kit; listed as inventory items.

Credits: All characters start with 500 Cr, which is consistent with the Astra Rising Core recommended starting budget for pre-generated characters.

---

### 11.3 Astra Rising Core — Divergences and Simplifications

The following Astra Rising Core rules exist in the source material but are either absent, simplified, or delegated entirely to AI judgment in the app.

#### 11.3.1 Weapon Damage Dice — Not Enforced in Code

Astra Rising Core specifies precise damage dice for every weapon:
- Laser Pistol: 1d10 per SEU spent (1–10 SEU dial = 1d10 to 10d10 damage).
- Laser Rifle: 1d10–20d10 per SEU.
- Frag Grenade: 8d10 to all in blast radius.
- Vibroknife, Electrostunner, Gyrojet weapons: specific dice per type.
- PS (Punching Score) added to all non-electrical/sonic melee damage.

**Divergence:** The app does not execute damage dice rolls in code. The AI DM determines damage outcomes and applies a `stamina_delta` value directly. The player sees the result (stamina change) but not the underlying dice roll that produced it. This is a significant simplification: the precise mechanical fairness of Astra Rising Core's weapon damage tables is replaced by AI judgment about appropriate damage given weapon type, range, armor, and context. Results may vary from strict Astra Rising Core tables.

#### 11.3.2 Armor Damage Reduction — Not Enforced in Code

Astra Rising Core specifies precise armor protection:
- **Skeinsuit:** Halves damage from projectile weapons, gyrojet, frag grenades, melee, and explosives. Ruined after absorbing 50+ cumulative damage.
- **Albedo Suit:** Fully negates laser damage. Ruined after reflecting 100+ damage.
- **Defensive Screens (Albedo Screen, Inertia Screen, etc.):** Powered screens that drain SEU per hit and reduce specific damage types by specific amounts.

**Divergence:** Armor reduction is not calculated by the app. The AI DM is instructed to account for armor when applying stamina deltas, but the specific halving, quarter-damage, and screen-drain formulas from Astra Rising Core are not mechanically enforced. No defensive screen items are available to the pre-generated characters. Armor durability (suit destruction after cumulative damage) is not tracked.

#### 11.3.3 Wound Effects at Half Stamina — Not Enforced

Astra Rising Core specifies that at half STA or below, characters suffer:
- Movement reduced to half.
- Carrying capacity reduced to half.
- −10% to all attack rolls.
- Single shots only (no burst fire).

**Divergence:** The app tracks STA visually and color-codes the bar at thresholds, but the mechanical penalties at half-STA (attack penalty, movement restriction, burst fire prohibition) are not automatically applied. The AI DM may narratively describe these effects but the attack roll target number is not automatically adjusted, and burst fire is not automatically disabled.

#### 11.3.4 Attack Formula — Simplified

The Astra Rising Core attack formula is:
> Base Chance = ½ DEX + (10 × Skill Level) + Range Modifier + Movement Modifier + Situational Modifiers

**Divergence:** The app's attack resolution uses:
> Target = (10 × Skill Level) + Range Modifier

The ½ DEX component is not automatically applied. The AI DM receives the character's full stat block and is instructed to apply the percentile system with skill bonuses, but the specific DEX halving is not computed in code. For the pre-generated characters, this means attack targets based purely on skill level (Beam Weapons 2 = 20% base target before range modifiers), without the additional DEX contribution that Astra Rising Core mandates. This makes attack resolution less favorable than strict Astra Rising Core rules — a character with DEX 55 should have +27% to their base attack target from DEX alone, which is absent here.

#### 11.3.5 Skill Advancement — Not Implemented

Astra Rising Core specifies an XP cost system for buying and advancing skills:
- PSA skills cost 3 XP per level (Level 1 costs 3, Level 2 costs 6, etc.)
- Non-PSA skills cost 6 XP per level.
- Ability scores can be improved directly at 1 XP per point.

**Divergence:** XP is tracked and displayed, but there is no in-app mechanism for the player to spend XP on skill advancement or stat improvement. Skills remain at their starting levels for the duration of any campaign. Character advancement is entirely a future feature.

#### 11.3.6 Two-Sided Initiative and Declaration — Not Implemented

Astra Rising Core's full initiative sequence is:
1. Both sides declare actions in reverse IM order.
2. Side B moves (lower initiative result).
3. Side A fires opportunity shots during Side B's movement.
4. Side A moves.
5. Side B fires opportunity shots during Side A's movement.
6. Both sides resolve remaining actions.

**Divergence:** The app tracks initiative order and displays who acts when, but the two-sided declaration phase, opportunity fire during movement, and the alternating movement/resolution structure are not implemented as distinct mechanical phases. The AI DM manages the narrative flow of combat turns, which may or may not precisely replicate the Astra Rising Core sequence. Combat is simplified to a round-based, initiative-ordered resolution without the movement/fire opportunity mechanic.

#### 11.3.7 Drawing Weapons Penalty — Not Implemented

Astra Rising Core specifies a −3 IM penalty at the start of combat for a character whose weapon is holstered or slung rather than in hand.

**Divergence:** This penalty is not tracked or applied. All pre-generated characters are assumed to have weapons ready at combat start.

#### 11.3.8 Critical Hit Knockout — Not Explicitly Enforced

Astra Rising Core specifies that a roll of 01–02 on a ranged attack causes automatic knockout of the target regardless of remaining STA.

**Divergence:** The percentile rolls are surfaced to the player for visibility, but automatic knockout on 01–02 is not enforced by the code. The AI DM may apply this outcome narratively when a very low roll occurs, but it is not a guaranteed mechanical trigger.

#### 11.3.9 Natural Healing and Medical Recovery — Partially Implemented

Astra Rising Core specifies:
- Natural healing: 1 STA per 20 hours of rest.
- Biocort (medic-administered): restores 10 STA immediately, one dose per 20-hour period.
- Hospital care: up to 20 STA per day.

**Partial Implementation:** The Medical skill (Bolg at Level 3) is present and the AI DM is instructed to use it for healing, but the specific recovery rates and time-gating from Astra Rising Core are not enforced. Healing happens via stamina_delta state updates at the AI's discretion based on narrative context (resting, first aid, surgery). The strict 20-hour cooldown on Biocort and per-day hospital caps are not enforced.

#### 11.3.10 Untrained Skill Attempts — Implicitly Allowed

Astra Rising Core does not permit untrained skill attempts — if you don't have the skill, you cannot attempt the task.

**Divergence:** The AI DM may allow characters to attempt tasks for which they have no listed skill, assigning a low base percentage by judgment. This is a practical accommodation for solo play — strictly prohibiting untrained attempts would severely limit player options in a narrative context — but it diverges from the Astra Rising Core rule.

#### 11.3.11 Surprise Rules — Not Formally Implemented

Astra Rising Core includes an explicit surprise mechanic: surprised characters cannot act for the first combat turn, and an INT check may allow a character to notice an ambush.

**Divergence:** Surprise is handled narratively by the AI DM. There is no formal INT check at the start of combat for ambush detection. The AI may describe a surprise scenario and reduce available choices, but the mechanical prohibition on acting during a surprised turn is not code-enforced.

#### 11.3.12 Stamina Dose Limitations

Astra Rising Core specifies that Stimdose (which wakes unconscious/stunned characters) can only be used once per character per 20-hour period without negative side effects.

**Divergence:** Stimdoses appear in Bolg's inventory and are tracked as consumable items. However, the 20-hour cooldown and side effect rules are not enforced. The AI DM applies Stimdose effects narratively when the item is used.

#### 11.3.13 Punching Score in Melee — Partially Applied

Astra Rising Core adds a Punching Score (PS, derived from STR ÷ 10) as bonus damage to all melee attacks with non-electrical, non-sonic weapons.

**Divergence:** PS is stored in each character's combat stats but is not automatically added to melee damage dice rolls (since weapon damage dice themselves are not computed in code). The AI DM may account for STR-based bonus damage in its stamina_delta calculations, but this is not guaranteed or verifiable.

---

### 11.4 Knights Rising — Status

Knights Rising introduced the following systems:

| Knights Rising System | Status in App |
|---|---|
| Starship combat (hex grid, ADF/MR ratings) | **Not implemented** |
| Ship hull points | **Not implemented** |
| Ship weapon systems (laser batteries, torpedoes, rockets) | **Not implemented** |
| Defensive screens (ship-scale) | **Not implemented** |
| Boarding action rules | **Not implemented** |
| Spaceship skills (Piloting, Astrogation, Engineering, Energy Weapons) | **Not implemented** |
| Zero-G combat rules | **Not implemented** |
| Fighter, assault scout, frigate, cruiser, battleship types | Not tracked in game state |

**Setting References:** The Astra Rising universe includes space travel, and AI-generated narrative may reference ships, travel between systems, or space stations. These are treated as setting flavor only. No mechanical resolution of anything from Knights Rising occurs.

**Rationale:** All ten adventures in the current library are ground-based or set aboard stations or wrecks, not in active ship-to-ship combat. Knights Rising mechanics are irrelevant to the current content scope.

---

### 11.5 Korvath's Guide — Status

Korvath's Guide to the Frontier introduced the following changes and additions:

| Korvath's System | Status in App |
|---|---|
| Universal Table / Action Control Table (color-coded resolution) | **Not used.** Astra Rising Core percentile system is the sole resolution mechanic. |
| Column Shifts replacing percentage modifiers | **Not used.** Percentage-based modifiers (±10%, ±20%, etc.) are used throughout. |
| Single roll resolving both hit and damage | **Not used.** Hit and damage are separate (roll to hit, then stamina_delta for damage). |
| Graduated damage results (Yellow/Green/Blue/Cobalt bands) | **Not used.** Results are binary: success or failure. |
| 100+ granular skills replacing Astra Rising Core's 13 | **Not used.** Astra Rising Core's 13 skills across 3 PSAs are the framework. |
| Skills raised from max Level 6 to max Level 8 | **Not used.** Maximum skill level is 6. |
| Four permanent Professions (Enforcer, Techex, Scispec, Explorer) | **Not used.** Astra Rising Core's PSA system (Military, Technological, Biosocial) is used instead. Note: the character archetypes in the app use Profession-flavored labels (Techex for Skrix, Scispec for Bolg) as narrative descriptors only — they do not confer Korvath's profession bonuses or restrictions. |
| Starting 20 XP pool | **Not used.** Characters begin with 0 XP. |
| Untrained /0 column attempts | **Partially diverged from Astra Rising Core** (see §11.3.10 above), but not via the Korvath's mechanism. |
| New races: Grak, Chiivari, Ossivaan, Mechanon | **Not implemented.** Only the four Astra Rising Core races are playable. |
| Psionic abilities and Psi-Corp | **Not implemented.** Psionics are absent from the game. |
| Revised stat generation with multiple rolls | **Not used.** Pre-generated characters only; no character creation flow. |

**Community Context:** The fan community largely considers Korvath's Guide's Universal Table an awkward fit for Astra Rising and most ongoing fan campaigns use Astra Rising Core mechanics with Korvath's setting lore selectively. The app aligns with this community consensus.

---

### 11.6 Rules Fidelity Summary Table

The following table provides a single reference for every Astra Rising Core mechanic and its implementation status.

| Mechanic | Astra Rising Core Specification | App Status | Notes |
|---|---|---|---|
| Eight stats (STR/STA/DEX/RS/INT/LOG/PER/LDR) | 1–100 scale, four paired groups | **Fully implemented** | All eight tracked and displayed |
| Percentile resolution (roll ≤ target) | Core mechanic | **Fully implemented** | Used for all roll resolution |
| Skill bonus (+10% per level) | Each level adds +10% to base stat | **Fully implemented** | Applied to all skill checks |
| IM calculation (RS ÷ 10, rounded up) | Derived stat | **Fully implemented** | Correct for all four characters |
| Initiative roll (d10 + IM, lower acts first) | Per-turn roll | **Fully implemented** | Displayed in combat panel |
| STA as hit points | Direct damage pool | **Fully implemented** | Real-time tracking |
| Unconscious at 0 STA | Threshold | **Fully implemented** | Enforced by AI and code |
| Death at −(max STA) | Threshold | **Fully implemented** | Enforced by AI |
| Wound penalties at ½ STA | −10% attacks, halved movement/carry, single shots only | **Not implemented** | AI may narrate effects; not code-enforced |
| Natural healing (1 STA / 20 hours rest) | Time-gated recovery | **Partial** | AI applies healing; timing not enforced |
| Medical skill (First Aid, Surgery, Biocort) | Task table with base chances | **Partial** | AI uses skill; specific task percentages not enforced |
| Stimdose rules (1× per 20 hours) | Cooldown and side effects | **Not implemented** | Item tracked; cooldown not enforced |
| Skills 1–6 (Military/Tech/Biosocial PSAs) | PSA framework | **Fully implemented** | All four characters have PSA-consistent skills |
| XP earning | Session awards | **Fully implemented** | Awarded and tracked |
| XP spending (skill advancement) | Advancement system | **Not implemented** | XP tracked; no spending mechanism |
| Ability score improvement via XP | 1 XP per point | **Not implemented** | — |
| Weapon damage dice (per-weapon tables) | Specific dice per weapon | **Not implemented** | AI determines stamina_delta |
| DEX ½ in attack formula | Base attack component | **Not implemented** | Attack resolution simplified to skill × 10 + range |
| Punching Score in melee | STR ÷ 10 bonus damage | **Partial** | Stored; AI may apply; not code-computed |
| Two-sided initiative and declaration | Full sequence | **Not implemented** | Initiative order tracked; declaration phase absent |
| Opportunity fire during movement | Movement/fire interaction | **Not implemented** | — |
| Drawing weapon penalty (−3 IM) | Readiness penalty | **Not implemented** | All characters assumed weapon-ready |
| Critical hit knockout (roll 01–02) | Automatic result | **Not implemented** | AI may apply narratively |
| Burst fire | Optional rule | **Implemented as flag** | Active rules displayed; resolution by AI |
| Called shots | Optional rule | **Implemented as flag** | Active rules displayed; resolution by AI |
| Cover and concealment | Optional rule | **Implemented as flag** | Active rules displayed; resolution by AI |
| Suppression fire | Optional rule | **Implemented as flag** | Suppressed status applied |
| Albedo Suit (laser protection) | Negates laser damage | **Partial** | Present in inventory; applied by AI |
| Skeinsuit (physical damage reduction, halved) | Halves projectile/melee/frag damage | **Partial** | Present in inventory; applied by AI |
| Armor durability (damage threshold) | Suit destroyed after cumulative hits | **Not implemented** | — |
| Defensive screens (Albedo, Inertia, Gauss, Sonic) | SEU-powered active defense | **Not implemented** | No screen items available to pre-gens |
| SEU tracking (per-source) | Energy pool per weapon | **Fully implemented** | Multi-source, named deduction |
| Human racial bonus (+5 to one stat) | One-time generation bonus | **Implemented** | Reflected in pre-gen stat values |
| Krix Ambidexterity | No off-hand penalty | **Partial** | Listed; applied by AI; not code-enforced |
| Krix Comprehension (15%) | Insight roll | **Partial** | Listed at 15% per Astra Rising Core; AI applies |
| Moluun Elasticity (variable limbs) | Flexible morphology | **Partial** | Listed; AI applies narratively |
| Moluun Lie Detection (5%) | Secret referee roll | **Partial** | Listed at 5% per Astra Rising Core; AI applies |
| Skrath Gliding | Altitude-based glide | **Partial** | Listed; AI applies when contextually relevant |
| Skrath Night Vision | Low-light advantage | **Partial** | Listed; AI applies |
| Skrath Battle Rage (5%) | Triggered berserk state | **Partial** | Listed at 5% per Astra Rising Core; AI applies; +20% melee bonus per rules |
| Skrath Light Sensitivity | Bright-light penalty | **Not implemented** | Not listed or enforced |
| Untrained skill attempts | Not permitted in Astra Rising Core | **Diverged** | AI may allow attempts at low base chance |
| Surprise rule (INT check, lost turn) | Ambush mechanic | **Not implemented** | Handled narratively |
| Credits (economy) | Universal currency | **Fully implemented** | Tracked; no purchasing system |
| Techkit required for Technician tasks | Equipment prerequisite | **Partial** | Present in Skrix inventory; AI enforces |
| Medkit required for Medical tasks | Equipment prerequisite | **Partial** | Present in Bolg inventory; AI enforces |
| Starship combat (Knights Rising) | Full hex-grid system | **Not implemented** | Out of scope |
| Spaceship skills (Piloting, Astrogation, etc.) | Knights Rising Campaign Book | **Not implemented** | Out of scope |
| Zero-G combat | Knights Rising Campaign Book | **Not implemented** | Out of scope |
| Universal Table resolution (Korvath's) | Column-shift color system | **Not used** | Astra Rising Core percentile used instead |
| Professions (Korvath's: Enforcer/Techex/Scispec/Explorer) | Permanent profession with bonuses | **Not used** | Labels used as flavor; no mechanical effect |
| Extended skills 1–8 (Korvath's) | 100+ granular skills | **Not used** | Astra Rising Core 13-skill framework used |
| New races (Grak, Chiivari, Ossivaan, Mechanon) | Korvath's additions | **Not implemented** | Four Astra Rising Core races only |
| Psionics (Korvath's) | Psi skills and Psi-Corp | **Not implemented** | Absent from setting and mechanics |
