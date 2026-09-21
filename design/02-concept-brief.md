# Loop — Concept Brief
**Doc:** 02-concept-brief.md · **Owner:** Concept lead · **Status:** Decided, ready to build

---

## 0. The number, honestly

"90% of visitors do not bounce" is only meaningful with a definition, so here is ours, and we design directly to it:

> **Engaged session = the visitor performs at least one intentional interaction AND stays past 10 seconds.**

That reframes the whole problem. We are not trying to write a persuasive page. We are trying to get a finger onto the glass inside three seconds, and then keep a promise so satisfying that leaving feels like walking out mid-sentence. Every decision below is subordinate to two mechanics: **time-to-first-touch** and **the kept promise**.

The killers of the 90% are known and each gets a countermeasure: slow first paint (budget: interactive under 1.2s on 4G), any modal/cookie/sound-permission wall (we ship none), incomprehension (no text is required to understand the site), and dead ends (there are none — the site is a ring).

---

## 1. Ten interpretations of "Loop"

### A. THE RING — a silent loop instrument
**Hook:** Tap the circle. Whatever you put there repeats forever.
**First 3s:** One glowing ring, a sweep hand already moving, one dot already pulsing in time. A faint line of type: `tap the ring`.
**Why they stay:** The site makes a promise ("this will come back around") and keeps it four seconds later. That closed loop of cause and effect is the most reliable dopamine mechanic on the web, and it costs one tap.
**Non-bounce:** 80–88%. Time-to-first-touch is near zero, but a single toy exhausts itself in ~60 seconds without more to find.
**Build:** Low-medium. Canvas 2D + WebAudio, no assets, no libraries.

### B. THE ENDLESS CORRIDOR — procedural walk
**Hook:** A hallway that never ends, except you keep passing things you have passed before.
**First 3s:** First-person motion down a corridor rendered in CSS/WebGL, doors sliding past.
**Why they stay:** Curiosity about whether there is an end (there is not) plus the uncanny recognition of repeats.
**Non-bounce:** 55–65%. Mobile controls are awkward, motion sickness is real, and "walking" is a slow verb — nothing happens in the first three seconds *because of the visitor*.
**Build:** High (WebGL, movement, LOD).

### C. THE LOOP MUSEUM — scrollytelling about loops in nature, math, culture
**Hook:** From the water cycle to the Ouroboros to the for-loop.
**First 3s:** A beautiful animated title card. Requires reading.
**Why they stay:** Editorial quality. But it is language-dependent and passive.
**Non-bounce:** 40–55%. Text-first is the single biggest bounce driver on a cold visit.
**Build:** Medium. Lots of writing and bespoke diagrams.

### D. FEEDBACK — a site that demonstrates feedback by being feedback
**Hook:** This page is watching itself.
**First 3s:** The page renders a live, degrading copy of itself inside itself, infinitely.
**Why they stay:** It is genuinely uncanny and instantly legible without language.
**Non-bounce:** 65–75%. Enormous first impression, thin second act.
**Build:** Medium (canvas drawing its own previous frame). Perf risk on low-end phones.

### E. ONE DAY, FOREVER — a daily-ritual habit product
**Hook:** Come back tomorrow and the loop closes.
**First 3s:** A calm, well-designed prompt.
**Why they stay:** They mostly do not, on visit one. Habit products are built for retention, not for cold non-bounce, and without accounts we cannot even carry the habit across devices.
**Non-bounce:** 35–45%.
**Build:** Low.

### F. LOOP (THE PRODUCT) — landing page for a fictional device
**Hook:** A wearable that records your day as a four-second loop.
**First 3s:** Hero copy, product render, CTA.
**Why they stay:** They don't. Landing pages are the world's highest-bouncing artifact, and a fictional one has no payoff.
**Non-bounce:** 25–35%.
**Build:** Low.

