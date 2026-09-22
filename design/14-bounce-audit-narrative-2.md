# 14 — Bounce-risk audit 2: "the same four seconds"

**Doc:** `design/14-bounce-audit-narrative-2.md` · **Author:** bounce-risk auditor · **Date:** 2026-09-22
**Build:** branch `claude/lucid-knuth-pzwv2c` @ `699476d`, served from the prebuilt `.next` by
`next start -p 3222`
**Standard:** `design/11-narrative-build-spec.md` §H.4. Threshold **≥ 92 with zero Category H
penalties.** Previous pass: `design/13-bounce-audit-narrative.md`, 93/100.

| | |
|---|---|
| **Total** | **99 / 100** |
| Category H penalties | **0** |
| Hard gates | **all passed** (A1 = 5, A4 = 4, B1 = 6, no penalty ≥ 12, G = 10 ≥ 6) |
| Implied estimated non-bounce | **≥ 90 %** (rubric band 92–100) |
| Margin over the gate | **seven points** |
| Movement since `13` | **+6** (C +2, D +2, E +1, F +1) |

Six of the seven claimed fixes are complete as described. The seventh — the deep-link `visited`
lie, the one item that decided the last audit — is fixed on **every JavaScript path** and survives
in exactly one place: the prerendered zero-JS document. That residue is the only point I withhold,
and it is a one-line fix. **The contested Category H reading from `13` no longer exists:** there is
no arrival on which a reader who is accumulating state is told they have read something they have
not.

---

## 1. Method

I started my own server on `:3222` against the prebuilt `.next` and drove it with `playwright-core`
1.56.1 and the preinstalled Chromium rev 1194. I ran no build, no `pnpm verify`, no `pnpm test:*`,
no `pnpm audit:perf`, and I edited no source, test or config file. Everything below except the
figures given in §2 is my own measurement on this build.

I read the site as a visitor before scoring it, twice: once cold at 360×640, once returning with
three keys and a contradiction in hand. Then I re-measured at 320×568, 393×852, 412×915, a 180 px
layout viewport (200 % zoom), 1024×768 and 1440×900, in both colour schemes, under
`prefers-reduced-motion`, under `forced-colors: active`, in greyscale, and with JavaScript
disabled.

Screenshots: `/tmp/claude-0/-home-user-loopsite/13eb2cf5-36ab-5c24-a509-55e740c35678/scratchpad/audit-n2/shots/`.

**Supplied and used as given, not re-measured:** `pnpm verify` green (96 unit, 362 e2e, 48 a11y,
zero failures); Lighthouse mobile medians on `/` — performance 99, accessibility 100, best
practices 100, SEO 100, FCP 910 ms, LCP 910 ms, TTI 2000 ms, TBT 91 ms, CLS 0.000; bytes gz —
render-blocking 9.1, first-party JS 12.1, total JS 150.5, document 31.1, inline RSC 16.6, fonts 0,
images 0, third-party 0.

---

## 2. The seven fixes, verified one at a time

### 2.1 Held words survive a reload — **complete**

Cold arrival at `/`: `loop:v2.keys` is **`["the-hour-has-a-smell"]`**, the `open: true` aside
carries `data-held="true"`, and its summary computes `text-decoration-style: solid` while the other
four in `the dog` compute `dotted`. The endowment §C.8 calls genuine is now genuine.

Pressed `the second click` and `back door`, then reloaded: at `waitUntil: 'commit'` the document
already carries `<style id="loop-keys">` with **531 characters** of rules, and after load all three
words compute `solid` and carry `data-held="true"` while the two unpressed ones stay `dotted`
(`f1-reload-held-360.png` — three solid rules and three night bars visible in the first viewport).

Scoping is correct: a cold arrival at `/?s=road` gets `keys: []` — no key from an account the
reader has not opened — and the endowed key is granted the moment they navigate to `the dog`
(`keys: ["the-hour-has-a-smell"]` after that one click). Idempotent; entering twice grants once.

### 2.2 The deep-link `visited` lie — **fixed on every JS path; one no-JS residue**

Cold context, fresh profile, six arrival paths. In every case `loop:v2.visited` contains **only the
account the link opened**, and the `dog` slot's accessible name is `the dog`, not `the dog — read`:

