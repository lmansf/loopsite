# 07 — Bounce-risk audit of the built site

**Audited artefact:** `next start` on the production build of branch
`claude/lucid-knuth-pzwv2c` (`.next/BUILD_ID 9O1SGV3nVdxmSbgEWyFxP`), served on a
private port and driven with Chromium rev 1194 at 360×640 (touch), 320×568,
393×852, 412×915, 180×320 (200 % zoom) and 1440×900, in light and dark colour
schemes, with and without `prefers-reduced-motion`, with and without JavaScript.

**Rubric:** `design/05-build-spec.md` §H.2, with the §H.3 functional equivalents
for E3/E4. Scored strictly; ambiguity resolved against the site.

**Verdict:**

| | |
|---|---|
| **Score** | **84 / 100** |
| Category H penalties | **0** |
| Hard gates | **all passed** (A1 ≠ 0, A4 ≠ 0, B1 ≠ 0, no penalty ≥ 12, G = 8 ≥ 6) |
| Implied estimated non-bounce | **≈ 81 %** (rubric band 75–84 → 70–81 %) |
| Target | ≥ 92 → ≥ 90 % |
| **Gap** | **8 points** |

The site is not failing. It is a genuinely excellent artefact that loses points
in a small number of concentrated, cheap-to-fix places — and **seven of the
eight missing points come from one line of CSS and one constant.** The single
most expensive decision in the build is that the Ringway, the thing the entire
non-bounce thesis rests on, is invisible and inert for the first thirty seconds
on the landing route: the exact window in which a bounce is decided.

---

## 1. Method

1. Read §A, §B, §C, §H, §I of the build spec in full and §D in outline.
2. Captured 80+ states with Playwright/Chromium against the production server:
   the untouched arrival timeline at t = 0.5 / 1 / 3 / 6.5 / 10 / 15 / 33 s; a
   single tap on the ring band at 120 ms and 2 s; four nodes; all twelve rooms
   at ~2 s and after three `Space` presses; every state at 360×640 and
   1440×900; reduced motion on nine rooms; JavaScript disabled; 320 px; 200 %
   zoom; the 404 route; `/s/<slug>`; the shared-link hash.
3. Extracted every visible text node in every state (text, tag, rect, computed
   colour, computed opacity, ancestor opacity chain) and diffed it against §I.
4. Sampled rendered canvas pixels to measure real contrast rather than trusting
   the token table.
5. Measured tab order, focus visibility, target rects, history behaviour and
   pointer-event availability directly.
6. Looked at every screenshot.

Screenshots and the extracted-text dump live in the scratch audit directory and
are cited by filename below. Lighthouse figures are the gate-run medians handed
over by the orchestrator (performance 99, accessibility 100, FCP 910 ms, LCP
1706 ms, TTI 2199 ms, TBT 108 ms, CLS 0.000; Tier A 12 KB gz render-blocking,
Tier B 39 KB gz, Tier C 213 KB gz, 0 fonts, 0 raster images).

**Copy check:** every visible string in every captured state was one of
`tap the ring`, `it comes back`, `again`, `now it's yours`, the twelve room
labels, the eleven hook lines, `sound`, `gentle mode`, `keep this`,
`send your loop`, `skip to the ring`, `open the rooms`,
`you found the outside. there isn't one.` and the visually-hidden assistive
strings from §I.7. **No word appears on the site that is not in §I.** No
`read more`, no counts, no "live", no countdown, no sign-up prompt.

---

## 2. Item-by-item score

### Category A — Speed & Stability — 19 / 20

