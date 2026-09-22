# 13 — Bounce-risk audit: "the same four seconds"

**Doc:** `design/13-bounce-audit-narrative.md` · **Author:** bounce-risk auditor · **Date:** 2026-09-22
**Build:** branch `claude/lucid-knuth-pzwv2c` @ `bf38115`, served from `.next` by
`next start -p 3222`
**Standard:** `design/11-narrative-build-spec.md` §H.4, the 100-point rubric restated from
`design/01-attention-research.md` §6. Threshold **≥ 92 with zero Category H penalties**.

| | |
|---|---|
| **Total** | **93 / 100** |
| Category H penalties | **0** |
| Hard gates | **all passed** (A1 = 5, A4 = 4, B1 = 6, no penalty ≥ 12, G = 10 ≥ 6) |
| Implied estimated non-bounce | **≥ 90 %** (rubric band 92–100) |
| Margin over the gate | **one point** |

The outgoing ring site scored 96. This scores 93. It clears, but by less than the
build spec's own projection (§H.5: "95–98"), and the gap is not where the spec
expected it.

---

## 1. Method, and what I actually did

I started my own server on `:3222` against the prebuilt `.next` and drove it with
`playwright-core` 1.56.1 and the preinstalled Chromium rev 1194. One browser at a
time. I did not run `pnpm verify`, `pnpm build`, `pnpm test:*` or `pnpm audit:perf`,
and I edited no source, test or config file.

I read the site as a visitor before I scored it: I landed on `/` at 360×640 with a
cold profile, read `the dog` to the end, pressed the word that was already open,
pressed a closed one, followed `ask the streetlight` into `the streetlight`, went to
`the switch` from the night, pressed `once`, came back to `the dog` and read the
paragraph that had not been there, then opened `four seconds` holding three keys and
again holding none. I then repeated the relevant parts at 320×568, at a 180 px layout
viewport (200 % zoom), at 1440×900, under `prefers-reduced-motion`, and with
JavaScript disabled, and I looked at every PNG rather than only at the numbers.

Verified numbers supplied with the brief and used as given, not re-measured:
`pnpm verify` green (82 unit, 326 e2e, 48 a11y, zero failures); Lighthouse mobile
medians performance 99, accessibility 100, best practices 100, SEO 100; FCP 917 ms,
LCP 917 ms, TBT 72 ms, TTI ~2.0 s, CLS 0.000; bytes gz — render-blocking 9.0 KB,
first-party JS 11.4 KB, total JS 149.9 KB, document 29.8 KB, flight 15.9 KB, fonts 0,
images 0, third-party origins 0.

Everything else below I measured on this build. Screenshots are in
`/tmp/claude-0/-home-user-loopsite/13eb2cf5-36ab-5c24-a509-55e740c35678/scratchpad/audit-n/shots/`.

---

## 2. Does the writing hold a stranger? — the part CI cannot score

**Yes, and it is the best thing about this build.** I read all twelve accounts and I
wanted to. The corpus is disciplined, strange and specific: the dog that knows what
eleven oh four *smells* like; the clock that stopped and started in the same minute
and "has nothing to put between them"; the window that is a mirror until the lights
fail and then is a window; the river that "had let go of the four seconds before the
four seconds were over". The voice law holds across all twelve witnesses and each one
is genuinely limited by what a dog or a filament or a road can actually know. The
curiosity gap on the first screen is real and it is a *detective* gap, not a teaser:
"then the dog heard the second click. there is only supposed to be one." That is a
stranger-holding sentence.