| arrival | `visited` | `dog` slot name |
|---|---|---|
| `/?s=road` | `["road"]` | `the dog` |
| `/?s=four-seconds` | `["four-seconds"]` | `the dog` |
| `/s/road` (alias → `/?s=road`) | `["road"]` | `the dog` |
| `/#section-river` | `["river"]` | `the dog` |
| `/?s=lamp&b=hill` | `["lamp"]` | `the dog` |
| share link `/?s=switch#n=AVoBAgEHAAAABAA` | `["switch","dog"]` — the **sender's** set, unioned as §C specifies, with `someone read it this way` | — |

Zero console errors and zero `pageerror` on all six.

**The residue.** With JavaScript disabled, every route still serves `data-state="read"` and
`the dog — read` on the first slot, including `/s/road`, where the document is about the road and
the night says the dog has been read (`curl /s/road`; `nojs-360.png`). On `/` this is defensible —
the dog is the landing account and carries `aria-current` — but on an alias page it is the same
false mark the fix removed everywhere else. It is corrected within ~70 ms for every reader who has
JavaScript (measured: boot attributes set at **71 ms** after commit), and a reader without
JavaScript has no state mechanism at all, so this is not a fabricated meter. It costs **D2 one
point** and nothing else. Cheapest fix in §6.

### 2.3 The first-time feedback, `data-more` — **complete, honest and legible**

Cold profile, one press of `the second click` in `the dog`, nothing else:

- **exactly two of twelve** slots change — `lamp` and `switch`, both `data-state="unread"`, both
  gaining `data-more="true"` (`f3-before-press-360.png` → `f3-after-press-360.png`);
- the live region announces **`the streetlight — changed, the switch — changed`**;
- a second press adds `the radio — changed` and nothing else;
- the account on screen does not move; the press-to-paint interval was **3 ms**.

Honesty. An unvisited slot stays hollow and muted and merely gains a 10 × 2 px bar above its mark.
`read` is a **filled** mark; `changed` is filled **plus** bar; unvisited-with-more is **hollow plus
bar**. Four shapes, one accent, no new colour, and nothing that could be read as "you have been
here" (`f3-night-after-press-360.png`).

Without colour. In greyscale the four shapes remain distinct (`night-grayscale-360.png`); under
`forced-colors: active` the bar renders `CanvasText` and survives (`night-forcedcolors-360.png`).

In the accessibility tree. CDP `Accessibility.getPartialAXTree` on the `lamp` slot returns
`link "the streetlight"` before the press and `link "the streetlight — changed"` after it. The
signal is not visual-only, and `changed` is a §C.13 string.

No layout cost: the bar is absolutely positioned into the slot's 5 px top padding. Across
load → two presses → navigate → press → return → reload, `layout-shift` with trusted input sums
**exactly 0** (the two entries recorded both carry `hadRecentInput: true`; the same sequence driven
by synthetic `.click()` sums 0.058, which is the observer's input-exclusion rule, not a shift the
reader ever sees uninvited).

### 2.4 The aside at the foot of the block — **complete, and a net gain**

The opening paragraph now reads unbroken: `.blk` text content with the bodies removed is the
complete sentence, and the note lands under the paragraph carrying the word as its lemma
(`f4-dog-first-viewport-360.png`). `::details-content` is suppressed, so an open `<details>` holding
only its word fragments nothing.

Structure across all twelve accounts: **42** blocks carry asides, **max 2 asides per block**, max
`data-i` = **1** (the CSS pairs 0–2, so there is one index of headroom), **zero** unpaired
word/body pairs, **zero** bodies out of position. Zero-JS: the `[open] ~ .aside-body` pair works
with scripting off (`display: block` measured, `nojs-360.png`).

Reading rhythm, all 43 asides opened at once: the median note sits **177 characters** after its
word — three to five lines — and the worst case is 226 (`switch / nothing was wrong`). Measured in
pixels at 360 in `the dog`: 98, 155, 41, 70, 13 px between the word's line box and its note. That
is a gloss, not a separation: the note is labelled with the word in the reading face, the order
matches the eye's order, and it is never more than a paragraph away. I judge the tie **stronger**
than the old inline form, which bought adjacency by cutting a sentence in half.

The promised knock-on is real: at 360 the second pressable word `the second click` now sits at
y 430–504 with the ask bar at y 587 — **fully inside the first viewport and fully above the bar**,
dotted, next to a solid one. The first press can now be additive.

