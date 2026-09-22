# 09 — Bounce-risk audit, third pass

**Audited artefact:** the production build at commit `9876f41` ("phones: ring
lifted in three height tiers; controls above the ring; arc under the caption"
— the tree moved to `77e60d7` mid-audit, a docs-only commit adding `08`, so the
audited source is unchanged), served with `next start` on a private port (3222
— the gate suite owns 3111) and driven with `playwright-core@1.56.1` against
the preinstalled Chromium rev 1194
at 320×568, 360×640, 393×852, 412×915 (touch, `isMobile`), 180×320 (a 200 % zoom
layout viewport), 1024×768 and 1440×900 (fine pointer), in light and dark
schemes, with and without `prefers-reduced-motion`, with and without JavaScript.

**Rubric:** `design/05-build-spec.md` §H.2, with the §H.3 functional equivalents
for E3/E4. Same strictness as passes one and two; ambiguity resolved against the
site, ties scored down.

**Verdict:**

| | |
|---|---|
| **Score** | **96 / 100** (pass one 84, pass two 93) |
| Category H penalties | **0** |
| Hard gates | **all passed** (A1 ≠ 0, A4 ≠ 0, B1 ≠ 0, no penalty ≥ 12, G = 10 ≥ 6) |
| Implied estimated non-bounce | **≥ 90 %** (rubric band 92–100) |
| Target | ≥ 92 → ≥ 90 % |
| **Result** | **clears the gate by four points** |

**Both pass-two regressions are gone, measured independently.** R1 (the fixed
footer box swallowing taps on the ring's one-to-two-o'clock arc) and R2 (the Next
Arc covering three Ringway notches and sending two of them to the wrong room) do
not reproduce at any viewport. The lift cost nothing on the landing route: the
ring still reads as the hero, the caption sits over empty ground, the arc clears
both a level-15 node and TONE's second ring, and the tab order is unchanged.

The lift did introduce **one new visual regression inside the rooms** (R3: the
2×2 control block is pinned over the room title block on phones, so every room's
hook line prints straight through `keep this` for its first three seconds) and
left **two residues** (R4: the arc's traveller dot escapes the 44 px arc box on
short phones and lands on the `pulse` notch; and the outer edge of the tap band
at 320×568 is still under `keep this` / `send your loop` once a node exists).

---

## 1. Method

