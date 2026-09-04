# Astra Primer

A research project testing whether an adaptive, story-based reading practice tool teaches decoding better than fixed decodable passages. This document covers the idea, the pedagogical commitments, and judgement/expertise calls needed to proceed well. It deliberately contains no software detail.

The tool is called Astra. It is intended to cover reading, writing and arithmetic, though this document concentrates almost entirely on reading, which is where the research question sits. "Adaptive" here means that the order of material, the difficulty, and the amount of help all change for each child according to what they have and have not mastered, rather than every child working through the same fixed passages in the same order. ("Primer" is a nod to Neal Stephenson's novel *The Diamond Age*, in which a girl is given a book that teaches her through stories shaped around her own life. That is the long-term ambition, not a claim about what the first version does.)

---

## 1. What we are building

A science-fiction story a child plays for about fifteen minutes a day. The story only advances when the child does something: reads a word, blends a word, builds a word from letter tiles, or works out a small number problem.

There is no quiz, no lesson screen, and nothing that announces itself as instruction. A door opens because the child read the word written on it. The ship jumps because they counted out the right number of fuel cells. The practice is the play.

Two design commitments shape everything:

**The child is never asked to read a word they have not been taught to decode.** Every word the child reads is checked against the set of grapheme-phoneme correspondences and irregular words they have already been taught. This is the whole point, and it is what fixed decodable readers get right and adaptive digital reading products almost universally get wrong.

**Nothing decides what the child knows except their own performance.** The system tracks per-skill mastery from observed attempts, not from any judgment made about the child in the moment.

---

## 2. Pedagogical commitments

- **Systematic, explicit phonics, in a published order.** The scope and sequence we build on is UFLI Foundations: ~110 lessons, published sequence, free toolbox with decodable passages, word lists and heart-word lists (irregular high-frequency words). We chose it partly because its own decodable passages give us a fair comparison condition. This choice is open to objection (see section 5).

- **Two kinds of text, with different rules.** The narrator reads aloud in unrestricted language, because listening vocabulary should outrun decoding ability by a long way. Only the text the child reads for themselves is restricted to their taught grapheme-phoneme correspondences plus their heart words.

- **No answer-giving, ever.** The narrator cannot tell the child the word, and the system checks every passage before it reaches the child to confirm it has not. The evidence on this is unusually clear: the only reproducible positive results for AI tutoring come from hint-only designs, and unguarded answer-giving produced worse retention than no help at all once the help was removed.

- **A designed scaffolding sequence rather than "try again".** Our current draft is: nudge, then isolate the tricky grapheme, then segment aloud for the child to blend, then model the whole word for the child to echo, then abandon the item, reschedule it, and let the story continue another way. A child is never stuck on a word and is never told they failed. This path is a guess, requires expert review and correction.

- **Distributed practice with deliberate review.** Items resurface on a spacing schedule rather than being drilled to criterion and dropped.

- **No points, badges, streaks or leaderboards.** The evidence on rewards crowding out intrinsic motivation for this age group is good enough that we would rather solve return-visit motivation through the story itself: sessions end on a cliffhanger, and the world changes between visits.

- **Encoding as well as decoding.** The child builds words from letter tiles to narrator dictation. This covers the writing side of the project, and reciprocal reading and spelling practice is better than either alone.

- **We will not listen to the child read aloud.** Speech recognition on this age group still gets roughly a third of words wrong, and the best-validated reading-assessment systems in the research literature explicitly advise against high-stakes use. Wrongly telling a six-year-old they misread a word is the failure mode we are least willing to risk. Any read-aloud assessment stays human.

---

## 3. What we are trying to find out

The primary question:

> **Does an adaptive, AI-written decodable story teach decoding better than fixed, professionally authored decodable passages at the same point in the sequence?**

Nobody appears to have answered this for children this young. Every study we found with real effect sizes for AI tutoring used secondary-school students or adults.

The comparison is deliberately hard on us: the control condition is UFLI's own decodable passages, not a straw man. A clean loss would be a genuinely useful result and we would publish it.

**Cohort.** Three six-year-olds as the core group, plus one five-year-old. Our reasoning: six is mid-acquisition, so there is room for an effect to show. By seven, many children read fluently enough that the intervention has little to move. At four or five the interaction may fail on its own terms, so the five-year-old is there to test whether the youngest plausible child can physically work the thing, rather than to contribute to the outcome measure. **We need expert critique here, including whether the age is wrong.**

**Outcome measures.** Decoding accuracy on words the child has not been taught but could sound out from patterns they already know, including nonwords, plus oral reading fluency benchmarked against Hasbrouck-Tindal norms so the numbers are legible to people outside the project. Engagement is tracked entirely separately and never conflated with learning.

**Design.** Within-child crossover: every child gets both kinds of practice, so each child acts as their own comparison. That is what keeps the group small enough to actually run.

**What we will not claim.** Bloom's two-sigma figure has never replicated; honest estimates for excellent human tutoring sit near 0.3 to 0.4 standard deviations and degrade at scale. We will not overstate, both on principle and because children's education products making unverified efficacy claims are currently attracting regulatory attention.

---

## 4. What we need (a guess, needs expert critique)

**D1. The annotated word list.** Everything else waits on this. Roughly 3,000 to 5,000 words, each tagged with its grapheme-phoneme decomposition and the lesson at which it becomes decodable for the child, with heart words held as a separate list. Seeded from UFLI's published word and heart-word lists and extended from there. Start with 300 to 500 words, enough to test and revise the first stages of Astra before committing to the full corpus.

**D2. The scaffolding sequence.** The exact hint sequence, per skill type, for what happens on the second, third and fourth attempt. Distinct sequences for blending, segmenting, grapheme discrimination and heart-word recall. Plus expert guidance on when to abandon an item, and what the child should experience at that moment.

**D3. The assessment protocol.** How to measure decoding accuracy and fluency on a six-year-old repeatedly over several weeks without wearing them out or teaching to the test. Which instruments, how often, administered by whom, and what a meaningful difference would look like.

**D4. A passage review rubric, and ongoing quality assurance.** We will generate a large volume of decodable passages. We need a rubric for judging them on three axes at least: strict decodability at level, natural language rather than stilted word-list prose, and whether a six-year-old would want to read it. Then a sampling review as we go. This is where the project most likely fails if not considered well or if too difficult to map.

**D5. The early number strand.** Subitizing, the counting principles, place value and fact fluency, laid out as roughly 200 individual skills with their prerequisites mapped. Lower priority.

---

## 5. Where we need expert judgement

1. **Is UFLI the right scope and sequence to build on?** We picked it for its published sequence, free toolbox and ready-made comparison passages. If we should use a different programme, we will.

2. **Is there enough decodable vocabulary at the earliest stages to write anything worth reading?** At stage one the child's decodable set is a few dozen words. We suspect this is the single hardest constraint in the project, and we're not sure if it's survivable.

3. **Is age six right?** Including whether the five-year-old is worth including at all.

4. **How many heart words, introduced when?** And how should the story handle a heart word the child has met but not secured?

5. **Does "abandon the item after four attempts" match practice,** or is that too many or too few?

6. **What is the honest size of the D1 word-list job in your hours?** We would rather scope it accurately and phase it than discover halfway that it is twice the work.

---

## 6. Ethics and data

Testing involves a handful of children recruited directly, with an adult present throughout.

- Written informed consent from each parent, stating exactly what is collected and why.
- No audio or video recordings retained.
- No child's data used to train any AI system.
- All data deleted on request and at the end of the study.

If the work goes to publication, formal ethics review comes with it, and we would want expert guidance on where to submit.