Two costs, both small and both recorded: at 320 the same word's dotted rule is at the bar's edge
(10.5 px of overlap at scroll 0), and the open aside's note has moved below the fold at 320, so on
the shortest phone the mechanic is taught by the solid rule alone (`f4-dog-first-viewport-320.png`).

### 2.5 The five contradiction lines — **complete, and they land as a discovery**

All five are in the raw response body, each inside
`.blk.contra[data-needs="contra:<id>"]`, each at the foot of the account its sentence names first:
`clicks`→`dog`, `both`→`lamp`, `count`→`moth`, `bridge`→`river`, `hill`→`window`.

Earned live: pressed `the second click` in `the dog`, walked to `the switch`, pressed `once`. The
hub ticked to **`1/5`**, the live region said
`the dog — it says more now, the road — changed, four seconds — changed, 1/5`, and the `dog` slot
went `changed` with a bar. Returning to `the dog`, the line materialised by the ordinary entry rule
with `data-held="true"` and `data-new="true"`, **at the foot of the account, immediately above the
ask card**, with the hairline rule drawn in Ember — the hub's colour and the site's only other mark
for a contradiction (`f5-contra-line-dog-360.png`):

> the dog heard two clicks. the switch was pressed once. neither of them can hear the other one counting.

After reload it is still there and `data-new` is gone. Zero running animations after entry. This is
a discovery, not a notification: the reader is told an account they have read says more, they go
back, and the narrator speaks for the first time at the bottom of a page they thought they had
finished. `13`'s D5 deduction is fully answered.

### 2.6 The ambient layer — **complete, with one honest qualification**

Maximum alpha on the finished drawing, measured by `getImageData` over the whole canvas, twelve
accounts at 360 px: **3.53 %–6.67 %** (dog 6.67, lamp 6.67, kettle 6.27, moth 6.67, river 5.49,
bus 5.10, radio 5.88, clock 5.49, window 3.53, switch 6.67, road 4.71, four seconds 5.10). At 1440
it is 3.53–5.49 %. All are under §C.16's 8 % ceiling; the audit-1 figure of 28.6 % is gone, and the
`destination-in` ceiling means crossing strokes cannot add.

`strokeRect` appears nowhere in `src/figures/**` (only in `src/lib/keep.ts`, which draws the
`keep this` PNG border — not the ambient layer). Amplifying each canvas ×14 and viewing it alone
confirms the shapes are open: the dog is a jamb, a slant and a floor line; four seconds is a row of
open-sided verticals on short rules; the switch is a curved wall, a lever and two small circles
(`amp-m360-dog.png`, `amp-m360-four-seconds.png`, `amp-m360-switch.png`, `amp-m360-river.png`).
Nothing frames the navigation grid any more. At 1440 the river reads as current lines across the
full width under a centred column, and in dark it reads the same (`fig-d1440_light-river.png`,
`fig-m360_dark-river.png`).

**Qualification.** "Staged below the navigation" is approximately, not strictly, true on a phone:
five of twelve figures put ink above the night's bottom edge — dog, lamp, kettle, river, road —
at a measured maximum of **1.96 %** alpha, because the veil ramps from zero at `quiet/2` rather than
cutting at `quiet`. It is visible if you look for it (one faint diagonal through the bottom row of
the grid at 360 and 320). At 2 % it reads as weather, not as chrome, and I do not charge it; if the
intent was a hard edge, the gradient's first stop is the place to move it.

### 2.7 The night's labels, and the shortest phone — **complete**

Every `.label`'s `scrollWidth ≤ clientWidth` at **320, 360, 393, 412, 180, 1024 and 1440**; zero
labels carry `text-overflow: ellipsis`; twelve slots present and on screen at every width;
`scrollWidth === clientWidth` on the document at every width (no horizontal overflow anywhere).
`the streetlight`, `the last bus` and `four seconds` set on two lines inside a 45 px box
(`f7-night-w320.png`, `f7-night-w360.png`, `f7-night-w180.png`).

