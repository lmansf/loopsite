# 08 — Bounce-risk audit, second pass

**Audited artefact:** `next start` on the production build at commit `da6dec4`
("audit fixes, Next 15.5, honest LCP gate"), served on a private port (3222) and
driven with Chromium rev 1194 at 360×640 (touch), 320×568, 393×852, 412×915,
180×320 (200 % zoom), 1024×768, 1280×800 and 1440×900, in light and dark colour
schemes, with and without `prefers-reduced-motion`, with and without JavaScript.

**Rubric:** `design/05-build-spec.md` §H.2, with the §H.3 functional equivalents
for E3/E4. Same strictness as pass one; ambiguity resolved against the site.

**Verdict:**

| | |
|---|---|
| **Score** | **93 / 100** (pass one: 84) |
| Category H penalties | **0** |
| Hard gates | **all passed** (A1 ≠ 0, A4 ≠ 0, B1 ≠ 0, no penalty ≥ 12, G = 10 ≥ 6) |
| Implied estimated non-bounce | **≥ 90 %** (rubric band 92–100) |
| Target | ≥ 92 → ≥ 90 % |
| **Result** | **clears the gate, by one point** |

**All eight fixes from `07` are real and verified on the built site.** Seven of
them are clean. The eighth — the 44 px touch targets — was implemented by
growing two fixed overlays that now **collide with the ring and with each
other on the two smallest phone sizes**, which is where the three remaining
deductions in A–D come from. Nothing in this audit is a dark pattern, and the
margin over the gate is one point, so the two collisions below are worth fixing
before anyone touches anything else.

---

## 1. Method

1. Re-read §H in full and `07` in full.
2. Started an independent production server on port 3222 (the gate suite owns
   3111) and drove it with `playwright-core@1.56.1` against the preinstalled
   Chromium rev 1194. No `playwright install`, no rebuild, no `pnpm verify`.
3. For each of the eight fixes: reproduced the pass-one measurement, took
   screenshots at 360×640 (touch, `isMobile`) and 1440×900, and looked at every
   PNG.
4. Re-walked all 29 rubric items, not only the eight.
5. Hunted specifically for regressions the fixes could have caused: first-viewport
   busyness on a phone; the 44 px controls against the ring at 320×568; the
   five-o'clock arc against node radius level 15 and against TONE's second ring;
   the hidden `keep this` / `send your loop` in the tab order.
6. Measurements taken directly: computed opacity and `pointer-events` on
   `nav.ringway` at t = 1 s and 5 s; `document.elementFromPoint` hit-tests on all
   twelve notches and on 72 points around the ring band at six viewports; every
   `<a>`/`<button>` rect and inter-target gap; sampled rendered ring-canvas pixels
   at six angles in both schemes; tab order over twenty stops with the ancestor
   opacity chain; the untouched 38 s copy timeline and the 34 s timeline after one
   node.

Screenshots and probe JSON are in the scratch directory
`…/scratchpad/audit2/` and cited by filename below. Lighthouse figures are this
build's gate medians from `reports/perf-report.json` (performance 0.99,
accessibility 1.00, FCP 913.7 ms, LCP 913.7 ms, TTI 2184 ms, TBT 118.6 ms,
CLS 0), plus the handed-over byte budgets (Tier B 43 KB gz, Tier C 185 KB gz).

**Copy check:** every visible string captured across this pass was one of
`tap the ring`, `it comes back`, `again`, `now it's yours`,
`there are twelve of these`, the twelve room labels, the eleven hook lines (now
also used as the notch sublines, exactly as §H.3 requires), `sound`,
`gentle mode`, `keep this`, `send your loop`, `skip to the ring`,
`you found the outside. there isn't one.` and the §I.7 assistive strings.
**No word appears on the site that is not in §I.** `return` correctly carries no
hook line. No `read more`, no counts, no "live", no countdown, no sign-up prompt.

---

## 2. The eight fixes, verified