### G. THE GIF COMMONS — a wall of procedural looping animations
**Hook:** A thousand tiny loops, all running at once.
**First 3s:** Overwhelming, gorgeous grid of motion.
**Why they stay:** Browse instinct is strong; each cell is a micro-reward.
**Non-bounce:** 70–78%. But it is a lean-back site: nothing the visitor does changes anything, and grids train scanning, not depth.
**Build:** Medium-high (hundreds of distinct generative sketches, perf budget).

### H. LOOPQUEST — a room-to-room exploration game
**Hook:** Twelve rooms. The twelfth is the first.
**First 3s:** A room, an object, an implied rule.
**Why they stay:** Discovery, completion drive, the Zeigarnik pull of an unfilled map.
**Non-bounce:** 70–80%. Games have a comprehension tax: the visitor must work out the verb before they get a reward.
**Build:** Medium-high.

### I. OUROBOROS — infinite scroll that seamlessly rejoins its own top
**Hook:** Scroll to the end. There isn't one. You are back where you started and you didn't notice.
**First 3s:** A normal-looking page.
**Why they stay:** One good gag, discovered late.
**Non-bounce:** 45–55%. The payoff arrives after the bounce window has closed.
**Build:** Low.

### J. PHASE — two loops drifting out of sync
**Hook:** Two identical rhythms, one one percent faster. Watch them come apart and back together.
**First 3s:** Two rings rotating, almost together.
**Why they stay:** Hypnotic; the resolution (when they realign) is a genuine event worth waiting for.
**Non-bounce:** 60–70%. Sublime but narrow, and the payoff is on the site's clock, not the visitor's.
**Build:** Low.

---

## 2. Scoring

Scale 0–5. Criteria: **IC** instant comprehension (0–3s) · **II** instant interactivity · **DE** depth (6–10+ destinations) · **RL** replay/loop structure · **MV** mobile viability · **ZD** zero-dependency feasibility · **SH** shareability · **UN** universality (no language/culture/intent required).

| # | Concept | IC | II | DE | RL | MV | ZD | SH | UN | **Total /40** |
|---|---------|----|----|----|----|----|----|----|----|----|
| A | The Ring | 5 | 5 | 2 | 5 | 5 | 5 | 4 | 5 | **36** |
| B | Endless Corridor | 3 | 3 | 4 | 4 | 2 | 2 | 3 | 4 | **25** |
| C | Loop Museum | 3 | 1 | 5 | 2 | 4 | 4 | 3 | 1 | **23** |
| D | Feedback | 4 | 3 | 2 | 4 | 3 | 3 | 4 | 5 | **28** |
| E | One Day, Forever | 3 | 2 | 2 | 5 | 5 | 5 | 2 | 3 | **27** |
| F | Product page | 4 | 1 | 2 | 1 | 5 | 5 | 2 | 2 | **22** |
| G | GIF Commons | 4 | 2 | 5 | 3 | 4 | 3 | 4 | 5 | **30** |
| H | Loopquest | 2 | 4 | 5 | 5 | 4 | 3 | 4 | 4 | **31** |
| I | Ouroboros | 2 | 2 | 2 | 5 | 4 | 5 | 3 | 3 | **26** |
| J | Phase | 4 | 3 | 1 | 5 | 4 | 5 | 3 | 5 | **30** |

**A wins on the first three seconds. H wins on the next five minutes.** Neither reaches 90% alone: A runs out of site, H runs out of patience before the visitor understands it.

---

## 3. The winner: a deliberate fusion of A and H

### **LOOP — one ring, twelve rooms.**

Take the instrument's zero-friction opening gesture and make that same gesture the key to an entire world. The visitor learns exactly one rule in three seconds — *put something on the ring and it comes back* — and then spends five minutes discovering that this one rule is a drum machine, a melody, a drawing arm, a flock of birds, a growing fern, a solar system, a loom, a feedback mirror, and finally a mirror of the visitor.

**Why this hits 90% where the others don't:**