The shortest phone: `.blocks` top at 320×568 is **380.6** (was 415.8), the bar top is 515, so there
are **134 px** of reading above the bar — four full lines of prose instead of one line and a
clipped aside. That is +35 % on my measurement rather than the claimed +47 %, and it is still short
of §F.3's promise of y ≈ 300 with 212 px, but the defect `13` charged — "the first screen has no
story in it" — is no longer true.

---

## 3. Item-by-item score

### Category A — Speed & Stability — **20 / 20**

| # | Score | Evidence | Deduction |
|---|---|---|---|
| A1 | **5 / 5** | Raw body: 12 × `<section id="section-*">`, 43 `<details>` with exactly one `open`, 43 `.aside-body`, 5 `.blk.contra`, one `<h1>`, ~8 447 words, 238 882 bytes. With `javaScriptEnabled: false`: 12 of 12 sections laid out, one `<h1>`, 144 night `<a href>`, 24 ask links, the open aside's body visible, 23 694 characters of readable text (`nojs-360.png`, `nojs-360-full.png`). Zero-JS is the best case, not a fallback. | — |
| A2 | **4 / 4** | 8 resources, 124.8 KB uncompressed in total, document 32 076 B on the wire (31.1 KB gz supplied); zero third-party origins, zero fonts, zero rasters, zero `<iframe>`/`<embed>`/`<object>`. Far inside 200 KB. | — |
| A3 | **4 / 4** | `PerformanceObserver('layout-shift')` installed with `addInitScript`, trusted taps: **0.000** across load → two presses → navigate → press → navigate back → reload. Nothing has an unknown intrinsic size; the `data-more` bar is drawn into reserved padding; the contradiction line materialises only at entry. | — |
| A4 | **4 / 4** | A `<summary>` clicked at `commit + 200 ms` opened in **17 ms** with two `<details open>` in the account — native, pre-hydration, no JS dependency. Boot attributes present at **71 ms**. | — |
| A5 | **3 / 3** | At **t = 300 ms** the frame carries the premise, the account title, the standfirst, all twelve slots, block 1, the open aside and the ask bar (`t300-360.png`) and is indistinguishable from the settled frame. No spinner, no skeleton, no gate, ever. | — |

### Category B — Instant Comprehension — **17 / 17**

| # | Score | Evidence | Deduction |
|---|---|---|---|
| B1 | **6 / 6** | `the lights went out for four seconds.` — seven plain words, line 1 of the `<h1>`, in the initial HTML, above the fold at 360×640, 320×568 and a 180 px layout viewport, at **17.84 : 1** light / **17.50 : 1** dark. Line 2 names the form. | — |
| B2 | **4 / 4** | One primary CTA: the fixed ask bar, always naming its destination (`ask the streetlight`), never `next`. Two competing attractors in the first viewport — the night grid and the prose column. The three footer controls are at the document foot. | — |
| B3 | **4 / 4** | A concrete instance in frame one: the standfirst (`a dog beside a heater, in a house with a door that was shut all evening.`) plus block 1 and, at 360, four lines of the open aside (`t300-360.png`). At 320 the note falls below the fold but the standfirst and four lines of the account remain. | — |
| B4 | **3 / 3** | 0 `<dialog>`/`[role=dialog]`/`[aria-modal]`, 0 `<audio>`/`<video>`/`<iframe>`, 0 cookie bars. Only three `position: fixed` elements exist at any time (the night rail, the ask bar, the canvas) and that count is unchanged at 12 s. | — |

### Category C — Interaction & Agency — **16 / 16**

| # | Score | Evidence | Deduction |
|---|---|---|---|
| C1 | **6 / 6** | **The deduction from `13` is repaired.** The first viewport at 360 now carries twelve 44 px night links, one solid (held) word and one **dotted, unpressed** word fully above the bar; pressing it is additive — a five-line note appears under the paragraph, **two of twelve** night slots gain a bar, and the live region names both. Verified with `tap()` on touch contexts at 320 and 360, click at 1440 and `Enter` on a focused `<summary>`, all pre-hydration. The priced compensation ("the nav reacts to the press") fires for a first-time reader on their first press, which is what it did not do in `13`. | — |
| C2 | **4 / 4** | Press → `<details open>` in 3–17 ms; night, hub and live region repaint in the same handler; **zero long tasks** on `/`, `/?s=four-seconds` and `/?s=river` over 3 s; TBT 91 ms supplied. INP far inside 150 ms. | — |
| C3 | **3 / 3** | Within two screens: press a word, twelve-way night, fixed ask bar. Beyond: `→`/`←` (verified `→ lamp`, `← lamp`), digits (`3 → kettle`), `Esc` (closes all five open asides, verified), the belief anchors, `gentle mode`, `keep this`, `send the night as you have it`. `Space` still scrolls (457 px). | — |
| C4 | **3 / 3** | Measured rest/hover/active/focus on a summary (`dotted` + ink → accent + 2 px rule), a night slot (muted → text colour + border) and a footer button (border and colour). All 23 tab stops show `2px solid rgb(75,57,201)`. Two non-colour signifiers on every state. **The held rule now survives a reload and the one worked example is genuinely held**, which was `13`'s deduction here. | — |

