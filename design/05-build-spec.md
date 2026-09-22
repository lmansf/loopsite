# 05 — LOOP: Authoritative Build Spec

**Doc:** `design/05-build-spec.md` · **Status:** SINGLE SOURCE OF TRUTH · **Date:** 2026-09-21

This document supersedes `01-attention-research.md`, `02-concept-brief.md`, `03-architecture.md`
and `04-visual-motion-system.md` wherever they disagree. Build agents read **this file only**
(the scaffold agent additionally reads `03-architecture.md` for verbatim config files).
Everything a build agent needs is restated here. If something is not in this document, it is
not in the build; open a question rather than inventing it.

**Conflict resolutions already made (do not re-litigate):** the concept (one ring, twelve rooms)
defines what the site is; the visual doc defines how it looks and moves; the architecture doc
defines the stack, budgets, contracts and testing. There is no separate "Orrery" hero — its
three good ideas (comet trails, pointer-proximity slowing, the ring doubling as persistent
navigation) are folded into the Ring itself. The master clock is 4000 ms per revolution; the
visual doc's phase-offset motif and 24 s "Return" ride on top of it (6 revolutions = 24 s).
**No webfont**: system stack only. Reduced motion is a designed mode (12 discrete sweep steps),
never blank. No fake social proof, no fake counts, no dark patterns, no modals/overlays/audio
gates in the first 30 seconds; sound is opt-in behind a real gesture.

---

## A. Elevator pitch and the non-bounce thesis

**Loop is one ring on a near-black field with a sweep hand already turning when you arrive.
You tap the ring; a node appears where you touched; four seconds later the sweep comes back
around and your node fires, exactly as promised. That single rule — put something on the ring
and it comes back — is the entire interaction model for a site of twelve rooms, each of which
reinterprets your same taps as rhythm, pitch, a drawn line, a flock, a fern, a system of
orbits, a woven band, a decaying loop, and finally a field of loops that includes yours. The
ring never leaves the screen; the rooms change around it; the clock never resets.**

**The non-bounce thesis.** We commit to the hardened GA4 definition from doc 01: a session is
engaged if it reaches ≥10 s dwell **and** fires at least one intentional interaction. Loop
attacks that definition structurally rather than persuasively.

1. **Time-to-first-touch is ~2 s.** The ring is the only object on the screen, it is centered,
   it is already moving, and on a phone it is 78% of the short axis — a target the size of a
   hand. There is no nav, no logo, no modal, no cookie bar, no scroll required.
2. **The reward is delayed by exactly one revolution (4000 ms), and the visitor scheduled that
   delay themselves.** A visitor who taps at 2.5 s cannot leave before ~6.5 s without
   abandoning a promise they made. Most tap again immediately; the median first-tap sequence
   (3–6 taps) carries the session past 15 s without any persuasion at all.
3. **Comprehension is paid by physics, not prose.** Nothing has to be read, translated or
   inferred. The `tap the ring` line is a courtesy, not a dependency.
4. **The first viewport is never a closed statement.** A ring with a sweep on it is an open
   loop in the literal and the Zeigarnik sense; the Ringway's twelve notches (one lit, eleven
   dark) converts curiosity into a collectible set the moment it appears.
5. **The site has no dead ends and no loading states.** One route, one clock, one rAF loop;
   rooms cross-fade around a ring that never unmounts. There is no moment where nothing is
   happening, therefore no natural exit point.
6. **It is fast enough to be judged on its ideas.** Server-rendered value proposition, no
   webfont in the LCP path, zero raster bytes, CSS-driven first motion, and a ≤2 KB inline
   bootstrap that makes the hero reactive before React hydrates.
7. **Nobody is excluded.** Reduced motion is a designed twelve-step mode. Keyboard is a
   first-class input (space places a node on the beat — genuinely the best way to play it).
   Every canvas has a text equivalent. Excluded users bounce at 100%; we have none.

Target rubric score (§H): **≥92/100 with zero Category H penalties**, which maps to ≥90%
non-bounce.

---

## B. The visitor journey, second by second

Times are from first paint. Everything below is a requirement, not a mood board.

### 0–3 s — "something is already running"

- Near-black field (`--c-canvas` `#06070A`). One hairline ring, centered. A sweep head is
  already about a third of the way round (phase seeded at 0.33 on first paint) with a comet
  trail behind it. One node already sits on the ring at angle 0.62 rev, pulsing each time the
  sweep passes — **the site was running before you got here**.
- The ring, sweep and seed node are painted by CSS and the inline bootstrap; they do not wait
  for React. Under `prefers-reduced-motion` the sweep is a twelve-step hand from the first
  frame — it never animates smoothly first and then corrects.
- The pointer (desktop) leaves a short comet trail from the first `pointermove`, handled by
  the inline bootstrap.
- **At 1.8 s**, one line of type fades in beneath the ring (CSS animation, `--dur-6`,
  `--ease-enter`): `tap the ring`. It is present in the initial HTML from byte zero; only its
  opacity is animated, so it costs no CLS and is readable by assistive tech immediately.
- No logo. No nav. No modal. No cookie bar. No audio. No spinner. No skeleton.

### 3–10 s — "it came back"

- The visitor taps. A node blooms under the finger in <100 ms: a disc scaling 0 → 6 px with a
  ripple ring expanding to +64 px over `--dur-6`. Haptic pulse of 8 ms where supported.
- Then the wait — up to 4 s of anticipation the visitor created. The sweep arrives and the node
  **fires**: bloom to 22 px over `--dur-4`, glow to full, trail flare.
- On the first fire the hero line changes to `again`.
- **The ghost-node self-demo:** if **no** pointer, touch or key input has occurred by
  **6000 ms**, the site demonstrates itself. A ghost node fades in over 400 ms at
  `angle = currentPhase + 0.25 rev`, radius level 8, at 45% opacity, in `--c-accent-3` (Ember).
  It fires once when the sweep reaches it (~1 s later) with the full bloom, then fades out over
  800 ms. A second ghost demo runs at **14 000 ms**, placed 120° from the first. **There is no
  third.** Any real input cancels the schedule permanently for the session.
- After the **third** node, the hero line changes to `now it's yours`.

### 10–30 s — "there are more of these"

- A second, smaller ring fades in concentrically at 0.72 R, turning at 4/5 the angular rate
  (period 5000 ms) at 20% opacity: polyrhythm before the visitor knows the word.
- The **sound petal** appears on the ring's outer edge — a 44 px target with a wordless speaker
  glyph and the label `sound`. It is never a gate, never a modal, and never blocks anything.
- The background stops being flat: a radial gradient field whose luminance scales with node
  density (`0.04 + 0.02 · min(n,8)/8`), breathing ±10% on the downbeat (amplitude capped at 10%
  per doc 01/02 photosensitivity rules).
- The **Ringway** fades in: twelve notches, one lit. The hero line changes to
  `there are twelve of these`. Trigger: `t ≥ 30 s` **or** the 5th node placed, whichever is
  first.

### 30 s – 2 min — "the room changed and the ring didn't"

- The visitor moves to another room via the Ringway, the Next Arc, an arrow key, or a vertical
  swipe. The **world behind the ring slides and cross-fades over `--dur-6` (520 ms)**; the ring
  keeps its exact phase and its exact nodes. There is no page transition, no fetch, no spinner.
- **There is no auto-advance.** (See §C.11 and the decision log.) When a room's trick has landed
  and the visitor has been idle ≥4 s, the Next Arc *escalates* — the arc fills, the destination
  label goes to full opacity, a small traveller walks the arc — but it never navigates for them.
- Each room takes 20–40 s to reveal its trick. The Ringway fills one notch at a time with a
  360 ms lock-in animation and a one-frame Ember flash.

### 2–5 min — "the loop argues with itself, then comes back"

- The deep rooms — SWARM, MIRROR, GROWTH, ORBIT, LOOM — each an "oh" built from the same taps.
- **WEAR** is the turn: repetition starts costing something, the loop dulls, and the only fix is
  to change a node. `it's getting tired` → on any change, `better.`
- **GARDEN**: the visitor's loop drifts into a field of loops (a shipped seed set plus their own
  plus anything opened from a shared link). Copy is `loops left here`. Nothing claims to be
  live; no people are invented; no counters are fabricated.
- **RETURN** is ORIGIN again, but lit: the field is alive, the second ring is there, the Ringway
  is full, and a door exists in the ring that was not there the first time. When the twelfth
  notch lights, one line appears, once: `it was always going to come back.`
- `keep this` (PNG) and `send your loop` (hash URL) are reachable from every room, not only at
  the end.

### Hero copy sequence — verbatim, in order

| # | When | Text |
|---|---|---|
| 1 | 0.0 s | *(nothing — only the ring)* |
| 2 | 1.8 s, dies on first touch | `tap the ring` |
| 3 | after the first node fires | `again` |
| 4 | after the third node | `now it's yours` |
| 5 | as the Ringway fades in | `there are twelve of these` |
| 6 | RETURN, once, when the 12th notch lights | `it was always going to come back.` |

---

## C. Global mechanics

### C.1 The Ring — geometry

Single source of truth for geometry, computed once per resize in `src/lib/ring-geometry.ts`
and published on the `RingGeometry` object every room receives.

```
short   = min(viewportWidth, viewportHeight)
D       = 0.78 * short            // diameter: 78% of the short axis — hard requirement
R       = D / 2                   // = 0.39 * short
cx      = viewportWidth / 2
cy      = coarsePointer ? viewportHeight * 0.455 : viewportHeight * 0.50
band    = max(28, 0.12 * R)       // hit band half-width; total band >= 56px on mobile
```

- `cy` is biased upward on touch devices so the ring clears the bottom-anchored Ringway and sits
  inside the easy thumb zone; on desktop it is dead center.
- Angles: **0 = 12 o'clock, increasing clockwise**, expressed as a normalized turn `a ∈ [0,1)`.
  Screen position: `x = cx + ρ·sin(2πa)`, `y = cy − ρ·cos(2πa)`.
- Ring stroke: 1.5 px in `--c-border-strong`, plus an inner track arc in `--c-accent` at 12%
  alpha. Never more than one ring stroke is at full accent at a time.
- The ring layer is drawn by `RingStage` and **never by a room**. Rooms draw beneath it.
- Minimum viable: at 320×568 the ring is 249 px across; at 1440×900 it is 702 px.

### C.2 The Sweep

- **One revolution = 4000 ms, exactly.** `SWEEP_MS = 4000`.
- The sweep head is a 3 px disc in `--c-accent-hi` with the glow filter recipe and a comet
  trail. Trail length = `v · 0.38 s` clamped to 24–140 px, where `v = 2πR / 4 s`.
- The trail is drawn with the canvas exponential-decay recipe (§E): do not clear the ring
  layer; paint `rgba(canvas, 1 − exp(−dt/380))` over it each frame and draw the head with
  `globalCompositeOperation = 'lighter'`, capped at 0.85 alpha.
- **Pointer-proximity slowing (folded in from the Orrery):** a node within 180 px of the pointer
  scales 1 → 1.45 with `--spring-magnetic`, brightens its label/trail, and — only while the
  pointer is within 90 px of the **sweep head** — the head's apparent angular velocity is
  visually eased to 35% for at most 600 ms **without changing the clock**. The clock is never
  slowed; only the head's rendered lead/lag offset is interpolated (max ±0.02 rev) and it
  re-converges with `--ease-loop`. Nothing that fires depends on it.
- **Direction** is `+1` normally, `−1` after REVERSE (§C.13).

### C.3 Nodes

A node is the only thing a visitor creates. Stored shape:

```ts
export interface RingNode {
  id: string;      // crypto.randomUUID().slice(0,8)
  a: number;       // angle, normalized turn, quantized to 1/256 on commit
  r: number;       // radius level 0..15 (8 = exactly on the ring)
  v: number;       // variant 0..15 — room-interpreted (timbre, hue index, thread)
  born: number;    // clock.revolution at creation, for age-based effects (WEAR)
}
```

- **Placing:** `pointerdown` whose distance from the center is within `R ± band` places a node
  at that angle and at the radius level nearest the touch point. Outside the band, nothing
  happens (the center is reserved for SLOW, §C.13). Placement is committed on `pointerdown`,
  not `pointerup` — feedback must appear within 100 ms.
- **Quantization:** angles are quantized to **1/256 of a revolution (15.625 ms)** on commit.
  This is below the perceptual threshold for "I did that exactly", and it makes share codes
  round-trip byte-exactly. There is **no musical quantization** — the visitor's timing is the
  visitor's.
- **Moving:** `pointerdown` within 22 px of an existing node grabs it instead of placing a new
  one (`setPointerCapture`). Dragging around the ring retimes it; dragging inward/outward
  changes `r`. Release commits.
- **Removing:** flick a node radially outward past `1.45 R` with a release velocity
  > 0.6 px/ms, or press a grabbed node's keyboard `Delete`/`Backspace`. Removal plays a 240 ms
  dissolve, never a flash.
- **Max count: 24.** At 24, further placement is refused; the ring rim flashes `--c-accent-3`
  once for 240 ms. No copy — the site does not scold.
- **Nodes travel with the visitor.** Rooms never mutate the node set; they only read it. (WEAR
  reads node *age*; GARDEN previews a foreign set through a non-destructive overlay slot.)
- **Firing:** a node fires when the sweep crosses its angle. Frame-rate independent test, run
  once per frame with the previous and current phase:

```ts
// dir = +1 or -1; p0 = previous phase, p1 = current phase, both in [0,1)
const travelled = dir > 0 ? mod1(p1 - p0) : mod1(p0 - p1);
const behind    = dir > 0 ? mod1(p1 - n.a) : mod1(n.a - p1);
if (behind < travelled) fire(n, /* lateness in ms */ behind * SWEEP_MS);
```

  `travelled` is clamped so a backgrounded tab cannot fire 900 nodes on return (see C.4).

### C.4 The Clock

One `requestAnimationFrame` loop for the whole application, owned by `src/lib/clock.ts`.
No room, component or hook may start its own rAF.

- State: `t` (ms since start, monotonic), `phase ∈ [0,1)`, `revolution` (integer, increments on
  each wrap), `dt` (ms, clamped to 50), `dir`, `periodMs` (4000, or 16000 in SLOW).
- `phase` advances by `dir · dt / periodMs`; `revolution` increments on each forward wrap and
  decrements on each backward wrap (never below 0).
- **Pause on hidden:** on `visibilitychange → hidden`, cancel the rAF and record the wall time.
  On `→ visible`, resume from the recorded phase — **do not fast-forward**. The clock's phase is
  continuous, but the site does not simulate the missing minutes.
- **The Return:** `revolution % 6 === 0` is the master 24 s Return moment. On that frame the
  clock emits `{ return: true }`; elements using phase offsets simultaneously reach their
  initial configuration. Rooms may use it for a one-frame accent (a single Ember tick on the
  Ringway hub); nothing functional may depend on it.
- **Phase offsets:** any set of `n` sibling elements uses `φᵢ = i/n`, sampled as
  `phaseOf(i, n) = mod1(clock.phase + i/n)`. In CSS the equivalent is
  `animation-delay: calc(-1 * var(--loop-half) * var(--i) / var(--n))`.
- **Quality tiers:** if `dt > 32 ms` for 30 consecutive frames, drop one global quality tier
  (`high → mid → low`) and broadcast through `LoopContext`. Tiers only ever reduce particle
  counts, recursion depth and DPR. A room that cannot hold 45 fps ships simpler, not later.