| # | Fix | Verdict | Evidence |
|---|---|---|---|
| 1 | Ringway visible from frame one | **verified** | `nav.ringway` computed opacity **1** at t = 1 s and t = 5 s at both 360×640 and 320×568; `data-shown="true"`; link `pointer-events: auto`; twelve `<a>` present. A notch tap at t ≈ 3 s changes the URL. ORIGIN's notch is already filled with its inner ring and marker dot on arrival (`m360-t1000.png`, `m320-t1000.png`). The escalation still fires: after one node, `there are twelve of these` appeared in the live region at **t = 30.3 s** (`m-t34s-after-node.png`). |
| 2 | 44 px footer controls, two rows of 44 px notches on short phones | **verified for size, not for spacing — and it introduced two collisions (§4)** | Footer buttons measure 74×44, 123×44, 99×44, 142×44 at y = 12/60/108/156 on every phone size (was 32 px tall). Notches are 48×48 in two rows of six. **Gaps are 4 px, not ≥ 8 px** (`--sp-1`), in both the footer (`shell.css` `row-gap: var(--sp-1)`) and the short-phone notch block (`row-gap: 4px`). |
| 3 | 404 renders under the JS layout | **verified** | `/nonexistent` → 404, `document.body.innerText` = `skip to the ring / you found the outside. there isn't one. / origin`, `<h2>` rect `[16, 32, 328, 64]`, `origin` link `[16, 120, 46, 29]` (`m-404-js.png`). The site's one literal dead end is gone. |
| 4 | `keep this` / `send your loop` arrive with the first node | **verified** | At `data-node-count="0"`: opacity 0, `pointer-events: none`, still in the tab order. After two nodes: opacity 1, `pointer-events: auto` (`m-3nodes-controls.png`). Tabbing to `keep this` at zero nodes makes it visible — measured `:focus-visible` true, opacity 1, `pointer-events: auto` (`m-focus-keep-delayed.png`). |
| 5 | Ring, notches and arc track on `--c-text-muted` | **verified** | Sampled the rendered ring canvas at six angles: light **3.24 – 5.40 : 1** against `rgb(247,245,240)`, dark **3.51 – 5.45 : 1** against `rgb(6,7,10)` — every sample ≥ 3 : 1 (pass one: 2.02 and 1.78). Notch border and arc `.track` compute to `rgb(92,101,117)` light / `rgb(123,134,152)` dark = **5.39 : 1** / **5.40 : 1** (`ring-light-crop.png`, `ring-dark-crop.png`, `m-dark-t2500.png`). |
| 6 | Desktop Next Arc at the ring's five o'clock | **verified, no collisions** | 1440×900 arc `[938, 724, 208, 64]` (ring cx 720, cy 450, R 351); 1280×800 `[833, 643, 208, 64]`; 1024×768 `[698, 618, 208, 64]`. Inside the viewport at all three, and clear of the `<h1>` caption in all three (1440: caption `[645, 829, 149, 49]`, arc ends y 788). It does not touch TONE's second ring (`d-tone-4nodes.png`, `d1440x900-arc.png`, `d1280x800-arc.png`, `d1024x768-arc.png`). |
| 7 | Notch labels carry the hook line | **verified** | Hovering the `growth` notch reveals `growth` + `.gap` = `one more generation`, 12 px, `rgb(92,101,117)`, label rect `[1234, 435, 126, 38]`; identical at 1280 and 1024 (`d1440x900-notch-hover.png`). This is exactly the §H.3 gap subline. |
| 8 | No-JS stage collapses, title leads the document | **verified** | With JavaScript disabled the first 640 px now carries `tap the ring` / `it comes back` at the top, the four controls, and then the twelve room names each with its hook line (`m-nojs-top.png`, `m-nojs-full.png`). Pass one's blank first screen is gone. |

Also re-verified from the "do not regress" list in `07`: a **touch tap at
t = 150 ms placed a node**, detected 10 ms later, before hydration; a desktop
click placed a node **29 ms** after `mousedown`; the `<h1>` is in the initial
HTML and paints at opacity 0.35 from ~120 ms, 0.86 at 500 ms, 1.0 by 900 ms
(`--dur-6` 520 ms after a 300 ms beat); reduced motion is still a designed still
composition (`m-reduced-origin.png`, `m-reduced-trail.png`); a notch click →
`/?s=garden` and **Back returns to `/` in one press**; zero console errors and
zero page errors across every run.

