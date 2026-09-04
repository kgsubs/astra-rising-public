# Astra Primer: approach for extending this repo into a Diamond Age tutor

Date: 2026-07-24. External claims sourced from research run this session; see `## Evidence base`. Revised twice: once after an adversarial review that corrected two load-bearing errors in the first draft, and once after four scoping decisions were settled (section 0). Corrections are noted inline where they change the plan.

---

## 0. Standing decisions

Four decisions are now fixed and the rest of this document is written against them.

**This is a research project that may become a product.** That is not a hedge, it is a scope reduction with consequences:

- Compliance drops from a build phase to a testing protocol: written informed consent from each parent, no raw audio retained, all data deleted on request, no data used for training. The full verifiable-parental-consent apparatus, Safe Harbor programme and DPIA are deferred until money changes hands.
- **Cost optimisation is deferred.** Use the strongest model available for every turn. Section 7's routing and caching design stands as the eventual answer, but optimising a research prototype's token spend before knowing whether it teaches anything is premature.
- The success criterion changes. It is not retention or payback; it is whether a measurable learning effect exists at all.

**The primary research question is one nobody has answered:** does an adaptive, AI-generated decodable story teach decoding better than a fixed, professionally authored decodable reader? Every located LLM-tutoring RCT used high-schoolers or adults. A clean result here is publishable on its own and de-risks any product built later.

**Test cohort is age 6, with one 5-year-old as a stress case.** Six sits mid-decoding, which is where there is the most room for an effect to show. By 7 many children are fluent enough that the intervention has nothing to move (Hasbrouck-Tindal spring Grade 2 median is 100 words correct per minute). At 4 the interaction model itself fails, so a null result would be uninterpretable. The 5-year-old is there to answer a separate question: can the youngest plausible user operate the loop unaided?