### Category D — Open Loops & Exploration Pull — **16 / 17**

| # | Score | Evidence | Deduction |
|---|---|---|---|
| D1 | **4 / 4** | The first viewport cuts mid-sentence into the note at 360 and mid-paragraph at 320. Every block ends withholding something nameable (CI-enforced). The foot of all twelve accounts is an ask card naming the next account and its standfirst, and `four seconds` closes the ring back to `the dog`. No screen is a closed statement. | — |
| D2 | **3 / 4** | Non-zero and **genuine** on arrival: `visited: ["dog"]`, one of forty-three words held and drawn solid in the first painted frame, hub reserved and printing nothing at zero. Every deep-link, alias, anchor and belief arrival marks only the account it opens. An inbound share link unions the sender's state and says `someone read it this way`. | **The zero-JS document still marks `the dog — read` on every route**, including `/s/road`, where the page is about the road (§2.2). One slot of twelve, JavaScript-off only, corrected at 71 ms for everyone else — not a fabricated meter, so not a Category H penalty, but not yet honest either. −1. |
| D3 | **4 / 4** | Three nested finite sets with visible holes: twelve slots (one filled, eleven hollow) at 320/360/393/412/180/1024/1440 with no slot off-screen and no overflow; 43 dotted words; `n/5`. | — |
| D4 | **3 / 3** | Fixed from frame one, in the thumb zone with `max(10px, env(safe-area-inset-bottom))`, instant, and never relocating: rect byte-identical on `/` and in every account at 360 (`[0,587,360,53]`), 320 (`[0,515,320,53]`), 393 and 412. On desktop the anchor is identical (`bottom 884, right 1424`) and only the left edge follows the length of the destination's name. Always names its destination. | — |
| D5 | **2 / 2** | The five authored lines are rendered and earned (§2.5). Which contradiction fires first is determined entirely by the reader's own order; the reward is a sentence, an Ember rule, a hub tick and a live announcement. No scarcity, no timer, no streak, no countdown, no punishment. | — |

### Category E — Depth & Click-Through Architecture — **10 / 10**

| # | Score | Evidence | Deduction |
|---|---|---|---|
| E1 | **3 / 3** | Swept the rendered document: zero `read more` / `learn more` / `click here` / `discover` / `immersive` / `journey` / `next` / `tap` / `scroll`, zero sign-up language, zero counts of people, **zero numerals of any kind** in rendered text outside the hub's `n/5`. Every label is an account title or `see also <title>`. (`join` occurs once, as corpus prose: "the clock cannot join the two ends".) | — |
| E2 | **3 / 3** | An ask card at the foot of all twelve accounts, each naming the next account's title and standfirst; `four seconds` → `the dog`. No content unit dead-ends. | — |
| E3 | **2 / 2** | **`13`'s truncation deduction is gone**: zero labels clipped at seven widths. Desktop slot is a full teaser — shape-coded visited state, specific title, and the account's standfirst as a gap subline on hover **and** focus (measured 288 × 50, `e3-night-hover-1440.png`). On a phone the subline's job is done by the ask card, which carries the same standfirst permanently. The one missing attribute is metadata, which this site cannot supply without inventing copy the corpus and §C.13 forbid; I do not deduct for the absence of something the same rubric penalises elsewhere. | — |
| E4 | **2 / 2** | Two real belief anchors, `/?s=four-seconds&b=valley` and `&b=hill`, both URL-addressable, both plain links with zero JS, both on screen and enabled after choosing, reversible in one tap and by Back; plus the twelve-way order branch, earned in both modes. | — |