---

## 3. Item-by-item score

### Category A — Speed & Stability — 20 / 20 *(was 19)*

| # | Score | Evidence | Deduction |
|---|---|---|---|
| A1 | **5 / 5** | The initial HTML carries `<h1 id="loop-title">tap the ring<span class="echo">it comes back</span></h1>`, all twelve `<section id="section-*">` and the §I.5 metadata. **With JS disabled the first viewport now leads with the `<h1>`**, then the twelve room names with their hook lines (`m-nojs-top.png`). Pass one's −1 is recovered. | — |
| A2 | **4 / 4** | Tier A ~12 KB gz render-blocking; Tier C 185 KB gz total (framework floor 142 KB gz on next 15.5.25); every `<script>` `async`; no third-party in the critical path. | — |
| A3 | **4 / 4** | CLS **0** in all three gate runs. Zero fonts, zero raster bytes; canvases sized in effects; caption absolutely positioned so only opacity animates. | — |
| A4 | **4 / 4** | Measured: `touchscreen.tap` fired at **t = 150 ms** placed a node, observed 10 ms later (`m-earlytap.png`); desktop click → node in 29 ms. No hydration dependency. | — |
| A5 | **3 / 3** | At 120 ms the frame already holds the ring, the sweep, a seed node and the title (`m-t350.png`). No spinner, no skeleton. | — |

### Category B — Instant Comprehension — 16 / 17 *(was 15)*

| # | Score | Evidence | Deduction |
|---|---|---|---|
| B1 | **6 / 6** | `tap the ring` / `it comes back` — six plain words, rect `[121, 466, 117, 42]` in a 640 px viewport, in the initial HTML, 17.8 : 1 at rest. | — |
| B2 | **3 / 4** | Fix 4 removed the two inert labels: at `data-node-count="0"` the first viewport carries only `sound` and `gentle mode` beside the ring, and the ring is unmistakably the one CTA (`m360-t1000.png`). | Three attractor clusters remain, one over the rubric's ≤ 2: the top-right control pair, the twelve-notch Ringway, **and the Next Arc, which on a phone is literally drawn through the notch row** (`hit-360x640.png`, `hit-320x568.png`). The bottom band reads as two overlapping objects rather than one. −1. |
| B3 | **4 / 4** | The site still arrives mid-performance — seed node on the ring, sweep already turning, the unprompted ghost demo. | — |
| B4 | **3 / 3** | 0 `<audio>`/`<video>`, 0 `<dialog>`/`[role=dialog]`, no cookie bar, no interstitial, no carousel. | — |

### Category C — Interaction & Agency — 13 / 16 *(was 15)*

| # | Score | Evidence | Deduction |
|---|---|---|---|
| C1 | **4 / 6** | Pointer and touch both place nodes: 7 of 8 sampled ring angles placed a node on a real `touchscreen.tap`, in 52–89 ms; desktop click in 29 ms. | **A measurable arc of the primary control is dead to touch.** `footer.loop-footer` is a fixed box with `pointer-events: auto`; growing its buttons to 44 px grew the box from 128 px to **188 px tall** (`[202, 12, 142, 188]` at 360×640), and it now overhangs the ring's one-to-two-o'clock arc. Hit-testing 72 points on the ring band: **8 / 72 blocked at 360×640, 12 / 72 at 320×568** (the arc a ≈ 0.01–0.17), all resolving to `footer.loop-footer`. Real taps confirm it — a tap at a = 0.12 and a tap at a = 0.05 left `data-node-count` at `0`. At zero nodes two of the four buttons are invisible, so **the visitor sees nothing at all where the tap dies**. Taller phones (393×852, 412×915) and every desktop size are clear. −2. |
| C2 | **4 / 4** | 10 ms from tap to the node-count change at t = 150 ms; 29 ms on desktop; placement committed on `pointerdown`; TBT 118.6 ms. | — |
| C3 | **3 / 3** | Tap-to-place, drag-to-retime, radial drag, flick-to-remove, long-press, `Space`/arrows/`Esc`, the sound petal, twelve-way nav. A drag that starts on the ring and ends at level 12 *under* the desktop arc still places correctly — pointer capture wins (`d-drag-under-arc.png`). | — |
| C4 | **2 / 3** | Hover, `:focus-visible` (2 px `rgb(75,57,201)`), active and two signifiers on every control, verified over a twenty-stop tab walk; the Ringway is live from frame one, so pass one's invisible-focus deduction is gone. | **The Next Arc sits on top of three Ringway notches on small phones.** Same z-index, later in the DOM: at 360×640 the arc `[96, 528, 168, 44]` covers the centres of `pulse`, `tone` and `trail` (`[72/128/184, 518–520, 48, 48]`); at 320×568 it covers the same three. `elementFromPoint` on each notch centre returns the arc, and a real tap on the `tone` notch navigated to **`/?s=pulse`** — the arc's destination. In TONE the arc points at `trail` and the same three notches all resolve to `trail`. **Two of the twelve room controls send the visitor to the wrong room on the two most common phone widths** (`hit-360x640.png`, `m-tone-arc.png`). Separately, the desktop dial's links measure **40 × 8 px** with zero spacing. −1. |