1. Re-read §H.2/§H.3 in full, `07` in full and `08` in full.
2. Started an independent `next start` on 3222 against the existing `.next`
   (BUILD_ID written 07:42:47, the same minute as the commit — the build under
   test is this commit's). No rebuild, no `pnpm verify`, no `playwright install`.
3. Reproduced R1 and R2 with the same instruments pass two used, then went
   further: 72 ring angles × five radii (R − band, R − ½band, R, R + ½band,
   R + band) resolved with `document.elementFromPoint`, plus **real
   `touchscreen.tap()`** at each clock position, plus a rendered hit map drawn
   over the live page.
4. Re-walked all 29 rubric items from scratch.
5. Hunted specifically for damage from the lift: ring size as a share of the
   short axis; the 2×2 block against the room title and hook; the caption's
   background; the arc against a node at radius level 15 at six o'clock; the arc
   against TONE's second ring; the tab order; 200 % zoom; reduced motion.
6. Direct measurements: every `<a>`/`<button>` rect at six viewports; ink boxes
   (`Range.getBoundingClientRect`) for every room's `<h2>` and hook line; ring
   canvas pixels at twelve angles in both schemes; `MutationObserver` latency
   from tap to `data-node-count`; a 36 s untouched-then-one-node copy timeline;
   a 26-stop tab walk on `/` and in ORBIT; `AudioContext` construction counted
   with an `addInitScript` shim.

Screenshots and probe JSON live in
`…/scratchpad/audit3/` (`q1.json` … `q15.mjs`) and are cited by filename below.
Lighthouse figures are this build's gate medians from `reports/perf-report.json`
written at 07:54 (**after** the commit): performance 0.99, accessibility 1.00,
FCP = LCP 918.5 ms, TTI 2155 ms, TBT 109 ms, CLS 0. Byte budgets as handed over
(Tier B 43 KB gz, Tier C 185 KB gz); measured independently, everything the
landing route actually downloads is **172.0 KB gz** across 17 files, of which
**11.7 KB gz is render-blocking CSS** and there is no third-party origin at all.

**Copy check:** the visible-string sweep across all twelve rooms (tap, tap,
settle, collect every rendered leaf with non-zero opacity inside the viewport)
returned exactly: `better.`, `gentle mode`, `it comes back`, `it sees itself`,
`keep this`, `send your loop`, `sound` and the twelve room labels, plus
`tap the ring`, `again`, `now it's yours`, `there are twelve of these` and
`you found the outside. there isn't one.` from the timed runs. Every one is in
§I. No `read more`, no counts, no "live" language, no countdown, no sign-up
prompt. One note, carried below: ORBIT renders three `<button class="u-num">`
harmonic controls whose text is `1` / `2` / `3` — §I.6 says nothing but the
`n/5` hub and the `144` clock may display a number. They are painted underneath
the room canvas, so **nothing renders on screen**, and the copy inventory is
intact as seen; but they are live tab stops reading as bare numerals.

---

## 2. R1 and R2 — verified gone

### R1 — the footer no longer swallows ring taps

| Viewport | Ring-stroke points blocked (of 72) | Full-band points blocked (of 360) | Real taps at 1, 2, 5 o'clock |
|---|---|---|---|
| 360×640 | **0** | 2 (both at 12 o'clock, outer edge, `keep this`) | all three **placed** (count 1→2→3→4) |
| 320×568 | **0** | 24 (outer half, ≈ 11–1 o'clock, `keep this` / `send your loop`) | all three **placed** |
| 412×915 | **0** | **0** | all three **placed** |
| 393×852 | **0** | — | — |
| 1024×768 | **0** | — | — |
| 1440×900 | **0** | — | — |

`footer.loop-footer` now computes `pointer-events: none` with
`pointer-events: auto` on its buttons (measured, all six viewports), and the 2×2
block ends at y = 96 on every phone class while the ring's top edge is at
y = 122.8 (360×640) / 98.2 (320×568) / 223.6 (412×915). Evidence:
`a3-hitmap-360x640.png`, `a3-hitmap-320x568.png`, `a3-hitmap-412x915.png`
(green = resolves inside `#stage`, red = blocked), `q1.json`, `q2.json`,
`q13.json`.

*Residue.* The tap band is R ± 28 px, so it reaches 28 px **above** the stroke,
and the block was placed against the stroke, not against the band. At 320×568
the band's outer half between roughly 11 and 1 o'clock is therefore still under
the two buttons that appear with the first node: 24 of 360 sampled points
(6.7 %), and real taps at (229, 91) and (91, 91) left `data-node-count` at 1.
At 360×640 this is 2 points; at 412×915 it is zero. Unlike pass two, the dead
region is (a) off the ring stroke, (b) only present once a node exists, and
(c) covered by a **visible, labelled control** rather than an invisible box.

### R2 — the Next Arc no longer covers any notch

* The arc is positioned `top: calc(var(--ring-cy) + var(--ring-r) + 84px)` and
  `nav.ringway` computes `z-index: 81` against the arc's `80`.
* At 360×640 the stack is caption `417–459` → arc `473–517` → notches `526–624`;
  at 320×568 caption `350–392` → arc `406–450` → notches `456–552`; at 412×915
  caption `573–615` → arc `629–693` → notches `791–899`. No pair overlaps.
* `elementFromPoint` at **all twelve notch centres returns that notch** at
  320×568, 360×640, 393×852, 412×915, 1024×768 and 1440×900, on `/` **and** in
  `?s=tone` (where pass two's arc pointed at `trail` and stole three notches).
* Real taps: `tone` → `/?s=tone`, `trail` → `/?s=trail`, `growth` → `/?s=growth`,
  `return` → `/?s=return`, `pulse` → `/?s=pulse`, each with the matching
  `aria-current="page"`, at all three phone sizes. A real tap on the arc itself
  goes to `/?s=pulse` from `/`.
* Evidence: `q1.json`, `q3.json`, `a3-360x640-tone.png`, `a3-320x568-tone.png`,
  `a3-412x915-tone.png`, `a3-360x640-t2500.png`.

### The lift itself, checked for damage

| Question | Measured | Verdict |
|---|---|---|
| Does the ring still read as the hero? | D / short axis = 0.74 at 360×640 (266 px of 360), 0.70 at 320×568 (224 px of 320), 0.78 at 412×915 (321 px of 412); the ring occupies y 123–389 of 640, i.e. the top two-thirds, with nothing else inside it | **yes** — `a3-360x640-t2500.png`, `a3-320x568-t2500.png`, `a3-412x915-t2500.png` |
| Does the 2×2 block crowd the room title top-left? | **On `/`, no** (ORIGIN's hook is suppressed, and `keep this`/`send your loop` are invisible at zero nodes). **In every other room, yes** — see R3 | **new regression** |
| Is the caption still legible over nothing? | Caption sits between the ring's bottom edge and the arc with clear ground behind it at all three phone classes; it fades to opacity 0 about 600 ms after the first node (t = 1.5 s tap, opacity 0 by t = 2.1 s), before any node can be dragged out to level 15 | **yes** |
| Does the arc collide with a node at level 15 at 6 o'clock? | Level 15 = 1.294 R. Node lands at (180, 428) / (160, 355) / (206, 592); arc tops are 473 / 406 / 629 — clear by 45 / 51 / 37 px. Placed one by real radial drag and re-measured: caption opacity was already 0, `elementFromPoint` at the node returns the canvas | **no** — `a3-360x640-level15.png`, `a3-320x568-level15.png`, `a3-412x915-level15.png` |
| Does the arc collide with TONE's second ring? | TONE with four nodes at 360×640: inner ring and halo stay inside the main ring (bottom 389); arc starts at 473. At 1440×900 the arc is `[938, 724, 208, 64]` and its centre hit-tests to itself | **no** — `a3-360-tone-4nodes.png`, `a3-1440-tone-4nodes.png` |
| Is the tab order still sane? | 20 stops, exactly §C.12: `skip to the ring` → `#stage` → `sound` → `gentle mode` → `keep this` → `send your loop` → the twelve notches in room order → Next Arc → (focus-revealed `next-link`) → wrap. Every stop `:focus-visible` with a 2 px `rgb(75,57,201)` outline | **yes** — `q5.json`, `a3-tab-360.png` |

---

## 3. Item-by-item score

### Category A — Speed & Stability — 20 / 20

| # | Score | Evidence | Deduction |
|---|---|---|---|
| A1 | **5 / 5** | Initial HTML carries `<h1 id="loop-title">tap the ring<span>it comes back</span></h1>`, twelve `<section id="section-*">` and the §I.5 metadata (`Loop — tap. it comes back.` / `one ring, twelve rooms, no ending.`). With JS disabled the first viewport reads `tap the ring / it comes back`, the keyboard help, the four controls, then the twelve rooms with their hook lines (`a3-nojs-top.png`). | — |
| A2 | **4 / 4** | Measured from the wire: 17 files, **172.0 KB gz** total, of which render-blocking CSS is **11.7 KB gz**; every `<script>` is `async` except Next's `nomodule` polyfill; **zero third-party origins**. Tier C 185 KB gz as handed over. | — |
| A3 | **4 / 4** | CLS **0** in all three gate runs (`reports/perf-report.json`, 07:54). No fonts, no raster bytes, canvases sized in effects, caption absolutely positioned. | — |
| A4 | **4 / 4** | `touchscreen.tap` fired at **t = 154 ms** on a fresh load placed a node (`a3-earlytap.png`); node count observed 40 ms later (polling granularity). No hydration dependency. | — |
| A5 | **3 / 3** | At 300 ms the frame holds the ring, the sweep head with its glow, a seed node, the Ringway with ORIGIN already lit, the arc, and the title at opacity 0.35 (`a3-t300.png`). No spinner, no skeleton, ever. | — |

### Category B — Instant Comprehension — 17 / 17 *(was 16)*

| # | Score | Evidence | Deduction |
|---|---|---|---|
| B1 | **6 / 6** | `tap the ring` / `it comes back` — six plain words, in the initial HTML, rect `[121, 417, 117, 42]` in a 360×640 viewport (opacity 0.35 at 120 ms, 1.0 by 901 ms), 17.8 : 1 at rest. | — |
| B2 | **4 / 4** | **Pass two's deduction is recovered.** The bottom band is now a clean vertical stack — caption, then arc, then the twelve notches — with no overlap at any phone size, so it reads as one object instead of two tangled ones. First viewport at zero nodes: the ring (the one CTA), the top control pair, the bottom nav band. Two competing clusters, the rubric's limit. | — (the stray traveller dot is charged once, at C4) |
| B3 | **4 / 4** | The site still arrives mid-performance: seed node on the ring, sweep already turning, the unprompted ghost demo (`a3-t300.png`). | — |
| B4 | **3 / 3** | 0 `<dialog>` / `[role=dialog]` / `[aria-modal]`, 0 `<audio>`/`<video>`/`<iframe>`, no cookie bar, no interstitial, no carousel, no gate. | — |

### Category C — Interaction & Agency — 15 / 16 *(was 13)*

| # | Score | Evidence | Deduction |
|---|---|---|---|
| C1 | **6 / 6** | **Recovered in full.** 0 of 72 ring-stroke points blocked at six viewports; real taps at 1, 2 and 5 o'clock place nodes at 320×568, 360×640 and 412×915 (`q13.json`); desktop click places in 2.6–11.8 ms. `footer.loop-footer` is `pointer-events: none` with buttons opting in — the standing rule from `08` §6 is now honoured. | — (the 320×568 band-edge residue is charged at F3) |
| C2 | **4 / 4** | `MutationObserver` on `data-node-count`: touch **24.1 / 26.1 / 30.8 / 34.6 ms**; desktop **2.6 / 3.7 / 9.8 / 11.8 ms**. TBT median 109 ms. | — |
| C3 | **3 / 3** | Tap-to-place, radial drag (drove a node from level 8 to level 15 and it landed at 1.294 R), keyboard `Space`/arrows/`Esc`, twelve-way notch nav, the arc, the sound petal, `gentle mode`. | — |
| C4 | **2 / 3** | Hover, `:focus-visible` (2 px `rgb(75,57,201)`), active and two signifiers (label + pip / notch fill + inner ring) on every shell control, verified over a 20-stop walk. All twelve notches and the arc now hit their own target. | Three defects, all on controls that are present and visibly wrong. (a) **R3**: on phones the room hook line prints through `keep this` — the control's label, its primary signifier, is illegible for the first 3 s of every room (`a3-360x640-growth-title.png`, `a3-320x568-growth-title.png`). (b) **R4**: the arc's traveller dot renders outside the 44 px arc box on short phones and sits on the `pulse` notch at 320×568 — the same Ember fill the *visited* marker uses (`a3-320x568-arcnotch-4x.png`). (c) ORBIT's three `u-num` buttons are 32×32, carry a bare numeral as their whole accessible name, sit under the room canvas, and at 360×640 the `2` button's centre hit-tests to `send your loop`. The desktop dial's 40 × 8 px links with zero spacing are unchanged from pass two. −1. |

### Category D — Open Loops & Exploration Pull — 17 / 17

| # | Score | Evidence | Deduction |
|---|---|---|---|
| D1 | **4 / 4** | `body.scrollHeight === innerHeight` at all six viewports; every screen holds a turning sweep, a named next room and an unfinished set. | — |
| D2 | **4 / 4** | `nav.ringway` computes opacity **1 at t = 120 ms** with `data-shown="true"`; ORIGIN arrives filled, `data-visited="true"`, `origin — visited` in the accessibility tree. The escalation survives: `again` in the live region at 4.5 s, arc `data-escalated="true"` at 5.7 s, `there are twelve of these` at **30.3 s** (`q7.json`, `a3-360-36s.png`). | — |
| D3 | **4 / 4** | Twelve countable notches, one filled, eleven hollow, real `<a href="/?s=…">` inside `<nav aria-label="rooms">`, in the initial HTML and visible from the first frame at every size tested. | — (200 % zoom is charged at F1) |
| D4 | **3 / 3** | The Next Arc is `position: fixed`, present in every room, navigates instantly, and no longer relocates between the landing route and a room: `[96, 473, 168, 44]` on `/` and the same box in `?s=tone`. | — |
| D5 | **2 / 2** | The ghost self-demo, TONE's realignment, ORBIT's true epicycle sum, MIRROR's deterministic ghost, the five hidden destinations. No scarcity, timer, streak or punishment anywhere. | — |

### Category E — Depth & Click-Through Architecture — 10 / 10

| # | Score | Evidence | Deduction |
|---|---|---|---|
| E1 | **3 / 3** | Every label is a room name or a concrete phrase; the sweep of all twelve rooms found no generic link text. | — |
| E2 | **3 / 3** | Desktop arc hangs off the ring at five o'clock — `[938, 724, 208, 64]` at 1440×900 (ring cx 720, cy 450, R 351) and `[698, 618, 208, 64]` at 1024×768 — inside the viewport, clear of the caption. On phones it now hangs under the caption, tied to the ring's own geometry (`a3-1440x900-t2500.png`, `a3-1024x768-t2500.png`). | — |
| E3 | **2 / 2** | §H.3 equivalent complete: notch state (visual), one-word title, **hook line as the gap subline** — hovering `growth` reveals `growth` + `one more generation`, 12 px, rect `[1234, 435, 126, 38]` at 1440 and `[818, 369, …]` at 1024 — and a visited marker that is fill + inner ring + `growth — not yet visited` text (`a3-1440x900-notchhover.png`). | — |
| E4 | **2 / 2** | Twelve URL-addressable reversible options; notch tap → `/?s=garden`; **Back → `/` in one press**; no choice forced. | — |

### Category F — Mobile — 7 / 10

| # | Score | Evidence | Deduction |
|---|---|---|---|
| F1 | **2 / 3** | `scrollWidth === clientWidth` at 320 (320/320) and at a 180 px layout viewport (180/180); `maximum-scale=5, user-scalable=yes`. | At 200 % zoom (180×320) the six-column notch grid is still 312 px wide: **`origin`, `growth`, `mirror` and `return` are entirely off-screen** (x = −62 and x = 198) with four more clipped, and no horizontal scroll to reach them; the caption `[45, 209, 90, 83]`, the arc `[6, 265, 168, 44]` and the notch block all overlap each other (`a3-zoom180.png`). Slightly worse than pass two, which found two notches off-screen. −1. |
| F2 | **2 / 3** | The ring's lower arc sits at 61 % (360×640) and 57 % (320×568) of viewport height — squarely in the thumb zone — and the Ringway and arc both use `max(16px, env(safe-area-inset-bottom))`. | The two outbound controls are still in the top corner, and the lift moved them **further into it** (`top: 4px`): `keep this` and `send your loop` now occupy y 52–96 on every phone. That is the hardest place to reach one-handed, it is why they overhang the band at 320×568, and it is what produces R3. −1. |
| F3 | **1 / 2** | Sizes hold: every notch is 44×44 (short phones) or 48×48, every footer button is ≥ 44 px tall, the short-phone arc is 44 px, at 320×568, 360×640, 393×852 and 412×915. | Spacing does not. `row-gap` is **4 px** in the footer 2×2 (rows at y 4 and y 52) and **4 px** between the two notch rows — the rubric asks ≥ 8 px. Worse, three pairs have *negative* spacing: the footer buttons over the band's outer half at 320×568 (24/360 points dead), the same buttons over the room title block (R3), and ORBIT's 32×32 numerals under them. The desktop dial is 40 × 8 px with zero gap. −1. |
| F4 | **2 / 2** | `100svh`/`100dvh` throughout. At 320×568 the whole stack — ring 98–322, caption 350–392, arc 406–450, notches 456–552 — is inside the viewport with 16 px to spare; nothing critical is under browser chrome. | — |

### Category G — Accessibility — 10 / 10 *(hard gate ≥ 6 — passed)*

| # | Score | Evidence | Deduction |
|---|---|---|---|
| G1 | **3 / 3** | Reduced motion is a second design: ORIGIN keeps its seed nodes and sweep head, TRAIL its dodecagonal spirograph, GROWTH its full still composition (`a3-reduced-origin.png`, `a3-reduced-trail.png`, `a3-reduced-growth.png`); `document.getAnimations()` shows exactly **1** running animation, the allowed ambient breathe. `gentle mode` toggles in-page with `aria-pressed` and a filled pip. | — |
| G2 | **3 / 3** | Tab order on the landing route is exactly §C.12 across 20 stops, every one with a visible 2 px focus ring, no trap, skip link first, the two node-gated controls reachable and self-revealing on focus. | — (noted, not charged: in ORBIT the three `u-num` buttons precede the skip link in DOM order and are painted under the room canvas, so that room's first Tab lands on an occluded numeral.) |
| G3 | **2 / 2** | One `<h1>`, twelve `<section aria-labelledby>`, `<nav aria-label="rooms">`, `<main>`, a polite live region carrying `again` / `there are twelve of these`, ring and background canvases `aria-hidden="true"`, room canvas `role="img"` with `origin — tap the ring, drawn from your 0 nodes`, per-notch visited text. Lighthouse accessibility **1.00** in all three gate runs. | — |
| G4 | **2 / 2** | Rendered-pixel sampling of the ring canvas at twelve angles (peak stroke pixel within ±3 px, composited over the canvas): light **5.39 – 5.69 : 1** against `rgb(247,245,240)`, dark **5.47 – 5.81 : 1** against `rgb(6,7,10)`. Arc track and notch borders compute to `rgb(92,101,117)` / `rgb(123,134,152)` = 5.39 : 1 / 5.40 : 1. Body text 17.8 : 1. No state encoded by colour alone (visited = fill **and** inner ring **and** text). | — |

### Category H — Trust & Anti-Dark-Pattern — **0 penalties**

| Violation | Penalty | Finding |
|---|---|---|
| Entry modal / exit-intent / content-obscuring overlay before 30 s | −15 | **None.** 0 dialogs, 0 modals; nothing overlays the stage in a 36 s observation. The `keep this` / `send your loop` fade is a reveal, not an overlay, and both stay keyboard-reachable at zero nodes. |
| Fabricated social proof / fake counts / fake scarcity / countdown | −15 | **None.** No count of people anywhere; GARDEN's only copy is `loops left here`; the hub counter reads real collected state. |
| Scroll-jacking | −12 | **None.** `body.scrollHeight === innerHeight`; wheel is deliberately unbound (§J.5). |
| Sign-up / email wall | −12 | **None.** No accounts, no forms, no email field. |
| Clickbait curiosity gap | −8 | **None.** `it comes back` is paid in 4000 ms. |
| Progress indicator not backed by real state | −6 | **None.** `data-visited` follows §C.5 from the first frame. *(The stray traveller dot near the `pulse` notch is a rendering artefact, not an indicator; it carries no state and is charged as a visual defect at C4.)* |
| Infinite feed with no end state | −5 | **None.** Twelve rooms, countable, with a named end. |
| Autoplay audio | −10 | **None.** `AudioContext` construction counted with an init-script shim: **0** on load, **0** after a ring tap, **1** only after pressing `sound` (label then reads `quiet`, `aria-pressed="true"`). |

**Total penalty 0.**

---

## 4. Totals and gates

```
A 20 + B 17 + C 15 + D 17 + E 10 + F  7 + G 10  =  96
Category H penalties                             =   0
                                          TOTAL  =  96 / 100
```

Hard gates: A1 = 5 ✔ · A4 = 4 ✔ · B1 = 6 ✔ · no penalty ≥ 12 ✔ · Category G = 10 ≥ 6 ✔.
**No gate fails. 96 → the 92–100 band → estimated ≥ 90 % non-bounce.**

Movement since pass two: **C +2** (R1 fixed: C1 4 → 6), **B +1** (R2 fixed: the
bottom band reads as one object), **C4 held at 2/3** (the arc/notch collision it
was charged for is gone, but R3, R4 and the ORBIT numerals replace it), F, D, E,
A and G unchanged. Four of the six fixes `08` priced were taken: fix 1 (+2),
fix 2 (+2 across C4 and B2); fixes 3, 4 and 5 (the 8 px gaps, moving the
outbound controls off the corner, and 200 % zoom) were not, which is exactly the
four points still on the table.

---

## 5. Remaining deductions, cheapest fix for each

Four points, in points per line of CSS. All four live in
`src/components/shell/shell.css` (WP3).

**1. Stop the 2×2 control block landing on the room title block. — C4 +1
(and it removes the 320×568 band residue as a side effect).**
*Owner: WP3 — `footer.loop-footer`.* On coarse pointers the block is
`right: var(--gutter); top: 4px` and 248 px wide, so at 360×640 it reaches
x = 96 and at 320×568 x = 56, while `.room-shell` renders `<h2>` at x = 16 and
the hook line under it — measured ink `[16, 71, 164, 87]` for
`one more generation` against `keep this` at `[96, 52, 194, 96]`. Two lines of
type print through each other on every room entry (`a3-360x640-growth-title.png`,
`a3-320x568-growth-title.png`). Cheapest honest fix: on coarse pointers move the
`keep this` / `send your loop` row to the **bottom-left**, opposite the arc,
where the desktop rule already puts the whole footer
(`top: auto; right: auto; left: var(--gutter); bottom: var(--gutter-b)`), and
leave `sound` / `gentle mode` on the top row. That clears the title block, moves
the site's only outbound actions into the thumb zone (F2 +1 as well), and takes
them off the band's outer edge at 320×568.
*Verification: for each of the twelve rooms at 320×568 and 360×640, with one
node placed, the `<h2>` and `.hook` ink boxes must not intersect any footer
button rect; and all 360 band points must resolve inside `#stage`.*

**2. Keep the arc's traveller inside the arc. — C4 +1 (shared with fix 1).**
*Owner: WP3 — `a.next-arc .traveller`.* `offset-path: path('M 21 60 A 96 96 0 0 1 187 60')`
is written in the SVG's unscaled 208 × 64 coordinate space, but the element is an
absolutely positioned `<i>`, so it does not scale with the `svg`. On the
`(max-height: 700px) and (max-width: 639px)` class, where the arc is 168 × 44,
the dot renders at arc-top + 60 px — **10 px below the arc box**, on the
`pulse` notch at 320×568 (`a3-320x568-arcnotch-4x.png`, `a3-360-dark.png`), in
the same Ember fill the visited marker uses, and it walks across the notch row
when the arc escalates. One line: give the short-phone rule its own
`.traveller { offset-path: path('M 17 41 A 77 77 0 0 1 151 41') }`, or set
`transform: scale(168/208)` with `transform-origin: 0 0` on the traveller.
*Verification: the traveller's rect is inside the arc's rect at 320×568 and
360×640, at `offset-distance` 0 % and 100 %.*

**3. 8 px gaps. — F3 +1.**
*Owner: WP3.* `footer.loop-footer { row-gap: 4px }` → `var(--sp-2)`, and the
short-phone `nav.ringway .notches { row-gap: 4px }` → `8px`. Both blocks have
the room: the footer ends at y = 96 of 568 and the notch block gains 4 px inside
a viewport that already has 16 px of slack. Do it in the same pass as fix 1 so
the block's height is computed once. (While there: ORBIT's `u-num` buttons are
32 × 32 and the desktop dial's links are 40 × 8 — neither is worth a rubric
point on its own, but both are the same control at a third of the size.)

**4. Make the Ringway survive 200 % zoom. — F1 +1.**
*Owner: WP3.* At a 180 px layout viewport the six-column grid is 312 px wide and
four of the twelve rooms are unreachable, with the caption, arc and notches
overlapping. Under `(max-width: 380px)` let the grid fall to
`repeat(4, minmax(32px, var(--tap-min)))` — three rows of four — keeping the
44 px hit area with padding, and let the arc's `top` fall back to a
`bottom`-anchored rule when `--ring-cy + --ring-r + 84px` would push it past
`100dvh - nav-height`.

Fixes 1 + 2 + 3 + 4 take the score to **100** and are about a dozen lines in one
file owned by one work package.

---

## 6. What to protect

Everything in `07` §5 and `08` §6 still holds. This pass adds three:

1. **The rule that saved R1 is now written down in the CSS and must stay
   there.** `footer.loop-footer { pointer-events: none }` with
   `footer.loop-footer button { pointer-events: auto }` is the whole of the
   two-point C1 recovery. Any new fixed overlay must ship the same pair.

2. **The band is 28 px wide, and layout must clear the band, not the stroke.**
   The commit's own comment reasons about "ring top ≥ 98 px", which is the
   stroke; the tappable band starts 28 px above that. Every future "this clears
   the ring" claim should be checked at R + band, not at R.

3. **The arc's position is now derived from the ring mirrors
   (`--ring-cy` + `--ring-r` + 84 px) and the Ringway outranks it in z-order.**
   Both halves matter: the derivation is what keeps the arc under the caption on
   every phone class, and the `z-index: calc(var(--z-nav) + 1)` on `nav.ringway`
   is the belt to that braces. Do not re-introduce a `bottom`-anchored arc on
   coarse pointers, and do not equalise those z-indices.

And one standing instrument: the hit map in `q13.mjs` (72 angles × five radii,
drawn over the live page as green/red dots) takes four seconds to run and would
have caught both R1 and its residue on the day they landed.

---

## 7. One-line summary

**96/100, zero dark-pattern penalties, all hard gates passed, ≥ 90 % estimated
non-bounce. Both pass-two regressions are verifiably gone — the ring stroke is
100 % live to touch at six viewports and all twelve notches navigate to their
own room on `/` and inside a room — and the lifted ring costs the hero nothing;
what remains is the 2×2 control block printing over the room title on phones,
the arc's traveller dot escaping onto the `pulse` notch, 4 px gaps, and a
Ringway that loses four rooms at 200 % zoom, together worth four points.**