### Category F — Mobile — **10 / 10**

| # | Score | Evidence | Deduction |
|---|---|---|---|
| F1 | **3 / 3** | `document.scrollWidth === clientWidth` at 320, 360, 393, 412, **180**, 1024 and 1440. The night falls to 4 columns on a phone and 2 at a 180 px layout viewport with **no slot off-screen**. `maximum-scale=5, user-scalable=yes`. | — |
| F2 | **3 / 3** | The primary action is the bottom-anchored ask bar with safe-area padding, `pointer-events: none` on the bar and `auto` on its two children (the standing `08` §6 rule). The two outbound controls are at the document foot, not the top-right corner. | — |
| F3 | **2 / 2** | All-pairs sweep of every visible `<a>`, `<button>` and `<summary>` at seven widths: **zero** elements under 44 px in their tappable dimension, **zero** in-flow pairs closer than 8 px. The only sub-8 px pairs anywhere are in-flow content passing behind the opaque fixed bar at scroll 0, which the reader scrolls past; at a 180 px layout viewport two night slots sit at the bar's edge, noted in §6. | — |
| F4 | **2 / 2** | `min-height: 100svh; min-height: 100dvh` on the account shell; `.blocks` reserves `calc(72px + env(safe-area-inset-bottom))`; nothing critical is hidden by browser chrome. **`13`'s shortest-phone deduction is repaired**: 134 px and four legible prose lines above the bar at 320×568, against 91 px and one line. | — |

### Category G — Accessibility — **10 / 10** *(hard gate ≥ 6 — passed)*

| # | Score | Evidence | Deduction |
|---|---|---|---|
| G1 | **3 / 3** | Under `reducedMotion: 'reduce'`: `html[data-motion="reduce"]`, `requestAnimationFrame` called **0 times** (counted with an `addInitScript` shim over 2.6 s), `document.getAnimations()` running **0**, and the figure still draws its still — 6 051 non-zero-alpha pixels on `four seconds` (`reduced-360.png`, `reduced-fourseconds-360.png`). Same design, nothing stripped; `gentle mode` flips it in page. | — |
| G2 | **3 / 3** | A 24-press `Tab` walk at 1440: skip link → twelve slots in order → five summaries in reading order → ask card → ask bar → three footer buttons → body. **All 23 stops** compute `2px solid rgb(75,57,201)`; none is occluded; no trap. `→`, `←`, digits and `Esc` work and are scoped; `Space` still scrolls; Back leaves in one press. | — |
| G3 | **2 / 2** | One `<h1>`, twelve `<h2>`, twelve `<section aria-labelledby>`, `<main>`, `<nav aria-label="the night">`, `<p id="loop-live" aria-live="polite" aria-atomic="true">` carrying the first-press difference, `n/5` and `someone read it this way`. The single `<canvas>` is `aria-hidden="true"` and carries no information. AX tree verified by CDP: summaries are `DisclosureTriangle` with `expanded` true/false; slots are links whose names carry `— read` / `— it says more now` / `— changed`; blocks are `paragraph`. | — |
| G4 | **2 / 2** | Light: prose 17.84, h1/h2 17.84, standfirst 8.71, note 8.71, lemma 17.84, unread label 5.39, ask 19.43, hub 7.22, footer 5.39, contradiction 17.84, `see also` 8.71; marks 5.39 (hollow) and 5.69 (filled). Dark: 17.50 / 9.23 / 5.47 / 16.54 / 9.85 / 13.22. All ≥ 4.5 : 1 text and ≥ 3 : 1 UI. **No state by colour alone**, confirmed in greyscale and under `forced-colors: active`. | — |

### Category H — Trust & Anti-Dark-Pattern — **0 penalties**