**Phonics scope and sequence: UFLI Foundations.** It has a published ordered sequence of ~110 lessons, and a free toolbox of decodable passages, word lists and heart-word lists; only the teacher manual is purchased (https://ufli.education.ufl.edu/foundations/toolbox/). This gives two things at once: the spine the whole system keys off, and a ready-made control condition, because its own decodable passages are exactly what the generated passages must beat.

**A literacy specialist is already available.** The corpus work therefore starts at Phase 0 in parallel with the code, not at Phase 4. It is no longer a hiring risk, but it remains the critical path.

---

## 1. Verdict

The market splits into two failing shapes:

- **Drill apps with a chat layer bolted on.** Khanmigo reached 700K users but Khan Academy publicly admitted only ~15% of enabled students actually use it, and spent Oct 2025 to Apr 2026 redesigning. Engagement, not capability, is the binding constraint.
- **Companion chatbots with no learning engine.** These are in a regulatory graveyard: FTC 6(b) inquiry into seven companies (Sep 2025), Character.AI/Google wrongful-death settlements (Jan 2026), Florida AG suit against OpenAI (Jun 2026), Italy's EUR 5M Replika fine.

Nobody found in the research has shipped a product where **the story is the pedagogy** and a deterministic engine, not the model, decides what the child knows and what comes next. That is the gap.

**What this repo actually contributes is a shape, not a firewall.** The first draft of this document claimed the codebase already enforces a hard separation between fiction and mechanics. It does not, and the correction matters:

- `dice_rolls` is a **model output field**. The model emits `{target, roll, success}` itself (`public/app.js:3569`). `ruleEngine.js` computes reference values that are injected into the prompt as *advice*; nothing checks the model's roll against them.
- `validateDMResponse`, `repairTruncatedJSON` and `sanitizeNarrative` exist **only in `public/app.js`** (from `:3739`). Grep confirms zero references anywhere under `server/`. They are client-side, in the file this plan deletes.

So the honest carry-over is roughly **15%**: the turn loop, session and persistence layer, the corpus loader, the priority-tiered injector structure, and streaming. The firewall is net-new, server-side, and belongs in Phase 0. That is still the right foundation to build from, but it is a starting point, not a head start.

---

## 2. What actually carries over

| Existing component | Lines | Becomes | Change |
|---|---|---|---|
| `server.js` request loop, session tokens, dual rate limiters | 512 | Same, minus Groq | Light |
| `db.js` sessions/messages/state/modules schema | 126 | `children` / `turns` / `attempts` / `learner_state` | Light, same shapes |
| `server/ruleLoader.js` JSON corpus -> cache -> selective read | 109 | `curriculumLoader.js` | Near-verbatim |
| `server/services/promptRulesInjector.js` P1-P7 priority tiers, ~800 token budget | 314 | `curriculumInjector.js` | Structural reuse, new content |
| Streaming with early partial parse of `narrative` | ~60 | Same, with field ordering constraint (see Bet 2) | Light |
| `server/services/ruleEngine.js` deterministic computation | 195 | `masteryEngine.js` (BKT + FSRS) | Full rewrite, role only |
| Client-side `validateDMResponse` / `repairTruncatedJSON` | ~110 | Server-side equivalents | Rewrite and relocate |
| Client-side `sanitizeNarrative` | ~35 | Server-side `assertNoAnswerLeak` | Rewrite, harder job |
| `public/app.js` React frontend | 4,654 | Nothing | Delete |
| `public/data/rules/*.json` Astra Rising corpus | ~60KB | Nothing | Delete |

What is genuinely worth stealing is the **prompt-construction discipline**: a large JSON corpus loaded once at startup, a selector that picks a small slice per turn under an explicit token budget, priority tiers so the most important block is never truncated, and a response contract that separates what the player sees from what the system needs.

The `SIGNATURE TRAIT` instruction (`public/app.js:3499`) is reusable in form: "actively create openings for it every scene, do not wait for the player to invoke it" becomes "actively create openings to practise the target skills every scene."

---

## 3. The product

A persistent sci-fi world the child returns to daily and grows into over years. Same setting family as Astra Rising, aged down: a young explorer, a ship, a companion, an expanding star map.

Each session is a short story turn. To move the story, the child must **perform a skill**, not answer a question. A door opens when the word on it is read. A jump needs the right number of fuel cells counted out. The tutor never says "correct." The world responds.

**v1 targets ages 5 to 7, and testing centres on age 6** (section 0). A three-year-old and a nine-year-old are not a difficulty setting apart; they are two products, two interaction models, two content pipelines. Five to seven is the band where systematic phonics and early number both land, where touch interaction is reliable, and where the parent is still the buyer. Extend down and up only after the loop works.

If it later becomes a product: parent-purchased, ~$12-15/month (category median ARPU is ~$12/mo, observed points $4-20). The parent dashboard is a separate surface showing mastery, evidence and next steps, and it is the retention mechanism, because 36% of churn in this category is "child lost interest" and the parent holds the credit card. In the research phase the dashboard serves a different purpose: it is the instrument, the place the effect either shows up or does not.

---

## 4. The design bets

### Bet 1: the engine owns the item, the model owns the story

The single reproducible finding across every LLM-tutoring RCT: scaffolded, hint-only tutors help and unguarded answer-giving tutors hurt. Bastani et al. (PNAS, ~1,000 students): the guardrailed hint-based tutor produced +127% practice improvement with no harm after removal; the unguarded version produced +48% while assisted and a **17% grade drop once withdrawn**.

The narrative frame helps but does not by itself prevent answer-giving: `narrative` is free text read aloud, and nothing stops the model writing "the door says CAT, that's c-a-t!". Mechanics leakage is regex-detectable; answer leakage is semantic and is not.

So the enforcement is structural. The engine selects the item and passes it **into** the prompt:

```
{skill_id: "cvc_short_a", item: "cat", distractors: ["cot", "cut"], hint_level: 0}
{skill_id: "add_within_10", operands: [3, 4], representation: "concrete"}
```

The model wraps that item in fiction and nothing else. Two deterministic asserts run server-side before the turn is released:

1. The target string, its spelled-out form (`c-a-t`, `c a t`), and the numeral and word forms of any arithmetic result do not appear in `narrative`.
2. `action.payload` returned by the model is byte-identical to what was sent. Any alteration rejects the turn.

This is the discipline the existing code aspires to and does not have. Building it server-side is Phase 0 work.

### Bet 2: a closed decodable lexicon, not a post-generation checker

This is the moat, and the first draft specified it in a form that will not build.

Forty-two states plus DC have passed science-of-reading legislation since 2013 specifically to stop children guessing at words they have not been taught to decode. A free-generating LLM violates this on every turn. The obvious fix, letting the model write freely and validating afterwards by segmenting arbitrary English against the child's taught grapheme-phoneme correspondences, does not work:

- Grapheme-phoneme segmentation of open-vocabulary English is not decidable from spelling. Heteronyms (`read`, `live`, `wind`, `bow`) need context. `-ed` has three pronunciations. Schwa in multisyllables is unpredictable.
- The regenerate-with-a-forbidden-list loop does not converge. Negative constraints do not tell the model what *is* allowed, so each pass substitutes fresh out-of-set words.
- Validation-then-regeneration is incompatible with streaming and with a sub-300ms latency budget.

Apply Bet 1's own principle instead. **The engine selects the child-read words from a closed, pre-annotated, per-stage lexicon and passes them positively into the prompt.**

- Annotate once, offline: roughly 3,000 to 5,000 words, tagged with their GPC decomposition and the stage at which each becomes legal. The stage boundaries are UFLI Foundations' ~110 lessons (section 0); its published word lists and heart-word lists seed the corpus, CMUdict supplies pronunciations, and the specialist does the QA. This is content work, done once, not runtime inference.
- Validation collapses to set membership: every token in `child_read` is either in the child's currently-legal slice, on their sight-word list, or a story proper noun already introduced with audio support. O(1) lookup, 100% coverage, no segmentation engine.
- Regeneration becomes a rare backstop assert rather than a control loop.

Two text channels with different constraints:

- **`narrative`** (narrator-read, TTS or parent): rich, unconstrained vocabulary. Listening vocabulary should outrun decoding ability. Streams immediately.
- **`child_read`** (the words the child must decode): drawn only from the legal set. Emitted **after** `narrative` in the response so narrative streams while `child_read` is held, validated and only then rendered. The streaming partial-parse in the existing client already reads `narrative` first; keep that field order and the latency budget survives.

Competitors either hand-author leveled readers, which cannot adapt, or let the model generate freely, which breaks the phonics sequence. Doing both is the product.

### Bet 3: the engine observes the child, the model never reports on them

Per-skill mastery is a Bayesian Knowledge Tracing posterior with learn/guess/slip parameters and a decay function, scheduled by an FSRS-style spaced-repetition layer. BKT remains the practical interpretable baseline in 2026; deep knowledge tracing needs interaction data a new product does not have at launch. FSRS is Anki's default and needs 20-30% fewer reviews than SM-2 for equal retention. Do not hand-roll a decay model.

**The model contributes no evidence about the child.** The first draft had the model emit a `skill_observations` array with its own confidence values feeding BKT; that is the model guessing at mastery, which is exactly what this bet forbids. Deleted. The engine observes the child's actual interaction and writes the attempt record itself:

```
attempts  id, child_id, skill_id, item, response, correct, latency_ms,
          attempt_n, hint_level, timestamp
```

BKT updates from `attempts`. Nothing else.

One caveat from the research: a 2025 fairness study found BKT skill-level bias tied to reading ability. In a literacy product that is a live risk, so decoding evidence and comprehension evidence must be traced as separate skills, never collapsed.

### Bet 4: the failure ladder is the product

This is where the game-to-tutor analogy breaks hardest, and it is what the first draft omitted entirely. In a game, a failed roll is narratively interesting and **advances** the story. In a tutor, a failure must **not** advance the story. It must trigger scaffolding and a re-taught item.

The ladder, driven by the engine, with `hint_level` passed into every prompt:

| Attempt | Engine action | What the child experiences |
|---|---|---|
| 1 | Present item | The door has a word on it |
| 2 | `hint_level: 1` - narrow distractors, isolate the target grapheme | The companion points at the tricky letter |
| 3 | `hint_level: 2` - segment the word aloud, child blends | The companion sounds it out, child finishes |
| 4 | `hint_level: 3` - model the full answer, child imitates | The companion reads it, child echoes |
| 5 | Abandon item, mark not-yet-taught, reschedule via FSRS, advance story by another route | The door opens another way; nothing was failed |

Two invariants:

- **No dead ends.** The story always has a non-skill route forward after four attempts. A child must never be trapped by a word.
- **Frustration and boredom are engine-detected**, from latency, attempt counts and abandonment rate, not from asking the child. Sustained struggle drops difficulty and switches strand; sustained ease raises it. This is the adaptivity that the word "adaptive" actually means, and it is deterministic.

All of the pedagogy lives in this table. Design it before anything else.

### Bet 5: writing before voice

"Read, write, and do arithmetic" is the ask, and writing was nearly absent from the first draft. It should displace voice in the roadmap entirely.

**Encoding, not handwriting.** The child spells words with letter tiles from narrator dictation: the companion says a word, the child builds it. This is deterministically gradeable with no ASR and no OCR, it directly reinforces decoding (encoding and decoding are reciprocal), and it reuses the same closed lexicon and the same failure ladder. It is the cheapest high-value strand in the plan.

Voice input is deferred, and the ASR evidence explains why. Adult WER sits near 5%; ages 6-10 run 15-21%; ages 4-6 reach **35%**, and a 2026 age-aware adapter study still left ages 3-4 at ~37%. Purpose-built reading-assessment ASR is not a rescue: an independent 2026 study of SoapBox Labs on 429 kindergartners found only poor to moderate agreement with human raters (kappa 0.09-0.70), and the best-validated system found (SERDA) scores MCC 0.43-0.55 with its own authors recommending against high-stakes use. When read-aloud scoring does arrive, a miscue is **one weak signal into BKT**, never a gate and never a "wrong." A false rejection tells a six-year-old they failed at reading when they did not. That is the product-killing bug.

Voice **output** ships early, because it must: pre-readers need the narrator. Budget under 300ms to first audio, and never go silent during a delay. Field observation of children with AI toys: during latency they shake the device and ask "are you awake?" Fill gaps with in-world sound.

### Bet 6: no streaks, but a designed reason to return

The overjustification literature shows badges and points decoupled from the underlying skill crowd out intrinsic motivation, and a 2024 SDT meta-analysis finds autonomy, competence and relatedness sustain motivation better than reward systems. That is the argument.

(The first draft also leaned on EU AI Act Article 5. That is over-claimed: Art. 5 bans manipulative practices causing significant harm, not progress streaks. Keep it as a reason to avoid genuinely predatory retention mechanics, not as the case against a streak counter.)

But "no streaks" is only defensible if something replaces them, and that must be designed rather than assumed:

- **Cliffhanger session boundaries.** Every session ends mid-beat, at a point the engine chose.
- **Between-session world events.** The world moves while the child is away. A message waiting, a plant grown, a companion who went somewhere. This creates a reason to return that is about the story rather than about a number, and it is what a Primer would actually do.
- **Progress shown as world state to the child** (bigger map, repaired ship, new companion) and as mastery to the parent.

---

## 5. Response contract

Field order is load-bearing: `narrative` first so it streams, `child_read` after so it can be held and validated.

```
{
  "narrative": "string",                    // narrator-read, unconstrained vocab, streams
  "child_read": "string|null",              // tokens MUST be in the child's legal set
  "action": {
    "type": "tap_grapheme|read_word|build_word|count_set|compose_number|sequence",
    "skill_id": "string",                   // supplied BY the engine
    "payload": {}                           // engine-generated, byte-identical echo required
  },
  "state_updates": {
    "world_delta": {},                      // map, ship, companions, canon additions
    "interest_signals": [],                 // what the child lingered on
    "journal_entry": "string|null"
  },
  "choices": [{"id": "string", "text": "string"}],
  "scene_change": false,
  "ooc_note": null                          // parent-facing colour only, never rendered to child
}
```

There is deliberately no field in which the model can report on the child's ability. Assessment is written by the engine from observed interaction (Bet 3).

---

## 6. Data model

```
children       id, parent_id, display_name, birth_month, created_at, updated_at
               -- no full DOB, no surname: data minimisation is now binding under COPPA

parents        id, email, vpc_method, vpc_verified_at, vpc_training_consent_at,
               retention_policy_version, delete_after

turns          id, child_id, role, content_json, timestamp

attempts       id, child_id, skill_id, item, response, correct, latency_ms,
               attempt_n, hint_level, timestamp
               -- the assessment record. BKT reads only this.

learner_state  child_id, skill_id, p_mastery, learn/guess/slip, last_seen,
               next_due, decay_params

canon          child_id, canon_json, updated_at
               -- world state, characters, arcs, observed interests

rollups        child_id, week, summary_text, mastery_snapshot_json
               -- the multi-year memory

audio_events   child_id, derived_features_json, created_at
               -- NEVER raw audio by default. See section 8.
```

Keep better-sqlite3 and WAL. Synchronous, fast, correct, and the per-child dataset is small. Move to Postgres only when multi-tenancy demands it.

---

## 7. Model routing and cost

**For the research phase, ignore this section and use the strongest model available on every turn** (section 0). Optimising token spend before knowing whether the thing teaches anything is premature, and a weak model confounds the result: a null finding would not distinguish "the approach does not work" from "the prose was not good enough." What follows is the design for the day cost starts mattering.

The repo currently calls Groq `llama-3.3-70b-versatile` (`server.js:16`) despite `CLAUDE.md` claiming Anthropic. That changes: the long system prompt plus curriculum injection plus canon is exactly the prompt-caching shape, and turn quality is the product.

**Most interactions must not call a model at all.** Taps, retries, hint escalation within an item, and correctness feedback are engine-only. The model is called when the story needs new prose: scene changes, new items introduced in fiction, session open and close. Budget roughly 6 to 10 model calls per 15-minute session, not one per interaction. If every tap hits the model, cost triples and latency ruins the loop.

Tiered routing:

- **Per turn:** `claude-haiku-4-5` ($1/$5 per MTok, 200K context). The hard reasoning has been moved into the deterministic engine, which is the point.
- **Weekly rollup and story-arc planning:** `claude-sonnet-5` ($2/$10, rising to $3/$15 on 2026-09-01) or `claude-opus-5` ($5/$25). Once per child per week.
- **Cache** the system prompt plus canon block with 1h TTL: writes at 2x, reads at 0.1x. The once-daily pattern fits Anthropic and OpenAI TTL caching better than Google's per-hour cache storage fee, which bills idle caches between sessions.

Cost, with assumptions stated. At 20 model calls per session, ~4K cached system tokens, ~1K fresh input and ~500 output per call, the naive figure is $0.0039 per call, or $0.078/day. That understates it: conversation history grows roughly 1.5K tokens per turn, so incremental cache writes at 2x and growing cache reads push a realistic figure to **$0.15-0.25/day, or $4.50-7.50 per month**, before retries. Cutting to 6-10 calls per session by keeping taps engine-only brings it back under **$0.10/day**. Against $12-15/month ARPU that leaves room for narrator TTS.

Voice is the swing factor. There is **no Anthropic audio API**: the Messages API has no audio content-block type, and Claude's own voice mode is a turn-based STT to Claude to third-party TTS pipeline. So voice means STT plus LLM plus TTS, $0.11-0.51 per minute in the general case, dominated by TTS. Mitigations: Cartesia Sonic-Turbo (~40ms TTFB) or ElevenLabs Flash v2.5 (100-200ms TTFB) rather than a premium tier; aggressive caching of repeated narrator lines, which is highly effective given a closed lexicon and a bounded set of companion phrases; and keeping voice to the narrator channel rather than open-ended conversation. If a native speech-to-speech loop becomes essential, that means swapping the reasoning model for Gemini Live or Nova Sonic: a real architectural fork, and a deliberate later decision, not a default.

---

## 8. Compliance constraints on the architecture

**Research phase obligations are much lighter** (section 0). Testing with a handful of children recruited directly, with no payment and no data sharing, needs: written informed consent from each parent covering what is collected and why; no raw audio retained; no child data used to train or fine-tune anything; deletion on request and at the end of the study; and an adult present. That is the whole protocol. If the work is ever published, an ethics review comes with it.

The rest of this section is what commercialisation requires, and it decides the schema, so the columns go in now even though the machinery does not.

- **COPPA amended rule is in force**; the 2026-04-22 compliance deadline has passed. Voice recordings are Personal Information. Penalty $53,088 per violation.
- **Retained or analysed voice requires verifiable parental consent.** Audio used only to fulfil an immediate request can be exempt; personalisation cannot. **Therefore: store no raw audio by default.** Transcribe, extract derived features, discard the waveform. Raw retention becomes an explicit opt-in with VPC. This is why `audio_events` stores features.
- **A second, separate VPC is required to use a child's data for model training.** Hence a distinct `vpc_training_consent_at` column. Do not conflate them.
- **A written retention and deletion policy with a concrete timeframe** is required. "As long as necessary" is not compliant. Hence `delete_after`.
- **California SB 243 (in force 2026-01-01)**: self-harm detection with crisis referral, periodic AI-disclosure reminders to minors, private right of action, $1,000 per violation. Texas TRAIGA and New York's AI Companion law (up to $15,000/day) are also live. Build crisis detection and disclosure once, for everyone.
- **EU AI Act Art. 50 transparency lands 2026-08-02**; education high-risk obligations 2027-12-02. Persistent per-child profiling likely requires a DPIA under GDPR-K for EU or UK families.
- **KOSA is not law.** The House passed a related KIDS Act on 2026-06-29 but Senate sponsors call it dead. Do not build to it.

Notable precedent gap: no enforcement action or lawsuit was found targeting a dedicated AI tutoring product. All the litigation is companion chatbots. That argues for building something visibly not a companion chatbot: bounded world, bounded persona, no open-ended chat, everything routed through the story.

---

## 9. Build order

Reordered after review. The original sequence built the two hardest systems before ever putting the loop in front of a child, while simultaneously naming "no evidence base for ages 3-9" as the largest unknown. That is backwards.

**Phase 0 - strip, re-point, and build the firewall.** Delete Astra Rising rules JSON, combat, dice, weapons. Swap Groq for Claude with prompt caching. Port validation, repair and the new `assertNoAnswerLeak` and payload-echo asserts to the **server**, where they belong. Keep the turn loop and tests green against a placeholder curriculum.

**Phase 0b, running in parallel from day one - the corpus.** The specialist starts now, not at the end. UFLI Foundations supplies the ordered spine, its published word and heart-word lists seed the data, and the work is to extend that into a 3,000-5,000 word annotated lexicon with per-lesson legality, plus ~200 math nodes with prerequisite edges. Months of specialist work, on the critical path for two later phases, and entirely parallelisable with the code.

**Phase 1 - thin curriculum slice.** Not the whole corpus. Three UFLI stages, counting to ten, and a few hundred annotated entries. Enough to run a real session.

**Phase 2 - crude touch frontend, hardcoded content, real children.** The moment of truth, and it must come early. Three six-year-olds plus one five-year-old (section 0). Can they operate the loop unaided? Does the story pull them back tomorrow? Does the failure ladder feel like help or like failing? No mastery engine needed; hand-sequence the items. If this fails, nothing downstream matters.

**Phase 3 - mastery engine.** BKT posteriors plus FSRS scheduling in `masteryEngine.js`. `curriculumInjector.js` selects target skills per turn and emits the priority-tiered block under the same ~800 token budget discipline as today's rules injector.

**Phase 4 - the comparison study.** The reason the project exists. Adaptive generated decodable passages against UFLI's own fixed decodable passages, same children, same sequence position, measuring decoding accuracy and words correct per minute. This is where a real answer comes from, and it needs the corpus from Phase 0b finished.

**Phase 5 - encoding strand.** Letter-tile spelling from dictation. Reuses the lexicon and ladder.

**Phase 6 - commercialisation layer, only if it becomes a product.** VPC flow (a Safe Harbor programme such as PRIVO or kidSAFE gives a pre-vetted path), retention and deletion jobs, crisis detection and referral, periodic AI disclosure, DPIA if EU or UK, and the cost routing in section 7.

**Phase 7 - voice input,** flagged, weak-signal only, ages 6+.

Phases 0-4 are the research project. Phase 6 exists only if Phase 4 produces a result worth building on.

---

## 10. Measurement

- **Primary outcome, with a real control.** Decoding accuracy and words correct per minute on untaught-but-decodable words, adaptive generated passages against UFLI's own fixed decodable passages at the same sequence position. Using the published programme as the control is what makes the result mean something; a within-child crossover design keeps the sample small enough to actually run.
- **Track engagement and learning as separate metrics.** High play time is not evidence of skill gain. That gap is where Khanmigo's 15% and Alpha School's unverified internal claims both live.
- **Benchmark reading fluency against Hasbrouck-Tindal WCPM norms** (Grade 1: 60, Grade 2: 100, Grade 3: 112 words correct per minute at the spring 50th percentile) rather than a proprietary scale. Legible to parents and schools.
- **Do not claim 2 sigma.** Bloom's 2.0 SD has never replicated; a 2020 meta-analysis of 96 studies found none reproduced it, and roughly half the original effect came from added testing and feedback rather than tutoring. Excellent human tutoring lands near 0.3-0.4 SD, degrading to 0.16-0.21 SD at scale. Claiming more is false and, for a children's product under current FTC posture, dangerous.
- **Retention benchmark:** 7.4% monthly churn, roughly 60% annualised, 36% attributed to "child lost interest." Cliffhangers and between-session world events are the mechanism being tested.

---

## 11. Risks and kill criteria

| Risk | Kill criterion |
|---|---|
| A six-year-old cannot operate the loop unaided, or does not want to return | Phase 2 fails. Stop here; everything else is moot. |
| The annotated lexicon cannot be built to quality in reasonable time | QA pass rate on annotations under 98%, or the specialist's estimate exceeds the project's runway |
| A generative story cannot beat hand-authored leveled readers | Phase 4 loses to UFLI's own decodable passages. This is the project's actual hypothesis, so a clean loss is a real and publishable result, not a failure to hide. |
| Constrained early-stage lexicon leaves too little English for coherent sentences | Stage-1 story passages rated incoherent by human raters. Mitigation already in design: `narrative` is unconstrained and carries the story, `child_read` carries only the target |
| Per-child model cost exceeds ARPU once narrator TTS is on | Blended cost above $5/month/child at target usage |
| No evidence base exists for LLM tutors at ages 3-9 | Not a kill criterion, but it means efficacy is measured in-house from day one, not assumed. Every located RCT used high-schoolers or adults. Largest single unknown in the plan. |
| Regulatory shift bans student-facing AI for elementary ages | AFT called for exactly this in May 2026; over half of NYC's council sought a two-year school moratorium in Jun 2026. Consumer positioning is the hedge; do not make school-district distribution the primary channel. |

---

## 12. Evidence base

- Guardrailed vs unguarded LLM tutoring, +127% vs +48%-then-minus-17%: https://www.pnas.org/doi/10.1073/pnas.2422633122
- Metacognitive laziness: https://arxiv.org/pdf/2412.09315
- Bloom 2-sigma non-replication and real effect sizes: https://www.educationnext.org/two-sigma-tutoring-separating-science-fiction-from-science-fact/
- Tutoring effect decay at scale: https://edworkingpapers.com/sites/default/files/Tutoring%20Meta-Analysis%20Oct%202024_unblinded.pdf
- Hasbrouck-Tindal fluency norms: https://files.eric.ed.gov/fulltext/ED594994.pdf
- Science-of-reading state legislation count: https://www.thereadingleague.org/compass/policymakers-and-state-education-agencies/
- Counting principles: https://prek-math-te.stanford.edu/system/files/media/document/2017/The%20Principal%20Counting%20Principles.pdf
- BKT fairness bias tied to reading ability: https://www.mdpi.com/2076-3417/15/17/9605
- FSRS vs SM-2: https://help.remnote.com/en/articles/9124137-the-fsrs-spaced-repetition-algorithm
- SDT meta-analysis: https://selfdeterminationtheory.org/wp-content/uploads/2024/06/2024_WangWangEtAl_MetaEdu.pdf
- Stealth assessment / Evidence Centered Design: https://link.springer.com/article/10.1007/s11423-023-10232-1
- Child ASR WER by age: https://arxiv.org/abs/2606.05440
- SoapBox Labs independent evaluation, 429 kindergartners: https://www.frontiersin.org/articles/10.3389/feduc.2026.1671946/full
- SERDA, authors advise against high-stakes use: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12686063/
- Children shaking devices during latency: https://arxiv.org/abs/2604.02629
- Khanmigo 15% usage: https://blog.khanacademy.org/how-khan-academy-is-building-a-better-ai-tutor-our-most-recent-learnings/
- COPPA amended rule: https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule
- FTC 6(b) inquiry: https://www.ftc.gov/news-events/news/press-releases/2025/09/ftc-launches-inquiry-ai-chatbots-acting-companions
- Anthropic pricing and absence of an audio content type: https://platform.claude.com/docs
- YC RFS: https://www.ycombinator.com/rfs

Known gaps: no RCT anywhere tests LLM tutoring on ages 3-9; no commercial ASR vendor publishes child-specific WER; no shipped consumer product's stealth assessment has been publicly verified; Amira's cited 0.40 effect size is available only via its own marketing summary.

---

## Plain-English TLDR

**What gets nuked**
- All the Astra Rising game content: rulebooks, combat, dice, weapons, character sheets.
- The entire existing screen layer. The children's version looks nothing like the current one.
- The current AI provider, which is not the one the project notes claim it is.
- The first draft's claim that this codebase already keeps the AI's storytelling and the game's scorekeeping properly separated. It does not. That separation has to be built from scratch, and it has to live on the server, not in the browser.

**What gets built**
- A space story a child plays every day for years, where the only way the story moves forward is by reading a word, spelling a word, or working out a number.
- A separate scorekeeper, written as ordinary code rather than AI, that decides which word or sum to give next and quietly tracks what the child can and cannot do yet. The AI writes the story around whatever it is handed. It never picks the word, never sets the sum, and never gets an opinion about how the child is doing.
- A hand-checked list of a few thousand words, each tagged with the letter patterns needed to read it, so the child is only ever asked to read words built from patterns they have already been taught. This is the hard, unglamorous part, it needs a specialist, and it is what nobody else does.
- A proper "what happens when they get it wrong" ladder: a nudge, then a hint, then sounding it out together, then showing them, and finally letting the story move on another way so a child is never stuck. This is the actual teaching, and it is designed before anything else.
- Spelling with letter tiles, which teaches writing and needs no handwriting recognition.
- A parents' view showing real progress in plain terms, measured against the same yardsticks schools use.
- A reason to come back tomorrow that is not a streak counter: every session stops on a cliffhanger, and the world quietly changes overnight while the child is away.
- A fair head-to-head test against the best existing thing. The same children read the made-up adaptive stories and the fixed, professionally written practice stories from an established reading programme, and we measure which one actually teaches them more. That comparison is the whole point of the project, and losing it cleanly would still be a useful answer.

**What gets preserved**
- The engine room: how a turn works, how progress is saved, how a long history gets squeezed into a short memory, how a half-finished AI reply gets rescued, and the trick of feeding the AI only the small slice of reference material it needs for this exact moment.
- The sci-fi world and the name.

**What's deferred**
- Talking aloud as a way of checking the child's reading. Speech recognition still gets roughly a third of what young children say wrong, and wrongly telling a six-year-old they misread a word is the one mistake that would sink the product. The narrator still talks to them from day one.
- Ages three and four, and ages eight and nine. Version one aims at five to seven, and testing centres on six-year-olds. The younger and older ends are genuinely different products, not easier and harder settings.
- Worrying about running costs. This is a research project first, so it uses the best available AI on every turn and counts the pennies later. A cheap model that writes dull stories would muddy the one result the project is trying to get.
- Anything sold to schools. Parents buy it first; several US school bodies spent 2026 trying to ban AI tutors for young children.
- The full legal apparatus for handling children's data. Testing with a handful of children needs written parental consent, no recordings kept, and deletion on request. The heavy machinery only arrives if money ever changes hands.