### Category D — Open Loops & Exploration Pull — 17 / 17 *(was 12)*

| # | Score | Evidence | Deduction |
|---|---|---|---|
| D1 | **4 / 4** | One viewport, `body.scrollHeight === innerHeight`; it always holds a turning sweep, a named next room and an unfinished set. | — |
| D2 | **4 / 4** | **The whole pass-one deduction is recovered.** `nav.ringway` opacity 1 at 1 s and 5 s; ORIGIN filled on arrival with `data-visited="true"` and `origin — visited` in the assistive text — real, honest, non-zero endowed progress in the bounce window. The 30 s moment survives as an escalation and still speaks: `there are twelve of these` at t = 30.3 s. | — |
| D3 | **4 / 4** | Twelve countable notches, one filled, eleven hollow, real `<a href="/?s=…">` in `<nav aria-label="rooms">`, in the initial HTML and **visible from the first frame on the landing route at every size tested**. A visitor who leaves at 12 s now knows the site has twelve rooms. | — (the arc overlap is charged once, at C4) |
| D4 | **3 / 3** | The Next Arc is `position: fixed`, present in every room, instant, and never relocates within a session. | — |
| D5 | **2 / 2** | The ghost self-demo, TONE's realignment, ORBIT's closing epicycles, MIRROR's deterministic ghost, five hidden destinations. No scarcity, timer, streak or punishment. | — |

### Category E — Depth & Click-Through Architecture — 10 / 10 *(was 8)*

| # | Score | Evidence | Deduction |
|---|---|---|---|
| E1 | **3 / 3** | Every label is a room name or a concrete phrase. No generic link text anywhere. | — |
| E2 | **3 / 3** | The desktop arc now hangs off the ring at five o'clock at 1440×900, 1280×800 and 1024×768 — inside the viewport, clear of the caption, visually part of the ring rather than a corner ornament (`d1024x768-arc.png`). Idle escalation unchanged. | — |
| E3 | **2 / 2** | §H.3 equivalent complete: notch state (visual), one-word title, **hook line as the gap subline** (`growth` / `one more generation`), visited marker that is filled + inner ring + `origin — visited` text. | — |
| E4 | **2 / 2** | Twelve URL-addressable reversible options; notch click → `/?s=garden` with `<h2>garden</h2>`; Back → `/` in one press. No choice forced. | — |

### Category F — Mobile — 7 / 10 *(was 7; F3 +1, F1 −1)*