| Violation | Penalty | Finding |
|---|---|---|
| Entry modal / exit-intent / content-obscuring overlay before 30 s or 50 % scroll | −15 | **None.** 0 dialogs at 0.3 s, 3 s and 12 s; exactly three fixed elements ever (night rail, ask bar, canvas); the bar is opaque white, 53–64 px, and `pointer-events: none` except on its two children. |
| Fabricated social proof / fake counts / fake scarcity / countdown | −15 | **None.** No count of people anywhere; no numerals in rendered prose at all. `someone read it this way` attributes to no name and no number. |
| Scroll-jacking | −12 | **None.** No wheel or swipe binding; `Space` scrolls 457 px; arrows and `Page*` unbound. |
| Sign-up / email wall | −12 | **None.** No accounts, no forms, no email field. |
| Clickbait — payoff smaller than the promise | −8 | **None.** At five of five, `four seconds` is a complete authored solve, assembled from earned sentences: a stiff handle at the top of a road, a valley noticing one house at a time, a small yellow light over the bridge at walking pace, a weight going up the hill road that stopped once, the last step over the side into the field, the water that does not report to anything — and then the boots, dry, because the dog lay against them (`fs-full-360.png`). At zero keys it is seven exact blank rules and seven `see also` links naming five accounts, with no scold (`fs-empty-360.png`). The writer paid the build's one priced exposure. |
| Progress indicator not backed by real state | −6 | **No penalty, and this time it is not contested.** On every JavaScript arrival the night reports only what the reader has actually opened (§2.2, six paths measured). The one surviving wrong mark is in the zero-JS document, where no state exists to be backed and no meter is being kept; it is charged at D2 as a defect, not here as a dark pattern. The inbound share link marks accounts the recipient has not opened, but that is the sender's real state, transferred by the recipient's own click, and disclosed — though only to assistive technology (§6.2). |
| Infinite feed with no visible end state | −5 | **None.** Twelve countable accounts, a named end, a ring back to `the dog`. |
| Autoplay audio | −10 | **None.** No `<audio>`, no `<video>`, no `AudioContext` anywhere in `src/`. |

**Total penalty 0.**

---

## 4. Totals and gates

```
A 20 + B 17 + C 16 + D 16 + E 10 + F 10 + G 10  =  99
Category H penalties                             =   0
                                          TOTAL  =  99 / 100
```

Hard gates: A1 = 5 ✔ · A4 = 4 ✔ · B1 = 6 ✔ · no penalty ≥ 12 ✔ · Category G = 10 ≥ 6 ✔.
**No gate fails. 99 → the 92–100 band → estimated ≥ 90 % non-bounce**, seven points clear of the
project's threshold and inside the spec's own projection of 95–98 (§H.5).

---

## 5. Regressions introduced by the fixes

I looked for these specifically. There are three, all small, and none costs a point.

1. **At 320 the open aside's note is now below the fold.** Moving the body to the foot of the block
   pushed the one worked example off the shortest phone's first screen; the mechanic is taught there
   by the solid rule under `eleven oh four` alone. At 360 the note is still on screen and the trade
   bought a second, dotted word above the bar, which is worth more.
2. **At 320 the second pressable word's dotted rule sits at the bar's edge** (10.5 px of overlap at
   scroll 0). It is legible as a word; its signifier is clipped until the reader scrolls a line.
3. **An expanded disclosure now owns no content.** `<summary>` reports `expanded=true` for an
   element with nothing inside it, and the compiler deliberately drops `aria-details`. A screen
   reader reading linearly reaches the note at the end of the paragraph with the word as its lemma,
   which works; a reader who activates the word and expects adjacent content gets none. The comment
   in `compile.ts` states the trade openly. I would revisit it only if the corpus ever grows a
   block with an aside in its final sentence.

Nothing else moved backwards: CLS is still 0, no long tasks appeared on any route, `pnpm verify`'s
362 e2e are green, and the twelve figures are quieter and simpler than before.

**The `/?s=four-seconds` Lighthouse outlier is variance, not weight.** Measured on this build, that
route serves the identical 32 076-byte document, the same 8 resources, **8 extra DOM nodes** (the
veil spans), **zero** long tasks, FCP 84 ms and zero console errors — marginally *cheaper* than `/`.
There is nothing heavy on it.

---

## 6. What is left, and the cheapest fix for each

**1. The zero-JS night marks `the dog — read` on every route. — D2 +1, and the last corner of the
`13` defect.**
*Owner: WP-A — `src/components/night/TheNight.tsx` (and the alias page that renders it).*
The server always renders the landing account's slot as `read`. On `/` that is defensible; on
`/s/<slug>` and `/?s=<slug>` with scripting off it tells a reader they have read an account they
have not opened. Cheapest honest fix: render the `read` mark on **the route's own account** rather
than the landing one — the page knows its slug — or render every slot `unread` and let the runtime
paint the truth 71 ms later. One prop.
*Verification: `curl /s/road` — no slot carries `data-state="read"` except `road`, or none does.*