- **Reduced motion:** `phase` is quantized on read to `floor(phase · 12) / 12` — twelve discrete
  sweep steps per revolution (one every 333.33 ms). Firing uses the quantized phase, so a node
  fires on the step that passes it. Everything else in the site still works.

```ts
export interface ClockFrame {
  t: number; dt: number; phase: number; revolution: number;
  dir: 1 | -1; periodMs: number; isReturn: boolean; tier: 'high'|'mid'|'low';
}
```

### C.5 The Ringway

Persistent navigation. Twelve notches, never a navbar.

- **Desktop:** a vertical dial pinned right (`right: 24px`, vertically centered), notches as
  12 px ticks on a 96 px-tall arc; the one-word label is revealed on hover/focus and is always
  present in the accessibility tree.
- **Mobile:** a horizontal arc of twelve notches pinned to the bottom safe area
  (`bottom: max(16px, env(safe-area-inset-bottom))`), each notch a ≥44×44 px hit target with
  ≥8 px spacing, centered, thumb-reachable.
- Each notch is a real `<a href="/?s=<slug>">` inside a `<nav aria-label="rooms">` so it works
  with zero JS, middle-click, and screen readers.
- **State encoding is never colour alone:** visited notches are **filled** (Filament) *and*
  carry a 1 px inner ring; unvisited notches are hollow in `--c-border-strong`; the current
  notch additionally has a marker dot and `aria-current="page"`.
- **A room counts as visited when either:** (a) it has been the active room continuously for
  ≥3000 ms **and** at least one full sweep revolution completed while it was active, or
  (b) the visitor placed, moved or removed a node while it was active. The notch then locks in
  with a 360 ms fill (`--dur-5`, `--ease-loop`) and a one-frame Ember flash.
- **Endowed progress:** ORIGIN's notch is lit from the first frame — the visitor arrives at
  1/12, not 0/12, because they have genuinely already been somewhere.
- The Ringway hub (its center) shows the hidden-destination counter as `n/5` in Ember once
  `n ≥ 1`. Numerals only; no prose.
- When all twelve are lit, the Ringway runs a single 720 ms full-circuit light sweep with one
  Ember flash, and RETURN's final line becomes eligible.

### C.6 Keep — canvas to PNG

`src/lib/keep.ts`. Trigger: long-press ≥600 ms anywhere inside the stage that is not on a node,
or the `keep this` button in the corridor rail, or `K` when the stage has focus.

- Composites the three stage canvases (background, room, ring) into one offscreen canvas at
  `min(devicePixelRatio, 2)`, draws a 1 px `--c-border` frame inset 24 px and the word `loop` in
  `--c-text-muted` at `--fs-xs` in the lower-right of the frame, then
  `canvas.toBlob(blob => …, 'image/png')`.
- Downloads via an `<a download="loop-<revolution>-<code>.png">` created, clicked and revoked in
  the same task. No server round trip. Falls back to `toDataURL('image/png')` if `toBlob`
  is unavailable.
- Copy: `keep this`. The flash confirmation is the canvas rim brightening for 240 ms.

### C.7 Share — URL hash encoding, exact bytes

`src/lib/share.ts`. The loop encodes into the **hash**; the room lives in the **search param**.
A full URL looks like `https://<host>/?s=tone#l=BQHk8ZH2…`.

**Binary layout** (then base64url, no padding):

| Offset | Bytes | Meaning |
|---|---|---|
| 0 | 1 | header: bits 0–3 = version (`0b0001`), bit 4 = reverse, bit 5 = slow, bits 6–7 = reserved (0) |
| 1 | 1 | XOR checksum of all subsequent bytes, seeded `0x5A` |
| 2 + 2i | 2 per node | `byte0 = round(a · 256) & 0xFF`; `byte1 = (r << 4) | v` |

- Node count is derived: `n = (byteLength − 2) / 2`. A payload with an odd or <2 length, an
  unknown version, a failed checksum, or `n > 24` is **rejected silently**: the site loads
  normally with the visitor's own (or empty) ring. A bad link never shows an error.
- Encoding: `btoa(String.fromCharCode(...bytes))` then `+`→`-`, `/`→`_`, strip `=`.
- **Exact sizes:** 8 nodes = 18 bytes = **24 base64url characters**; 4 nodes = 10 bytes = 14
  chars; 24 nodes (max) = 50 bytes = 68 chars. Total hash length for 8 nodes: `#l=` + 24 = 27.
- On load, if `location.hash` starts with `#l=` and decodes, the ring is populated with the
  decoded nodes **before first paint of the room layer**, ORIGIN is the starting room, and the
  caption shows `someone left this here` for 3.5 s.
- Writing: `send your loop` copies `location.origin + '/?s=' + slug + '#l=' + code` to the
  clipboard via `navigator.clipboard.writeText`, falling back to a hidden `<input>` +
  `document.execCommand('copy')`. On success the caption shows `copied. it travels.` for 2 s.
  The hash is **not** written to the address bar by the site itself (only on explicit share), so
  the back button is never polluted.

### C.8 localStorage

One versioned key, `loop:v1`, wrapped by `src/lib/storage.ts`. Every read and write is
`try/catch`'d; every failure returns the default. If storage is unavailable, the site is fully
functional and simply forgets between visits — no warning, no degraded UI, no prompt.

```ts
export interface LoopState {
  v: 1;
  visited: string[];                    // slugs, in first-visit order
  visits: Record<string, number>;       // slug -> visit count (for the 144 trigger)
  collected: string[];                  // hidden ids found: silence|reverse|144|twin|slow
  maxDepth: number;                     // 0..1, max depth reported by any room
  kept: string[];                       // up to 12 share codes the visitor saved
  lastLoop: string | null;              // share code of the ring at last unload
  returns: number;                      // number of times RETURN has been reached
  sound: boolean;                       // default false
  motion: 'auto' | 'reduce';            // explicit override; default 'auto'
  slow: boolean;                        // SLOW mode persists
  reverse: boolean;                     // REVERSE persists
}
```

- Additional keys: **none**. `sessionStorage` holds exactly one key, `loop:sid`, owned by the
  beacon.
- Never read during render (hydration mismatch). Read inside a `useEffect`, flip
  `hydratedFromStorage`. Writes are debounced 500 ms.
- Nothing here is ever sent anywhere. No account, no gate, no sign-up — ever, for anything.

### C.9 Engagement beacon

`src/lib/beacon.ts`, ~1.2 KB, per doc 03 §4.4, restated.

- **Refuses to send** if `navigator.doNotTrack === '1'`, `window.doNotTrack === '1'`,
  `navigator.msDoNotTrack === '1'`, or `navigator.globalPrivacyControl === true`. In that case
  every API is a no-op and nothing is stored.
- Session id: `crypto.randomUUID()` in `sessionStorage` under `loop:sid`. No cookies, no
  localStorage, no fingerprinting, no PII. It dies with the tab.
- **Wire events (exactly five, each deduped to once per session):**

| Event | Fires when |
|---|---|
| `session_start` | on init — the denominator |
| `hero_interacted` | first `pointermove` / `pointerdown` / `touchstart` / `keydown` inside the stage |
| `section_viewed` | a room becomes active for ≥1000 ms (payload `{ section }`), max once per room |
| `depth_reached` | a room reports `depth ≥ 0.75` (payload `{ section, depth }`) |
| `time_on_site_30s` | a 30 s timer that only accrues while `document.visibilityState === 'visible'` |

- `onExplore` accepts the richer `ExploreEventName` set; `section_interacted`,
  `collectible_found` and `section_completed` are aggregated locally (progress, Ringway,
  hidden counter) and surface on the wire only as `depth_reached` details. Max 8 detail keys.
- Queued and flushed on `visibilitychange → hidden`, on `pagehide`, and on a 10 s idle timer,
  via `navigator.sendBeacon('/api/beacon', blob)` falling back to
  `fetch(..., { keepalive: true })`. Never `unload`.
- Flushes `window.__loop.q` (the pre-hydration queue) on init, so a `hero_interacted` at 300 ms
  is never lost.
- **Measurement of record:** engaged session = fired `hero_interacted` **or** `section_viewed`
  for ≥2 distinct rooms **or** `time_on_site_30s`. Non-bounce rate = engaged ÷ `session_start`.
  Target ≥0.90.

### C.10 The URL scheme

- **Room:** `/?s=<slug>`. Written with `history.replaceState` for passive changes (arriving at a
  room because its trick completed, restoring from storage) and `history.pushState` for
  deliberate navigation (Ringway click, Next Arc, arrow key, swipe). This is the single most
  important back-button rule: passive changes never create history entries, so Back always
  leaves in one press from wherever the visitor deliberately went.
- **Loop:** `#l=<base64url>` (§C.7). Read on load; written only on explicit share.
- **Anchors:** `#section-<slug>` remains valid for the no-JS document and is honoured on load
  (it selects the room and is immediately replaced by `?s=<slug>`).
- `/s/<slug>` is a prerendered alias route whose only job is `generateMetadata`. On arrival it
  `replaceState`s to `/?s=<slug>`.
- Only `src/lib/url-state.ts` touches `location` or `history`. No component reads them.

### C.11 Room switching

- **Ringway notch** (click/tap/Enter) → `pushState`, cross-fade 520 ms.
- **Next Arc** — a 96 px-radius, 120° arc at the bottom edge of the stage bearing the **next
  room's one-word name** on a `textPath`, with a small traveller parked at its start. It is a
  real `<a href="/?s=<next>">` with a ≥48 px tall hit area, in the easy thumb zone.
- **Keyboard:** `←`/`→` previous/next room, `1`–`9` jump to rooms 1–9, `0` room 10, `-` room 11,
  `=` room 12 — **only while focus is inside the stage** (§C.12).
- **Touch:** vertical swipe on the room layer — threshold 64 px with velocity >0.3 px/ms — moves
  forward (up) or back (down). `touch-action: none` on the room layer only; the rest of the
  document scrolls natively.
- **Wheel does nothing.** We do not bind the wheel to navigation at any threshold. (Decision:
  see §J.)
- **There is no auto-advance.** After a room's trick completes and 4 s of idle, the Next Arc
  escalates (arc fills to 100%, label to full opacity, traveller walks it once). It never
  navigates on its own. This satisfies doc 01's "no time limits" and doc 04 §6.4, and removes
  doc 02's second-biggest risk outright.
- **Transition choreography (520 ms, `--dur-6`):** the outgoing room layer rotates −8° and fades
  to 0 with `--ease-exit`; the incoming layer enters from +8° and fades in with `--ease-enter`;
  the background field pans 6% of the viewport in the travel direction; **the ring layer does
  not move, rotate, fade or reset**. Backwards navigation inverts the rotation signs, runs at
  0.85× duration (442 ms), and tints the Ringway marker `--c-accent-2` (Ion) for the duration —
  colour plus direction, never colour alone.
- Focus management: a deliberate navigation moves focus to the new room's `<h2>`
  (`tabIndex={-1}`) and announces the room name in the shell's `aria-live="polite"` region.

### C.12 Keyboard

The stage is a single focusable surface: `<div id="stage" role="application" tabindex="0"
aria-label="the ring — place nodes on a four second loop">` with a visually-hidden instructions
block adjacent to it. Keys are handled **only** when focus is inside the stage, and
`preventDefault()` is called only for keys we handle, so we never steal the browser's or a
screen reader's keys elsewhere on the page.

| Key | Action |
|---|---|
| `Space` | place a node at the **current sweep phase** (quantized to 1/256), at the last-used radius level (default 8). This is the best drum machine in the site. |
| `←` / `→` | previous / next room |
| `↑` / `↓` | raise / lower the radius level of the most recently placed node by 1 |
| `1`–`9`, `0`, `-`, `=` | jump to room 1–12 |
| `Delete` / `Backspace` | remove the most recently placed node |
| `S` | toggle sound (same as the sound petal) |
| `K` | keep this (PNG) |
| `Esc` | if an overlay is open, close it and return focus to its trigger. Otherwise lift every node into a held state — this is the SILENCE trigger, and it is fully reversible: the next tap or `Space` restores the ring exactly as it was. |
| `Tab` | leaves the stage; order is skip link → stage → sound → motion → keep → share → Ringway → Next Arc |

Every pointer-only mechanic has a keyboard equivalent, including hidden destinations
(REVERSE: `Shift+←` held for one full revolution; SLOW: `Shift+S`).

### C.13 Hidden destinations — exact triggers

Five, tracked in `collected[]`, counted in the Ringway hub as `n/5`. None gates content; none
can fire accidentally during ordinary use.

| id | Name | Exact trigger | Effect | Undo |
|---|---|---|---|---|
| `silence` | SILENCE | the ring has **0 nodes for one continuous full revolution (4000 ms)** in a session in which it has held ≥1 node | everything fades to a single hairline circle over 900 ms; one word appears: `oh.` | any tap/`Space` restores the previous node set exactly |
| `reverse` | REVERSE | `pointerdown` within 18 px of the sweep head, then drag backwards through ≥340° of cumulative negative rotation within 6 s (keyboard: `Shift+←` held 4 s) | `clock.dir = -1`; all twelve rooms support it; persists in storage | repeat the gesture |
| `slow` | SLOW | two-pointer pinch-out centered inside the ring increasing distance ≥1.6×, **or** press-and-hold within `0.25 R` of the center for 1200 ms (keyboard: `Shift+S`) | `periodMs` eases 4000 → 16000 ms over 1200 ms with `--ease-loop`; persists | repeat the gesture |
| `144` | 144 | `visits[slug] ≥ 12` for **all twelve** slugs | the Ringway becomes a working clock face: the twelve notches are hours, the sweep reads real seconds, a minute hand appears | permanent; toggled off by tapping the hub |
| `twin` | THE TWIN | the visitor's loop matches a GARDEN loop under rotation: same node count `n ≥ 3`, and there exists a rotation offset `δ` such that every node's angle is within **±1/64 rev** of a garden node's angle + δ, and each matched radius level is within ±1 | both rings light to `--c-accent-hi` and phase-lock for 8 s (two revolutions) | ends by itself |

Discovery is logged to `collected[]` and surfaced as the `n/5` hub counter — the set converts
the eggs into a collectible, which is the stronger mechanic. Nothing in the set is required, and
no hidden destination is ever the only way to reach a room, a control, or a piece of content.

---

## D. The twelve rooms

Every room is the same ring with a different interpretation. Every room:

- implements `SectionModule` (§F.3) and is registered in its reserved registry slot;
- draws only on the **background** and **room** canvases — the ring layer belongs to `RingStage`;
- reads `clock`, `nodes` and `geometry` from props and **never** starts its own rAF, calls
  `matchMedia`, touches `localStorage`, or mutates the node set;
- renders a **still, complete composition** under reduced motion — never a blank box;
- calls `onExplore({name:'section_viewed'})` once on becoming active, and
  `onExplore({name:'depth_reached', depth})` at most once per 0.25 step;
- renders a server `Shell.tsx` containing `<section id="section-<slug>" aria-labelledby>`, one
  `<h2>` (the one-word label), the hook line, the Next Arc link, and a `min-height` of `100dvh`;
- ships a `<canvas role="img" aria-label="…">` with a real description of what it depicts.