| # | Score | Evidence | Deduction |
|---|---|---|---|
| A1 | **4 / 5** | The raw 25.5 KB response contains `<h1 id="loop-title">tap the ring<span class="echo">it comes back</span></h1>`, all twelve `<section id="section-*">`, the §I.5 title and description. No JS needed to *have* the value prop. | With JS disabled the **first viewport renders completely blank** (`m-nojs-top.png`): the stage holds `min-height:100dvh` and is painted only by canvas, so the readable corridor starts ~640 px down and the `<h1>` is absolutely positioned ~3000 px into the document (`m-nojs-full.png`). −1. |
| A2 | **4 / 4** | Tier A 12 KB gz render-blocking (three first-party stylesheets + the ~2 KB inline bootstrap). Every `<script>` in the response carries `async`. No third-party in the critical path — `@vercel/*` mount only when `VERCEL*` env vars exist. | — |
| A3 | **4 / 4** | CLS 0.000 median. Zero fonts, zero raster bytes, canvases sized inside effects, hero caption absolutely positioned so only opacity animates. | — |
| A4 | **4 / 4** | `html[data-loop-hero-ready]` at **82 ms**. A real `touchscreen.tap` on the ring band at **t = 100 ms** created a node (room canvas `aria-label` went `0 nodes` → `1 nodes`), i.e. before hydration. | — |
| A5 | **3 / 3** | `m-t500.png`: at 500 ms the frame already holds the ring, a moving sweep with comet trail, a seed node and the caption. No spinner, no skeleton, no placeholder. | — |

### Category B — Instant Comprehension — 15 / 17

| # | Score | Evidence | Deduction |
|---|---|---|---|
| B1 | **6 / 6** | `tap the ring` / `it comes back` — **six plain words**, rect `[121, 460, 117, 42]` of a 640 px viewport, 17.8:1 contrast, present in the initial HTML, only opacity animated (`crop-m-hero.png`). | — |
| B2 | **2 / 4** | The ring is unmistakably the one primary CTA — 78 % of the short axis, centred, already moving. | The first viewport also carries **six** other attractors: the `origin` `<h2>` top-left and **four** identically-styled 12 px grey labels stacked top-right — `sound`, `gentle mode`, `keep this`, `send your loop` — plus the Next Arc and its traveller (`crop-m-controls.png`, `m-t500.png`). Two of those four are *meaningless at t = 0*: there is nothing yet to keep and nothing yet to send. The rubric allows ≤ 2. −2. |
| B3 | **4 / 4** | The site arrives mid-performance: a seed node already on the ring at `a = 0.62`, the sweep already a third round (`m-t500.png`), and at 6.5 s an Ember ghost node fades in and fires unprompted, demonstrating the entire contract with no input (`m-t6500.png`, second demo at `m-t15000.png`). | — |
| B4 | **3 / 3** | 0 `<audio>`/`<video>` elements, 0 `<dialog>`/`[role=dialog]`, no cookie bar, no interstitial, no carousel. `AudioContext` is constructed only inside the sound-petal gesture handler. | — |

### Category C — Interaction & Agency — 15 / 16

| # | Score | Evidence | Deduction |
|---|---|---|---|
| C1 | **6 / 6** | Touch tap places a node (mobile emulation, `hasTouch`); mouse click places a node; the inline bootstrap draws a comet trail from the first `pointermove`. Both input classes verified independently. | — |
| C2 | **4 / 4** | Measured **26.9 ms** from `pointerdown` to the second rAF commit. Placement is committed on `pointerdown`, not `pointerup`. TBT 108 ms. `m-tap-120ms.png` / `dk-m-tap150ms.png` show the node already blooming. | — |
| C3 | **3 / 3** | Tap-to-place, drag-to-retime, radial drag for radius, flick-to-remove, long-press for `keep this`, `Space`/arrows/`Esc`, the sound petal, pinch/hold for SLOW. Far more than three. | — |
| C4 | **2 / 3** | Footer buttons: hover → `--c-text`, active → scale, focus-visible → 2 px outline, plus a dot glyph that fills on `aria-pressed` (two signifiers). Next Arc: hover/focus changes colour, reveals the label and tints the track. Ringway notch: hover reveals the one-word label (`d-ringway-hover2.png`). | For the first 30 s on `/`, `nav.ringway[data-shown='false']` is `opacity: 0` **and** its links are `pointer-events: none` (`shell.css:37-40`) — measured: a tap on the `tone` notch at t = 3 s did nothing, URL unchanged. Twelve controls with no hover, no active and an invisible focus ring. Separately, the notch *mark* is 12×4 px on desktop and 10 px on mobile — a very thin signifier. −1. |