**2. `someone read it this way` is invisible.** It exists only in the 1 × 1 clipped live region
(`inbound-caption-360.png`), so a sighted reader who opens a friend's link sees six slots marked
and `1/5` in the hub with no explanation on screen. §C.13 fixes the string's home as the live
region, so making it visible is the architect's call, not a builder's — but a caption that only
assistive technology receives is a disclosure only some readers get. *Cheapest fix: render the same
string once, at the foot of the night, on an inbound arrival only.*

**3. `send the night as you have it` still never confirms.** `data-busy` tints the label with the
accent for the few milliseconds the clipboard write takes, and nothing persists. No text, no
announcement, and the one feedback there is is colour-only. There is no lawful string for a
successful copy; this needs §C.13 to gain one.

**4. `normalizeAnchorUrl()` is exported and never called.** `/#section-river` therefore keeps its
hash instead of replacing to `/?s=river` (§C.11 says the shell calls it once). Everything works;
the canonical URL is just not normalised. One line in the shell, or delete the function.

**5. Two cosmetic phone items.** At 320, drop the aside body's leading or the block's bottom margin
by ~14 px so `the second click`'s dotted rule clears the bar; at a 180 px layout viewport the last
two night slots sit 0.1 px from the bar at scroll 0, which one line of `scroll-margin` or an extra
`--sp-2` of list padding would clear.

**6. The ambient veil's first stop.** If figures are meant to be strictly below the navigation on a
phone, move the gradient's zero stop from `quiet * 0.5` to `quiet`. Five figures currently put up
to 1.96 % alpha above the night's bottom edge.

None of these changes a score except the first. Fix 1 takes this build to **100**.

---

## 7. Does this hold a stranger for five minutes? — the part CI cannot score

**Yes. I would now say so without the hedge I put on it last time.**

The writing was always the strongest thing this project has produced, and it is unchanged: the dog
that knows what eleven oh four *smells* like; the clock that stopped and started in the same minute
and "has nothing to put between them"; the window that is a mirror until the lights fail; the river
that "had let go of the four seconds before the four seconds were over". Twelve witnesses, each
genuinely limited to what a filament or a road can know, and a first screen whose last line —
"then the dog heard the second click. there is only supposed to be one." — is a detective's gap and
not a teaser's.

What has changed is that the machine around the writing now keeps its promises, and all three of
the changes are the kind a reader feels rather than notices.

- **The first press pays.** Ten seconds in, a stranger presses a dotted word in the paragraph they
  are already reading; a note in the writer's best voice appears under that paragraph, and two
  slots in a grid of twelve they have never touched quietly grow a mark. That is the exchange the
  whole build was priced on, and in `13` it did not happen at all on a cold profile.
- **The page remembers out loud.** Come back tomorrow and the first screen is visibly *yours*: two
  solid rules where a stranger sees dotted ones, three bars in the night. A returning reader is no
  longer indistinguishable from a first-time one.
- **The site acquires an answer.** Earn two halves of a contradiction and a sentence you have never
  seen is waiting at the foot of a page you thought you had finished, in the one voice that is not
  a witness's. That is the moment §B promised and `13` found missing, and it is the difference
  between a good anthology and a thing with a solution in it.

And the paragraph that carries all of it no longer breaks in half to do it.

What I would still watch. The interactive signifier is a dotted underline on an ordinary word — the
quietest hook this project has shipped, and the beacon (`word_pressed` within 15 s) is the only
instrument that can say whether strangers find it; §H.5's own R2 criterion still applies. The nav's
reaction to a first press is honest and legible but *small* — two 10 × 2 px dashes two hundred
pixels away — so the note under the paragraph is doing most of the teaching. And a 320 px phone
still spends 380 of 568 px on a headline and a grid before the story starts.

None of that is a reason to hold the build. **99/100, zero dark-pattern penalties, every hard gate
passed, an estimated ≥ 90 % non-bounce, and one remaining wrong mark that only a reader with
JavaScript disabled will ever see.** The seven fixes did what they said, the writing is worth the
five minutes, and for the first time the mechanisms are worth the writing.