| # | Score | Evidence | Deduction |
|---|---|---|---|
| F1 | **2 / 3** | `scrollWidth === clientWidth` at 320 (320/320) and at a 180×320 layout viewport (180/180); `maximum-scale=5, user-scalable=yes`. | At 200 % zoom (180×320) the six-column notch block is 328 px wide, so **`origin` sits at x = −74 and `pulse` at x = −18 — two of twelve nav targets entirely off-screen, with no scroll to reach them** — and the `<h1>`'s second line is clipped below the fold (`zoom-180.png`). At 320 px the `origin` notch is clipped by 4 px. The ring itself stays usable. −1. |
| F2 | **2 / 3** | `cy = 0.455 · vh` keeps the ring's lower arc in the thumb zone; Ringway and arc both use `max(16px, env(safe-area-inset-bottom))`. | The four utility controls are still pinned top-right on every phone, and at 44 px each the block now runs from y = 12 to y = 200 — deeper into the hardest corner to reach one-handed, and it is where the two outbound actions live. −1. |
| F3 | **1 / 2** | **Sizes are fixed.** Every notch is 48×48 and every footer button ≥ 44 px tall on 320×568, 360×640, 393×852 and 412×915; the short-phone arc is 44 px. Pass one's 32 px footer and 24 px notches are gone. | **Spacing is not.** `row-gap: var(--sp-1)` = **4 px** between footer buttons (y 12/60/108/156, 44 tall) and `row-gap: 4px` between the two notch rows (y 524/576, 48 tall) — the rubric asks ≥ 8 px. And the arc/notch overlap is negative spacing on three targets. The `origin` link on the 404 is 46×29. −1. |
| F4 | **2 / 2** | `100svh`/`100dvh` throughout. At 320×568 the notches (y 446–552) and the arc (y 456–500) are both fully inside the viewport; nothing critical is under browser chrome. | — |

### Category G — Accessibility — 10 / 10 *(was 8; hard gate ≥ 6 — passed)*

| # | Score | Evidence | Deduction |
|---|---|---|---|
| G1 | **3 / 3** | Reduced motion is still a second design, not a strip: ORIGIN keeps a complete still composition with its seed nodes and sweep head (`m-reduced-origin.png`), TRAIL its dodecagonal spirograph (`m-reduced-trail.png`). `gentle mode` toggles it in-page with `aria-pressed` and a filled glyph. | — |
| G2 | **3 / 3** | Measured tab order is exactly §C.12: `skip to the ring` → `#stage` → `sound` → `gentle mode` → `keep this` → `send your loop` → the twelve notches → Next Arc. `:focus-visible` is a 2 px outline on every stop. **Pass one's deduction is recovered**: the notches are opaque from the first frame, so all twelve focus rings are visible. The two hidden controls are not invisible tab stops — focus reveals them (measured opacity 1, `:focus-visible` true); the only residue is the 520 ms fade before they are fully legible. | — |
| G3 | **2 / 2** | One `<h1>`, twelve `<section aria-labelledby>`, `<nav aria-label="rooms">`, `<main>`, a polite live region that carried `there are twelve of these` at 30.3 s, ring canvas `aria-hidden`, room canvas `role="img"` with a live node count (`origin — tap the ring, drawn from your 2 nodes`), per-notch visited text. Axe clean, Lighthouse a11y 1.00 in all three runs. | — |
| G4 | **2 / 2** | Text unchanged (muted 5.39 : 1, `<h1>` 17.8 : 1). **Non-text now passes**: sampled ring pixels 3.24–5.40 : 1 light and 3.51–5.45 : 1 dark; notch borders and the arc track 5.39 : 1 / 5.40 : 1. No state is encoded by colour alone. | — |

### Category H — Trust & Anti-Dark-Pattern — **0 penalties**

| Violation | Finding |
|---|---|
| Entry modal / exit-intent / obscuring overlay | None. 0 `<dialog>`/`[role=dialog]`. Nothing overlays the stage in 38 s of observation. The `keep this` / `send your loop` fade is a *reveal*, not an overlay, and both stay keyboard-reachable. |
| Fabricated social proof / fake counts / countdowns | None. GARDEN is still the three honest sources; the only copy is `loops left here`; the hub reads real collected state. |
| Scroll-jacking | None. `wheel` unbound, `body.scrollHeight === innerHeight`. |
| Sign-up / email wall | None. No accounts, no forms, no email field. |
| Clickbait curiosity gap | None. `it comes back` is paid in 4000 ms. |
| Progress indicator not backed by real state | None — and it is now *visible*: `data-visited` follows the §C.5 rule from the first frame. |
| Infinite feed | None. Twelve rooms, countable, with a named end. |
| Autoplay audio | None. `AudioContext` only inside the `sound` gesture handler. |