### Category D — Open Loops & Exploration Pull — 12 / 17

| # | Score | Evidence | Deduction |
|---|---|---|---|
| D1 | **4 / 4** | There is exactly one viewport (`html[data-loop-js] #main { height:100dvh; overflow:hidden }`; measured `body.scrollHeight === innerHeight`), and it always holds a turning sweep, a named next room and an unfinished set. Even RETURN's final line carries no CTA and the arc still reads `origin`. No screen is a closed statement. | — |
| D2 | **1 / 4** | ORIGIN's notch *is* lit from the first frame and the whole indicator is honest, persistent and backed by real `visited[]` state. | **The indicator is invisible on arrival.** `AppShell.tsx:56` `RINGWAY_MS = 30_000`; `AppShell.tsx:354` reveals it at `t ≥ 30 s` **or** the 5th node. Measured `nav.ringway` computed opacity: **0 at 1.5 s, 0 at 5 s, 0 at 15 s, 0 at 29 s, 1 at 33 s** (`crop-m-ringway.png` vs `crop-m-ringway-30s.png`, `m-t35s.png`). Endowed progress that you cannot see is not endowed progress. Median bounce decisions happen long before 30 s. −3. |
| D3 | **2 / 4** | When it does appear the set is the best version of this item I have seen: twelve notches, one filled with an inner ring and a marker dot, eleven hollow, all real `<a href="/?s=…">` inside `<nav aria-label="rooms">`, present in the initial HTML, and visible from the first frame in all eleven non-landing rooms (`m-room-pulse-2s.png`). | On the landing route the twelve countable slots are invisible for 30 s. A visitor who leaves at 12 s never learns the site has twelve rooms; the only hint is the single word `pulse` on the arc. −2. |
| D4 | **3 / 3** | The Next Arc is `position: fixed`, present in every room, tap → `/?s=pulse` immediately (verified), label and URL change instantly. It escalates on idle rather than navigating (`m-trail-arc-3s.png` vs `m-trail-arc-25s.png`: track → accent fill, label → full opacity). The ring itself is the truer "one more" control and never moves. | — |
| D5 | **2 / 2** | The ghost self-demo at 6.5 s and 14 s; TONE's true 20 s realignment; ORBIT's integer harmonics closing into a shape that is genuinely the visitor's own (`m-room-orbit-3nodes.png`); MIRROR's deterministic ghost mark; five hidden destinations. No scarcity, no timer, no streak, no punishment — WEAR floors at 0.22 and is revived by a one-level nudge. | — |

### Category E — Depth & Click-Through Architecture — 8 / 10

| # | Score | Evidence | Deduction |
|---|---|---|---|
| E1 | **3 / 3** | Every link label is a room name or a concrete verb phrase. Across 80+ captured states there is no `read more`, `learn more`, `click here`, no generic `next`, no invented word. | — |
| E2 | **2 / 3** | Every room ends in a Next Arc naming the next room, with idle escalation. | On desktop the arc is pinned to the **bottom-right corner** (`shell.css:332-338`, `right: 24px; bottom: 12px`), measured `[1208, 824, 208, 64]` at 1440×900, ~700 px from the ring, with a 13 px label and the arc stroke running to the viewport edge (`d-t3000.png`, `d-1440-arc.png`). That is not "full salience". −1. |
| E3 | **1 / 2** | §H.3 equivalent: visual notch state ✔; specific one-word title revealed on hover/focus ✔ (`growth` at `[1308,444,52,19]`); visited marker that is not colour alone ✔ (filled + 1 px inner ring + `<span class="u-sr">growth — not yet visited</span>`). | **No gap subline.** §H.3 requires the room's hook line on hover/focus; the revealed label is the room name only. −1. |
| E4 | **2 / 2** | Twelve URL-addressable, reversible options. `/?s=<slug>` loads straight into the room for all twelve; `/s/tone` returns 200 with room metadata and `replaceState`s to `/?s=tone`; a deliberate notch tap `pushState`s and **Back returns in exactly one press** (`/?s=tone` → Back → `/`, verified). No choice is forced. | — |

### Category F — Mobile — 7 / 10