**Core ring rooms** (ORIGIN, PULSE, TONE, TRAIL, RETURN) must be complete and perfect; they are
owned by WP1–WP3. **Expansion rooms** (SWARM, MIRROR, GROWTH, ORBIT, LOOM, WEAR, GARDEN) may be
simpler and are spread across WP4–WP7. Each room is implementable in ~300–600 lines of
TypeScript/canvas. `budgetKb` is the gzipped lazy-chunk budget, asserted by CI.

Colour names below are token names from §E. `n` is the node set; `ρ(r) = R · (0.58 + 0.042·r)`
is the radius-level mapping (level 8 = exactly R); `phase` is `clock.phase`.

---

### D.1 ORIGIN — `origin` — notch 1 — core — budgetKb 7

**Hook copy:** `tap the ring`
**Renders:** the bare ring on the near-black field. This is the landing room and the only room
whose code is in the landing bundle (not lazily loaded).

**Visual algorithm.**
- Background: one radial gradient centered on `(cx, cy)`, inner stop
  `color-mix(--c-accent 6%, --c-canvas)` at radius `0.2R`, outer stop `--c-canvas` at `1.9R`.
  Its inner alpha is `A = 0.04 + 0.02 · min(count,8)/8`, breathing to `A · (1 ± 0.10)` on a
  4000 ms sine keyed to `phase` — a 10% luminance cap, never more.
- On fire, each node emits a **ripple**: a stroked circle centered on the node, radius
  `0 → 64 px` over 520 ms `--ease-exit`, stroke `--c-accent` alpha `0.22 → 0`, width `2 → 0.5`.
- On fire, the node blooms: disc radius `6 → 22 → 6` over `--dur-4` with `--ease-enter` out,
  glow at full `--glow-full`.
- **After the third node**, a second concentric ring fades in at `0.72R` over 900 ms, 20% alpha,
  turning at 4/5 the rate (period 5000 ms) with its own 2 px head — polyrhythm, unannounced.
- The seed node (placed by the site at `a = 0.62`, `r = 8`, 60% alpha) is removable like any
  other. If the visitor removes it, it does not come back.

**Beyond tapping:** drag the seed node to feel retiming before placing anything; hover any node
(desktop) to see it swell and its trail brighten.
**Next affordance:** Next Arc reading `pulse`. Escalates after the trick lands (first node
fired) plus 4 s idle.
**Reduced motion:** twelve-step sweep; ripples render as one static 32 px ring at 0.16 alpha
that fades over 150 ms; the gradient breathes opacity `0.80 ↔ 0.92` over 12 s; the second ring
appears without a fade.
**Mobile:** `cy` at `0.455·vh`; the hero caption sits at `cy + R + 28px`, above the Ringway.
**Depth:** `0.25` first node placed, `0.5` first fire, `0.75` third node, `1.0` second ring seen.

---

### D.2 PULSE — `pulse` — notch 2 — core — budgetKb 10

**Hook copy:** `it has a pulse`
**Renders:** the ring as a drum machine; the whole field breathes on the downbeat.

**Visual algorithm.**
- Radius level selects a voice: `r < 5` → **kick**, `5 ≤ r ≤ 10` → **snare**, `r > 10` → **hat**.
  The node is drawn as a filled disc (kick, 9 px, `--c-accent`), a hollow square rotated 45°
  (snare, 8 px, `--c-accent-3`), or a 2 px cross (hat, 7 px, `--c-accent-2`) — **shape carries
  the voice, not colour alone.**
- On fire: a **shock ring** expands from the node to `min(0.9R, 180 px)` over 300 ms with
  stroke alpha `0.5 → 0` and stroke width scaling `3 → 0.5`; kick shocks also displace the ring
  stroke outward by up to 4 px with a 1/(1+d²/120²) falloff, springing back over 420 ms.
- **Downbeat breathe:** at `phase` crossing 0, the whole field's luminance lifts 6% for 90 ms.
  **Hard cap: at most one global flash per 400 ms** (2.5 Hz floor, per doc 01 §4 and doc 02 §7);
  if multiple nodes fire inside the window, the flash is emitted once and its amplitude is not
  summed.
- Idle ambient: a 1 px concentric grid of 4 rings at 8% alpha that pulse outward once per
  revolution with phase offsets `i/4`.

**Sound (the reveal).** The **sound petal** appears at `a = 0.5` on the ring's outer edge after
the visitor's third node in this room (or immediately if `state.sound` is already true). It is a
44 px target with a speaker glyph and the visible label `sound`; pressing it constructs the
`AudioContext` inside the gesture handler (§F.8) and ramps the master gain 0 → 0.8 over 40 ms.
Voices: kick = sine 55 Hz with a 120 ms exponential decay and a pitch drop 110→55 Hz over 40 ms;
snare = 200 ms noise buffer through a bandpass at 1.8 kHz, Q 0.8; hat = 40 ms noise through a
highpass at 8 kHz. Once on, the label becomes `quiet`. **Everything downstream works identically
muted** and no visual depends on audio.

**Beyond tapping:** drag a node radially across a voice boundary and the glyph morphs live.
**Next affordance:** Next Arc reading `tone`. Mechanic: the ripple of one node escapes the ring
and travels outward toward the arc, which fills as it arrives.
**Reduced motion:** twelve-step sweep; shock rings are drawn once at their final radius at 0.18
alpha and fade over 150 ms; no global luminance flash at all — the downbeat is shown by the
Ringway marker dot changing opacity `0.85 → 1 → 0.85` over 1200 ms.
**Mobile:** voices are big shapes (≥8 px) so they read at arm's length; haptic 8 ms on placement
only, never on fire — rhythmic haptics are banned.
**Depth:** `0.25` first node, `0.5` two voices used, `0.75` sound petal pressed **or** four nodes
firing, `1.0` all three voices present.

---

### D.3 TONE — `tone` — notch 3 — core — budgetKb 12

**Hook copy:** `radius is pitch`
**Renders:** the ring as a melodic sequencer with a second ring beating 5 against 4.

**Visual algorithm.**
- Pitch: `scale = [0,3,5,7,10,12,15,17,19,22,24,27,29,31,34,36]` (minor pentatonic over three
  octaves, 16 entries indexed by `r`), `f(r) = 220 · 2^(scale[r]/12)`.
- Each node renders a **string**: a line from `(cx,cy)` to the node, drawn as a sine with
  amplitude `A·sin(2πk·s)` along its length, where `s ∈ [0,1]` is position along the string,
  `k = 3 + r mod 5` and `A` decays from 14 px to 0 with `τ = 520 ms` after each fire. Colour is
  `--c-accent` at alpha `0.25 + 0.6·A/14`.
- The **second ring** sits at `0.72R` with period **5000 ms** (4/5 rate). Its own head is
  `--c-accent-2`. Nodes are shared: the second ring fires the same node set at its own phase, a
  fifth above (`f · 1.5`).
- **The realignment:** 4 s and 5 s periods coincide every **20 000 ms** (5 inner revolutions, 4
  outer). At that instant both heads cross `a = 0` together; the room renders a single 720 ms
  full-circuit light sweep in `--c-accent-hi`, and the Next Arc jumps to 100% fill. That is the
  "realignment opens something" moment, and it is a true property of the two periods, not a
  scripted cue.
- Audio (if on): a triangle oscillator per fire, `f(r)`, 260 ms, attack 8 ms, exponential
  release, through a lowpass at `f·6`; polyphony capped at 8 voices with oldest-stealing.

**Beyond tapping:** drag nodes radially — the pitch glides continuously while dragging and
snaps to the scale on release, with the string's `k` changing live.
**Next affordance:** Next Arc reading `trail`, driven by the 20 s realignment.
**Reduced motion:** twelve-step sweep; strings are drawn as straight lines whose alpha (not
amplitude) encodes the last fire, decaying over 1200 ms; the second ring is drawn at its exact
position each step; the realignment sweep becomes an instant 150 ms alpha lift.
**Mobile:** the second ring's stroke is 1 px at 26% alpha so it never competes with the main
ring; radial drag uses `setPointerCapture` and `touch-action: none` on the stage only.
**Depth:** `0.25` first node, `0.5` a radial drag, `0.75` three distinct pitches, `1.0` the
realignment witnessed.

---

### D.4 TRAIL — `trail` — notch 4 — core — budgetKb 12

**Hook copy:** `it draws`
**Renders:** a pen on a rotating arm; the loop draws a figure nobody else has.

**Visual algorithm.**
- An **ink canvas** (offscreen, same size as the room canvas) is never cleared. Each frame the
  pen advances and a segment is stroked onto the ink canvas; the room canvas is cleared each
  frame and composites `ink` then the live pen head.
- Pen position: arm angle = sweep angle; radial offset `u` is a spring:
  `u'' = -k·u - c·u'` with `k = 90`, `c = 9`, integrated with the clamped `dt`. Each node fire
  injects `u' += 260 · (r − 8)/8` (inward for `r<8`, outward for `r>8`) and `u += 6`.
- `ρ_pen = R · (0.62 + 0.26 · sin(2π · 3 · phase)) + u`, so with no nodes the pen draws a calm
  trefoil and every node bends it. Stroke width `1.2 + 0.8·|u|/40`, colour
  `--c-trail-1 → --c-trail-2` interpolated by `|u'|` normalized to 300.
- Ink fades globally: once per revolution, the ink canvas is composited with
  `globalAlpha = 0.965` against itself — a slow τ ≈ 110 s decay so a 30 s drawing is fully
  present and a 5 min one is a palimpsest, not mud.
- On quality tier `low`, the ink canvas is DPR 1 and the fade runs every two revolutions.

**Beyond tapping:** **long-press ≥600 ms** anywhere = `keep this` (§C.6) — this is the room
where the affordance is discovered, and the copy appears next to the press point for 2 s.
**Next affordance:** Next Arc reading `swarm`. Mechanic: when the drawing's bounding box exceeds
the stage, the ink layer drifts 12% toward the arc, which fills as it arrives.
**Reduced motion:** the sweep steps; the pen jumps between the twelve step positions and
connects them with straight segments (a clean dodecagonal spirograph — a designed variant, not a
degraded one); no ink fade, no drift.
**Mobile:** ink canvas DPR capped at 1.5; the drawing is centered on the ring, never clipped at
320 px.
**Depth:** `0.25` first node, `0.5` visible deformation, `0.75` 4 revolutions drawn, `1.0` a keep.

---

### D.5 SWARM — `swarm` — notch 5 — expansion — budgetKb 12

**Hook copy:** `they follow it`
**Renders:** 200 agents (tier: high 200 / mid 120 / low 60) that take the loop as a heartbeat.

**Visual algorithm.** Standard boids on a toroidal field, `dt`-scaled:
`separation` weight 1.4 (radius 18 px), `alignment` 1.0 (radius 48 px), `cohesion` 0.9
(radius 48 px), max speed 120 px/s, max force 220 px/s². Neighbour lookup by a 48 px uniform
grid, rebuilt each frame — O(n). Each agent is a 3 px triangle oriented to velocity, drawn at
`--c-text-secondary` 45% alpha, with the 8 agents nearest the pointer in `--c-accent`.
Every node fire injects an **attractor** at that node's screen position with strength 900
decaying `τ = 600 ms`; the flock visibly lunges on the beat. At `revolution ≥ 6` in-room, the
attractor sequence briefly resolves the flock into an arrow pointing at the Next Arc for 1.5 s.
**Beyond tapping:** the pointer is a weak repulsor (strength 160, radius 90 px) on desktop; on
touch, a tap emits a one-shot repulse pulse.
**Next affordance:** Next Arc reading `mirror`; the arrow formation is the escalation.
**Reduced motion:** agents hold position in a still, evenly distributed formation and pulse
opacity `0.55 ↔ 0.85` over 12 s with phase offsets `i/n`; node fires nudge the nearest 12 agents
by ≤2 px with a 150 ms transition. Fully legible as a flock, frozen.
**Mobile:** 60 agents at tier low, 120 at mid; no per-frame allocation (pre-allocated
`Float32Array` of positions and velocities).
**Depth:** `0.25` viewed, `0.5` first lunge, `0.75` pointer/tap interaction, `1.0` arrow seen.

---

### D.6 MIRROR — `mirror` — notch 6 — expansion — budgetKb 9

**Hook copy:** `it sees itself`
**Renders:** the canvas drawing its own previous frame — an infinite tunnel.

**Visual algorithm.** Keep a second canvas holding the previous frame. Each frame:
`ctx.drawImage(prev, 0,0,w,h)` transformed about `(cx,cy)` by `scale 0.94` and
`rotate 1.5° · dir`, at `globalAlpha 0.92`; then draw this frame's node marks on top; then copy
to `prev`. Recursion depth is emergent, but **cap the visible tunnel** by clearing `prev` fully
every `N` frames where `N = 6/0.06 ≈ 100` at tier high, 60 at mid, 36 at low — this bounds
accumulation error and GPU cost. Node fires draw a 16 px `--c-accent` arc at the node position
which then recedes inward forever, echoing at 0.94× per frame.
**Hook out ("something moves in there you did not put"):** at `revolution ≥ 8` in-room, one
**deterministic** ghost mark derived from `hashSeed(seed,'mirror')` is drawn deep in the tunnel
(scale 0.55) for 3 revolutions. It is generated, not fabricated social content — nothing claims
it is another person.
**Beyond tapping:** pointer position offsets the rotation centre by up to 24 px (lerp 0.08), so
the tunnel leans.
**Next affordance:** Next Arc reading `growth`.
**Reduced motion:** only the **innermost** frame updates; the outer tunnel is drawn once as a
static set of 6 nested, rotated, progressively dimmer rings (a complete, designed image).
**Mobile:** DPR capped at 1.5 (this room declares `heavy: true`), `alpha:false` context.
**Depth:** `0.25` viewed, `0.5` first echo, `0.75` pointer lean, `1.0` ghost mark seen.

---

### D.7 GROWTH — `growth` — notch 7 — expansion — budgetKb 11

**Hook copy:** `one more generation`
**Renders:** an L-system fern whose branching rule is the visitor's node pattern.

**Visual algorithm.** Axiom `F`. Rule `F → F[+F]F[−F]F` with per-node parameters: sort nodes by
angle; node `i` contributes branch angle `θᵢ = 14° + 22°·(rᵢ/15)` and length ratio
`λᵢ = 0.52 + 0.24·(vᵢ/15)`. Generation count increments by 1 on each `revolution` while the room
is active, **capped at 7** (tier low: 5). Draw with a turtle into a path, stroke
`--c-accent-dim → --c-accent` by depth, width `3.2 · λ^depth`, alpha `0.35 + 0.55·depth/gen`.
The fern's base sits on the ring at the angle of the first node, so it visibly grows *out of*
the loop. Each node fire lights the branches at its own depth for 240 ms.
**Beyond tapping:** dragging a node rebuilds the L-system live (recompute on `pointermove`,
throttled to one rebuild per frame; the geometry is cached per `(angles,radii)` hash).
**Next affordance:** Next Arc reading `orbit`; when generation reaches the cap, the fern's tip
leaves the top of the stage and the arc fills.
**Reduced motion:** the fern is drawn once at its final generation, fully formed, with a 160 ms
fade-in; node fires change branch alpha only.
**Mobile:** cap total segments at 6000 (tier low 2500); precompute the path once per generation
and stroke a cached `Path2D`.
**Depth:** `0.25` viewed, `0.5` gen ≥3, `0.75` a node dragged, `1.0` gen at cap.