**Total penalty 0.**

---

## 4. Totals, gates, and the two regressions

```
A 20 + B 16 + C 13 + D 17 + E 10 + F  7 + G 10  =  93
Category H penalties                             =   0
                                          TOTAL  =  93 / 100
```

Hard gates: A1 = 5 ✔ · A4 = 4 ✔ · B1 = 6 ✔ · no penalty ≥ 12 ✔ · Category G = 10 ≥ 6 ✔.
**No gate fails. 93 → the 92–100 band → estimated ≥ 90 % non-bounce. The mandate is met.**

Movement since pass one: **A +1, B +1, D +5, E +2, G +2, F ±0, C −2.**
Fixes 1, 3, 5, 6, 7 and 8 delivered exactly what `07` priced them at. Fix 4 was
free. Fix 2 bought its two F3 size points but spent two C points on collisions:

**R1 — the footer box eats the ring's one-to-two-o'clock arc (C1 −2).**
`footer.loop-footer` is `position: fixed` with `pointer-events: auto`, so the
whole box swallows taps, not just the buttons. At 32 px rows the box ended at
y = 140 and the ring's topmost point is y = 151, so it missed the ring entirely.
At 44 px rows it ends at y = 200 and overlaps. Measured 8 / 72 ring-band points
dead at 360×640 and 12 / 72 at 320×568 — and at zero nodes half the box is
invisible, so the visitor taps where the copy told them to and nothing happens
for no visible reason (`m-3nodes-controls.png` shows `send your loop` sitting
on the ring stroke once it appears).

**R2 — the Next Arc is drawn on top of three Ringway notches (C4 −1, B2 −1).**
Both are `z-index: var(--z-nav)`; the arc comes later in the DOM, so it wins. At
360×640 and 320×568 the arc's 168×44 box covers the centres of the second, third
and fourth notches. A tap on `tone` goes to `pulse`; in TONE a tap on `pulse`
goes to `trail`. Taller phones and all desktop sizes are clear.

Neither is a dark pattern and neither fails a hard gate, but R2 in particular is
the same *class* of defect as pass one's blank 404: a control that is present,
visible and lying about where it goes.

---

## 5. Remaining deductions, cheapest fix for each

Seven points are still on the table. In order of points per line of CSS:

**1. Stop the footer box swallowing ring taps. — C1 +2**
*Owner: WP3 — `src/components/shell/shell.css`, the `footer.loop-footer` rule.*
Add `pointer-events: none` to `footer.loop-footer` and `pointer-events: auto` to
`footer.loop-footer button` — the same opt-in pattern `nav.ringway` already uses
two hundred lines above. One line each, no layout change, and the dead arc goes
to zero. *Verification: hit-test 72 points on the ring band at 320×568 and
360×640 — every one resolves inside `#stage`; a real tap at a = 0.05 and
a = 0.12 places a node.*

**2. Separate the Next Arc from the notch rows on short phones. — C4 +1, B2 +1**
*Owner: WP3 — `src/components/shell/shell.css`, the
`@media (max-height: 700px) and (max-width: 639px)` blocks.*
The arc bottom is `max(16px, safe-area) + var(--tap-min) + var(--sp-1)`, which
assumes **one** 48 px notch row; there are now two. Make it
`+ (2 * var(--tap-min) + 4px) + var(--sp-2)` (or give the two-row layout its own
`--nav-h` custom property and use it in both rules) so the arc clears the block
instead of lying across it. While there, raise the arc's `z-index` above the nav
or lower the nav's — whichever loses, it should not be the twelve navigation
targets. *Verification: `elementFromPoint` at all twelve notch centres returns
that notch at 320×568, 360×640, 393×852 and 412×915, on `/` and in `?s=tone`;
a tap on `tone` lands on `/?s=tone`.*