| # | Score | Evidence | Deduction |
|---|---|---|---|
| F1 | **3 / 3** | `scrollWidth === clientWidth` at 320, 360, 393, 412 and at a 180×320 layout viewport (200 % zoom emulation). `<meta name="viewport" … maximum-scale=5, user-scalable=yes>` — pinch-zoom explicitly permitted. | — |
| F2 | **2 / 3** | `cy = 0.455·vh` on coarse pointers puts the ring's lower arc in the easy thumb zone; Ringway and Next Arc both use `max(16px, env(safe-area-inset-bottom))`. | The four utility controls sit **top-right on every phone size** (`shell.css:343-349`: `right: var(--gutter); top: var(--sp-3)`), measured at y = 12/44/76/108 — the hardest corner to reach one-handed. Two of them (`keep this`, `send your loop`) are the site's only outbound actions. −1. |
| F3 | **0 / 2** | — | Two measured failures. (a) `footer.loop-footer button { min-height: 32px }` (`shell.css:357-359`); 44 px applies only under `pointer: fine`. Measured on **every** phone size: `74×32`, `123×32`, `99×32`, `142×32` at y = 12, 44, 76, 108 — **32 px tall, 0 px spacing**. (b) At `(max-height:700px) and (max-width:639px)` (`shell.css:177-181`) the Ringway compacts to `repeat(12, 24px); column-gap: 0` — measured **24×48 px targets with 0 px spacing** at both 360×640 and 320×568. Taller phones are fine (48×48 on two rows with 8 px gaps at 393×852 and 412×915, `m-412x915-pulse.png`), but the footer failure is universal. The rubric says "all targets". 0. |
| F4 | **2 / 2** | `body { min-height:100svh; min-height:100dvh }`, `#main { height:100dvh }`, `.room-shell { min-height:100dvh }`. At 320×568 all twelve notches measure inside the viewport (y 504–552) and the Next Arc at y 456–500; nothing critical is under browser chrome. | — |

### Category G — Accessibility — 8 / 10 *(hard gate: ≥ 6 — passed)*

| # | Score | Evidence | Deduction |
|---|---|---|---|
| G1 | **3 / 3** | Reduced motion is a design. TRAIL renders a clean dodecagonal spirograph (`m-reduced-room-trail.png`); SWARM a still, evenly distributed, fully legible flock (`m-reduced-room-swarm.png`); ORIGIN keeps its complete composition (`m-reduced-2.5s.png`). Nine rooms checked, none blank, none uniform. The clock quantizes `phase` to twelve steps so the calm variant is a property of the clock, plus an in-page `gentle mode` toggle with `aria-pressed` and a filled-dot glyph. | — |
| G2 | **2 / 3** | Measured tab order is exactly §C.12: `skip to the ring` → `#stage` → `sound` → `gentle mode` → `keep this` → `send your loop` → Ringway. `Space` places nodes (canvas label `0 nodes` → `3 nodes`); `←`/`→` change room and URL; `Esc` empties the ring and is reversible; `:focus-visible { outline: 2px solid var(--c-focus) }` everywhere; no trap. | On `/` the twelve Ringway links are in the tab order from the first frame while their `<nav>` is `opacity: 0`, so for 30 s a keyboard visitor passes through **twelve stops with a completely invisible focus indicator** (WCAG 2.4.7). `:focus-within a { pointer-events: auto }` restores activation but not visibility. axe cannot detect this. −1. |
| G3 | **2 / 2** | One `<h1>`; twelve `<section aria-labelledby>` each with an `<h2>`; `<nav aria-label="rooms">`; `<main>`; a polite live region; ring canvas `aria-hidden="true"`; room canvas `role="img" aria-label="origin — tap the ring, drawn from your 3 nodes"` (verified to track the node count live); a visually-hidden keyboard-help block; per-notch visited/not-visited text. Axe clean on all routes, Lighthouse a11y 100. | — |
| G4 | **1 / 2** | Text passes: muted labels `rgb(92,101,117)` on `#F7F5F0` = **5.39:1**; `<h1>` 17.8:1. No state is encoded by colour alone anywhere — visited notches are filled + inner ring, the current notch adds an outline and marker dot, toggles use `aria-pressed` + a filled glyph, PULSE encodes voice by **shape** (disc/rotated square/cross). | **Non-text contrast fails on the primary control.** Sampled the actual rendered ring-canvas pixels: light mode stroke `rgb(180,174,169)` on `#F7F5F0` = **2.02:1**; dark mode `rgb(50,58,81)` on `#06070A` = **1.78:1**. The unvisited Ringway notches and the Next Arc `.track` use the same `--c-border-strong` at 1 px (`#B8B3A8` = 1.90:1 light, `#2E374A` = 1.69:1 dark). The ring is the one thing the copy tells you to touch. −1. |

