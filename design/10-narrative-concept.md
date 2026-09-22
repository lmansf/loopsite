# 10 — Narrative concept for the replacement site

**Doc:** `design/10-narrative-concept.md` · **Author:** concept lead · **Date:** 2026-09-22
**Supersedes:** `design/02-concept-brief.md` and §A–§D, §I of `design/05-build-spec.md`.
**Does not touch:** `design/01-attention-research.md` (the rubric stands), `design/04` (the
visual/motion system stands, minus its webfont), `design/05` §F (the architecture contract
stands verbatim), `design/06` (the scaffold rulings stand).

The verdict on the shipped site was "the ring is boring." The ring was not the problem;
**the ring had nothing to say.** It scored 96/100 because its machinery is excellent. This
document keeps the machinery and puts a story in it.

---

## 0. The one thing this document is arguing

A narrative site bounces for one reason: **it asks you to read before it lets you do
anything.** Every concept below is scored first on how it solves that. The winner solves it
by making the sentence itself the control surface: *the words in the story are the buttons.*
Pressing a word is reading and interacting at the same instant, it works with zero JavaScript,
it works on touch and on keyboard, and it is diegetic — you are not clicking a UI, you are
asking about something.

---

## 1. Nine concepts

### C1 — THE SAME FOUR SECONDS *(twelve non-human witnesses to one blackout)*
**Hook.** The lights went out over one valley for four seconds, and twelve things that were
awake for it each tell you a different four seconds.
**First screen.** `the lights went out for four seconds.` / `twelve things were awake.` Under
it, the dog's first four lines, with two words already underlined and one of them already
open, showing its aside.
**Recurrence.** Accounts change as you learn. Each account *emits keys* (a short token) and
*declares locks* (blocks that only exist once you hold a key from elsewhere). A witness you
have read lights up as **changed** the moment another witness gives you something that bears
on it. The night is re-read, not replayed.
**Collected.** Twelve accounts (visited), forty pressable words (asked), five **contradictions**
— pairs of accounts that cannot both be true.
**Beat 2 / beat 20.** Beat 2 because beat 1 withholds one concrete thing ("there is only
supposed to be one" click). Beat 20 because by then three witnesses disagree in a way that has
exactly one explanation and you are two accounts from it.
**Non-bounce.** ~91%. Instant premise, instant touch, a visible finite set, and the second
beat is visible on the same screen as the first.
**Complexity.** Medium. ~5000 words of copy, one new codec, no new runtime primitives.
**Risk.** Writing quality is load-bearing. A flat sentence is a bounce.

### C2 — THE INDEX *(a card catalogue for a town that is not there)*
**Hook.** An index survives; the book does not. You read a town by following cross-references.
**First screen.** One card: `BRIDGE, the — see also: WATER RIGHTS; the SECOND BRIDGE; FIRE, 1974`.
**Recurrence.** Cross-references form a cycle; every path returns you to a card you have read,
now carrying an annotation in a second hand. **Collected:** cards, with every unfollowed
`see also` as a visible hole. **Beat 2** is a link with enormous scent; **beat 20** because the
annotator is a second character. **Non-bounce ~87%**, low-medium build. **Risk:** brilliant
structure, cold opening — "what is this?" takes two reads, and it reads as a puzzle, not a story.

### C3 — THE NIGHT DESK *(a switchboard you work, one shift at a time)*
**Hook.** You are the night operator; eight calls come in; the shift repeats until you route
them right. **First screen:** one line of an incoming call and the two buttons that are its two
routings. **Recurrence:** a literal shift loop with carried knowledge. **Collected:** call signs,
and the one caller who never gets through. **Non-bounce ~88%**, high build (branch state
multiplies). **Risk:** the "you are an employee" frame is work-shaped, and failure states are a
bounce generator.

### C4 — LETTERS TO THE RELAY *(a one-sided correspondence you complete)*
**Hook.** Nine letters to a station that never writes back, and one that does. **First screen:**
a dated letter, four lines, with a blank where a name was cut out. **Recurrence:** each letter
re-reads the one before it and contradicts it slightly. **Collected:** the cut-out words.
**Non-bounce ~84%**, low build. **Risk:** a wall of text at second three, thin agency, and a
period-letter voice is a cultural prerequisite.

### C5 — IT REMEMBERS THIS ROOM *(one room, twelve visits, decades apart)*
**Hook.** The same room, twelve times, and only the objects change. **First screen:** a short
inventory of a room, one object underlined. **Recurrence:** the room is the loop; objects recur
transformed. **Collected:** the four objects that survive all twelve visits. **Non-bounce ~86%**,
low build. **Risk:** elegant and melancholy, but nothing is at stake in the first thirty seconds.

### C6 — THE THING THAT KEEPS THE TIME *(a machine narrates its own cycle)*
**Hook.** A machine has been running the same four seconds for a long time and is explaining why
it cannot stop. **First screen:** `this is the four hundred and eleventh time i have started
this sentence.` **Recurrence:** perfect — the narrator *is* the loop, and the existing 4000 ms
clock is its voice. **Collected:** the lines it has never said before. **Non-bounce ~85%**, low
build. **Risk:** one-note and cold; beat 20 is beat 2 with a different number.

### C7 — TWELVE TELLINGS *(one myth, twelve variants, truth in the intersection)*
**Hook.** The same story told twelve ways; the parts that never change are the true parts.
**First screen:** variant one, four lines, with the three words that survive every telling set in
a second weight. **Recurrence:** structural — variation is the engine. **Collected:** the seven
invariants. **Non-bounce ~86%**, medium-high build (the site must actually compute and show the
intersection). **Risk:** "myth" carries the cultural prerequisite the brief forbids.

### C8 — THE LAST BUS *(a fixed cast of eight, an investigation you restart)*
**Hook.** Eight people were on the last bus; one got off somewhere that has no stop.
**First screen:** a passenger list with one entry blank. **Recurrence:** re-interview with what
you learned; the same question gets a different answer. **Collected:** answers that changed.
**Non-bounce ~89%**, medium build. **Risk:** the strongest pure mystery, but it needs named
invented people — straight at the "no invented people presented as real" rule and at universality.

### C9 — OUT OF ORDER *(scrambled beats you reassemble)*
**Hook.** Fourteen scenes, no order; you decide what happened first. **First screen:** one scene
and two slots labelled `before` and `after`. **Recurrence:** re-ordering re-reads. **Collected:**
fixed points — scenes whose position you can prove. **Non-bounce ~80%**, high build.
**Risk:** it is a sorting task, and a reader who builds an incoherent version blames us.

---

## 2. Scoring

Each 1–5. Rubric fit is weighted ×2 because it is the mandate.

| | C1 four seconds | C2 index | C3 night desk | C4 letters | C5 room | C6 machine | C7 tellings | C8 last bus | C9 out of order |
|---|---|---|---|---|---|---|---|---|---|
| Instant comprehension | **5** | 3 | 4 | 3 | 4 | 3 | 3 | 4 | 3 |
| Instant agency (pre-hydration) | **5** | 4 | 5 | 2 | 3 | 2 | 3 | 3 | 4 |
| Depth (8–14 + hidden) | **5** | 5 | 3 | 3 | 4 | 2 | 4 | 4 | 4 |
| Recurrence / replay | **5** | 4 | 4 | 3 | 4 | **5** | 4 | 4 | 3 |
| Mobile readability | **5** | 4 | 4 | 3 | 5 | 4 | 4 | 4 | 2 |
| Zero-dependency feasibility | 4 | **5** | 2 | **5** | **5** | **5** | 3 | 4 | 2 |
| Shareability | **5** | 3 | 3 | 3 | 3 | 3 | 4 | 4 | 3 |
| Universality | **5** | 4 | 4 | 2 | 4 | 4 | 2 | 3 | 4 |
| Rubric fit (×2) | **10** | 7 | 8 | 5 | 7 | 6 | 7 | 8 | 6 |
| **Total (/50)** | **49** | 39 | 37 | 29 | 39 | 34 | 34 | 38 | 31 |

---

## 3. The pick

**C1 — THE SAME FOUR SECONDS**, with one mechanic imported from **C2 (the index)**: every
pressable word is a cross-reference, and the collection surface lists the words you have not
pressed yet as visible blanks. That import is what turns "a nice story" into "a set with holes
in it," which is the rubric's D3.

**Against the runner-up (C2, the index, 39).** The index has the better structure and the worse
first ten seconds. Its opening card is a curiosity gap with no anchor — a reader who does not
already care about a town will not follow a `see also`. C1 opens with a fact anyone understands
in one read (the lights went out) and a promise that is visibly, immediately payable (twelve
things, one already telling you). C1 also wins the item the rubric punishes hardest: C2 has no
concrete instance in the first viewport, only a reference to one.

**Against C8 (the last bus, 38).** Same mystery engine, worse constraints: it needs named
people. Non-human witnesses give us cultural neutrality for free, keep us clear of the
"invented people presented as real" prohibition, and — the real reason — they let each account
have a genuinely different *perception*, not just a different opinion. A moth counting six
seconds is not lying; a passenger who says six seconds is.

---

## 4. Creative brief — THE SAME FOUR SECONDS

### 4.1 Title, premise, tone

**Product name stays `Loop`.** Meta title: `Loop — the lights went out for four seconds.`
Description: `twelve things were awake. ask any of them.`

**Premise.** At 11:04 on a Tuesday, power failed across one valley for four seconds. Twelve
things were awake for it. Each tells the four seconds it had. None of them agree, and none of
them are lying. The reader assembles what happened by carrying what one witness said into
another witness's account, which then says something it did not say before.

**Tone.** Plain, close, unhurried: small domestic detail against one unexplained event. The
register of a short story read aloud, not of a puzzle box. Nothing is spooky; several things are
funny. The answer, when it arrives, is human and sad and small.

**Narrator.** One omniscient voice that speaks *about* each witness in the third person and never
inhabits it — "the dog was awake because the dog is always awake at 11:04" — and addresses the
reader as *you* only when something changed because of them, the old site's law kept verbatim.

### 4.2 The recurrence engine, mechanically

**Keys and locks.**

- Every account is authored as an ordered list of **blocks**. A block is 25–55 words.
- A block is either **open** (always present) or **locked** behind exactly one **key**.
- Keys are emitted by **asides** — the text revealed when the reader presses a word.
- `src/lib/knowledge.ts` (new, WP-owned, written once) holds `KEYS: Record<KeyId, {emittedBy, unlocks}>`
  and a `Set<KeyId>` of held keys, persisted in `loop:v2.keys`.
- When a key is added, every account is re-evaluated. Any account that gains a block it did not
  have becomes **changed** — its nav slot gets a second marker (a filled bar plus the word
  `changed` in the accessibility tree; never colour alone).

**What the reader sees.** They press `the second click` in the dog. Two things happen in the
same frame: an aside opens in place under the line, and one slot in the bottom nav — `switch`,
a room they have not visited — grows its changed marker. That is the whole engine, visible in
under ten seconds, on the first screen, without a word of explanation.

**Why it is recurrence and not gating.** Locked blocks are inserted *between* existing blocks,
never appended. An account you have read is not extended, it is **interleaved**: re-reading the
dog after the switch gives the same four lines with a fifth between two and three, and the fifth
changes what three and four meant. Locked blocks carry a hairline left rule so the reader can see
which sentences are new.

**The pass.** Reading all twelve is a pass; the count is stored, capped at 3. Each pass replaces
the landing account's opening block (three authored openings for the dog) and recomposes
`four seconds`. Nothing else is pass-gated — passes garnish the key engine, they are not a second
system.

### 4.3 The destinations

Twelve, all `?s=<slug>`, all reachable in any order from the persistent nav, all reversible.
Each pushes to the next by withholding one concrete thing that the next one has.

| # | slug | who is awake | purpose | reveals | withholds | pushes to |
|---|---|---|---|---|---|---|
| 1 | `dog` | a dog beside a heater | teach the mechanic; establish the hour | two clicks, not one | what the second click was for | `lamp` |
| 2 | `lamp` | a streetlight on the bridge road | the outage was not clean | it dimmed first, then went out, half a second apart | what dimmed it | `kettle` |
| 3 | `kettle` | a kettle mid-boil | domestic warmth; the first timing problem | power returned before the light did | why | `moth` |
| 4 | `moth` | a moth on window glass | perception is a witness, not a clock | it counts the dark as six seconds | whether it is wrong | `river` |
| 5 | `river` | the water under the bridge | the first hard contradiction | the bridge was dark all night; no lamp on it | where the reflection came from | `bus` |
| 6 | `bus` | the last bus, empty, crossing | contradicts `river` flatly | there *was* a light on the bridge, moving | whose | `radio` |
| 7 | `radio` | a radio left on in an empty room | the event had a sound | four seconds of tone, then one word | the word | `clock` |
| 8 | `clock` | the station clock | the loop, stated | it stopped at 11:04 and started at 11:04 | four unaccounted seconds | `window` |
| 9 | `window` | a window facing the valley | misdirection, honestly signposted | the hill was empty | what it was facing (not the hill) | `switch` |
| 10 | `switch` | the substation switch | the machine voice; the mechanical truth | one switch, one press, no fault | the hand | `road` |
| 11 | `road` | the road up the hill | the answer, nearly | footsteps going up; none coming down | whose, and how they got back | `four seconds` |
| 12 | `four seconds` | nothing; the event itself | the ending, composed from the reader's own keys | exactly what they hold, and nothing more | the rest, named as missing | `dog` |

`four seconds` is the only destination whose text is assembled at runtime. It prints one line per
key held, in story order, then one line per key *not* held rendered as a blank rule of the same
length with a `see also` label — the index mechanic, at the end, as the strongest possible
open loop. At 5/5 contradictions it prints one more line, the resolution, and it is a real one.

### 4.4 Hidden content — exact triggers

Five **contradictions**, counted `n/5` in the nav hub in Ember, exactly as the old hidden set was.
A contradiction fires the frame the reader holds both keys — not on a visit, not on a timer.

| id | name | trigger (both keys held) | effect |
|---|---|---|---|
| `clicks` | two hands | `dog:two-clicks` + `switch:one-press` | both accounts gain a line; nav hub ticks |
| `bridge` | the bridge | `river:bridge-dark` + `bus:light-on-bridge` | a third block appears in `lamp` |
| `count` | six seconds | `moth:six` + `clock:four` | `clock` gains its stopped-minute block |
| `hill` | the empty hill | `window:hill-empty` + `road:footsteps` | `road` gains the last block before the answer |
| `both` | both ways | hold `belief=valley` in storage **and** arrive with `belief=hill` in the URL (or the reverse) | the only cross-visit collectible; `four seconds` gains its final line |

Three further easter eggs, none gating anything. **Third press:** eight authored words say
something different on their third press — no announcement, no odds, no scarcity; this is the
variable-reward item (D5). **Skipping to the end:** `?s=four-seconds` with zero keys renders one
line, `you weren't here.`, and a full-salience link to `dog` — no gate, no error, no scold.
**The silent pass:** twelve accounts visited with zero words pressed prints
`you didn't ask anything.` and nothing else — a real, earned, deliberately thin ending.

### 4.5 What is collected, and how it is shown

Three sets, one surface. The surface is the persistent nav — the **Ringway's replacement**,
called **the night**: on phones a bottom-anchored two-row grid of twelve slots with a hub
between the rows; on desktop a right-hand vertical column.

- **Twelve accounts.** Unvisited = hollow slot with the one-word label. Visited = filled +
  inner rule + `— read` in the accessibility tree. **Changed** = filled + a second short bar +
  `— it says more now`. Never colour alone, on all three states.
- **Forty words.** Never shown as a number; shown *in the text*. Unpressed = dotted rule;
  pressed = solid rule, permanently. Progress is the page getting visibly more solid. In
  `four seconds` the unpressed ones appear as blank rules of their exact character width:
  visible empty slots, inside the fiction.
- **Five contradictions.** `n/5` in Ember in the nav hub once `n ≥ 1`. Identical to the old hub.

**Endowed progress on arrival.** The reader lands inside `dog`, so one of twelve is already
filled before they have done anything — genuinely, not cosmetically. And the first pressable
word on the first screen is **rendered already open**, so the set starts at 1 word too, and the
mechanic is taught with zero instructional copy.

### 4.6 Branching and the URL

Two branch axes, both real, both reversible.

1. **Order.** Which accounts you read, in which order, determines which keys you hold when you
   read the next one, and therefore which text exists. This is a twelve-way reversible branch,
   offered without forcing a choice — the same construction that earned E4 before.
2. **One authored choice, at the end of the first pass.** In `four seconds`, two options,
   labelled by outcome, not mechanism: `it came from the valley` / `it came from the hill`.
   Choosing flips a two-bit field. It changes the frame block of four accounts (`lamp`, `window`,
   `switch`, `road`) on the next pass and changes the last line of `four seconds`. It is
   reversible in one tap — the other option stays on screen, and switching re-renders in place.

**Encoding.** `/?s=<slug>#n=<base64url>`, decoded before first paint of the room layer, rejected
silently on any failure (bad version, bad checksum, wrong length) exactly as the loop codec was.

| offset | bytes | meaning |
|---|---|---|
| 0 | 1 | bits 0–3 version `0b0001`; bits 4–5 belief (0 none, 1 valley, 2 hill); bits 6–7 pass, capped 3 |
| 1 | 1 | XOR checksum of bytes 2..n, seeded `0x5A` |
| 2–3 | 2 | visited bitfield, 12 bits used |
| 4 | 1 | contradictions, 5 bits used |
| 5–9 | 5 | pressed-word bitfield, 40 bits |

Ten bytes → **14 base64url characters**, so a full share URL is
`https://<host>/?s=road#n=` + 14 = under 45 characters. Share copy: `send the night as you have it`.
Arriving on someone else's link puts you in their account, with their knowledge, and the caption
says `someone read it this way`. That is the single most shareable thing the site can do: the
link is a *state of understanding*, not a bookmark.

**localStorage** is `loop:v2`, same shape as `LoopState` with `visited`, `visits`, `collected`
(the five contradictions), and three new fields: `keys: string[]`, `belief: 0|1|2`, `pass: number`.
Same wrapper, same try/catch, same silent failure. No accounts, ever.

### 4.7 The visitor's journey

**0–3 s.** Server-rendered text paints in frame one: the two-line `<h1>` at 35% opacity settling
to 100% at 300 ms (the LCP element, per `06` §G), the dog's first block under it, one aside
already open, two dotted-underlined words, the twelve-slot nav with `dog` filled, and the fixed
bottom control reading `ask the streetlight`. No spinner, nothing above the fold needing
JavaScript. The dotted words are `<summary>` elements inside inline `<details>`: **pressable
before a byte of React has run.**

**3–10 s.** The reader presses `the second click`. The aside opens under the line in under 30 ms
(it is CSS, not a framework), and `switch` — a slot they have never visited — grows its changed
marker. They have now learned the entire site in one gesture: press words, other places change.

**10–30 s.** They finish the dog's four blocks by tapping the bottom control, which names the
next beat rather than saying `next`. At the end of the account the bottom control becomes
`ask the streetlight` at full salience — a destination card, not a link. The nav reads 1 of 12
with eleven visible holes.

**30 s – 2 min.** Two or three more accounts. Somewhere in here `river` and `bus` flatly
contradict each other and the hub ticks to `1/5` in Ember. This is the moment the site stops
being a nice piece of writing and becomes a thing with a solution.

**2–5 min.** Five to eight accounts. At least two read slots are marked changed, and returning
to one is now the most attractive action on the page — Zeigarnik working on text the reader has
already invested in. A first session ends here, unfinished, which is the point.

**A returning visit.** Storage restores keys, contradictions and belief. The landing account's
opening line is its pass-2 version, and the changed markers are waiting. The one collectible
that cannot be earned in a single visit (`both`) is the honest reason to come back.

### 4.8 Motion, procedural visuals, reduced motion

The canvas stays; it stops being the point. One background canvas per account, `aria-hidden`,
drawn under the text at low contrast, from the retained single-rAF clock — and the clock's
4000 ms master cycle is now **diegetic**: it is the four seconds. Every account's ambient figure
is phase-locked to the same four seconds, and the `isReturn` frame (every sixth revolution) is a
single Ember tick on the hub. Nothing functional depends on it, per the standing rule.

Each account gets one procedural figure, ≤40 lines of canvas, tuned to the §04 caps (≤6% opacity
delta, ≤8 px travel, ≥6 s): `dog` a slow breathing radial; `lamp` a fall of light that dims then
cuts; `river` a drifting horizontal band; `moth` a scatter that returns to one point; `clock` a
hairline sweep; `switch` two hard states and nothing between. No figure runs behind a line of
type at more than 8% alpha.

**Reduced motion.** Each figure has an authored **still** — the composition at phase 0.25, drawn
once, complete, never blank (the existing `tests/reduced-motion.spec.ts` uniform-image check
still applies). Locked blocks appear with no fade. The `<details>` open with no animation. The
reduced-motion reader loses nothing: every word is still pressable, every key still fires, and
the still figures are, if anything, the better-looking variant.

### 4.9 The ending

`four seconds` is a real destination and a real ending, and it is deliberately incomplete for
almost everyone. It prints what you hold and names what you do not, and its bottom control sends
you back to `dog`, whose first line is different now. **There is no state in which the site tells
you that you are finished.** At 5/5 contradictions it prints the resolution — one sentence,
plain, and the payoff is larger than the promise, which is the one rule that keeps every other
curiosity mechanic on the site alive.

---

## 5. Copy inventory — the opening, verbatim

This replaces §I of the build spec for the opening. **No word may appear on the site that is not
in the inventory**; adding one is an edit to this section. All lowercase, as before.

### 5.1 First screen, in the initial HTML

```
<h1>the lights went out for four seconds.
    twelve things were awake.</h1>
```

Bottom fixed control, present from frame one: `ask the streetlight`
Nav slot labels: `dog` `lamp` `kettle` `moth` `river` `bus` `radio` `clock` `window` `switch` `road` `four seconds`
Footer: `gentle mode` · `keep this` · `send the night as you have it`

### 5.2 The first account — `dog`, blocks 1–4, verbatim

> **block 1.** the dog was awake because the dog is always awake at [11:04]. the dark came in
> one piece, like a held breath. the heater stopped its small noise. then the dog heard
> [the second click]. there is only supposed to be one.
>
> *aside on `11:04` — rendered already open on arrival:* the dog does not know what a clock is.
> the dog knows what 11:04 smells like.
>
> *aside on `the second click` — emits key `dog:two-clicks`:* a click is a switch. two clicks is
> two switches, or one switch pressed twice.

> **block 2.** in the dark the house got bigger. the dog counted the ways out, the way it does,
> and found one more than it started with. the [back door] was standing open a hand's width.
> it had been shut all evening.
>
> *aside on `back door` — emits key `dog:door`:* the dog had heard it open, earlier, and had
> decided it was the wind, which is what the dog decides.

> **block 3.** there was a smell on the step that was not the step's smell. wet wool. somebody's
> hands. going [up the road], not down it.
>
> *aside on `up the road` — emits key `dog:uphill`:* the road only goes one place. the dog has
> never been there. the dog has smelled everything that comes back from it.

> **block 4.** then the light came back and the heater started and the house was the right size
> again, and the dog lay down in the same shape it had been lying in, because that is what a dog
> does with four seconds. the [wool] smell stayed on the step until morning.
>
> *aside on `wool` — emits key `dog:wool`:* wet wool. it is still there at seven. it is not
> there at eight.

Bottom control at the end of the account: `ask the streetlight`

### 5.3 Voice rules for anyone adding copy

1. **Lowercase throughout.** No exclamation marks. No em dashes in prose (they are the house
   punctuation of the UI, not the story).
2. **Sentences of 4 to 16 words.** Maximum two clauses. If a sentence needs a comma splice to
   work, it works.
3. **Past tense for the four seconds. Present tense for what a witness always is.** "the dog
   *was* awake because the dog *is* always awake."
4. **Third person, always, about the witness.** The narrator never becomes the witness and never
   uses a witness's interior state as fact; it reports behaviour and sensation.
5. **The reader is `you` only when something changed because of them.** Two places only: the
   third-press asides, and `four seconds`.
6. **One concrete noun per sentence minimum.** wet wool, a hand's width, a heater's small noise.
   Abstraction is the failure mode of this genre and it is banned in the first three blocks of
   every account.
7. **Every block ends withholding something nameable.** Not a rhetorical question — a fact the
   reader can now go and look for somewhere specific.
8. **The narrator never says:** any human's name; any number except `11:04`, `four`, `six`, `ten`
   and the nav's `n/5`; `imagine`; `discover`; `experience`; `journey`; `immersive`; `click`;
   `tap`; `scroll`; `read more`; `learn more`; anything in the second person that is not covered
   by rule 5; any count of people; any "live"/"now"/"right now" language; any countdown; any
   sign-up prompt; any word that scolds.
9. **No witness lies.** Every contradiction must be resolvable by perception, position or timing.
   An unreliable narrator would make the whole site unfalsifiable and the payoff unpayable.

---

## 6. Rubric self-audit (§6 of doc 01, item by item)

| # | pts | how this concept earns it |
|---|---|---|
| A1 | 5 | Every account's pass-1 text is server-rendered in the initial HTML: twelve `<section>`s, every block, every aside inside `<details>`. Zero-JS is not a fallback here, it is the best-case reading experience. Stronger than the toy, which needed canvas for its value prop. |
| A2 | 4 | Text is the payload. Tier A unchanged (~7.5 KB gz). ~5000 words ≈ 9 KB gz split across twelve lazily-mounted sections; only `dog` is on the landing route. No third party. |
| A3 | 4 | No images, fonts or embeds. `<details>` expansion is user-initiated and excluded from CLS by definition. Every block reserves height on its wrapper. *Watch:* a locked block materialising on a non-input frame is a real shift — see R4. |
| A4 | 4 | `<summary>` is interactive before hydration; target first press <200 ms, as the ring tap hit 154 ms. |
| A5 | 3 | Text paints in frame one. Nothing is deferred, nothing is skeletonised. |
| B1 | 6 | `the lights went out for four seconds.` — seven plain words, above the fold at 360×640, in the initial HTML, as the `<h1>`. |
| B2 | 4 | One primary control (the fixed bottom advance) and one nav cluster. Prose is content, not a competing attractor. |
| B3 | 4 | The concrete instance is the already-open aside on `11:04`: the site arrives mid-telling, as the old one arrived mid-performance. |
| B4 | 3 | No modal, carousel, gate, interstitial or audio. Audio is dropped entirely, removing a whole penalty class. |
| C1 | 6 | Pressable words work on pointer, touch and keyboard in the first viewport, pre-hydration; the retained `--px/--py` bootstrap drives the ambient figure on `pointermove`/`touchmove`. *The weakest item — see the three compensations below.* |
| C2 | 4 | A `<details>` toggle is a style recalculation, not a render. Budget <50 ms. |
| C3 | 3 | Press a word; advance a beat; jump to an account; keyboard (`→` next beat, `1`–`9`/`0`/`-`/`=` accounts, `Esc` closes open asides). Four kinds in two screens. |
| C4 | 3 | Dotted→solid rule, hover thickening, 2 px `:focus-visible`, `aria-expanded` from `<details>` — two signifiers on every control. The old C4 defects are fixed by construction: no fixed 2×2 block over the title, controls bottom-anchored. |
| D1 | 4 | Voice rule 7 makes this a copy law, checked per block; every account ends on the next account's name at full salience. |
| D2 | 4 | `dog` is genuinely read on arrival: 1 of 12, plus one word already pressed. |
| D3 | 4 | Twelve slots with eleven visible holes, forty words with visible dotted holes, five contradictions. Three nested finite sets, all countable, all visibly incomplete — the toy had one. |
| D4 | 3 | The bottom advance control is `position: fixed`, on every screen, never relocating, always naming its destination. |
| D5 | 2 | Eight of the forty words reward a third press with something new. Variability selects which good thing, never whether. No timer, scarcity or streak. |
| E1 | 3 | Every label is a destination name or a concrete phrase: `ask the streetlight`, never `next`. |
| E2 | 3 | The bottom of every account is a full-salience card naming the next account and what it has. |
| E3 | 2 | The §H.3 functional equivalent: each nav slot carries a state marker (hollow / filled / changed), a one-word title, its hook line on hover/focus, and a non-colour visited marker. |
| E4 | 2 | Twelve URL-addressable reversible destinations **plus** one authored two-option belief branch that is reversible in a tap and changes real text — stronger than the toy, which had to claim an equivalent. |
| F1 | 3 | Text reflows. The old F1 failure is fixed by construction: the nav is `repeat(auto-fit, minmax(44px, 1fr))`, three rows of four at a 180 px layout viewport, never off-screen. |
| F2 | 3 | The advance control is bottom-centre with safe-area padding, in the thumb zone from frame one. Fixes the old F2 deduction. |
| F3 | 2 | ≥44 px slots, ≥8 px gaps from the start. Pressable words get `padding: 6px 2px` and a 44 px hit box via `::after`. *Copy constraint:* never two pressable words in one rendered line or in vertically adjacent lines — verified per block at 360 px and at 200% zoom. |
| F4 | 2 | `100dvh`/`100svh` on the account shell, as now. |
| G1 | 3 | An authored still per figure; text is 100% intact under reduced motion; no block appears by animation. A narrative site's calm variant is nearly free. |
| G2 | 3 | `<summary>` is natively keyboard-operable. Skip link → account → words in reading order → advance → nav → footer. `Esc` closes open asides and nothing else. |
| G3 | 2 | Real headings and sections, `aria-live="polite"` for a slot becoming changed, canvas `aria-hidden`. **There is no canvas-only information anywhere on this site** — structurally stronger than the toy. |
| G4 | 2 | Existing palette, existing verified ratios. Dotted vs solid rule is a shape difference, not a colour one. |
| **H** | 0 | No overlay, no count of people anywhere, no scroll-jack (native scroll in document mode, no scroll in JS mode), no sign-up, no countdown, no audio at all. The one clickbait exposure is the payoff at `four seconds`, which is why the resolution must actually resolve. |

**Projected: 100/100 before defects, and the four points the current site is losing (F1, F2, F3,
C4) are all lost to layout decisions this concept does not repeat.** A realistic shipped score
after the usual regressions is **95–98**, comfortably over the 92 gate.

**Where a narrative site is structurally weaker, and what compensates:**

1. **C1 — the interactive element is smaller and less obvious than a ring.** Compensated by the
   already-open aside (teaches in zero words), the dotted rule (a signifier flat design forgot),
   and the fact that the *nav* visibly reacts to a press, so the feedback is larger than the
   target.
2. **The 3–10 s window is a reading window.** A toy is comprehended by doing; prose has to be
   comprehended by reading, which is slower. Compensated by hard block-length caps (55 words,
   4–16 word sentences) and by putting the first payoff — an aside — on screen before the
   reader has done anything.
3. **Quality is not verifiable by a test.** The old site's mechanics either worked or did not.
   Here, `tests/` can assert that every block is ≤55 words, that every block ends without
   resolving, that no forbidden word ships, that every account has an authored still, and that
   every key has both an emitter and a consumer — but it cannot assert that the prose is good.
   That is the residual risk and it is managed in §7, not in CI.

---

## 7. Risks and kill criteria

| # | risk | mitigation | kill criterion |
|---|---|---|---|
| R1 | **The prose is not good enough.** Everything rests on twelve accounts worth reading. | One writer for all twelve, never split across agents; §5.3 is enforceable. Write `dog`, `river` and `bus` first — they carry the concept. Detection is a cold read-aloud on a phone. | `dog` blocks 1–4 failing a cold read-aloud after two rewrites → take C2 (the index), which needs less voice per word. |
| R2 | **Pressable words are not discovered;** the reader reads the page as a page. | The already-open first aside, the dotted rule, and a nav slot that visibly changes on the first press. Instrument it: a `word_pressed` beacon within 15 s for ≥70% of sessions. | <40% press rate after both fixes → C1 collapses from 6 to ~2. Revert to beat-advance-only and re-score. |
| R3 | **The key graph rots.** Forty keys × twelve accounts is a dependency graph. | Keep it shallow: **no block is behind more than one key, and there are no chains.** Unit test: every key has ≥1 emitter and ≥1 consumer, no account locks a block behind its own key, every account is fully readable from an empty key set. | Any account needing two keys for one block → cut the block. |
| R4 | **CLS from inserted blocks.** A locked block appearing on a non-input frame is a shift. | **Hard architectural rule:** locked blocks materialise only on account *entry*, never while the reader is looking at that account. What happens live is the changed marker. It is also better storytelling. | CLS >0.02 in the gate → the rule is being broken. |
| R5 | **"No invented people presented as real."** | Nobody here is presented as real: no names, no quotes attributed to a person, no counts of people, no testimony framed as reportage. The witnesses are a dog, a kettle and a road; the one human never speaks and is never named. | Any line readable as a real person's statement is cut. |
| R6 | **Length fatigue.** Twelve accounts × four blocks is ~8 minutes; most readers never finish. | Designed, not accidental: the target is 2–4 accounts in a first session plus a returning visit. `four seconds` is reachable at any time and is never locked. | Median session depth <2 accounts → cut every account to three blocks. |
| R7 | **The mystery outstays the warmth.** | Every account is a small domestic piece first and a clue second; `kettle` and `moth` carry almost no plot on purpose. | — |

---

## 8. What carries over unchanged

`src/lib/` in full except `ring-store.ts`, `ring-geometry.ts`, `share.ts`, `garden-seed.ts` and
`audio.ts` (deleted; the new codec lands as `share.ts` rewritten in place by the owning package,
and `knowledge.ts` is the one new module). `clock.ts` is retuned, not replaced — same single rAF,
same 4000 ms cycle, now diegetic. `storage.ts`, `beacon.ts`, `url-state.ts`,
`use-motion-preference.ts`, `use-canvas.ts`, `tokens.ts`, `keep.ts`, `use-lazy-mount.ts`, `rng.ts`
and `hero-bootstrap.ts` are untouched. `AppShell`, `Corridor`, `LoopContext` and `NextArc`
survive as-is; `Ringway` becomes `TheNight` with the same markup contract, the same
`<nav aria-label>`, the same `<a href="/?s=…">` slots and the same hub counter. The registry
keeps its seventeen append-only slots: twelve accounts, five contradictions, `_example`.
`scripts/`, `tests/` and the whole QA gate carry over, plus four new copy-discipline tests
named in §6.