The reward for pressing is worth it. The asides are not glosses; they are the best
lines in the corpus ("the wind does not put a shoe down on the step on its way
through"). A returning reader does notice that an account changed — the interleaved
block carries a permanent green hairline left rule and lands between paragraphs the
reader recognises, so the change is legible rather than announced
(`m360-return-dog-changed-full.png`). And the resolution pays: `four seconds` at five
of five is a complete solve — somebody walked up the hill road in the cold, put a
thumb on a stiff handle, and went home over the side of the road into the water — and
it is assembled entirely from sentences the reader earned. No clickbait penalty.

Four honest reservations, all of which cost points below.

1. **The aside fragments the sentence it interrupts.** In block 1 of `dog`, opening
   `eleven oh four` puts five lines between "the dark came in one" and "piece, like a
   held breath". On a phone the reader loses the clause across a 114 px gap
   (`m360-t0300.png`, `m360-after-press-closed-word.png`). It is a consequence of the
   inline-`<details>` mechanism, not of the writing, and it is survivable — but it is
   friction on the exact paragraph the whole site is priced on.
2. **The first press is subtractive.** At 360×640 and at 320×568 the only pressable
   word in the first viewport is the one that is *already open*. Pressing it closes
   the aside, removes the only five lines of bonus text on screen, and grants nothing
   (measured: `keys` stays `[]`). The teaching gesture takes content away
   (`m360-after-press-open-word.png`). The next word down, `the second click`, sits at
   y 604 behind the fixed ask bar at y 579.
3. **The second visit's first screen is identical to the first visit's.** The pass-2
   opening block the spec promised was never authored (`11` §I.12), so a returning
   reader gets the same `<h1>`, the same standfirst, the same block 1 and the same
   open aside; the new material is ~700 px down (`m360-returning-visit.png`). The hub
   reading `1/5` is the only above-the-fold evidence that they have been here.
4. **The premise headline is charged to every screen.** The `<h1>` is a fixed 200 px
   masthead repeated on all twelve accounts. On the eighth account it is 31 % of a
   360×640 viewport spent on a sentence the reader read eight screens ago
   (`m360-second-account-lamp.png`).

---

## 3. Item-by-item score

### Category A — Speed & Stability — **20 / 20**

| # | Score | Evidence | Deduction |
|---|---|---|---|
| A1 | **5 / 5** | Raw response body: 12 × `<section id="section-*">`, 43 `<details>`, exactly one with `open`, the `<h1>`, the night, twelve ask bars, 8221 words. With `javaScriptEnabled: false` the first viewport is **pixel-identical** to the JS one and all twelve accounts are present and readable (`m360-nojs.png`, `m360-nojs-full.png`). Zero-JS is the best case, not a fallback. | — |
| A2 | **4 / 4** | Render-blocking 9.0 KB gz, first-party JS 11.4 KB gz, total JS 149.9 KB gz, document 29.8 KB gz — all well inside the 200 KB critical path. Zero third-party origins, zero fonts, zero images, zero `<iframe>`/`<embed>`/`<object>`. | — |
| A3 | **4 / 4** | Supplied CLS 0.000. My own `PerformanceObserver` on `layout-shift`, installed with `addInitScript`, summed **exactly 0** across load → open two asides → navigate to `lamp` → navigate to `switch` → return to `dog` with a block materialising → reload. No media, no fonts, no unknown intrinsic sizes. | — |
| A4 | **4 / 4** | `<summary>` clicked at `waitUntil:'commit'` + 200 ms opened its aside in **8 ms**, with two `<details open>` in the account — native, before hydration, no JS dependency at all. | — |
| A5 | **3 / 3** | At **t = 300 ms** the frame already holds the premise (at 35 % settling), the account title, the standfirst, all twelve night slots, block 1 and the open aside, and the ask bar (`m360-t0300.png`). No spinner, no skeleton, no gate, ever. | — |

### Category B — Instant Comprehension — **17 / 17**

| # | Score | Evidence | Deduction |
|---|---|---|---|
| B1 | **6 / 6** | `the lights went out for four seconds.` — **seven plain words**, line 1 of the `<h1>`, in the initial HTML, above the fold at 360×640, at 320×568 and at a 180 px layout viewport, at 17.84 : 1. Line 2 (`twelve things were awake.`) names the form. Answerable in under a second. | — |
| B2 | **4 / 4** | Exactly one primary CTA: the fixed ask bar, naming its destination (`ask the streetlight`), never `next`. Competing attractors in the first viewport: the night grid and the prose column — two, the rubric's limit. The footer controls are at the document foot, out of the first viewport entirely. | — |
| B3 | **4 / 4** | A concrete instance is on screen in frame one and it is not an abstraction: the standfirst (`a dog beside a heater, in a house with a door that was shut all evening.`) and the already-open aside, five lines of real prose, inside the first viewport at 360 (`m360-t0300.png`). | — |
| B4 | **3 / 3** | 0 `<dialog>` / `[role=dialog]` / `[aria-modal]`; 0 `<audio>` / `<video>` / `<iframe>`; no cookie bar, no interstitial, no carousel, no gate. Nothing overlays anything at 300 ms, 3 s or 10 s. | — |

### Category C — Interaction & Agency — **14 / 16**

| # | Score | Evidence | Deduction |
|---|---|---|---|
| C1 | **5 / 6** | Input-reactive elements in the first viewport, twice over and on every input: twelve night slots (real 44 px `<a href>`, working with zero JS) and the pressable words. Verified with `tap()` on touch contexts at 360 and 320, with click on desktop, and with `Enter` on a focused `<summary>`; all work pre-hydration. | **The compensating mechanism the spec prices this item on does not fire for a first-time reader.** §A.2 and §B stake the build on "press a word, and a slot in the navigation the reader has never visited grows a *changed* marker… feedback visibly larger than the target". Measured: pressing `the second click` in `dog` on a cold profile changed **no** night slot and put **nothing** in the live region, because `accountState()` returns `changed` only for accounts already in `visited` (`knowledge.ts:426`) and `lamp`/`switch` are unvisited. The mechanism is real and it works — pressing `once` in `switch` after `dog` was read marked `dog: changed` and announced `the dog — it says more now` (`m360-switch-after-press-once.png`) — but it is unreachable in the first ten seconds. On top of that, the one pressable word in the first viewport is the already-open one, and pressing it *closes* the aside and grants nothing. The site's single most important ten seconds returns a local, subtractive reaction. −1. |
| C2 | **4 / 4** | Press → `<details open>` in **8 ms** pre-hydration; night repaint and hub tick in the same frame as the toggle handler; TBT 72 ms; INP far inside 150 ms. | — |
| C3 | **3 / 3** | Within the first two screens: press a word, twelve-way night navigation, the fixed ask bar. Beyond: `→`/`←`, digits `1`–`9 0 - =`, `Esc`, the belief anchors, `gentle mode`, `keep this`, `send the night as you have it`. Verified: `ArrowRight` → `lamp`, `3` → `kettle`, Back → `lamp` in one press. | — |
| C4 | **2 / 3** | Every interactive element carries hover (accent + 2 px rule), `:focus-visible` (2 px solid `rgb(75,57,201)`, verified on **all 23 tab stops**), `:active` (`--c-accent-hi`) and ≥ 2 non-colour signifiers. Night states differ by shape. Zero overlapping or sub-8 px pairs at any viewport. | **The `held` signifier does not survive a reload.** §C.2 and §C.8 make the dotted→solid rule permanent — "the page literally gets more solid as the reader works" — and it is one of the site's three progress sets. `data-held` is set *only* inside `onToggle` (`Runtime.tsx:287`) and is never applied from stored keys at boot or at entry. Measured after a reload holding `two-clicks`, `door-open`, `one-press` with the hub at `1/5` and the locked block present: **all five summaries render `dotted`** (`m360-returning-visit.png`). Two smaller defects on the same item: the already-open aside renders `solid` while *not* held, so the one worked example teaches the wrong mapping; and `send the night as you have it` confirms a successful copy with a hairline underline and no live-region announcement (`m360-footer-after-share.png`). −1. |

### Category D — Open Loops & Exploration Pull — **14 / 17**

| # | Score | Evidence | Deduction |
|---|---|---|---|
| D1 | **4 / 4** | The first viewport cuts mid-sentence into the open aside at 360 and mid-line at 320. Every block ends withholding something nameable (copy law, CI-enforced). The foot of every account is the ask card, not a full stop, and the fixed bar is on every screen. No screen is a closed statement. | — |
| D2 | **2 / 4** | The night is a persistent, diegetic, twelve-slot indicator, non-zero from frame one (`the dog` filled), and on the default entry it is genuine: `visited: ["dog"]`. The hub's box is reserved at `min-width: 3ch` and prints nothing at zero. | Two of the three endowed sets are wrong. **(a) The word endowment does not exist.** §C.4 says the `open: true` aside's key is granted at boot; measured on a cold load, `loop:v2.keys` is **`[]`** and the `<details>` carries no `data-held`. "One of forty words held before the reader has done anything" is false, and the reader's first press of that word removes the aside and still grants nothing. **(b) The indicator lies on every deep-link entry.** `useUrlState`'s module-scope `snapshot` is `EMPTY` (section `'dog'`) until `subscribe()` runs, so React's hydration render hands the entry effect `'dog'` before the real slug. Arriving cold at `/?s=road` writes `visited: ["dog","road"]` and the night reports **`the dog — read`** in the accessibility tree to a reader who has never opened it (`m360-enter-road.png`). Same on `/?s=four-seconds`, on `/s/<slug>` and on every inbound share link. (c) The solid-rule set resets on reload — charged once, at C4. −2. |
| D3 | **4 / 4** | Three nested finite sets with visible holes: twelve night slots (one filled, eleven hollow rings) in the initial HTML and on screen at 360, 320, 180 and 1440; 43 dotted words; `n/5`. `scrollWidth === clientWidth` and **no slot off-screen at a 180 px layout viewport** (`zoom180-arrival.png`). | — |
| D4 | **3 / 3** | The ask bar is `position: fixed`, present from frame one, in the thumb zone with `max(10px, env(safe-area-inset-bottom))`, navigates instantly, and **never relocates**: rect `[0, 579, 360, 61]` on `/` and byte-identical in every account at 360; `[1200, 820, 224, 64]` at 1440; `[0, 507, 320, 61]` at 320. It always names its destination and never says `next`. | — |
| D5 | **1 / 2** | The variability is genuine and clean — which contradiction fires first is determined entirely by the reader's own order, with no scarcity, no timer, no streak, no punishment, no countdown. | **The reward is a numeral, because the authored line is never rendered.** All five `Contradiction.line` strings — including `the dog heard two clicks. the switch was pressed once. neither of them can hear the other one counting.` — appear **nowhere** in the document or in any client module: `grep` finds 0 occurrences in the served HTML and the only mention in `src/` is the comment at `Runtime.tsx:37` explaining that prose may not reach Tier B. `11` §I.12 confirms the `contra:<id>` effect blocks were never authored either. So the moment §B calls "the site stops being a nice piece of writing and becomes a thing with an answer" is, in the shipped build, an unexplained 14 px `1/5` appearing in Ember at the bottom right with a 320 ms opacity pulse. The spec's own D5 rationale — "an unannounced *line* that arrives the moment two keys meet" — is unmet. −1. |

### Category E — Depth & Click-Through Architecture — **9 / 10**

| # | Score | Evidence | Deduction |
|---|---|---|---|
| E1 | **3 / 3** | Swept the rendered document: zero `read more` / `learn more` / `click here` / `discover` / `experience` / `journey` / `immersive` / `imagine` / `next` / `tap` / `scroll`, zero sign-up language, zero counts of people, zero numerals outside `n/5`. Every label is an account title or `see also <account title>`. (`click` occurs four times, all diegetic corpus prose about a switch — "a click is a switch" — never as an instruction.) | — |
| E2 | **3 / 3** | The ask card at the foot of every one of the twelve accounts: a block-level `<a>` carrying the next account's title at 26 px and its standfirst (`m360-return-dog-changed-full.png`). `four seconds` closes the ring with `the dog`. No content unit dead-ends. | — |
| E3 | **1 / 2** | On desktop the night slot is a complete teaser card: state mark (shape), specific title, the account's standfirst as a gap subline on hover **and** on focus — measured `[953, 347, 288, 50]` carrying `the water under the bridge, which has a before and an after.` (`d1440-night-hover.png`) — and a non-colour visited marker with matching accessibility text. | **The specific title is truncated on the primary device.** At 360 four of twelve read `the stree…`, `the last b…`, `the wind…`, `four seco…`; at 320 five do, adding `the swi…` (`m360-t0300.png`, `m320-arrival.png`). The reader cannot tell `the streetlight` from `the street` on the screen the rubric measures, and there is no hover on a phone to recover it. −1. |
| E4 | **2 / 2** | The belief choice: two real anchors, `/?s=four-seconds&b=valley` and `&b=hill`, both URL-addressable, both working as plain links with zero JS, reversible in one tap with the other option still on screen and still enabled, and reversible by Back. Verified: clicking `it came from the hill` set `html[data-belief="hill"]` and swapped the variant blocks in `lamp`, `window`, `switch` and `road` with no reflow. Plus the twelve-way order branch, which is earned in both modes. | — |

### Category F — Mobile — **9 / 10**

| # | Score | Evidence | Deduction |
|---|---|---|---|
| F1 | **3 / 3** | **`09`'s 200 % zoom deduction is recovered by construction.** `scrollWidth === clientWidth` at 320 (320/320) and at a 180 px layout viewport (180/180). The night's `repeat(auto-fit, minmax(44px, 1fr))` falls to 2 columns × 6 rows at 180 and **no slot is off-screen** — the outgoing site lost four rooms here. Nothing overlaps at 180 (`zoom180-arrival.png`). `maximum-scale=5, user-scalable=yes`. | — |
| F2 | **3 / 3** | **`09`'s corner deduction is recovered.** The primary action is the bottom-anchored 44 px ask bar with `padding-bottom: max(10px, env(safe-area-inset-bottom))`, in the thumb zone from frame one, with `pointer-events: none` on the bar and `auto` on its two children — the standing `08` §6 rule, kept. The two outbound controls (`keep this`, `send the night as you have it`) are at the document foot, not in the top-right corner. | — |
| F3 | **2 / 2** | **`09`'s 4 px-gap deduction is recovered.** An all-pairs sweep of every visible `<a>`, `<button>` and `<summary>` at 320, 360, 180 and 1440 found **zero overlapping pairs and zero pairs closer than 8 px**. Every night slot is ≥ 44 × 44; every summary is 46 px tall; the ask text and hub are 44 px tall; the three footer buttons are 44 px tall. Two edge cases noted and not charged: the skip link is 154 × 26 (keyboard-only, never a touch target) and `wool` is 39 px wide × 46 px tall (a four-letter inline word; the tappable dimension is the height). | — |
| F4 | **1 / 2** | `100dvh`/`100svh` on the account shell; `.blocks` reserves `calc(72px + env(safe-area-inset-bottom))` so the last line always clears the bar; nothing is hidden by *browser* chrome. | **At 320 × 568 the first screen has no story in it.** The `<h1>` wraps to four lines and the night to 4 × 3, so `.blocks` starts at y = **416** with the bar at y = 507: **91 px of reading**, of which what is actually legible is one line of prose and a clipped first line of the aside (`m320-arrival.png`). `11` §F.3 promised "block 1 begins at y ≈ 300 with 212 px of reading above the bar" and a 5 × 3 night; neither holds. On the shortest common phone the reader's first viewport is a headline, a nav grid and one line. That is the shortest-phone cramping of `09` in a new form. −1. |

### Category G — Accessibility — **10 / 10** *(hard gate ≥ 6 — passed)*

| # | Score | Evidence | Deduction |
|---|---|---|---|
| G1 | **3 / 3** | Reduced motion is not a stripped variant — it is **pixel-identical** to the motion build at arrival, a still, complete, non-uniform composition with every word still pressable (`m360-reduced.png` vs `m360-t10000.png`). Measured under `reducedMotion: 'reduce'`: `html[data-motion="reduce"]`, `requestAnimationFrame` called **0 times** (counted with an `addInitScript` shim), `document.getAnimations()` running **0** after 1.6 s. `gentle mode` flips it in page with `aria-pressed="true"` and no reload. This is the strongest possible form of the item. | — |
| G2 | **3 / 3** | A 24-press `Tab` walk at 1440: skip link → twelve night slots in order → five `<summary>` in reading order → ask card → ask bar → three footer buttons → body. Every one of the 23 stops shows `2px solid rgb(75, 57, 201)`. No trap, no occluded stop, skip link first (`d1440-focus-skip.png`, `d1440-focus-night.png`). `→`, `←` and digits work and are scoped; `Space`, arrows and `PageUp`/`Down` still scroll. Back leaves in one press. | — |
| G3 | **2 / 2** | One `<h1>`, twelve `<section aria-labelledby>`, `<nav aria-label="the night">`, `<main>`, `<p id="loop-live" aria-live="polite" aria-atomic="true">` carrying `the dog — it says more now`, `1/5` and `someone read it this way`. The single `<canvas>` is `aria-hidden="true"` and carries no information anywhere on the site. The `four seconds` blanks are veiled by wrapping the transparent prose in an inner `aria-hidden` span with its summaries taken out of the tab order, leaving the `see also` link reachable — the careful version, not the literal one that would trap seven focusable elements in an `aria-hidden` subtree. Supplied Lighthouse accessibility 100; 48 a11y tests green. | — |
| G4 | **2 / 2** | Measured both schemes. Light: prose 17.84, aside 8.71, standfirst 8.71, night label 17.84, ask text 17.84, hub 6.62, footer controls 5.39, `see also` 8.71, unread mark 5.39, read mark ≥ 5.4. Dark: prose 17.50, aside 9.23, hub 10.42, footer 5.47, unread mark 5.47, read mark 13.22. All ≥ 4.5 : 1 text, ≥ 3 : 1 UI. **No state by colour alone:** night slots differ by hollow / filled / filled-plus-second-bar; pressable words by dotted vs solid; the belief options by pip and `aria-pressed`. | — |

### Category H — Trust & Anti-Dark-Pattern — **0 penalties**

| Violation | Penalty | Finding |
|---|---|---|
| Entry modal / exit-intent / content-obscuring overlay before 30 s or 50 % scroll | −15 | **None.** 0 dialogs, 0 modals, 0 overlays observed at 300 ms, 3 s, 10 s and through a full session at three viewports. The ask bar is opaque, 61 px, bottom-anchored and `pointer-events: none` except on its two children. |
| Fabricated social proof / fake counts / fake scarcity / countdown | −15 | **None.** No count of people anywhere. `someone read it this way` is shown only on an inbound link and attributes state to no name, no count and no person. `n/5` reads real collected state. |
| Scroll-jacking | −12 | **None.** No wheel binding, no swipe navigation; `Space`, arrows and `Page*` are deliberately unbound. Native scroll is the reading gesture. |
| Sign-up / email wall | −12 | **None.** No accounts, no forms, no email field, no `<input>` beyond the hidden clipboard fallback. |
| Clickbait — payoff smaller than the promise | −8 | **None.** `four seconds` at five of five is a complete, authored resolution assembled from earned sentences (`m360-fs-full-page.png`); at zero keys it is seven exact blank rules with `see also` links and no scold (`m360-fs-empty-full.png`). This was the build's one priced exposure and the writer paid it. |
| Progress indicator not backed by real state | −6 | **Charged at D2 instead, and this is the one contested call in the audit.** The deep-link `visited: ["dog"]` seeding puts a `read` mark and the words `the dog — read` on a slot the reader has never opened. I charge it inside D2 (−2, with the missing word endowment) rather than as a Category H penalty because the indicator is genuine on the default entry `/` — the entry the rubric's 10 s + interaction measurement is about — and the defect is a hydration-order state-seeding bug, not a fabricated meter designed to manipulate. **An auditor who reads it as the Category H violation applies −6 and the build scores 87 and misses the gate.** It is therefore fix #1 below whichever reading is taken. |
| Infinite feed with no visible end state | −5 | **None.** Twelve countable accounts with a named end that loops back to `the dog`. |
| Autoplay audio | −10 | **None.** No `<audio>`, no `<video>`, no `AudioContext` constructed anywhere; the audio module was deleted in the teardown. The whole penalty class is removed by construction. |

**Total penalty 0.**

---

## 4. Totals and gates

```
A 20 + B 17 + C 14 + D 14 + E  9 + F  9 + G 10  =  93
Category H penalties                             =   0
                                          TOTAL  =  93 / 100
```

Hard gates: A1 = 5 ✔ · A4 = 4 ✔ · B1 = 6 ✔ · no penalty ≥ 12 ✔ · Category G = 10 ≥ 6 ✔.
**No gate fails. 93 → the 92–100 band → estimated ≥ 90 % non-bounce. The project's
hard requirement is met, with one point of margin.**

---

## 5. Prioritised fix list

Seven points are on the table. The first three are the ones that matter, and all
three are the same class of defect: a mechanism the spec describes, that the engine
supports, that is not wired to what the reader sees.

**1. Grant keys and paint `data-held` from stored state at boot and at entry.
— D2 +1, C4 +1, and it removes the contested Category H exposure's sibling.**
*Owner: WP-B — `src/components/night/Runtime.tsx`.*
`data-held` on a `<details>` is written only inside `onToggle`. In the same
`useLayoutEffect` that already calls `materialise()`, walk
`section.querySelectorAll('details.aside[data-key]')` and set `data-held` on every
one whose `data-key` is in `readKnowledge().keys`; and in the boot path, grant the
`open: true` aside's key once, as §C.4 requires. That restores the permanent solid
rule across reloads, makes the endowed word real, and stops the one worked example
teaching the wrong mapping.
*Verification: reload holding three keys — three summaries compute
`text-decoration-style: solid`; cold load — `loop:v2.keys.length === 1`.*

**2. Fix the deep-link `visited` seeding. — D2 +1 (or Category H +6).**
*Owner: WP-B / the architect — `src/lib/url-state.ts` (marked FROZEN, so this needs
the architect's sign-off).*
`snapshot` is initialised to `EMPTY` (`section: 'dog'`) at module scope and is only
replaced by `read()` inside `wire()`, which runs on `subscribe` — after React's first
render. The entry effect therefore fires once with `'dog'` on every deep-link
arrival. Make `getSnapshot()` call `wire()` (or initialise `snapshot = read()` at
module scope when `typeof window !== 'undefined'`) so the first hydration render
already carries the URL's slug. One line.
*Verification: cold context at `/?s=road` — `loop:v2.visited` is exactly `["road"]`
and the `dog` slot's accessible name is `the dog`, not `the dog — read`.*

**3. Make the contradiction say its line. — D5 +1.**
*Owner: WP-B + WP-A — the line is prose and may not reach Tier B, so it cannot come
from `Runtime.tsx`.* The cheapest honest fix inside the existing architecture: have
`AccountSection` server-render each contradiction's `line` once, inside a
`.blk[data-needs="contra:<id>"]` wrapper in the account that best owns it (`clicks`
in `switch`, `bridge` in `lamp`, `count` in `clock`, `hill` in `window`, `both` in
`four-seconds`). The engine already computes `contra:<id>` (§C.5), so it materialises
by the ordinary entry rule with no new mechanism and no corpus JavaScript. The
reader's `1/5` then means something the next time they enter that account — which is
also a second reason to go back.
*Verification: holding `two-clicks` + `one-press`, entering `switch` renders the
`clicks` line with `data-new="true"`; `layout-shift` still sums 0.*

**4. Let the night's labels say their names on a phone. — E3 +1.**
*Owner: WP-C — `src/styles/night.css`.* Four of twelve labels ellipsise at 360 and
five at 320. The slots are 76 px wide at 360 with a 12 px label; either drop the
label to `--text-xs` at `0.6875rem` with `text-wrap: balance` over two lines inside
the existing 44 px box, or let the grid fall to 3 columns × 4 rows below 380 px,
which buys ~30 px per slot and fits `the streetlight`. Do not shorten the titles —
they are corpus strings.
*Verification: at 320 and 360, every `.label`'s `scrollWidth <= clientWidth`.*

**5. Give the 320 px phone some story above the bar. — F4 +1.**
*Owner: WP-C — `src/app/globals.css` / `src/styles/night.css`.* Block 1 starts at
y = 416 of 568. Two cheap recoveries that do not touch the copy: (a) clamp the `<h1>`
harder below 360 px so the premise sets in three lines rather than four (it is the
LCP element and must stay painted in frame one, so change the size, not the opacity
schedule); (b) tighten the night's row gap from 8 px to `--sp-2` *only* below 360 px —
the all-pairs sweep has 8 px of slack there — and drop its top margin. Together that
is ~70 px, which is three more lines of prose on the first screen.
*Verification: at 320 × 568, `.blocks` top ≤ 350 and ≥ 4 full prose lines are
unoccluded above the ask bar.*

**6. Make the first press additive. — C1 +1.**
*Owner: WP-A — `src/styles/read.css` and, if the corpus can be reopened, the writer.*
The strongest version needs a corpus change (move the `open: true` aside to the
*second* pressable word so a dotted word sits above it) and the corpus is frozen. The
version that needs no prose: at 360 and below, reduce the aside body's line-height
just enough that `the second click` clears the ask bar in the first viewport, so the
reader's first viewport contains a dotted word as well as an open one. Failing that,
accept the state and fix the mapping via fix #1, which at least stops the open word
claiming to be held.
*Verification: at 360 × 640 and 320 × 568 at t = 300 ms, at least one
`summary` with `text-decoration-style: dotted` has its rect fully above the ask bar.*

**7. Confirm the copy. — C4, shared with fix #1.**
*Owner: WP-D — `src/components/ui/ShareButton.tsx`.* `send the night as you have it`
succeeds silently apart from a hairline rule. Announce the existing §C.13 string
`someone read it this way` — no; that one is the *receiver's*. There is no fixed
string for a successful copy, so this needs the architect to add one, or the button
should at minimum set `aria-pressed` / a visible held state so the action is
confirmed non-visually. Flagged rather than specified.

Fixes 1–5 take the score to **98** and are perhaps thirty lines across four files
owned by three work packages. Fixes 1 and 2 are the only two that change whether an
auditor's Category H reading matters.

---

## 6. What this build does better than the 96/100 toy — and what it does worse

### Better

- **The zero-JS document is the site, not a fallback.** The ring build's A1 was a
  readable list of rooms; here the first viewport with JavaScript disabled is
  *pixel-identical* to the first viewport with it enabled, and the whole 8221-word
  document is present and every link works. That is the strongest A1 I have scored on
  this project.
- **All four of `09`'s deductions are gone.** 200 % zoom loses no slot (F1 +1); the
  outbound controls are out of the top-right corner and at the document foot with the
  primary action bottom-anchored (F2 +1); the all-pairs sweep finds zero sub-8 px
  pairs at four viewports (F3 +1); the desktop nav is twelve 176 × 44 rows with a
  real hover subline instead of 40 × 8 px ticks (E3's desktop half). None of them
  reappeared in a new form except the shortest-phone cramping, which moved from
  *gaps* to *vertical budget*.
- **A whole penalty class is removed by construction.** No audio anywhere, no
  `AudioContext`, no canvas-only information, no rAF on load. The ring build had to
  *prove* the audio was silent; this one cannot make a sound.
- **Reduced motion is no longer a second design to maintain** — it is the same design.
  Zero `requestAnimationFrame` calls, zero running animations, and nothing lost.
- **CLS is 0 through a real session**, including a paragraph materialising inside an
  account the reader has already read, which is a harder thing to do than a canvas
  that never reflows.
- **The writing is a reason to stay that a toy cannot buy.** The ring rewarded
  dexterity; this rewards attention, and it rewards it with sentences worth having
  read. A stranger who reads the first two paragraphs will read the third.

### Worse

- **The ten-second moment is weaker.** The ring's first tap put a node on a ring you
  were already looking at — large, immediate, unmistakable. Here the first press in
  the first viewport closes an aside, and the nav reaction the spec priced the whole
  build on cannot fire until the reader has visited a second account. C1 went from
  6/6 to 5/6 and the real-world gap is likely larger than one point, because the ring
  taught itself in one gesture and this teaches itself in three.
- **Endowed progress is thinner and partly false.** The ring arrived mid-performance
  with a seed node, a turning sweep and an unprompted ghost demo, and `data-visited`
  followed real state from the first frame. Here one of the two endowed sets does not
  exist and the other carries a false mark on every deep-link arrival. D2 went from
  4/4 to 2/4 — the single largest regression in the audit.
- **The variable reward is quieter.** The ring had five hidden destinations, a
  self-demo, TONE's realignment and ORBIT's epicycle sum. Here D5 rests entirely on
  the contradictions, and the contradictions currently produce a numeral rather than
  the line the corpus wrote for them. D5 4/4-equivalent → 1/2.
- **A second visit is less distinguishable.** The ring's state was the composition:
  you came back to a ring you had built. Here the returning reader's first screen is
  byte-identical to a stranger's, the solid rules have reverted to dotted, and the
  only above-the-fold evidence of a previous session is `1/5` in 14 px.
- **The shortest phone is served worse.** The ring fitted its whole stack inside
  320 × 568 with 16 px to spare. This spends 416 of 568 px on a headline and a nav
  grid before the story starts.

**One-line summary. 93/100, zero dark-pattern penalties, all hard gates passed, ≥ 90 %
estimated non-bounce — it clears, by one point. The prose is the strongest asset this
project has produced and it would hold a stranger; what costs the seven points is not
the writing but three mechanisms the spec promised and the build did not wire to the
screen — the night does not react to a first-time reader's first press, the held word
forgets it was held, and the five contradiction lines the writer wrote are never
shown to anybody.**