### Category H — Trust & Anti-Dark-Pattern — **0 penalties**

| Violation | Finding |
|---|---|
| Entry modal / exit-intent / obscuring overlay | None. 0 `<dialog>`/`[role=dialog]`; nothing overlays the stage at any point in 35 s of observation. |
| Fabricated social proof / fake counts / countdowns | None. GARDEN is exactly the three honest sources: 150 build-time seeds from `garden-seed.ts`, the visitor's own kept loops, and loops opened from shared links. The only copy is `loops left here`. No avatars, no attribution, no counter, no "live" (`m-room-garden-2s.png`). |
| Scroll-jacking | None. `wheel` is unbound and there is nothing to scroll (`body.scrollHeight === innerHeight`). |
| Sign-up / email wall | None. No accounts, no forms, no email field anywhere on the site. |
| Clickbait curiosity gap | None. The promise is `it comes back`; it is paid in 4000 ms, every time. |
| Progress indicator not backed by real state | None. `visited[]` follows the documented §C.5 rule; the Ringway honestly shows what is still dark. |
| Infinite feed | None. Twelve rooms, countable, with a named end. |
| Autoplay audio | None. 0 media elements; `AudioContext` constructed only inside the `sound` gesture handler. |

**Total penalty 0.**

---

## 3. Totals and hard gates

```
A 19 + B 15 + C 15 + D 12 + E  8 + F  7 + G  8  =  84
Category H penalties                             =   0
                                          TOTAL  =  84 / 100
```

Hard gates: A1 = 4 (≠ 0) ✔ · A4 = 4 (≠ 0) ✔ · B1 = 6 (≠ 0) ✔ · no penalty ≥ 12 ✔ ·
Category G = 8 (≥ 6) ✔. **No gate fails; the 74-point cap does not apply.**

**84 → the 75–84 band → estimated 70–81 % non-bounce.** At the top of the band,
call it **≈ 81 %**. The mandate is ≥ 90 %. **Eight points short.**

---

## 4. Prioritised fix list

### Must fix to reach 92

**1. Show the Ringway from the first frame on the landing route. — recovers 7 points (D2 +3, D3 +2, C4 +1, G2 +1)**

*Owner: WP3 — `src/components/shell/AppShell.tsx`, `src/components/shell/shell.css`, `src/components/shell/Ringway.tsx`.*

This is the highest-leverage change in the audit by a wide margin. `RINGWAY_MS = 30_000`
(`AppShell.tsx:56`) plus `nav.ringway[data-shown='false'] { opacity: 0 }` and
`[data-shown='false'] a { pointer-events: none }` (`shell.css:37-40`) mean the
collection set — the mechanic §A.4 names as the thing that "converts curiosity
into a collectible set" — is invisible and unclickable for the whole bounce
window.

Concrete suggestion: initialise `ringwayShown` to `true` on first paint and keep
the 30 s / 5th-node moment as an **escalation** rather than a reveal. Ship the
nav from frame one at a quiet resting state (notches at ~55 % opacity, ORIGIN's
already filled — real endowed progress, 1/12 not 0/12), and let the existing
30 s trigger do what it was designed to do: lift the whole nav to full opacity,
run the lock-in animation and fire the `there are twelve of these` line. Drop
the `pointer-events: none` on the links entirely so a curious first tap works,
and the twelve tab stops stop being invisible. Note that
`AppShell.tsx:356` already gates `there are twelve of these` behind
`heroStage.current >= 1`, so a no-input visitor never sees that line at all
(verified at 33 s) — worth revisiting at the same time.