---

### D.8 ORBIT — `orbit` — notch 8 — expansion — budgetKb 11

**Hook copy:** `circles on circles`
**Renders:** the nodes as epicycles — circles riding on circles — tracing their true sum.

**Visual algorithm.** Sort nodes by angle. Node `i` becomes a term of a Fourier-style sum:
amplitude `Aᵢ = ρ(rᵢ) · 0.42 / (i+1)`, frequency `kᵢ = i + 1` (integer harmonics, so the curve
always closes), phase `φᵢ = 2π·aᵢ`. Position:

```
P(t) = (cx, cy) + Σᵢ Aᵢ · ( sin(2π·kᵢ·t + φᵢ), −cos(2π·kᵢ·t + φᵢ) )
```

Draw the chain of circles (1 px, `--c-border-strong`, 22% alpha) and the connecting radii
(1 px, `--c-accent-2`, 40%) at `t = phase`, and the traced curve `P(t)` for `t ∈ [0,1]` sampled
at 512 points, stroked in `--c-accent` with the head at `t = phase` glowing.
**Honesty note:** the room draws the **true sum of the visitor's own nodes**. It does not
pretend to "recognise" their taps as a bird or a heart; the payoff is that integer harmonics
always close into a shape, which is genuinely surprising and genuinely theirs.
**Beyond tapping:** pointer proximity to a circle in the chain slows its *rendered* phase to 35%
for 600 ms (the Orrery gravity idea) and labels its harmonic number `k` in `--font-mono`; the
clock is untouched.
**Next affordance:** Next Arc reading `loom`; the traced curve unrolls into a straight band that
runs toward the arc.
**Reduced motion:** the chain is drawn at `t = 0` only; the traced curve is drawn complete and
static; the head does not move. Changing a node redraws instantly.
**Mobile:** sample count 256; cap chain length to the first 12 nodes by amplitude.
**Depth:** `0.25` viewed, `0.5` ≥3 nodes in the chain, `0.75` a slowed circle, `1.0` a closed
curve with ≥5 terms.

---

### D.9 LOOM — `loom` — notch 9 — expansion — budgetKb 10

**Hook copy:** `four thousand years`
**Renders:** the loop as a repeating textile band that tiles infinitely in both directions.

**Visual algorithm.** The band is a horizontal strip of height `0.5R` through `cy`, tiled at
period `W = 2πR/3`. Warp = 48 vertical threads per tile (tier low 24); weft = 16 rows. Node `i`
sets a thread rule at column `cᵢ = floor(aᵢ · 48)`: for rows `y`, the thread is **over** when
`((y·(1 + (rᵢ mod 4)) + cᵢ) mod (2 + vᵢ mod 3)) === 0`, else **under** — a real interlacement
rule, not a texture. Over-threads are `--c-accent` at 70%, under-threads `--c-accent-2` at 35%,
ground `--c-surface`. The band scrolls horizontally at exactly one tile per revolution, so it is
locked to the clock, and each node fire brightens its own column for 240 ms.
**Beyond tapping:** horizontal drag on the band offsets the weave phase (the ring is unaffected);
release springs back to clock-lock over `--dur-8` with `--ease-loop`.
**Next affordance:** Next Arc reading `wear`; one thread of the weave comes loose and trails
toward the arc.
**Reduced motion:** the band does not scroll; three tiles are drawn statically; node fires change
column alpha only.
**Mobile:** 24 warp threads, band height `0.42R`; the band never causes horizontal document
overflow (it is canvas-internal).
**Depth:** `0.25` viewed, `0.5` ≥2 columns set, `0.75` a drag, `1.0` ≥5 columns set.

---

### D.10 WEAR — `wear` — notch 10 — expansion — budgetKb 9

**Hook copy:** `it's getting tired`
**Renders:** the turn. Repetition costs something here.

**Visual algorithm.** A scalar `vigor ∈ [0,1.15]`, starting at 1.0, multiplied by **0.94 on
each revolution** while the room is active. Everything the room draws is desaturated and dimmed
toward `--c-text-muted` by `1 − vigor`: node glow alpha `= vigor`, ring stroke alpha
`= 0.35 + 0.5·vigor`, background gradient alpha `= 0.04·vigor`, audio gain (if on) `= 0.8·vigor`
and lowpass cutoff `= 400 + 6000·vigor` Hz. The trail's τ shortens from 380 ms to
`120 + 260·vigor` ms, so even the memory gets shorter.
- At `vigor < 0.6` the caption shows `it's getting tired` (once, persistent until revived).
- **The only fix is change:** adding, moving or removing any node sets `vigor = 1.15` with a
  900 ms `--ease-enter` overshoot and a full-circuit light sweep; the caption becomes `better.`
  for 2.5 s. `vigor` then decays from 1.0 as before.
- Doing nothing never reaches zero: `vigor` floors at **0.22**, the room stays legible, and no
  content is ever lost. This is a thesis, not a punishment — there is no timer, no streak, no
  scarcity, and nothing is taken away permanently.
**Beyond tapping:** nudging a node by one radius level counts as change — the cheapest possible
revival, deliberately.
**Next affordance:** Next Arc reading `garden`; the revived loop is bright enough to light it.
**Reduced motion:** `vigor` decays per revolution as usual but is expressed **only** as alpha
and colour, with a 150 ms transition per step; no trail-length change, no sweep animation on
revival (instant alpha lift instead).
**Mobile:** the caption sits above the Ringway, never under it.
**Depth:** `0.25` viewed, `0.5` `vigor < 0.8` seen, `0.75` the tired caption, `1.0` a revival.

---

### D.11 GARDEN — `garden` — notch 11 — expansion — budgetKb 13

**Hook copy:** `loops left here`
**Renders:** a slow field of drifting rings, each a complete loop you can touch.

**Population — and the integrity rule.** The field contains exactly three honest sources:
1. **A shipped seed set of 150 loops**, generated deterministically at build time by
   `src/lib/garden-seed.ts` from a fixed seed (stored as 150 share codes, ~3.6 KB of string
   data, gzip ≈1.4 KB). These are authored artefacts, not people.
2. **Every loop this visitor has kept** (`state.kept`, up to 12).
3. **Any loop opened from a shared URL** this session.

**Nothing here claims to be live. No people are invented. No counters are fabricated. The only
copy is `loops left here`.** There is no "online now", no avatar, no attribution, no count of
strangers. Violating this is a Category H penalty and a build failure.

**Visual algorithm.** Each garden loop is a mini-ring of radius 24–48 px drifting with velocity
`(vx,vy)` sampled from `hashSeed` at 6–14 px/s, wrapping toroidally, avoiding the central
`1.15R` exclusion zone around the main ring. Each mini-ring shows its own nodes as 2 px dots and
its own sweep head running on the **same global clock** with a phase offset `i/n` — so the whole
field pulses in loose unison and returns together every 24 s. Alpha `0.25 + 0.35·(1 − depth)`
where `depth` is a per-loop parallax factor in `[0,1]`; depth also scales drift speed.
**Beyond tapping:** tapping a mini-ring **previews** it — its nodes render on the main ring as a
non-destructive overlay in `--c-accent-2`, and the visitor's own nodes stay visible at 40%.
Tapping it again (or tapping empty field) releases the preview. `send your loop` puts the
visitor's own loop into the field for the rest of the session.
**Hook out:** the visitor's own loop from ORIGIN drifts past, rendered in `--c-accent` (their
loop is the only Filament one in the field). THE TWIN can fire here (§C.13).
**Next affordance:** Next Arc reading `return`.
**Reduced motion:** the field does not drift; loops are laid out on a static jittered grid and
breathe alpha `0.6 ↔ 0.85` over 12 s with phase offsets; sweep heads step twelve times per
revolution.
**Mobile:** 40 visible loops at tier low, 70 at mid, 110 at high (the seed set is virtualized by
viewport); each mini-ring has a ≥44 px hit target.
**Depth:** `0.25` viewed, `0.5` a preview, `0.75` own loop spotted, `1.0` a loop sent.

---

### D.12 RETURN — `return` — notch 12 — core — budgetKb 8

**Hook copy:** *(none — the room speaks once, at the end)*
**Renders:** ORIGIN again. Same ring, same nodes, still going — but lit.

**Differences from ORIGIN, all of them earned state, none of them decoration:**
- The background field is at full amplitude (`A = 0.06`) and carries a faint trace of every
  visited room: for each visited slug, one 1 px arc segment at `1.3R` spanning `1/12` of the
  circle at that room's notch angle, in `--c-accent` at 18%.
- The second ring is present from the first frame.
- The Ringway is full (or shows exactly what is still dark — honestly).
- **The door:** a 14° gap in the ring stroke at `a = 0.0`, with a 2 px `--c-accent-hi` threshold
  line. Tapping or activating it (it is a real `<button aria-label="open the rooms">`) expands
  the Ringway into a full-stage map of twelve labelled links in 360 ms; `Esc` closes it and
  returns focus. The door does not exist on a first visit to ORIGIN — it is the visible proof
  that the visitor has been somewhere.
- **The final line.** When the twelfth notch lights, `it was always going to come back.`
  fades in beneath the ring over 900 ms and stays. It appears **once per visitor**
  (`state.returns` gates it). It is the last copy on the site; nothing follows it, and no CTA
  is attached to it.
- `state.returns++` on arrival.

**Beyond tapping:** everything ORIGIN offers, plus the door.
**Next affordance:** the door itself (it names no single destination because every destination is
behind it), plus the Next Arc reading `origin` — the ring closes.
**Reduced motion:** identical, with the twelve-step sweep and a 160 ms fade for the final line.
**Mobile:** the door sits at 12 o'clock, inside the easy reach zone only when expanded; the
expanded map is a 3×4 grid of ≥48 px targets with safe-area padding.
**Depth:** `0.25` viewed, `0.5` traces seen, `0.75` door opened, `1.0` final line shown.

---

### D.13 Hidden destinations — rendering notes

These are **not corridor rooms**. They are overlays or modes rendered by `RingStage` over the
current room, registered in the registry with `hidden: true` and `notch: null`, and they are
never reachable from the Ringway. Triggers are in §C.13.

- **SILENCE** (`silence`, budgetKb 3): everything except a single hairline circle fades to 0
  over 900 ms `--ease-exit`; the circle breathes alpha `0.35 ↔ 0.6` over 4 s; the word `oh.`
  fades in at 20% below it. Any tap/`Space` restores the exact previous node set and the
  previous room's render within 240 ms. Reduced motion: instant 160 ms cross-fade both ways.
- **REVERSE** (`reverse`, budgetKb 2): `clock.dir = -1`. All rooms already read `dir`. The
  sweep's comet trail flips to lead the head, and the Ringway marker renders in `--c-accent-2`
  (Ion) for as long as reverse is active — direction is signalled by colour **and** by the
  trail's side.
- **SLOW** (`slow`, budgetKb 2): `periodMs` eases 4000 → 16000 ms over 1200 ms with
  `--ease-loop`. Trail length recomputes from the new velocity automatically. Persists.