**3. 8 px gaps. — F3 +1**
*Owner: WP3 — `src/components/shell/shell.css`.* `footer.loop-footer`'s
`row-gap: var(--sp-1)` → `var(--sp-2)`, and the short-phone
`nav.ringway .notches { row-gap: 4px }` → `8px`. Both blocks have the room:
the footer ends at y = 200 of 640, and the notch block gains only 4 px.
Do this in the same pass as fix 2 so the arc offset is computed once.

**4. Move the two outbound controls off the top-right corner. — F2 +1**
*Owner: WP3 — `shell.css` `footer.loop-footer`.* `keep this` and
`send your loop` are the site's only outbound actions and they sit in the
hardest corner to reach one-handed; they also only exist once there is a node.
Cheapest honest version: on coarse pointers, move the pair to the bottom-left,
opposite the arc, when `data-node-count` ≥ 1. This subsumes fix 1 as well,
since the box would no longer be over the ring.

**5. Make the Ringway survive 200 % zoom. — F1 +1**
*Owner: WP3 — `shell.css`.* Under `(max-width: 380px)` let the notch grid shrink
its columns to `minmax(32px, var(--tap-min))` with the 44 px hit area kept by
padding, or drop to three rows of four. Today at a 180 px layout viewport two of
twelve notches are entirely off-screen.

**6. Desktop dial targets are 40 × 8 px. — no rubric points, but it is the
same control at a tenth the size.** *Owner: WP3 — the
`(pointer: fine) and (min-width: 721px)` `nav.ringway` block.* The vertical dial
packs twelve links into 96 px. WCAG 2.2's 24 × 24 minimum would want ~288 px of
column; the dial has the room (the viewport is 900 px tall).

Fixes 1 + 2 + 3 take the score to **98** and cost about eight lines of CSS in one
file owned by one work package.

---

## 6. What to protect

Everything in `07` §5 still holds, and this pass adds four things that the fixes
created and that are now load-bearing:

1. **The Ringway on arrival is the single biggest thing this site does.**
   Opacity 1 at 1 s, ORIGIN already lit, all twelve slots countable, and the
   30 s moment kept as an escalation that still says `there are twelve of these`.
   That one `useState(true)` is worth five rubric points and, on the rubric's own
   mapping, roughly nine points of non-bounce. Never let it start hidden again,
   and never re-add `pointer-events: none` to its links.

2. **Non-text contrast on the ring is now measured, not asserted.** 3.24 : 1 is
   the *lowest* of twelve samples; the ring stroke has very little headroom. Any
   future change to `--c-text-muted`, to the stroke alpha, or to the canvas
   background must be re-sampled from rendered pixels — the token table alone
   would not have caught the old 2.02 : 1.

3. **The no-JS document and the 404 both render real copy now.** They are the
   two routes no test screenshot usually covers and both were blank-ish before.
   `data-active="true"` on the not-found shell and the collapsed stage under
   `html:not([data-loop-js])` are one attribute and one rule; they are easy to
   lose in a refactor of `globals.css`.

4. **Time-to-first-touch survived the Next 15.5 move.** Tap at t = 150 ms still
   places a node, 10 ms to painted feedback, 29 ms on desktop, CLS still exactly
   0, FCP = LCP = 914 ms because the `<h1>` paints in the FCP frame. Re-measure
   all four on any change to the inline bootstrap, the title's
   `caption-in` animation, or the DPR cap.

And one standing rule this pass would add: **every fixed overlay must declare
`pointer-events: none` and let its interactive children opt back in.**
`nav.ringway` does it; `footer.loop-footer` does not, and that single omission
is what turned a 2-point accessibility win into a 2-point interaction loss.

---

## 7. One-line summary

**93/100, zero dark-pattern penalties, all hard gates passed, ≥ 90 % estimated
non-bounce — the mandate is met, by one point. All eight fixes landed; the
44 px pass shipped two overlay collisions (the footer eats 11–17 % of the ring
band to touch, the Next Arc covers three notches and sends two of them to the
wrong room on 360×640 and 320×568), and about eight lines of CSS in
`shell.css` would take it to 98.**