*Verification: `nav.ringway` computed opacity > 0 at t = 500 ms; a tap on a notch
at t = 3 s changes the URL; a `Tab` walk at t = 5 s shows a visible focus ring on
every notch.*

**2. Fix the mobile touch targets. — recovers 2 points (F3 0 → 2)**

*Owner: WP3 — `src/components/shell/shell.css`.*

Two edits:

- `shell.css:357-359` — `footer.loop-footer button { min-height: 44px }`
  unconditionally, and give the grid an 8 px `row-gap`. Today it is 32 px tall
  with 0 px spacing on every phone, and 44 px only under `pointer: fine`. That
  inverts the intent of the rule.
- `shell.css:177-181` — the `(max-height:700px) and (max-width:639px)` block
  compacts the Ringway to `repeat(12, 24px); column-gap: 0`. Replace it with the
  two-row layout the taller-phone path already uses and which measurably works
  (`repeat(6, 44px)` × 2 rows with `gap: 8px` fits 320 px with room to spare —
  6 × 44 + 5 × 8 = 304). The bottom of the stage at 320×568 has the space:
  the Next Arc ends at y 500 and the viewport is 568 tall.

*Verification: every `<a>`/`<button>` bounding box ≥ 44 px in both axes with ≥ 8 px
gaps at 320×568, 360×640, 393×852 and 412×915.*

Fixes 1 + 2 alone take the score to **93**.

### Strongly recommended (correctness, not points)

**3. The 404 page renders completely blank with JavaScript enabled.**

*Owner: WP0 — `src/app/not-found.tsx` and/or `src/app/globals.css:317-325`.*

`/nonexistent` returns 404 with the correct §I.4 copy in the HTML —
`<section id="section-outside" class="room-shell"><h2>you found the outside.
there isn't one.</h2><a href="/?s=origin">origin</a></section>` — but
`html[data-loop-js] .room-shell { opacity: 0; visibility: hidden }` hides every
shell that is not `[data-active="true"]`, and nothing on the not-found route
ever sets that attribute. The inline bootstrap sets `data-loop-js` before first
paint, so **every real visitor sees an empty near-white screen**
(`m-404.png`); only visitors with JS disabled see the page
(`m-404-nojs.png`). This is the site's one literal dead end, and it is the one
screen that exists specifically to *not* be a dead end.

Simplest fix: add `data-active="true"` to the not-found section, or scope the
hiding rule to `.corridor .room-shell` so a standalone shell outside the
corridor is unaffected.

*Verification: `document.body.innerText` on `/nonexistent` contains the copy and
the `<h2>` has a non-zero bounding box with JS on.*

### Nice to have (a further +6 available, to 99)

**4. Quieten the first viewport. — B2 +2.** *Owner: WP3 —
`src/components/shell/AppShell.tsx`, `shell.css:343-356`.* Four identically
weighted 12 px grey labels in the top-right corner compete with the one thing
the copy asks you to do, and two of them are inert at t = 0. Suggestion: render
only `sound` and `gentle mode` on arrival; fade `keep this` and `send your loop`
in once `nodes.length >= 1` — there is literally nothing to keep or send before
then, so the reveal is honest and doubles as a small reward. Consider also
holding the `origin` `<h2>` at a lower opacity until the first node fires.

**5. Raise non-text contrast on the ring and the notches. — G4 +1.**
*Owner: the `--c-border-strong` token lives in `src/app/globals.css` (WP0); the
ring stroke is drawn in `src/components/ring/**` (WP1) through the frozen
`src/lib/tokens.ts`.* Measured 2.02:1 (light) and 1.78:1 (dark) for the ring
stroke; WCAG 1.4.11 wants ≥ 3:1 for the boundary of a control. Cheapest route
that preserves the hairline aesthetic: keep `--c-border-strong` for decorative
borders and introduce a dedicated ring-stroke value at ≥ 3:1 (dark ≈ `#5A6478`,
light ≈ `#8E887C`), or keep the stroke colour and raise the ring's `--c-accent`
inner track arc from 12 % to ~28 % alpha so the composite boundary clears 3:1.
The same value should carry the unvisited notches and the Next Arc `.track`.
This needs the architect, since the token is frozen after WP0 — open an issue
rather than editing it from a room package.