1. **The comprehension tax is paid by physics, not prose.** A dot you place comes back around four seconds later. No one on earth needs that translated.
2. **Time-to-first-touch is ~2 seconds.** The ring is the only interactive object on screen, it is centered, it is moving, and it is finger-sized on a phone.
3. **The reward is delayed by exactly one revolution (4s), which pushes every visitor past the 10-second bar just to see their own tap return.** The bounce window is spent waiting for a promise the visitor made themselves.
4. **Depth is additive, not branching.** Rooms do not fork; they queue. A visitor is never lost and never has to choose, which is what kills exploration on most "experience" sites.
5. **The whole site never stops.** One global clock runs the entire app; rooms change around a ring that never leaves the screen. There is no page transition, no loading state, no moment where nothing is happening — and therefore no natural exit point.
6. **It survives silence.** Sound is a *reveal*, not a requirement (see 4.3).

---

## 4. Creative brief

### 4.1 Name, tagline, tone

**Name:** Loop
**Primary tagline:** *tap. it comes back.*
**Alternates for share cards / meta:** *one ring, twelve rooms.* · *nothing here ends.*

**Tone of voice.** Lowercase. Two to five words at a time. Patient, warm, slightly ceremonial — a museum label written by a friend who is not going to explain the joke. It never describes what it can demonstrate. It never says *experience*, *immersive*, *journey*, *discover*, *unleash*. It never uses an exclamation mark. It addresses the visitor as *you* only when something has changed because of them. When in doubt: **one word is better than five, and no words is better than one.**

### 4.2 The core mechanic: The Ring

- A circle sits at the center of the viewport. A **sweep** travels it at a fixed global tempo: **one revolution = 4.000 seconds** (15 rev/min, 60 BPM at four beats).
- **Tap/click anywhere on or near the ring → a node is placed at that angle.** Every time the sweep crosses it, the node *fires*.
- **Drag a node** along the ring to retime it; **drag it inward/outward** to change its value (pitch, size, weight — the room decides); **flick it off** the ring to delete it.
- **The clock is global and never resets.** Move between rooms and the sweep keeps its exact phase. Your nodes travel with you; each room reinterprets them.
- That is the entire interaction model for the whole website. **Every room is the same verb with a different noun.**

This is the single most important decision in the brief: one gesture, learned once, rewarded twelve times.

### 4.3 Sound is a reveal, not a requirement

Audio is off. Nothing autoplays. Silent, the ring is already a kinetic sculpture: nodes bloom, the page background breathes on the downbeat, trails smear. In Room 2, after the visitor's third node, a small petal appears on the ring's edge with a single wordless speaker glyph. Tapping it is the site's most satisfying moment — the visual loop they built for 20 seconds *turns out to have been music the whole time*. Because the tap is a user gesture, WebAudio unlocks cleanly on iOS. Everything downstream works identically muted.

### 4.4 Minute by minute

**0–3s.** Near-black field. One ring, hairline-thin, with a sweep already a third of the way round and a single node already pulsing — *the site was running before you got here*. Cursor/finger leaves a short comet trail. At 1.8s one line fades in beneath the ring: `tap the ring`. It dies the instant you touch anything. No logo, no nav, no modal, no cookie bar.

**3–10s.** You tap. A node blooms under your finger with a ripple. Then the wait — three seconds of anticipation you created — and the sweep arrives and your node fires exactly as promised. The word beneath the ring changes to: `again`. Most visitors tap three to six more times here. The bounce window is already over.

**10–30s.** The ring begins to *want* things. A second, smaller ring fades in concentrically, already turning slightly faster — you now have polyrhythm before you know the word. The sound petal appears. The background stops being black: a slow gradient field responds to node density. Beneath everything, the **Ringway** fades in — twelve faint notches arranged in a circle at the screen's edge, one lit. You have not been told what it is.

**30s–2min.** The first drift. The room does not "navigate" — the world behind the ring slides, and you arrive in **Pulse**, then **Tone**, then **Trail**. Each room takes 20–40 seconds to reveal its trick. The Ringway fills one notch at a time. The visitor is now in a collection loop: eleven notches are dark and that is unbearable.

