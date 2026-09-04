# Astra Primer: plain-English dossier

A research project into whether an AI can teach a six-year-old to read as well as the best existing methods do. Written for someone who has not read the technical plan. No jargon.

Date: 24 July 2026. The detailed technical version lives alongside this document.

---

## A. What the idea is

In Neal Stephenson's novel *The Diamond Age*, a girl is given a book that teaches her to read by telling her stories shaped around her own life, and keeps growing with her for years. That is the thing we are aiming at.

The concrete version: a space adventure a child plays for about fifteen minutes a day. The story only moves forward when the child reads a word or works out a number. A door opens because they read the word written on it. The ship jumps because they counted out the right number of fuel cells. There is no quiz and nothing that looks like a lesson. The child is just playing, and the playing is the practice.

Two things make it different from a story app or a chatbot:

**The computer, not the AI, decides what to teach.** Ordinary programmed code picks the exact word or sum the child gets next, based on what they have and have not mastered. The AI's only job is to write a good story around whatever it is handed. It never chooses the word, never sets the sum, and is never asked its opinion on how the child is doing. This matters because AI is good at writing and unreliable at judging.

**The child is never shown a word they have not been taught to read.** Children learn to read by being taught letter patterns in a deliberate order. Show them a word that needs a pattern they have not met yet and they guess, which is the exact habit good reading teaching exists to prevent. So every word the child is asked to read is checked against a hand-built list of what they have been taught so far. Nobody else does this, because the usual choice is either a fixed book that cannot adapt or a free-writing AI that breaks the order.

We are starting from an existing project in this repository: an AI that runs a science-fiction tabletop game. It already has the useful shape, an AI writing stories on top of ordinary code that keeps score. Roughly fifteen percent of it carries over. The rest is new.

---

## B. What we are trying to determine

One question, which as far as the research shows nobody has answered:

> **Does a story that adapts to the child teach reading better than a fixed, professionally written practice book at the same level?**

That is worth answering because both halves are currently assumptions. Everyone selling AI tutors assumes adaptation helps. Nobody has tested it on children this young. Every study we found with real numbers used teenagers or adults.

Three smaller questions sit underneath it:

1. Can a six-year-old actually operate this on their own, and want to come back tomorrow?
2. Can an AI write a story that is genuinely good while being restricted to a small set of allowed words? At the earliest stages that is only a few dozen words, which may not be enough English to write anything worth reading.
3. When a child gets stuck, does the help feel like help, or does it feel like failing?

Question 1 gets answered in a few weeks and can kill the project. Question 2 is the hardest engineering problem. Question 3 is where all the real teaching happens.

---

## C. How it works

Four moving parts.

**The scorekeeper.** Ordinary code, no AI. It holds a running estimate of how likely the child is to know each individual skill, updates that estimate every time they try something, and assumes knowledge fades unless refreshed. It decides what comes next and when to revisit something. This is well-understood, decades-old technique, not a research risk.

**The word list.** A few thousand words, each tagged by hand with the letter patterns needed to read it and the point in the teaching sequence at which it becomes fair game. Built by a literacy specialist, starting from the published word lists of an established reading programme. Checking whether a word is allowed is then a simple lookup rather than a guess.

**The storyteller.** The AI. It receives the exact word or sum to feature, plus the world so far, and writes the next beat of the story. Before that story reaches the child, the system automatically checks that the AI has not given the answer away and has not slipped in a word the child cannot read. If it has, the turn is thrown away and rewritten.

**The help ladder.** What happens when the child gets it wrong, which is the part that actually teaches. First a nudge. Then the companion character points at the tricky letter. Then it sounds the word out and the child finishes it. Then it reads the word and the child copies. After that the system quietly gives up on that word, schedules it for another day, and opens the door a different way. The child is never stuck and is never told they failed.

Two separate voices in the story matter. The narrator, read aloud by the computer, can use any words at all, because children understand far more than they can read. Only the words the child must read themselves are restricted.

Progress is shown to the child as the world getting bigger: more map, a better ship, a new companion. It is shown to the parent as a plain report of what their child can now do. There are deliberately no points, badges or streaks. The evidence says rewards bolted onto learning crowd out the child's own interest, and the story itself should be the reason to return. Each session stops on a cliffhanger, and the world changes overnight while they are away.

---

## D. What it tests, and how