- **144** (`144`, budgetKb 4): the Ringway becomes a clock face — twelve notches as hours (the
  current hour's notch carries a 2 px marker), the sweep head doubles as a seconds hand read
  from `Date`, and a 1 px minute hand is added. Local time only, no locale lookup, no
  geolocation; `Intl.DateTimeFormat().resolvedOptions().timeZone` is not called.
- **THE TWIN** (`twin`, budgetKb 3): both the main ring and the matched garden ring stroke to
  `--c-accent-hi` at full glow and phase-lock for 8 s (2 revolutions), then release. No copy.

---

## E. Design tokens — `src/app/globals.css`, paste-ready

Adapted from doc 04 §9, with the webfont removed (system stack only, per ruling 4) and the token
layer expressed as a Tailwind v4 `@theme` block (per doc 03 §1.3). `@theme` emits every `--*`
it contains as a plain custom property on `:root`, and Tailwind's generated utilities reference
those variables — so overriding them later (light theme, reduced motion) changes rendered output
without regenerating utilities. Canvas and TypeScript read them through `src/lib/tokens.ts`.

**Naming rule:** Tailwind-namespaced names (`--color-loop-*`, `--font-*`, `--text-*`, `--ease-*`,
`--radius-*`) are canonical. The short `--c-*` aliases exist for hand-written CSS and are
defined once, immediately after the theme. Never define a colour anywhere else.

```css
/* ============================================================
   LOOP — globals.css   (Tailwind v4 + tokens + critical layer)
   ============================================================ */
@import "tailwindcss";

@theme {
  /* ---- fonts: system stack only. No webfont, ever. ---- */
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
               "Helvetica Neue", Arial, sans-serif;
  --font-display: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
                  "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, "SF Mono", "Cascadia Mono", Menlo, monospace;

  /* ---- raw palette ---- */
  --color-fil-100:#E6FFF8; --color-fil-300:#9CF6E0; --color-fil-400:#7CF3D8;
  --color-fil-500:#4FE9C4; --color-fil-600:#22C9A3; --color-fil-700:#0A6E59;
  --color-fil-900:#04332A;
  --color-ion-300:#C3BAFF; --color-ion-400:#9B8CFF; --color-ion-500:#7B68F5;
  --color-ion-600:#5B48D9; --color-ion-700:#4B39C9; --color-ion-900:#231A63;
  --color-emb-300:#FFC79A; --color-emb-400:#FFA65C; --color-emb-500:#F5842A;
  --color-emb-700:#8A4406; --color-emb-900:#3D1E02;
  --color-n-0:#06070A;  --color-n-50:#0D1016; --color-n-100:#161B26;
  --color-n-200:#1E2431; --color-n-300:#232A38; --color-n-400:#2E374A;
  --color-n-500:#4A5566; --color-n-600:#7B8698; --color-n-700:#A6B0C3;
  --color-n-800:#CDD4E0; --color-n-900:#ECEFF6; --color-n-1000:#FFFFFF;
  --color-w-50:#FFFFFF; --color-w-100:#FCFBF8; --color-w-200:#F7F5F0;
  --color-w-300:#EDEAE2; --color-w-400:#DCD8CF; --color-w-500:#B8B3A8;

  /* ---- semantic colour (DARK is the default and the designed case) ---- */
  --color-loop-canvas:         #06070A;   /* 17.50:1 vs text */
  --color-loop-surface:        #0D1016;
  --color-loop-raised:         #161B26;
  --color-loop-border:         #232A38;
  --color-loop-border-strong:  #2E374A;
  --color-loop-text:           #ECEFF6;   /* 17.50:1 */
  --color-loop-text-secondary: #A6B0C3;   /*  9.23:1 */
  --color-loop-text-muted:     #7B8698;   /*  5.47:1 */
  --color-loop-accent:         #4FE9C4;   /* 13.22:1 — Filament */
  --color-loop-accent-hi:      #7CF3D8;   /* 15.03:1 */
  --color-loop-accent-dim:     #22C9A3;
  --color-loop-accent-2:       #9B8CFF;   /*  7.28:1 — Ion: back/history/reverse */
  --color-loop-accent-3:       #FFA65C;   /* 10.42:1 — Ember: discovery/heat */
  --color-loop-on-accent:      #06070A;   /* 13.22:1 on Filament */
  --color-loop-focus:          #7CF3D8;   /* 15.03:1 */

  /* ---- type scale (fluid 360 -> 1440) ---- */
  --text-display: clamp(2.75rem, 1.30rem + 6.44vw, 7rem);
  --text-h1:      clamp(2rem, 1.32rem + 3.02vw, 4rem);
  --text-h2:      clamp(1.5rem, 1.17rem + 1.48vw, 2.5rem);
  --text-h3:      clamp(1.25rem, 1.12rem + 0.56vw, 1.625rem);
  --text-lead:    clamp(1.125rem, 1.02rem + 0.46vw, 1.4375rem);
  --text-body:    clamp(1rem, 0.96rem + 0.19vw, 1.125rem);
  --text-sm:      clamp(0.875rem, 0.86rem + 0.09vw, 0.9375rem);
  --text-xs:      0.75rem;

  /* ---- easings ---- */
  --ease-loop:     cubic-bezier(.65,0,.35,1);
  --ease-drift:    cubic-bezier(.37,0,.63,1);
  --ease-enter:    cubic-bezier(.16,1,.3,1);
  --ease-exit:     cubic-bezier(.7,0,.84,0);
  --ease-snap:     cubic-bezier(.2,.9,.1,1);
  --ease-orbit:    linear;
  --ease-elastic:  cubic-bezier(.34,1.56,.64,1);
  --ease-spring-soft:linear(0,.0732,.2212,.3971,.5565,.6918,.8021,.8803,.935,.9722,.9938,1.006,1.0113,1.0127,1.0119,1.01,1.0079,1.0057,1.004,1.0026,1.0016,1.0009,1);
  --ease-spring-snap:linear(0,.0779,.2325,.4081,.573,.7119,.8201,.8987,.9545,.9875,1.0063,1.0153,1.0181,1.0173,1.0148,1.0115,1.0084,1.0058,1.0037,1.0021,1.001,1.0004,1);
  --ease-spring-magnetic:linear(0,.0686,.2132,.3894,.5541,.6968,.8142,.8984,.9568,.9953,1.0163,1.0263,1.0286,1.0266,1.0223,1.0174,1.0127,1.0085,1.0053,1.0029,1.0012,1.0001,1);
  --ease-spring-bounce:linear(0,.1584,.4661,.7788,.9984,1.1151,1.1462,1.1227,1.0776,1.032,1,.9828,.9786,.9821,.9889,.9954,1,1.0025,1.0031,1.0026,1.0016,1.0007,1);

  --radius-sm:6px; --radius-md:12px; --radius-lg:20px; --radius-xl:32px;
}

/* ---------- aliases + non-namespaced tokens ---------- */
:root {
  color-scheme: dark;
  --c-canvas:var(--color-loop-canvas);            --c-surface:var(--color-loop-surface);
  --c-surface-raised:var(--color-loop-raised);
  --c-surface-overlay:color-mix(in oklab, var(--color-loop-surface) 82%, transparent);
  --c-border:var(--color-loop-border);            --c-border-strong:var(--color-loop-border-strong);
  --c-text:var(--color-loop-text);                --c-text-secondary:var(--color-loop-text-secondary);
  --c-text-muted:var(--color-loop-text-muted);    --c-text-inverse:var(--color-loop-canvas);
  --c-accent:var(--color-loop-accent);            --c-accent-hi:var(--color-loop-accent-hi);
  --c-accent-dim:var(--color-loop-accent-dim);    --c-accent-2:var(--color-loop-accent-2);
  --c-accent-3:var(--color-loop-accent-3);        --c-on-accent:var(--color-loop-on-accent);
  --c-focus:var(--color-loop-focus);
  --c-trail-0:color-mix(in oklab, var(--c-accent) 0%,  transparent);
  --c-trail-1:color-mix(in oklab, var(--c-accent) 35%, transparent);
  --c-trail-2:var(--c-accent-hi);

  --shadow-1:0 1px 2px rgb(0 0 0 / .5);
  --shadow-2:0 8px 24px -8px rgb(0 0 0 / .65);
  --shadow-3:0 24px 64px -24px rgb(0 0 0 / .8);
  --glow-1:0 0 8px -1px color-mix(in oklab, var(--c-accent) 55%, transparent);
  --glow-2:0 0 28px -4px color-mix(in oklab, var(--c-accent) 32%, transparent);
  --glow-3:0 0 72px -12px color-mix(in oklab, var(--c-accent-2) 18%, transparent);
  --glow-full:0 0 0 1px color-mix(in oklab, var(--c-accent) 90%, transparent),
              var(--glow-1), var(--glow-2), var(--glow-3);
  --blend-traveller:plus-lighter;

  /* line-height / tracking / measure */
  --lh-display:0.94; --lh-h1:1.02; --lh-h2:1.12; --lh-h3:1.25; --lh-body:1.6; --lh-sm:1.45;
  --ls-display:-0.035em; --ls-h1:-0.025em; --ls-h2:-0.015em;
  --ls-body:0em; --ls-sm:0.005em; --ls-label:0.14em;
  --measure:68ch; --measure-lead:54ch; --measure-display:18ch;

  /* space, layout, z */
  --sp-1:.25rem; --sp-2:.5rem; --sp-3:.75rem; --sp-4:1rem; --sp-5:1.5rem;
  --sp-6:2rem; --sp-7:3rem; --sp-8:4rem; --sp-9:6rem; --sp-10:8rem;
  --gutter:max(1rem, env(safe-area-inset-left), env(safe-area-inset-right));
  --gutter-b:max(1rem, env(safe-area-inset-bottom));
  --content-max:76rem; --tap-min:48px;
  --z-bg:0; --z-room:10; --z-ring:20; --z-caption:30; --z-nav:80; --z-overlay:90;

  /* durations */
  --dur-1:80ms; --dur-2:120ms; --dur-3:180ms; --dur-4:240ms;
  --dur-5:360ms; --dur-6:520ms; --dur-7:720ms; --dur-8:1200ms;

  /* THE CLOCK: one revolution = 4000ms. Everything else is a multiple. */
  --loop-half:4000ms;     /* one revolution — the master */
  --loop-cycle:8000ms;    /* 2 revolutions */
  --loop-double:16000ms;  /* 4 revolutions */
  --loop-slow:24000ms;    /* 6 revolutions — the Return */

  /* amplitudes — components read these, never hardcode */
  --amp-drift:24px; --amp-parallax:40px; --amp-lift:4px; --amp-tilt:7deg;
  --amp-magnet:14px; --amp-breathe:0.26; --amp-flash:0.06;
  --amp-scale-press:0.97; --amp-scale-hover:1.03;
  --trail-len:18px; --trail-tau:380ms;
  --phase-n:12; --follow-lerp:0.12;

  /* ring geometry mirrors (written by JS once per resize; CSS reads them) */
  --ring-r:0px; --ring-cx:50%; --ring-cy:50%;
}

@property --loop-t { syntax:"<number>"; inherits:true; initial-value:0; }
@property --px     { syntax:"<number>"; inherits:true; initial-value:0.5; }
@property --py     { syntax:"<number>"; inherits:true; initial-value:0.5; }
:root { animation: loop-clock var(--loop-half) linear infinite; }
@keyframes loop-clock { from{--loop-t:0} to{--loop-t:1} }
.loop-set > * { animation-delay: calc(-1 * var(--loop-half) * var(--i) / var(--phase-n)); }

/* ---------- light theme: a real design, not an inversion ---------- */
[data-theme="light"], :root:not([data-theme="dark"]):where(.light-pref) {
  color-scheme: light;
  --color-loop-canvas:#F7F5F0; --color-loop-surface:#FFFFFF; --color-loop-raised:#FFFFFF;
  --color-loop-border:#DCD8CF; --color-loop-border-strong:#B8B3A8;
  --color-loop-text:#0B0D12; --color-loop-text-secondary:#3E4655;
  --color-loop-text-muted:#5C6575;
  --color-loop-accent:#0A6E59; --color-loop-accent-hi:#0A6E59; --color-loop-accent-dim:#22C9A3;
  --color-loop-accent-2:#4B39C9; --color-loop-accent-3:#8A4406;
  --color-loop-on-accent:#FFFFFF; --color-loop-focus:#4B39C9;
  --glow-1:0 0 0 1px color-mix(in oklab, var(--c-accent) 70%, transparent);
  --glow-2:0 6px 18px -8px color-mix(in oklab, var(--c-accent) 45%, transparent);
  --glow-3:0 0 0 0 transparent; --glow-full:var(--glow-1), var(--glow-2);
  --blend-traveller:multiply;
}
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
    color-scheme: light;
    --color-loop-canvas:#F7F5F0; --color-loop-surface:#FFFFFF; --color-loop-raised:#FFFFFF;
    --color-loop-border:#DCD8CF; --color-loop-border-strong:#B8B3A8;
    --color-loop-text:#0B0D12; --color-loop-text-secondary:#3E4655;
    --color-loop-text-muted:#5C6575;
    --color-loop-accent:#0A6E59; --color-loop-accent-hi:#0A6E59;
    --color-loop-accent-2:#4B39C9; --color-loop-accent-3:#8A4406;
    --color-loop-on-accent:#FFFFFF; --color-loop-focus:#4B39C9;
    --glow-1:0 0 0 1px color-mix(in oklab, var(--c-accent) 70%, transparent);
    --glow-2:0 6px 18px -8px color-mix(in oklab, var(--c-accent) 45%, transparent);
    --glow-3:0 0 0 0 transparent; --glow-full:var(--glow-1), var(--glow-2);
    --blend-traveller:multiply;
  }
}

/* ---------- critical base layer ---------- */
*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; }
html { -webkit-text-size-adjust:100%; text-size-adjust:100%; }
body {
  min-height:100svh; min-height:100dvh;
  font-family:var(--font-sans); font-size:var(--text-body); line-height:var(--lh-body);
  letter-spacing:var(--ls-body); color:var(--c-text); background:var(--c-canvas);
  -webkit-font-smoothing:antialiased; overflow-x:clip;
}
img, svg, video, canvas { display:block; max-width:100%; }
button, input, select, textarea { font:inherit; color:inherit; }
button { background:none; border:0; cursor:pointer; touch-action:manipulation; }
a { color:inherit; text-decoration:none; }
h1,h2,h3 { font-family:var(--font-display); font-weight:600; text-wrap:balance; }
p { text-wrap:pretty; }
:focus-visible { outline:2px solid var(--c-focus); outline-offset:3px; border-radius:var(--radius-sm); }
:focus:not(:focus-visible) { outline:none; }
::selection { background:var(--c-accent); color:var(--c-on-accent); }

/* Hero caption: absolutely positioned inside the stage, so opacity changes cost 0 CLS. */
#loop-title { position:absolute; left:50%; transform:translateX(-50%);
  top:calc(var(--ring-cy) + var(--ring-r) + 28px);
  font-size:var(--text-lead); line-height:1.3; letter-spacing:var(--ls-h2);
  color:var(--c-text); text-align:center; max-width:var(--measure-display);
  opacity:0; animation:caption-in var(--dur-6) var(--ease-enter) 1800ms both; }
#loop-title .echo { display:block; color:var(--c-text-muted); font-size:var(--text-sm); }
@keyframes caption-in { from{opacity:0} to{opacity:1} }
[data-stage-state="engaged"] #loop-title { opacity:0; transition:opacity var(--dur-5) var(--ease-exit); }
#loop-status { position:absolute; left:50%; transform:translateX(-50%);
  top:calc(var(--ring-cy) + var(--ring-r) + 28px); min-height:2.2em;
  font-size:var(--text-lead); color:var(--c-text); text-align:center; }

/* utilities used across the site */
.u-glow { box-shadow:var(--glow-full); }
.u-label { font-size:var(--text-xs); letter-spacing:var(--ls-label); text-transform:lowercase;
  font-weight:500; color:var(--c-text-muted); }
.u-num { font-family:var(--font-mono); font-variant-numeric:tabular-nums; }
.u-sr { position:absolute; width:1px; height:1px; padding:0; margin:-1px;
  overflow:hidden; clip-path:inset(50%); white-space:nowrap; }
.skip-link { position:absolute; left:-9999px; }
.skip-link:focus-visible { left:var(--sp-4); top:var(--sp-4); z-index:var(--z-overlay);
  background:var(--c-surface-raised); color:var(--c-text); padding:var(--sp-3) var(--sp-4);
  border-radius:var(--radius-md); }
@media (hover:hover) and (pointer:fine) {
  .u-hover-lift:hover { transform:translateY(calc(-1 * var(--amp-lift)));
    transition:transform var(--dur-2) var(--ease-snap); }
}

/* ---------- reduced motion: the calm variant, never nothing ---------- */
@media (prefers-reduced-motion: reduce) {
  :root {
    --dur-1:60ms; --dur-2:100ms; --dur-3:120ms; --dur-4:150ms;
    --dur-5:160ms; --dur-6:180ms; --dur-7:200ms; --dur-8:220ms;
    --amp-drift:0px; --amp-parallax:0px; --amp-lift:0px; --amp-tilt:0deg;
    --amp-magnet:0px; --amp-breathe:0.12; --amp-flash:0;
    --amp-scale-press:1; --amp-scale-hover:1;
    --trail-len:0px; --follow-lerp:1;
    --ease-spring-soft:var(--ease-snap);  --ease-spring-snap:var(--ease-snap);
    --ease-spring-magnetic:var(--ease-snap); --ease-spring-bounce:var(--ease-snap);
    --ease-elastic:var(--ease-snap); scroll-behavior:auto;
  }
  #loop-title { animation-duration:var(--dur-5); animation-delay:0ms; }
  .parallax, .tilt { transform:none !important; }
  *, *::before, *::after { animation-duration:var(--dur-5); animation-iteration-count:1;
    transition-duration:var(--dur-3); }
  /* the ambient breathe survives — a still page is a dead page */
  .is-ambient, .is-ambient * { animation-duration:12s !important;
    animation-iteration-count:infinite !important; }
}
:root[data-motion="reduce"] { /* identical overrides, applied by the in-page toggle */ }
@media (prefers-reduced-transparency: reduce) {
  :root { --c-surface-overlay: var(--c-surface); } .glass { backdrop-filter:none; }
}
@media (prefers-contrast: more) {
  :root { --color-loop-text-muted:#A6B0C3; --color-loop-border:#2E374A; }
}
@media (forced-colors: active) {
  :root { --c-accent:Highlight; --c-text:CanvasText; --c-canvas:Canvas; }
  .u-glow { forced-color-adjust:none; }
}
```

**`:root[data-motion="reduce"]`** must repeat the same overrides as the media block verbatim (the
scaffold writes them out; they are elided above only for length). The JS half of the same signal
lives in `useMotionPreference()`, and the two can never disagree because both read
`document.documentElement.dataset.motion`.

---

## F. Architecture contract

Stack, budgets, testing pins and sandbox gotchas are doc 03's and are restated here in full so
no build agent needs another file. The scaffold agent additionally reads doc 03 §10 for the
verbatim config files (`package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`,
`eslint.config.mjs`, `pnpm-workspace.yaml`, `.npmrc`, `.gitignore`, `playwright.config.ts`).

### F.1 Pins and rules

| Area | Decision |
|---|---|
| Framework | Next.js **16.3.5**, App Router, **default (server) output** — not `output:'export'` (we keep one Route Handler for the beacon) |
| Runtime | react **19.3.0** / react-dom **19.3.0** |
| Language | TypeScript **5.9.3** (not the 7.x native port) |
| Styling | Tailwind CSS **4.3.3** + `@tailwindcss/postcss@4.3.3`, `@theme` tokens |
| Animation | CSS/WAAPI first; `motion@13.4.0` **`motion/mini` only** (+3.5 KB gz). **`motion/react` is banned** (+38.5 KB gz) |
| Graphics | Canvas 2D everywhere. **No three.js** (+126.6 KB gz), no regl unless the architect approves one room |
| Fonts | **None.** System stack only. Zero font bytes, zero font requests |
| Audio | Web Audio only, synthesized, opt-in behind a real gesture |
| State | URL search param + hash, `localStorage`, one React context. **No state library** |
| Analytics | `@vercel/analytics@2.0.1` + `@vercel/speed-insights@2.0.0` (+2.3 KB gz) + first-party beacon |
| Test | `@playwright/test` **1.56.1** (must match preinstalled Chromium rev 1194), `lighthouse` **13.5.0**, `axe-core`/`@axe-core/playwright` **4.13.0**, `@next/bundle-analyzer` **16.3.5** |
| Package manager | pnpm **10.33.0**, Node ≥22.19 |

**Budgets.** Tier A (render-blocking: the single stylesheet + inline bootstrap) **≤14 KB gz,
hard**. Tier B (all first-party JS on the landing route, excluding the React/Next runtime)
**≤90 KB gz, hard** — the landing route carries shell + RingStage + clock + ORIGIN only.
Tier C (total JS transferred on the landing route) **≤230 KB gz, soft**. Total CSS ≤14 KB gz.
Fonts 0 KB. Raster images 0 bytes. **Per-room lazy chunk ≤40 KB gz** and never more than its
declared `budgetKb`.

**Sandbox gotchas (all QA commands).**

```
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
export CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
export NO_PROXY=localhost,127.0.0.1
export no_proxy=localhost,127.0.0.1
# NEVER run `pnpm exec playwright install` — the browser is preinstalled.
```

Without the `NO_PROXY`/`no_proxy` pair, `curl`/`fetch` to `http://127.0.0.1:3111` returns
nothing in this sandbox, which hangs the readiness poll in `audit-perf.mjs` and Playwright's
`webServer`. Chromium itself reaches localhost fine — that asymmetry is the confusing part.
Also: `next lint` does not exist in Next 16; the lint script is plain `eslint`.

### F.2 Directory tree

```
loopsite/
├── design/                         # 01..05 (05 is this file)
├── public/og/                      # build-time generated OG images (SVG)
├── scripts/
│   ├── audit-perf.mjs              # Lighthouse + byte-budget gate
│   └── bundle-budget.mjs           # gzip accounting, Tier B/C
├── src/
│   ├── app/
│   │   ├── layout.tsx              # <html>, tokens, skip link, landmarks, Analytics
│   │   ├── page.tsx                # the experience; room preselected from ?s=
│   │   ├── globals.css             # §E verbatim
│   │   ├── not-found.tsx           # the 404 room
│   │   ├── s/[slug]/page.tsx       # prerendered alias, generateStaticParams + metadata
│   │   └── api/beacon/route.ts     # edge, POST -> 204, console.log only
│   ├── components/
│   │   ├── ring/                   # RingStage, RingCanvas, Sweep, NodeLayer, GhostDemo
│   │   ├── hero/                   # HeroCaption (server) + HeroIsland (client)
│   │   ├── shell/                  # AppShell, LoopContext, Ringway, Corridor, NextArc,
│   │   │                           #   SkipLink, MotionToggle, SoundToggle, LiveRegion
│   │   └── ui/                      # Button, Toggle, VisuallyHidden, KeepButton, ShareButton
│   ├── sections/
│   │   ├── registry.ts             # THE manifest — 12 reserved slots + 5 hidden slots
│   │   └── <slug>/
│   │       ├── index.ts            # exports the SectionModule
│   │       ├── Shell.tsx           # server component
│   │       ├── Room.tsx            # client component, dynamic(ssr:false)
│   │       ├── logic.ts            # pure, testable, no DOM
│   │       └── room.module.css
│   ├── lib/                        # THE SHARED CONTRACT — scaffold writes all of it
│   │   ├── types.ts  clock.ts  ring-store.ts  ring-geometry.ts  share.ts  keep.ts
│   │   ├── tokens.ts  motion.ts  use-motion-preference.ts  use-lazy-mount.ts
│   │   ├── use-canvas.ts  rng.ts  url-state.ts  storage.ts  beacon.ts  audio.ts
│   │   ├── garden-seed.ts  hero-bootstrap.ts
│   └── styles/motion.css           # shared @keyframes + reduced-motion layer
├── tests/                          # smoke, rooms, a11y, reduced-motion, rooms/<slug>.spec.ts
└── (config files per doc 03 §10)
```

`src/lib/gl.ts` is **not** created: no room uses WebGL. Add it only if the architect approves a
shader room, with a Tier B line.

### F.3 The section contract

```ts
// src/lib/types.ts — written by the scaffold, never edited by a room agent
export type SectionId = string & { readonly __brand: 'SectionId' };

export type ExploreEventName =
  | 'section_viewed' | 'section_interacted' | 'depth_reached'
  | 'collectible_found' | 'section_completed';

export interface ExploreEvent {
  name: ExploreEventName;
  section: SectionId;
  depth?: number;                                        // 0..1, monotonic
  detail?: Record<string, string | number | boolean>;    // non-PII, max 8 keys
}

export interface SectionProps {
  id: SectionId;
  active: boolean;         // this is the ?s= selected room
  visible: boolean;        // >20% visible. Rooms MUST NOT draw when false.
  reducedMotion: boolean;  // resolved once in the shell; rooms never call matchMedia
  seed: number;            // from ?seed=; same seed => same visuals
  onExplore: (event: ExploreEvent) => void;

  // --- Loop additions, present on every room ---
  clock: ClockFrame;            // read-only snapshot for the current frame
  nodes: readonly RingNode[];   // read-only. Rooms never mutate the set.
  geometry: RingGeometry;       // { cx, cy, R, band, dpr, w, h }
  fired: readonly FireEvent[];  // nodes that fired this frame: { node, lateness }
  ctx: CanvasRenderingContext2D;      // the ROOM layer
  bg: CanvasRenderingContext2D;       // the BACKGROUND layer
  tier: 'high' | 'mid' | 'low';
  say: (text: string, ms?: number) => void;  // caption slot; only §I strings are legal
}

export interface SectionModule {
  id: SectionId;
  title: string;            // the one-word label: nav, <h2>, Ringway
  hook: string;             // the one-line hook copy (§I)
  blurb: string;            // one sentence for generateMetadata on /s/[slug]
  next: SectionId;          // the Next Arc destination
  notch: number | null;     // 1..12, or null for hidden destinations
  kind: 'core' | 'expansion' | 'hidden';
  Shell: React.ComponentType<{ children?: React.ReactNode }>;
  load: () => Promise<{ default: React.ComponentType<SectionProps> }>;
  reservedHeight: string;   // '100dvh'
  budgetKb: number;         // CI asserts the gz chunk size
  heavy?: boolean;          // caps DPR at 1.5 (MIRROR, TRAIL)
}
```

**Lifecycle rules, non-negotiable.** (1) All setup in one `useEffect` keyed on
`[seed, reducedMotion]`. (2) Never call `requestAnimationFrame` — register a `draw(props)` with
the shared clock instead. (3) `section_viewed` once, on first activity; `depth_reached` at most
once per 0.25 step. (4) Never read `window`/`document` outside an effect; never call
`matchMedia`; never touch `localStorage` (use `storage.ts`). (5) Release everything in cleanup.
(6) Under `reducedMotion`, render a **still, complete** composition — never an empty box.
(7) Never draw on the ring layer. (8) Never mutate `nodes`.

### F.4 `src/lib/` API surface

```ts
// clock.ts — ONE rAF loop for the whole app
export function startClock(): void;                     // idempotent; called once by AppShell
export function stopClock(): void;
export function subscribeFrame(fn: (f: ClockFrame) => void): () => void;
export function getFrame(): ClockFrame;
export function setDirection(dir: 1 | -1): void;
export function setPeriod(ms: number, easeMs?: number): void;   // SLOW
export function phaseOf(i: number, n: number): number;          // phase offsets
export const SWEEP_MS = 4000;

// ring-store.ts — the node set. The only mutable global state.
export function getNodes(): readonly RingNode[];
export function addNode(a: number, r: number, v?: number): RingNode | null;  // null at 24
export function moveNode(id: string, a: number, r: number): void;
export function removeNode(id: string): void;
export function clearNodes(): RingNode[];              // returns them for SILENCE restore
export function restoreNodes(nodes: readonly RingNode[]): void;
export function subscribeNodes(fn: (n: readonly RingNode[]) => void): () => void;
export const MAX_NODES = 24;

// ring-geometry.ts
export interface RingGeometry { cx:number; cy:number; R:number; band:number;
  dpr:number; w:number; h:number; }
export function computeGeometry(w: number, h: number, coarse: boolean): RingGeometry;
export function angleAt(x: number, y: number, g: RingGeometry): number;   // 0..1
export function levelAt(x: number, y: number, g: RingGeometry): number;   // 0..15
export function pointAt(a: number, level: number, g: RingGeometry): { x:number; y:number };

// share.ts
export function encodeLoop(nodes: readonly RingNode[], flags?: { reverse?:boolean; slow?:boolean }): string;
export function decodeLoop(code: string): { nodes: RingNode[]; reverse:boolean; slow:boolean } | null;
export function shareUrl(slug: string, code: string): string;
export function copyToClipboard(text: string): Promise<boolean>;

// keep.ts
export function keepPng(canvases: HTMLCanvasElement[], filename: string): Promise<boolean>;

// tokens.ts — the ONLY reader of CSS custom properties
export function token(name: string): string;                 // e.g. '--color-loop-accent'
export function rgba(name: string, alpha: number): string;   // resolves + applies alpha
export function refreshTokens(): void;                       // on theme change
export function duration(name: string): number;              // '--dur-6' -> 520

// motion.ts
export function animateEl(el: Element, keyframes: Keyframe[] | PropertyIndexedKeyframes,
  options: KeyframeAnimationOptions): Promise<void>;   // motion/mini; jumps to end under reduce

// use-motion-preference.ts — the ONLY caller of matchMedia('(prefers-reduced-motion…')
export function useMotionPreference(): 'auto' | 'reduce';
export function setMotionOverride(v: 'auto' | 'reduce'): void;

// use-canvas.ts — DPR cap, ResizeObserver sizing, visibility pause, frame registration
export function useCanvas(opts?: { heavy?: boolean }): {
  ref: React.RefObject<HTMLCanvasElement | null>;
  ctx: CanvasRenderingContext2D | null;
  geometry: RingGeometry;
};
export function decay(ctx: CanvasRenderingContext2D, dt: number, tauMs: number, bg: string): void;
// decay() implements the frame-rate-independent recipe:
//   ctx.fillStyle = rgba(bg, 1 - Math.exp(-dt / tauMs)); ctx.fillRect(0,0,w,h);
// DPR: Math.min(devicePixelRatio || 1, heavy ? 1.5 : 2), total backing store capped at 2.5 Mpx.
// Resize via ResizeObserver debounced 100ms. Never the window 'resize' event.

// use-lazy-mount.ts
export function useLazyMount(opts?: IntersectionObserverInit): [React.RefObject<HTMLElement|null>, boolean];

// rng.ts
export function hashSeed(seed: number, key: string): number;
export function mulberry32(seed: number): () => number;

// url-state.ts — the ONLY toucher of location/history
export function useUrlState(): {
  section: string; seed: number; loopCode: string | null;
  setSection(slug: string, mode: 'push' | 'replace'): void;
  setLoopCode(code: string | null): void;
};

// storage.ts — every read/write try/catch'd; failures return DEFAULT
export function readState(): LoopState;
export function writeState(patch: Partial<LoopState>): void;   // debounced 500ms
export function markVisited(slug: string): void;
export function markFound(id: string): void;

// beacon.ts
export function initBeacon(): void;     // session_start, flushes window.__loop.q
export function beacon(name: BeaconEventName, detail?: Record<string, string|number|boolean>): void;

// audio.ts — opt-in, synthesized, singleton context
export function isEnabled(): boolean;
export function enableAudio(): Promise<boolean>;  // MUST be called inside a gesture handler
export function disableAudio(): void;
export function playCue(name: 'kick'|'snare'|'hat'|'tone'|'chime', opts?: { freq?:number; gain?:number; when?:number }): void;
export function setMasterGain(g: number, rampMs?: number): void;  // never set .value directly
// Lazy AudioContext inside pointerdown; master GainNode ramped over 40ms;
// suspends on visibilitychange->hidden, resumes on gesture. Rooms never touch AudioContext.

// garden-seed.ts
export const GARDEN_SEEDS: readonly string[];   // 150 share codes, build-time constant

// hero-bootstrap.ts
export const HERO_BOOTSTRAP: string;   // <=2KB module source, inlined via dangerouslySetInnerHTML
```

**The inline bootstrap** sets `data-loop-js` on `<html>` synchronously (so the JS layout is the
first paint and CLS stays 0), attaches `{passive:true}` `pointermove`/`pointerdown`/`touchstart`
listeners, writes `--px`/`--py` coalesced into one rAF, checks
`matchMedia('(prefers-reduced-motion: reduce)')` and does nothing motion-related if it matches,
sets `window.__loop = { interacted:false, q:[], off:[] }`, pushes `hero_interacted` into `q` on
the first real interaction, and adds `data-loop-hero-ready` to `<html>`. React **adopts** it:
`HeroIsland` flushes `q` into the beacon and calls `window.__loop.off` to detach the bootstrap
listeners. Both implementations drive the same two custom properties, so there is no visual
discontinuity.

### F.5 The registry

`src/sections/registry.ts` is the only file more than one agent edits. It is **append-only**, and
the scaffold pre-writes numbered slot markers so two agents appending never touch the same line.

```ts
import type { SectionModule } from '@/lib/types';
// SLOT WP1-1  origin
// SLOT WP2-1  pulse
// SLOT WP2-2  tone
// SLOT WP3-1  trail
// SLOT WP4-1  swarm
// SLOT WP4-2  mirror
// SLOT WP5-1  growth
// SLOT WP5-2  orbit
// SLOT WP6-1  loom
// SLOT WP6-2  wear
// SLOT WP7-1  garden
// SLOT WP1-2  return
// SLOT WP7-H1 silence   SLOT WP7-H2 reverse   SLOT WP7-H3 slow
// SLOT WP7-H4 144       SLOT WP7-H5 twin
export const ROOMS: SectionModule[] = [ /* one entry per slot, in notch order */ ];
export const HIDDEN: SectionModule[] = [ /* the five */ ];
export const bySlug = (s: string) => ROOMS.find(r => r.id === s) ?? HIDDEN.find(r => r.id === s);
```

Room order in `ROOMS` is fixed and is the notch order:
`origin, pulse, tone, trail, swarm, mirror, growth, orbit, loom, wear, garden, return`.

### F.6 Layout composition

```
<html data-motion data-theme data-loop-js data-loop-hero-ready>
 <body>
  <a class="skip-link" href="#stage">skip to the ring</a>
  <main id="main">
    <h1 id="loop-title">tap the ring<span class="echo">it comes back</span></h1>
    <div id="stage" role="application" tabindex="0" aria-label="the ring — place nodes on a four second loop">
      <canvas id="loop-bg"   aria-hidden="true"></canvas>        <!-- z-bg,   room-owned -->
      <canvas id="loop-room" role="img" aria-label="<room description>"></canvas>  <!-- z-room -->
      <canvas id="loop-ring" aria-hidden="true"></canvas>        <!-- z-ring,  RingStage-owned -->
      <p id="loop-status" aria-live="polite"></p>                <!-- z-caption -->
      <div class="sr-controls u-sr"> … keyboard-equivalent buttons … </div>
    </div>
    <nav aria-label="rooms"> … Ringway: 12 <a href="/?s=…"> … </nav>
    <a class="next-arc" href="/?s=<next>"> <svg><textPath>pulse</textPath></svg> </a>
    <div class="corridor"> … the 12 server-rendered room shells … </div>
  </main>
  <footer> sound · gentle mode · keep this · send your loop </footer>
 </body>
</html>
```

- **RingStage is persistent.** It mounts once, outside the room switch, and is never unmounted,
  keyed or remounted by navigation. The ring's phase and node set survive every transition.
- **Without JS** the document is a plain, readable, scrollable page: all twelve room shells are
  visible in order, each with its `<h2>`, hook line and an anchor to the next. The Ringway is a
  list of links that work. This is what the A1 rubric item and `tests/rooms.spec.ts` assert
  against the **raw response body**.
- **With JS** (`html[data-loop-js]`, set synchronously by the bootstrap before first paint) the
  corridor collapses to `100dvh` with only the active room's shell visible, and the stage takes
  over. Because the attribute is set before paint, there is no reflow and CLS stays 0.
- Each room shell reserves `min-height:100dvh` and is `position:absolute; inset:0;` within the
  corridor in JS mode, so cross-fades cost zero layout.

---

## G. Work packages

**The rule: one agent, one directory. A file has exactly one owner.** There are exactly two
shared files and both are append-only with pre-reserved slots: `src/sections/registry.ts` and
the `tests/rooms/` directory (one file per room, named for the room).

`package.json` `dependencies` is **frozen** after WP0. Adding a dependency needs the architect's
approval and a Tier B budget line.

Every `src/lib/**` file is **frozen** after WP0 except `src/lib/audio.ts` (owned by WP2). A room
agent who needs a change to a shared module opens an issue; the architect makes the change. A
room agent editing `src/lib/types.ts` is the failure mode that costs the swarm a day.

### WP0 — Scaffold (runs alone, blocking; nothing else starts until it merges)

**Owns:** everything, initially.
**Deliverables:**
1. Every config file from doc 03 §10, verbatim: `package.json`, `next.config.ts`,
   `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `pnpm-workspace.yaml`, `.npmrc`,
   `.gitignore`, `playwright.config.ts`, `README.md`. **Do not use `create-next-app`.**
2. `src/app/globals.css` — §E of this document, verbatim, including the repeated
   `:root[data-motion="reduce"]` block.
3. **The complete `src/lib/` contract — all seventeen modules, fully implemented, typed and
   exported. Not stubs.** A room agent must be able to `import { subscribeFrame } from
   '@/lib/clock'` on their first line of work. `audio.ts` may ship as a working no-op skeleton
   with the real signatures (WP2 fills it in).
4. `src/app/layout.tsx`, `page.tsx`, `not-found.tsx`, `s/[slug]/page.tsx`, `api/beacon/route.ts`.
5. `src/components/shell/**` (AppShell, LoopContext, Ringway, Corridor, NextArc, SkipLink,
   MotionToggle, SoundToggle, LiveRegion) and `src/components/ui/**` — working, plain, unstyled
   beyond tokens. WP1/WP3 polish them.
6. `src/components/ring/**` as a **working minimum**: three stacked canvases, geometry,
   the sweep, node placement, node firing. WP1 owns it from then on.
7. `src/sections/registry.ts` with all seventeen slot markers and **one worked reference room**
   at `src/sections/_example/` implementing `SectionModule` end to end — canvas, reduced-motion
   still, `onExplore` calls, `room.module.css`, and a `tests/rooms/_example.spec.ts`. Every
   room agent copies this folder. A reference implementation removes more ambiguity than prose.
8. `tests/smoke.spec.ts`, `tests/rooms.spec.ts`, `tests/a11y.spec.ts`,
   `tests/reduced-motion.spec.ts` with the shared no-console-errors fixture.
9. `scripts/audit-perf.mjs` and `scripts/bundle-budget.mjs` with a recorded framework baseline in
   `perf-baseline.json`.
10. **A green `pnpm verify` on the empty site. WP0 does not end until `pnpm verify` passes.**

**Acceptance:** `pnpm typecheck && pnpm lint && pnpm test:e2e && pnpm audit:perf` all green; the
landing route Tier B under 20 KB gz; `/` renders a ring that sweeps and accepts a tap with
JS **and** a readable twelve-section document without it.
**Must not:** implement any room beyond `_example`; write copy not in §I; add a dependency
beyond doc 03 §10.2.

---

### WP1 — Ring engine, hero, ORIGIN, RETURN *(core — most careful assignment)*

**Owns:** `src/components/ring/**`, `src/components/hero/**`, `src/lib/hero-bootstrap.ts`,
`src/app/layout.tsx`, `src/sections/origin/**`, `src/sections/return/**`,
`tests/rooms/origin.spec.ts`, `tests/rooms/return.spec.ts`. Registry slots WP1-1, WP1-2.
**Deliverables:** the ring/sweep/node rendering to the spec in §C.1–C.3 including comet trail,
pointer-proximity slowing, node place/move/remove, the 24-node rim flash, the ghost-node
self-demo at 6 s and 14 s, the hero caption state machine (§B copy sequence), the ≤2 KB inline
bootstrap and React's adoption of it, ORIGIN (§D.1) and RETURN (§D.12) including the door and
the final line.
**Acceptance:** hero interactive within 1 s of `commit` with React unhydrated (asserted by
`tests/smoke.spec.ts`); a tap produces a visible node in <100 ms; a node fires within
4000 ms ±40 ms; the ghost demo fires exactly twice and never after input; reduced motion shows
a twelve-step sweep from the first frame; Tier B (shell+ring+ORIGIN) ≤34 KB gz; axe clean.
**Must not touch:** `src/lib/**` (except its own `hero-bootstrap.ts`), any other room,
`src/components/shell/**`, `tests/*.spec.ts` at the top level.

---

### WP2 — PULSE, TONE, and the audio engine *(core)*

**Owns:** `src/sections/pulse/**`, `src/sections/tone/**`, `src/lib/audio.ts`,
`src/components/ui/SoundPetal.tsx`, `tests/rooms/pulse.spec.ts`, `tests/rooms/tone.spec.ts`.
Registry slots WP2-1, WP2-2.
**Deliverables:** PULSE (§D.2) with the three shaped voices and the 400 ms global-flash cap;
TONE (§D.3) with the pentatonic radius mapping, the strings, the 4/5 second ring and the true
20 s realignment; the whole synthesized audio engine (kick/snare/hat/tone/chime), the sound
petal with `sound`/`quiet` and `aria-pressed`, gesture-constructed `AudioContext`, 40 ms gain
ramps, suspend on hidden.
**Acceptance:** with audio off, both rooms are complete experiences (asserted by a muted
Playwright run); `AudioContext` is never constructed outside a gesture handler (asserted by a
spy in `tests/rooms/pulse.spec.ts`); no global flash faster than 2.5 Hz under any node
arrangement; both chunks within `budgetKb`; reduced-motion stills are complete compositions.
**Must not touch:** `src/lib/**` except `audio.ts`; the ring layer; any other room.

---

### WP3 — TRAIL, Ringway, corridor navigation, Keep and Share *(core)*

**Owns:** `src/sections/trail/**`, `src/components/shell/**` (Ringway, Corridor, NextArc,
LiveRegion, MotionToggle, SoundToggle wiring), `src/components/ui/KeepButton.tsx`,
`src/components/ui/ShareButton.tsx`, `tests/rooms/trail.spec.ts`,
`tests/navigation.spec.ts`. Registry slot WP3-1.
**Deliverables:** TRAIL (§D.4) with the ink canvas and the spring pen; the Ringway (§C.5) in
both desktop and mobile arrangements with the visited/unvisited/current encodings, the lock-in
animation, endowed progress at 1/12 and the `n/5` hub counter; the corridor transition (§C.11)
including push/replace discipline, swipe, arrows and digits; the Next Arc with per-room
destination labels and the 4 s idle escalation; `keep this` (PNG) and `send your loop` with the
exact §C.7 codec wired to the clipboard and to inbound `#l=` links.
**Acceptance:** Back returns to the previous deliberate room in **one** press after ten passive
room changes; every notch is a real link that works with JS disabled; a shared link round-trips
byte-exactly (property test over 1000 random node sets in `tests/navigation.spec.ts`); focus
moves to the new `<h2>` on deliberate navigation and never on passive; wheel events change
nothing.
**Must not touch:** `src/lib/**`; `src/components/ring/**`; `src/app/layout.tsx`; other rooms.

---

### WP4 — SWARM, MIRROR *(expansion)*

**Owns:** `src/sections/swarm/**`, `src/sections/mirror/**`, `tests/rooms/swarm.spec.ts`,
`tests/rooms/mirror.spec.ts`. Registry slots WP4-1, WP4-2.
**Deliverables:** §D.5 and §D.6 including tiered agent counts, pre-allocated typed arrays, the
bounded feedback accumulation, the deterministic ghost mark, and both reduced-motion stills.
**Acceptance:** SWARM holds ≥45 fps at tier low on a 4× CPU throttle; MIRROR declares
`heavy: true` and caps DPR at 1.5; neither allocates inside the frame loop; both chunks within
budget; axe clean; reduced-motion renders non-uniform, non-empty frames.
**Must not touch:** anything outside its two folders and its two test files.

---

### WP5 — GROWTH, ORBIT *(expansion)*

**Owns:** `src/sections/growth/**`, `src/sections/orbit/**`, `tests/rooms/growth.spec.ts`,
`tests/rooms/orbit.spec.ts`. Registry slots WP5-1, WP5-2.
**Deliverables:** §D.7 and §D.8, including the cached `Path2D` per generation, the segment cap,
the true epicycle sum (**no fabricated "recognised" silhouette**), and the harmonic label on
pointer proximity.
**Acceptance:** GROWTH never exceeds its segment cap at any node arrangement; a node drag
rebuilds in ≤1 frame; ORBIT's traced curve always closes; both reduced-motion variants are
complete static images; chunks within budget.
**Must not touch:** anything outside its two folders and its two test files.

---

### WP6 — LOOM, WEAR *(expansion)*

**Owns:** `src/sections/loom/**`, `src/sections/wear/**`, `tests/rooms/loom.spec.ts`,
`tests/rooms/wear.spec.ts`. Registry slots WP6-1, WP6-2.
**Deliverables:** §D.9 and §D.10, including the real interlacement rule, clock-locked scrolling,
the `vigor` decay with its 0.22 floor, the `it's getting tired` / `better.` copy and the
revival overshoot.
**Acceptance:** WEAR never removes content, never shows a timer, never punishes, and is fully
revived by a one-level nudge; LOOM causes no horizontal document overflow at 320 px; both
reduced-motion variants express decay with alpha only; chunks within budget.
**Must not touch:** anything outside its two folders and its two test files.

---

### WP7 — GARDEN and the five hidden destinations *(expansion)*

**Owns:** `src/sections/garden/**`, `src/sections/silence/**`, `src/sections/reverse/**`,
`src/sections/slow/**`, `src/sections/144/**`, `src/sections/twin/**`,
`tests/rooms/garden.spec.ts`, `tests/hidden.spec.ts`. Registry slots WP7-1 and WP7-H1..H5.
**Deliverables:** §D.11 and §D.13; the 150-loop seed set consumed from `@/lib/garden-seed`
(WP0 generates the constant — WP7 does not edit `lib`); virtualized field rendering; the
non-destructive preview; all five hidden triggers with their exact thresholds and their keyboard
equivalents; the `collected[]` bookkeeping and the `n/5` hub counter's data (WP3 renders it).
**Acceptance:** **the Garden contains no claim about other people, no live-activity language,
no counter of humans, and no attribution** — asserted by a string test over the rendered DOM and
the room's source; no hidden trigger can fire during a scripted "ordinary use" session
(`tests/hidden.spec.ts` plays 90 s of typical interaction and asserts `collected` stays empty);
SILENCE restores the exact previous node set; REVERSE and SLOW persist across reload; chunk
within budget.
**Must not touch:** `src/lib/**`; the Ringway component; any other room.

---

### Integration cadence

- Each agent works on `agent/wp<N>` off `main` and rebases before every push.
- **Merge order:** WP0 → WP1 → WP3 → WP2 → WP4 → WP5 → WP6 → WP7. WP1 first because everything
  renders on the ring; WP3 second because the Ringway and the corridor are what every other room
  is navigated by.
- Every PR must pass `pnpm verify` and state its Tier B delta from `scripts/bundle-budget.mjs`.
  A room chunk over its declared `budgetKb` fails CI.
- **Definition of done for a room:** shell renders server-side and appears in the raw HTML;
  room chunk mounts lazily; reduced motion renders a complete still; `onExplore` fires
  `section_viewed` and `depth_reached`; keyboard-operable with a real text equivalent for the
  canvas; axe clean at serious/critical; chunk within budget; zero console output.

---

## H. The QA gate

### H.1 `pnpm verify`

```
pnpm verify = pnpm typecheck && pnpm lint && pnpm test:e2e && pnpm audit:perf
```

| Step | Command | What it enforces |
|---|---|---|
| typecheck | `tsc --noEmit` | strict, `noUncheckedIndexedAccess`, no `any` escapes |
| lint | `eslint` | `eslint-config-next@16.3.5` flat config + the two `no-restricted-syntax` bans: `matchMedia('(prefers-reduced-motion…')` outside `use-motion-preference.ts`, and any `localStorage` member access outside `storage.ts` |
| test:e2e | `playwright test` | the four suites below, on projects `desktop` (Desktop Chrome), `mobile` (Pixel 7) and `reduced-motion` |
| audit:perf | `node scripts/audit-perf.mjs` | builds, starts `next start` on port 3111, polls for 200 (**needs `NO_PROXY`**), runs Lighthouse 13.5.0 three times and asserts the **median**, asserts Tier B/Tier C byte budgets and every room's `budgetKb`, writes `perf-report.json`, exits non-zero on any breach |

**`tests/smoke.spec.ts`** — `/` returns 200 and renders one `<h1>`; `html[data-loop-hero-ready]`
appears within 1000 ms of `waitUntil:'commit'`; a synthetic `pointermove` changes `--px` on the
stage **before React hydrates**; a synthetic tap inside the ring band adds a visible node within
100 ms; zero console errors and zero `pageerror` (shared fixture, applied to every spec); no
response ≥400; CLS after a full session is `0` (read via a `PerformanceObserver` injected with
`addInitScript`).

**`tests/rooms.spec.ts`** — every entry in `ROOMS` has `<section id="section-<slug>">` in the
**raw response body**; selecting each room mounts its chunk within 2 s and emits `section_viewed`
(asserted by intercepting `POST /api/beacon` with `page.route`); `/s/<slug>` returns 200 with a
room-specific `<title>` and `og:description`; `/?s=<slug>` starts in that room; Back returns in
one press after ten passive changes.

**`tests/a11y.spec.ts`** — `AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa'])`
on `/`, on `/` after visiting all twelve rooms, and on one `/s/<slug>`: **zero `serious` or
`critical` violations**. Keyboard-only walk: `Tab` reaches the skip link first; the stage is
reachable and operable; `Space` places a node; arrows change rooms; `Esc` behaves per §C.12;
focus is never trapped. Every `<canvas>` has `aria-label` or `aria-hidden="true"`.

**`tests/reduced-motion.spec.ts`** — project with `use:{ reducedMotion:'reduce' }`; every room
renders visible, **non-uniform**, non-empty content (screenshot variance above a floor);
`document.getAnimations().filter(a => a.playState === 'running')` is empty after 1 s except the
explicitly-allowed ambient breathe; the in-page motion toggle flips `html[data-motion]` and takes
effect without reload; the sweep advances in exactly twelve steps per revolution.

**Lighthouse targets** (default mobile simulate: 1638 Kbps, 150 ms RTT, 4× CPU, 412×823 @1.75 —
the CI gate) / (`throttlingMethod:'provided'`, local desktop):

| Metric | CI gate | Local |
|---|---|---|
| FCP | < 1.0 s | < 0.6 s |
| LCP | < 1.8 s | < 1.0 s |
| TTI | < 2.5 s | < 1.5 s |
| TBT | < 150 ms | < 100 ms |
| CLS | **0** | **0** |
| INP | < 100 ms | < 100 ms |
| Performance | ≥ 0.95 | ≥ 0.98 |
| Accessibility | **1.00** | **1.00** |

### H.2 The bounce-risk rubric — restated in full for the audit agent

Score only what is verifiable in the artifact (code inspection, rendered DOM, simulated
conditions). Every item is 0 / partial / full. **Default to zero when ambiguous.**

**Category A — Speed & Stability (20)**

| # | Item | Pts |
|---|---|---|
| A1 | First meaningful content present in initial HTML (no JS required to see the value prop) | 5 |
| A2 | Critical path ≤200 KB; no render-blocking third-party scripts | 4 |
| A3 | Zero layout shift: all media/embeds have reserved dimensions or `aspect-ratio`; fonts metric-matched or `font-display: optional` | 4 |
| A4 | Hero interactive (responds to input) within 1 s; no hydration dependency for first interaction | 4 |
| A5 | No spinner/skeleton occupying the first viewport | 3 |

**Category B — Instant Comprehension (17)**

| # | Item | Pts |
|---|---|---|
| B1 | "What is this?" answerable from the first viewport in ≤8 plain words, above the fold at 360×640 | 6 |
| B2 | Exactly one primary CTA; ≤2 competing visual attractors in the first viewport | 4 |
| B3 | A concrete, specific instance shown (not only abstraction) in the first viewport | 4 |
| B4 | No carousel, no entry modal, no interstitial, no autoplay audio, no gate before value | 3 |

**Category C — Interaction & Agency (16)**

| # | Item | Pts |
|---|---|---|
| C1 | An input-reactive element in the first viewport, working on **both** pointer and touch | 6 |
| C2 | Interaction feedback <100 ms; INP budget <150 ms | 4 |
| C3 | ≥3 distinct kinds of interaction available within the first two screens | 3 |
| C4 | Every interactive element has hover + focus-visible + active states and ≥2 visual signifiers | 3 |

**Category D — Open Loops & Exploration Pull (17)**

| # | Item | Pts |
|---|---|---|
| D1 | Every viewport ends unresolved (no screen is a closed statement) | 4 |
| D2 | A persistent progress/collection indicator, non-zero on arrival (endowed progress) | 4 |
| D3 | A finite, countable set (7–12) with visible unexplored slots | 4 |
| D4 | A "one more" control that is fixed, instant (<300 ms), and never relocates | 3 |
| D5 | ≥1 genuine surprise/variable-reward element, with no scarcity/timer/punishment mechanics | 2 |

**Category E — Depth & Click-Through Architecture (10)**

| # | Item | Pts |
|---|---|---|
| E1 | Zero generic link labels ("read more", "click here", "learn more") anywhere | 3 |
| E2 | Bottom of every content unit presents a full-salience next unit | 3 |
| E3 | Teaser cards carry visual + specific title + gap subline + metadata + visited state | 2 |
| E4 | Branch/path choice offered with 2–3 reversible, real, URL-addressable options | 2 |

**Category F — Mobile (10)**

| # | Item | Pts |
|---|---|---|
| F1 | No horizontal overflow at 320 px; usable at 200% zoom; pinch-zoom not disabled | 3 |
| F2 | Primary action in the thumb zone with safe-area padding | 3 |
| F3 | All targets ≥44 px with ≥8 px spacing | 2 |
| F4 | `dvh`/`svh` used for full-height sections; nothing critical hidden by browser chrome | 2 |

**Category G — Accessibility (10) — hard gate**

| # | Item | Pts |
|---|---|---|
| G1 | Full `prefers-reduced-motion` alternative that is *designed*, not stripped | 3 |
| G2 | Complete keyboard operability, logical order, visible focus, skip link, no traps | 3 |
| G3 | Semantic structure + `aria-live` for dynamic state + text equivalent for any canvas/WebGL centerpiece | 2 |
| G4 | Contrast ≥4.5:1 text / ≥3:1 UI; no state encoded by colour alone | 2 |

**Totals: A 20 + B 17 + C 16 + D 17 + E 10 + F 10 + G 10 = 100.**

**Category H — Trust & Anti-Dark-Pattern — penalties applied after scoring**

| Violation | Penalty |
|---|---|
| Any entry modal, exit-intent popup, or content-obscuring overlay before 30 s / 50% scroll | **−15** |
| Fabricated social proof, fake counts, fake scarcity, countdown timers | **−15** |
| Scroll-jacking or any override of native scroll distance/direction | **−12** |
| Sign-up/email wall before any value delivered | **−12** |
| Curiosity gap whose payoff is smaller than the promise (clickbait) | **−8** |
| Progress indicator not backed by real state | **−6** |
| Infinite feed with no visible end state | **−5** |
| Autoplay audio | **−10** |

**Score → estimated non-bounce**

| Score | Estimated non-bounce (10 s + interaction) | Verdict |
|---|---|---|
| 92–100 | **≥90%** | Meets the target |
| 85–91 | 82–89% | Close; fix A, B, C first |
| 75–84 | 70–81% | Better than median, misses the mandate |
| 60–74 | 55–69% | Ordinary good site |
| <60 | <55% | At or below industry median |

**Hard gates — failing any one caps the total at 74 regardless of points earned:**
- A1 or A4 scored zero (page is slow or dead on arrival)
- B1 scored zero (nobody knows what this is)
- Any Category H penalty ≥12 applied
- Category G total <6

**The threshold for this project is ≥92 with zero Category H penalties.**

### H.3 How Loop is designed to score

E3 (teaser cards) and E4 (2–3 branch choice) do not map cleanly onto a site with no cards and no
branches. The audit agent scores them on the functional equivalents, which must therefore exist:
**E3** = each Ringway notch carries a visual (the notch state), a specific one-word title, the
room's hook line on hover/focus, and a visited marker that is not colour alone. **E4** = the
twelve rooms are all URL-addressable, all reversible, and reachable in any order from the
Ringway — a twelve-way reversible branch, offered without forcing a choice. If an item genuinely
cannot be earned, it is scored zero and the remaining categories must carry the ≥92.

---

## I. Copy inventory — every word on the site, verbatim

**Tone law:** lowercase; two to five words at a time; patient, warm, slightly ceremonial. Never
`experience`, `immersive`, `journey`, `discover`, `unleash`. No exclamation marks. Addresses the
visitor as *you* only when something changed because of them. **No word may appear on the site
that is not in this inventory.** Adding one requires an edit to this section.

### I.1 Hero sequence (ORIGIN), in order

| When | Text |
|---|---|
| in the initial HTML, visible from 1.8 s | `tap the ring` |
| second line of the same `<h1>` | `it comes back` |
| after the first node fires | `again` |
| after the third node | `now it's yours` |
| as the Ringway fades in | `there are twelve of these` |
| RETURN, once, when the twelfth notch lights | `it was always going to come back.` |

### I.2 Room labels (the Ringway, `<h2>`, and Next Arc destinations)

`origin` · `pulse` · `tone` · `trail` · `swarm` · `mirror` · `growth` · `orbit` · `loom` ·
`wear` · `garden` · `return`

### I.3 Room hook lines (one per room, shown once on entry, 3 s, dismissed by any input)

| Room | Hook |
|---|---|
| origin | `tap the ring` |
| pulse | `it has a pulse` |
| tone | `radius is pitch` |
| trail | `it draws` |
| swarm | `they follow it` |
| mirror | `it sees itself` |
| growth | `one more generation` |
| orbit | `circles on circles` |
| loom | `four thousand years` |
| wear | `it's getting tired` |
| garden | `loops left here` |
| return | *(none)* |

### I.4 Micro-copy — the complete remaining inventory

| Context | Text |
|---|---|
| Sound petal, off | `sound` |
| Sound petal, on | `quiet` |
| Keep / save | `keep this` |
| Share | `send your loop` |
| Share, on copy | `copied. it travels.` |
| Arriving from a shared link | `someone left this here` |
| Empty ring for one revolution (SILENCE) | `oh.` |
| WEAR, as it dims | `it's getting tired` |
| WEAR, after a change | `better.` |
| GARDEN | `loops left here` |
| Motion toggle | `gentle mode` |
| 404 (a real room) | `you found the outside. there isn't one.` |

### I.5 Meta and share card

- Title: `Loop — tap. it comes back.`
- Description: `one ring, twelve rooms, no ending.`
- OG image: build-time SVG of the ring with four nodes; no text beyond `loop`.

### I.6 Numerals (the only non-word glyphs that carry meaning)

- Hidden-destination counter on the Ringway hub: `n/5`, Ember, shown once `n ≥ 1`.
- The `144` clock face renders real local time. Nothing else on the site displays a number.

### I.7 Assistive text (present in the accessibility tree, not visible)

| Element | Text |
|---|---|
| Skip link | `skip to the ring` |
| Stage `aria-label` | `the ring — place nodes on a four second loop` |
| Ring canvas | `aria-hidden="true"` |
| Room canvas `aria-label` | `<room label> — <hook>, drawn from your <n> nodes` |
| Ringway `<nav aria-label>` | `rooms` |
| Ringway notch | `<label> — visited` / `<label> — not yet visited` |
| Next Arc | `next room: <label>` |
| RETURN door | `open the rooms` |
| Sound toggle | `sound` with `aria-pressed` |
| Motion toggle | `gentle mode` with `aria-pressed` |
| Live region | announces the room label on each deliberate change |
| Keyboard help (visually hidden, adjacent to the stage) | `space places a node · left and right change rooms · up and down change its radius · escape empties the ring` |

**Forbidden copy, permanently:** any count of people, any "live"/"online now"/"right now"
language, any invented activity, any attribution of a loop to a person, any countdown, any
streak, any "don't miss", any sign-up prompt, any `read more` / `learn more` / `click here`.

---

## J. Decisions made here that the rulings did not cover

Recorded so the audit agent and any later agent can see the reasoning rather than re-deriving it.

1. **No auto-advance between rooms, at all.** Doc 02 §9.4 allowed auto-advance after the trick
   plus 4 s idle; doc 04 §6.4 forbade it ("auto-advance on dwell is a bounce generator"), and
   doc 01 §4.6 forbids auto-advancing content outright on accessibility grounds. Resolved in
   favour of never navigating for the visitor: the Next Arc *escalates* on idle instead.
2. **The `<h1>`.** Doc 02's hero has no heading and the copy list is closed; the rubric (B1) and
   a11y both require one visible heading answering "what is this?" above the fold in the initial
   HTML. Resolution: `<h1>` = `tap the ring` with a second line `it comes back` — six plain
   words, both already in the approved lexicon (the second is doc 02's own primary tagline minus
   its first word). The `<h1>` persists in the DOM; only its opacity changes after first touch,
   and the changing state copy lives in a separate `aria-live` `<p>`.
3. **Room hook lines are new copy.** Section D required one-line hook copy per room and doc 02
   declared the inventory closed. Eleven two-to-four-word lines were written in doc 02's voice
   and added to §I.3; nine of the eleven are lifted verbatim or near-verbatim from doc 02's own
   room descriptions (`it's getting tired`, `loops left here`).
4. **ORBIT does not fake a silhouette.** Doc 02 promised the room "resolves your random taps
   into a recognizable silhouette (a heart, a bird)". Implemented honestly, that is a curiosity
   gap whose payoff is smaller than its promise (−8 under Category H) or outright fabrication.
   The room draws the *true* epicycle sum of the visitor's own nodes with integer harmonics, so
   it always closes into a real shape that is genuinely theirs.
5. **Wheel is not bound to navigation.** A wheel-to-navigate binding on a non-scrolling page is
   indistinguishable from scroll-jacking to an auditor and to a trackpad user (−12). Navigation
   is the Ringway, the Next Arc, arrows/digits, and a vertical swipe on touch.
6. **Node cap behaviour.** 24 nodes maximum (the share codec's ceiling and a sane audio
   polyphony ceiling). The 25th tap is refused with a single 240 ms Ember rim flash and no copy —
   the site does not have words for scolding and should not acquire them.
7. **Angle quantization at 1/256 revolution (15.6 ms)**, below the perceptual threshold, so
   share codes round-trip byte-exactly. There is deliberately **no musical quantization**: the
   visitor's timing is the point.
8. **Share lives in the hash, room lives in the search param.** Doc 02 put rooms in the hash;
   doc 03 reserved the hash for anchors and put state in `?s=`. Both are satisfied:
   `/?s=tone#l=<code>`, with `#section-<slug>` still honoured for the no-JS document.
9. **`Esc` maps to SILENCE, not to "clear".** Doc 02 wanted `esc` to empty the ring; doc 01
   warns against binding plain `Esc`. Resolution: `Esc` closes an overlay if one is open;
   otherwise it *lifts* the nodes into a held state that the next tap restores exactly — a
   fully reversible action, and the intended SILENCE trigger.
10. **The five hidden destinations are registry entries with `notch: null`, not corridor rooms.**
    They are overlays or clock modes; the Ringway never lists them, and the `n/5` hub counter is
    the only acknowledgement they exist.
11. **The Garden's 150 loops are build-time generated constants**, shipped as share codes in
    `src/lib/garden-seed.ts`, explicitly framed as authored artefacts. No loop in the field is
    ever attributed to a person, and the room ships a test that fails on people-language.
12. **Reduced motion quantizes the clock's `phase` on read**, so the twelve-step sweep is a
    property of the clock rather than a per-room reimplementation — which is what stops any
    room from accidentally shipping a blank calm variant.
13. **`src/lib/gl.ts` is dropped** (no room needs WebGL), and `motion/react` and `three.js`
    remain banned. The only animation dependency is `motion/mini` at +3.5 KB gz.
14. **The light theme ships**, because `forced-colors`, `prefers-color-scheme: light` and print
    all need it, but the dark theme is the designed case and the one every room is tuned in.