**6. Move the desktop Next Arc under the ring. — E2 +1.** *Owner: WP3 —
`shell.css:332-338`.* At 1440×900 the arc measures `[1208, 824, 208, 64]` — the
bottom-right corner, ~700 px from the ring, with its stroke running to the
viewport edge. Use the same `left: 50%; transform: translateX(-50%)` treatment
as touch, sitting just below the ring's lower arc (the ring's bottom is at
y ≈ 801 at 1440×900, leaving ~75 px), and let it keep the `bottom: 24px`
offset.

**7. Put the hook line in the notch label. — E3 +1.** *Owner: WP3 —
`src/components/shell/Ringway.tsx` + `shell.css:127-140`.* The hover/focus
reveal currently shows the room name only. §H.3 explicitly requires the hook
line as the gap subline. The strings already exist in the registry
(`it has a pulse`, `radius is pitch`, `it draws`, …) and are already in §I, so
this is a render change with zero copy risk: `growth` on line one,
`one more generation` on line two at `--text-xs` and `--c-text-secondary`.

**8. Give the no-JS first viewport something to read. — A1 +1.** *Owner: WP0 —
`src/app/globals.css:303-312`.* With JS off the first 640 px is blank because
the stage reserves `100dvh` and is painted only by canvas. Under
`html:not([data-loop-js])`, collapse the stage's reserved height (or hoist the
`<h1>` above the corridor) so the first screen shows the h1 and the first room
shell. Low traffic, but it is also what crawlers and preview bots render.

---

## 5. Five things this site does exceptionally well — do not regress these

1. **Time-to-first-touch is the best I have measured.** `data-loop-hero-ready`
   at **82 ms**; a real tap at **t = 100 ms** places a node *before React
   hydrates*; **26.9 ms** from `pointerdown` to painted feedback; placement
   committed on `pointerdown`, not `pointerup`. Any change to the inline
   bootstrap or the ring-store contract must re-verify all four numbers.

2. **Reduced motion is a genuine second design, not a strip.** TRAIL's
   twelve-step dodecagonal spirograph and SWARM's frozen, evenly distributed
   flock are compositions somebody would choose on purpose
   (`m-reduced-room-trail.png`, `m-reduced-room-swarm.png`). The decision to put
   the quantization in `clock.ts` rather than in twelve rooms is why every room
   got this right instead of one or two.

3. **Keyboard is a first-class input, exactly as specified.** The measured tab
   order matches §C.12 line for line; `Space` places on the beat; `Esc` empties
   the ring *reversibly*; arrows change rooms and the URL; the room canvas
   `aria-label` carries the live node count so a screen-reader user knows how
   many nodes they have. This is the difference between "accessible" and
   "playable".

4. **Copy discipline and zero dark patterns.** Every visible string across 80+
   states is in §I. Zero Category H penalties is rare — no counts, no "live",
   no accounts, no gates, no countdowns, no fabricated field in GARDEN, and
   WEAR is a thesis with a floor rather than a punishment. The promise
   `it comes back` is paid in 4000 ms, every time.

5. **Performance and stability that let the ideas be judged.** 99 performance,
   100 accessibility, CLS **0.000**, FCP 910 ms, LCP 1706 ms — with twelve
   generative canvas rooms inside 213 KB gz total JS, 12 KB gz render-blocking,
   zero fonts and zero raster bytes. And the rooms themselves are beautiful:
   ORBIT's closing epicycle curve, TRAIL's trefoil, TONE's 5-against-4 strings
   and GARDEN's drifting field are the payoff the whole architecture exists to
   protect.

---

## 6. One-line summary

**84/100, zero dark-pattern penalties, all hard gates passed, ≈ 81 % estimated
non-bounce. Reveal the Ringway on arrival (+7) and fix the mobile touch targets
(+2) and the site scores 93 — everything else on the list is polish, except the
blank 404, which is a bug.**