**2–5min.** The deep rooms — **Swarm, Mirror, Growth, Orbit, Loom** — each a genuine "oh" moment built from the same taps. Then **Wear**, the turn, where the loop begins to decay and the site quietly argues against itself. Then **The Garden**, where the visitor's loop joins a field of loops. Then the twelfth notch lights and the door leads back to the first room, which is not the same room anymore.

---

## 5. Site map — twelve rooms, plus what is hidden

Every room is the same ring with a different interpretation. Listed with its one-line identity, the trick, and **the hook** that pulls to the next.

1. **ORIGIN** *(landing, notch 12)* — One ring, one node, one instruction. The trick: the kept promise. **Hook out:** the second ring appears turning at a different rate and drifts toward a doorway that was not there before.
2. **PULSE** *(percussion)* — Nodes become hits; the whole page breathes on the downbeat. The trick: the sound petal — silence becomes rhythm. **Hook out:** one node's ripple escapes the ring and travels outward like a wave, and following it moves you on.
3. **TONE** *(melody)* — Radius becomes pitch. Drag nodes outward and the loop sings upward. A second ring of five beats against your four. The trick: you accidentally make Steve Reich. **Hook out:** the two rings realign after 20 seconds and the realignment *opens* something.
4. **TRAIL** *(generative drawing)* — Your loop drives a pen on a rotating arm. Every node bends the line. The trick: thirty seconds in, you have made a spirograph nobody else has. Long-press to keep it. **Hook out:** the drawing is too big for the room and scrolls out of frame; following it is the transition.
5. **SWARM** *(emergence)* — Two hundred agents obey your loop as a shared heartbeat. The trick: flocking. Loops in nature. **Hook out:** the swarm forms an arrow. It is very rude about where it wants you to go.
6. **MIRROR** *(feedback)* — The canvas draws its own previous frame, slightly smaller and rotated: an infinite tunnel of itself. Your nodes perturb it and the perturbation echoes inward forever. The trick: the site demonstrates feedback by *being* feedback. **Hook out:** something moves deep inside the tunnel that you did not put there.
7. **GROWTH** *(recursion)* — An L-system fern adds one generation per revolution; your node pattern is its branching rule. The trick: recursion is a loop you can walk through. **Hook out:** the fern grows off-screen upward and the camera follows it into —
8. **ORBIT** *(epicycles)* — Your nodes become moons on circles on circles. The trick: enough loops can draw *anything* — the room resolves your random taps into a recognizable silhouette (a heart, a bird, your own ring). This is the intellectual peak. **Hook out:** the drawn shape falls flat and becomes a woven thread.
9. **LOOM** *(pattern and culture)* — Your loop becomes a repeating textile band that tiles infinitely in both directions: Greek key, kente, Celtic knot, all generated from your same four taps. The trick: culture has been looping this rule for 4,000 years. **Hook out:** a single thread of your weave comes loose.
10. **WEAR** *(the turn)* — Here repetition costs something. The loop dulls, each revolution slightly quieter, slightly grayer. Doing nothing lets it die. The only fix: **change one node.** The trick: the site's thesis — a loop with no variation is just a wait. This is the emotional pivot and it earns the ending. **Hook out:** the revived loop is brighter than it ever was, and it is bright enough to see a door.
11. **GARDEN** *(the commons)* — A slow field of drifting rings, each a complete loop you can touch to hear and steal. Populated entirely client-side: a shipped seed set of ~150 hand-authored and procedurally derived loops, plus every loop this visitor has made, plus any loop opened from a shared URL. **Integrity rule: nothing here claims to be live, nothing fabricates other people, no invented counters.** Copy is *loops left here*, never "1,204 people are online." The trick: your loop drifts into the field and keeps going without you. **Hook out:** your own loop from ORIGIN drifts past.
12. **RETURN** *(notch 12 again)* — The first room. Same ring, same node you placed 5 minutes ago, still going. But the field is lit, the second ring is there, the Ringway is full, and there is now a door in ORIGIN that was never there on the first visit — leading back to any room, instantly, forever. **There is no ending.** The last line of copy on the site is: `it was always going to come back.`