**The main test.** The same children, over several weeks, get both kinds of practice: our adaptive generated stories, and the fixed practice passages from the established reading programme, at the same point in the teaching sequence. We measure how accurately they read words they have never seen before but could work out, and how fluently they read. Using the published programme as the comparison is what makes the result mean anything: it is a real, respected standard, not a straw man. Because each child does both, the group can stay small.

**Who.** Three six-year-olds as the core group, plus one five-year-old. Six is the age where children are in the middle of learning to decode, which is where there is the most room for a difference to show up. By seven many read well enough that nothing we do would move the needle. At four they cannot work the thing at all, so a bad result would tell us nothing. The five-year-old is there to answer a different question: can the youngest plausible user manage it alone?

**What we measure.** Reading accuracy and reading speed against the same published benchmarks schools use, so the numbers are meaningful to outsiders. Separately, and never mixed together: how much they played, and how much they learned. Confusing those two is exactly how the current crop of AI tutors ended up with impressive usage numbers and no evidence.

**What would count as a real answer.** Either the adaptive stories beat the fixed passages, which is a genuinely new finding, or they do not, which is also a genuinely new finding and saves a lot of people a lot of money. A clean loss is a result, not a failure.

**What we will not claim.** There is a famous figure in education that one-to-one tutoring makes students perform two standard deviations better. It has never been reproduced, and honest estimates of even excellent human tutoring are about a fifth of that, shrinking further at scale. Overstating results in a children's product is both dishonest and, given current regulatory attention on AI and children, genuinely risky.

**The rules for testing with children.** Written consent from each parent explaining exactly what is collected and why. No recordings kept. Nothing used to train any AI. Everything deleted on request and at the end. An adult present throughout. That is the whole obligation at this scale. The heavier legal machinery only applies if this ever becomes something families pay for.

---

## E. The plan, in big pieces

Roughly in order, though the first two run side by side.

**1. Clear the decks and build the safety checks.** Strip out the existing space-game content. Point it at a better AI. Build the automatic checks that stop the AI giving answers away or using forbidden words, and put them on the server where they cannot be bypassed. The existing project does not have these, contrary to what its own notes suggest.

**2. Build the word list.** Runs in parallel from day one, with the specialist. Months of careful work, and two later stages depend on it, so it starts now and never sits on the critical path waiting.

**3. A rough, ugly, playable version.** Just enough content for a real session, a crude touchscreen interface, and hand-picked words rather than anything clever. The point is to get it in front of real children as early as possible.

**4. Put it in front of children.** The moment of truth. Can they use it? Do they come back? Does the help feel like help? If this fails, everything after it is irrelevant, which is exactly why it comes before the hard engineering rather than after.

**5. Build the scorekeeper.** Only once we know children will actually use the thing. This is what turns a fixed sequence into something that genuinely adapts.

**6. Run the comparison study.** The reason the project exists. Needs the finished word list.

**7. Add spelling.** The child builds words with letter tiles as the narrator says them. This is the writing half of "reading, writing and arithmetic", it needs no handwriting recognition, and it makes the reading stronger because spelling and reading reinforce each other.

**Deliberately left out for now:** listening to the child read aloud, because speech recognition still gets roughly a third of what young children say wrong, and telling a six-year-old they misread a word when they did not is the one mistake that would sink the whole thing. Also left out: younger and older children, selling to schools, and worrying about running costs.

---

## F. The next three things

**1. Recruit the children and write the consent form.** Three six-year-olds and one five-year-old, with parents who will commit to a few weeks. This is the longest-lead item that does not depend on any code existing, so it starts today. The consent form is one page: what is collected, why, that nothing is recorded, that everything is deleted on request.

**2. Brief the specialist and get the first slice of the word list.** Not the whole thing. The first three stages of the teaching sequence, a few hundred words, each tagged with the letter patterns it needs. That is enough to run a real session, it proves the format works before committing months to it, and it tells us what the full job actually costs.

**3. Strip the existing project back to its skeleton and get one hand-made turn working end to end.** Delete the space-game rules, point it at a better AI, and make a single scene work: the system hands over a chosen word, the AI writes a story beat around it, the checks confirm the answer was not given away, a child taps the right thing, and the story continues. One turn, hardcoded, no adaptation, no cleverness. Everything else is built on that loop working.

Those three run in parallel and are all independent of each other. None of them requires a decision that has not already been made.