**Hidden destinations (5):**
- **SILENCE** — remove every node and let one full revolution pass with an empty ring. Everything fades to a single hairline circle and a held breath; one word: `oh.` Tapping restores everything exactly as it was.
- **REVERSE** — drag the sweep hand backwards through a full revolution. The site runs anticlockwise until you do it again. All twelve rooms support it.
- **144** — visit all twelve rooms twelve times (tracked in localStorage) and the Ringway becomes a clock face that tells the real time.
- **THE TWIN** — build a loop that exactly matches one in the Garden; both rings light and briefly lock phase.
- **SLOW** — pinch out / hold the center of the ring to stretch the revolution to 16 seconds. Meditative mode. Persists.

**Non-room surfaces (3):** the **Ringway** (navigation, always present, never a navbar), the **Keep** (long-press anywhere to freeze the current frame as a downloadable PNG via canvas `toDataURL` — no server), and **Share** (the entire loop encodes to ~24 characters in the URL hash; opening a shared link starts you in ORIGIN with a stranger's loop already playing).

---

## 6. Verbatim copy

### Hero (ORIGIN, in order of appearance)
1. *(0.0s — nothing. Only the ring.)*
2. **`tap the ring`** — appears 1.8s, dies on first touch
3. **`again`** — after the first node fires
4. **`now it's yours`** — after the third node
5. **`there are twelve of these`** — as the Ringway fades in
6. *(RETURN, final line, appears once:)* **`it was always going to come back.`**

### Primary navigation (the Ringway, twelve labels — each one word)
`origin` · `pulse` · `tone` · `trail` · `swarm` · `mirror` · `growth` · `orbit` · `loom` · `wear` · `garden` · `return`

### Micro-copy (complete inventory — the site has no other words)
- Sound petal: **`sound`**
- Muted again: **`quiet`**
- Keep/save: **`keep this`**
- Share: **`send your loop`** / on copy: **`copied. it travels.`**
- Arriving from a shared link: **`someone left this here`**
- Empty ring, 4 seconds: **`oh.`**
- WEAR, as it dims: **`it's getting tired`** → after a change: **`better.`**
- GARDEN: **`loops left here`**
- Reduced-motion notice (settings only): **`gentle mode`**
- 404 (there is one, and it is a room): **`you found the outside. there isn't one.`** + a ring that takes you home.

### Meta / share card
Title: **`Loop — tap. it comes back.`**
Description: **`one ring, twelve rooms, no ending.`**

---

## 7. Mobile vs desktop

The ring is the layout, so there is no responsive re-flow problem — only a re-weighting.

**Mobile is the primary target.** Ring occupies 78% of the shorter viewport axis, centered, with a 56px-minimum touch band. The Ringway is a horizontal arc of twelve notches pinned to the bottom safe area, thumb-reachable. Room transitions are **vertical swipes** (with the ring pinned and the world moving behind it) and also happen automatically after a room's trick has landed — the visitor never has to know how to navigate. **No scroll-jacking:** the page has no scroll to hijack; the corridor is a gesture layer, and a normal flick always works. Haptics (`navigator.vibrate`) on node placement where supported, single 8ms pulse, never rhythmic.

**Desktop** adds hover, which adds intent: nodes glow before you touch them, the comet trail follows the cursor, and the Ringway is a vertical dial on the right with its twelve labels revealed on hover. Keyboard is a first-class input — `space` places a node on the beat (a genuinely better drum machine than tapping), `1–9` jumps rooms, arrow keys nudge timing, `esc` empties the ring (hello, SILENCE). Wider canvases show more of the Trail, deeper Mirror recursion, and more of the Garden at once.

**Reduced motion (`prefers-reduced-motion: reduce`) is a designed mode, not a degradation.** The loop is the product, so it is never removed; instead the continuous sweep becomes twelve discrete steps per revolution (a stepping clock hand), all parallax and camera drift are removed, room changes cross-fade at 200ms instead of sliding, the Mirror tunnel becomes static with only the innermost frame updating, and the Swarm holds position and pulses in place. No element flashes above 2.5Hz in any mode, ever, and full-viewport luminance changes are capped at 10% amplitude.

---

## 8. Technical shape (constraint compliance)

Next.js App Router, fully static export, deployed on Vercel. One route (`/`) plus the room state in the URL hash so rooms are linkable and the back button works. Zero runtime dependencies beyond React: all visuals are Canvas 2D and inline SVG, all audio is WebAudio oscillators and noise buffers synthesized at runtime, all color is generated. **No images, no fonts fetched from a CDN, no external API, no analytics that blocks paint.** Type is a system font stack, weighted to look intentional. Target: <60KB JS over the wire for ORIGIN, with rooms 2–12 code-split and prefetched during the visitor's first ten seconds of tapping — so the corridor is instant while the network is idle. Persistence is `localStorage` only (loops kept, rooms visited, slow mode, reduced-motion preference). Optional: `@vercel/og` at the edge for per-loop share images, with a static card as the fallback if we choose not to ship it.

---

## 9. Risks — what stops us hitting 90%

1. **The first tap doesn't happen.** Everything rests on this. Mitigation: the ring is the only thing on screen, it is already in motion, `tap the ring` appears at 1.8s, and if 6 seconds pass with no input, a ghost node fades in and fires once — the site demonstrates itself. **This is the single most important thing to prototype and test first.**
2. **Perf on a three-year-old Android.** Twelve canvas rooms is a lot of paint. Mitigation: one shared `requestAnimationFrame` loop for the entire app driving one clock; particle counts scale from a measured first-second FPS sample; Swarm caps at 60 agents and Mirror at 6 recursion levels on low tiers; hard rule — **if a room can't hold 45fps, it ships simpler, not later.**
3. **Motion sickness and photosensitivity.** Mitigation: the caps in §7, no camera roll/zoom, reduced-motion honored on first paint (not after a flash of animation), and a `gentle mode` toggle reachable from the ring center.
4. **The corridor feels like it's driving.** Auto-advance is the second-biggest risk after the first tap: if the site moves people before they're done, it reads as a slideshow and they leave. Mitigation: auto-advance only fires after the room's trick has completed *and* the visitor has been idle 4+ seconds; any input cancels it; every room is re-enterable from the Ringway.
5. **Room 4 fatigue — "it's the same thing again."** Mitigation: rooms are ordered so that no two adjacent rooms share an output medium (rhythm → pitch → line → crowd → recursion → space → pattern), and Room 10 (WEAR) deliberately breaks the pattern by taking something away.
6. **Depth without direction.** If the Ringway reads as decoration, the collection drive never starts. Mitigation: it must visibly *fill*, with a small satisfying lock-in animation per notch, and it must be visible by the 30-second mark.
7. **Silence undersells it.** If the muted experience is merely fine, we lose everyone who never taps `sound`. Mitigation: the muted build is the one we design and review first; sound is added last and judged only on how much it *adds*.
8. **Nothing to take away.** Without a keep/share moment, the session ends at nothing. Mitigation: `keep this` (PNG) and `send your loop` (hash URL) are available from every room, not just the end.
9. **Honesty risk in the Garden.** Fabricated live-user counts or invented "community" loops attributed to people would be a straightforward deception and are forbidden; the room is framed as a curated field, seeded and self-populating, and the copy never implies otherwise.
10. **We over-build.** Twelve rooms is the ceiling, not the floor. **Ship order: ORIGIN → PULSE → TONE → TRAIL → RETURN (a complete five-room loop) and only then add depth.** A perfect five-room Loop beats a broken twelve-room one, and the site is a ring either way.
