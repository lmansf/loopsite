# 11 — THE SAME FOUR SECONDS: authoritative build spec

**Doc:** `design/11-narrative-build-spec.md` · **Author:** architect · **Date:** 2026-09-22
**Status:** single source of truth for the narrative build.

**Supersedes** `design/05-build-spec.md` §A–§E, §G, §I and `design/10-narrative-concept.md`
wherever the two disagree. **Retains verbatim** `05` §F.1 (pins, budgets, sandbox), `05` §H.1
(the shape of `pnpm verify`) and every ruling in `design/06-wp0-notes.md` §D and §G
(toolchain deviations, webpack, the Next 15.5.25 pin, the 300 ms title beat, the LCP-as-FCP
rule). The rubric in `design/01-attention-research.md` §6 is restated here in full as §H.4 so an
auditor needs no other document.

**The content contract `src/content/schema.ts` is frozen.** Nothing in this document changes it.
A writer is producing `src/content/accounts.ts` against it in parallel. **No builder writes
prose.** Every visible string is either in the corpus or in the fixed table at §C.13.

---

## A. What the site is

### A.1 One paragraph

At 11:04 on a Tuesday, power failed across one valley for four seconds. Twelve things were
awake for it — a dog, a streetlight, a kettle, a moth, a river, a bus, a radio, a clock, a
window, a switch, a road, and the four seconds themselves. Each tells the four seconds it had.
None of them agree and none of them are lying. The site is those twelve accounts, rendered as
plain readable prose on one static route. Certain words inside the prose are pressable: pressing
one opens a short aside in place and grants a **key**. Keys unlock **blocks** — whole paragraphs
that were never there before — inside *other* accounts, interleaved between the paragraphs the
reader has already read, so that a witness they finished ten seconds ago now says something it
did not say. Five **contradictions** fire the instant the reader holds both halves of a pair that
cannot both be true. The twelfth account, `four seconds`, is composed at runtime from the keys
the reader actually holds, and prints what is missing as blank rules of the exact width of the
sentences they have not earned.

### A.2 The non-bounce thesis, one paragraph

A narrative site bounces because it asks you to read before it lets you do anything. This one
removes the gap entirely: **the sentence is the control surface.** The first pressable word is
rendered already open, so the mechanic is taught in zero words of instruction and the collection
set is non-zero before the reader has moved. The pressable words are `<details><summary>` inline
in the prose, so the first interaction works in the first painted frame, before a byte of
JavaScript has run, on pointer, on touch, with a keyboard and with a screen reader. Pressing one
does two things in the same frame — an aside opens under the line, and a slot in the navigation
that the reader has never visited grows a *changed* marker — so the feedback is visibly larger
than the target, which is the whole engine explained in one gesture inside ten seconds. From
there the pull is three nested finite sets with visible holes (twelve accounts, ~forty words,
five contradictions), an open loop at the end of every block enforced as a copy law, and a fixed
control at the bottom of every screen that never says `next` and always names the thing it is
about to hand you.

---

## B. The visitor's journey

Times are from navigation start on the CI mobile profile (1638 Kbps, 150 ms RTT, 4× CPU,
412×823 @1.75). "On screen" means inside the first viewport at 360×640 unless stated.

### 0–3 s — the premise, and something already open

The document is static HTML. There is no spinner, no skeleton, no gate, no overlay and nothing
above the fold that needs JavaScript.

Painted in the first frame:

1. `<h1>` — two lines, the premise, at 35 % opacity settling to 100 % at 300 ms. It is the LCP
   element and it is painted (not faded from zero) from frame one — `06` §G, kept verbatim.
2. The account heading: `<h2>` with the account title, and the standfirst under it.
3. **the night** — twelve slots, `dog` already filled and marked read, eleven hollow.
4. Block 1 of `dog`, with two words carrying dotted rules and **one of them already open**,
   its aside sitting under the line it belongs to.
5. The fixed bottom control reading `ask the streetlight`, in the thumb zone, with safe-area
   padding.

The reader can press either dotted word in this frame. Nothing is deferred. FCP target < 1.0 s;
the measured render-blocking payload is one stylesheet plus a ≤ 2 KB inline bootstrap.

### 3–10 s — one press teaches the whole site

The reader presses `the second click`. Three things happen:

- The `<details>` opens natively in under 30 ms (a style recalculation, not a render).
- The word's rule goes from dotted to solid — **permanently**, for the rest of the reader's life
  with the site.
- One slot in the night — `switch`, a place they have never been — grows its changed marker and
  the polite live region says `the switch — it says more now`.

They now know the entire mechanic: press words, other places change. No instructional copy was
spent. This is the single most important ten seconds in the build and every deduction in §G is
priced against it.

### 10–30 s — the account finishes, and names the next one

Four blocks, 25–55 words each, each ending by withholding something nameable. At the foot of the
account is the **ask card**: a full-salience destination naming the next account and what it has,
not a `next` button. The fixed bottom control carries the same destination and has not moved
since frame one. The night now reads one of twelve with eleven visible holes and one changed.

### 30 s – 2 min — the site acquires a solution

Two or three more accounts. `river` says the bridge was dark all night; `bus` says there was a
light on the bridge, moving. The moment the reader holds both keys, the `bridge` contradiction
fires: the hub in the bottom bar ticks to `1/5` in Ember, and the next time they enter `lamp` it
has a third block it did not have. The site stops being a nice piece of writing and becomes a
thing with an answer.

### 2–5 min — the Zeigarnik turn

Five to eight accounts. Two or more read slots are marked changed, and going *back* is now the
most attractive action on the page, on text the reader has already invested in. `four seconds` is
reachable at any time and is never locked; entering it early prints what they hold and blanks the
rest, which is the strongest open loop the site can draw. A first session ends here, unfinished.
That is the design target, not a failure — see §H.4 D-series.

### A returning visit

The bootstrap reads `loop:v2` **synchronously, in `<head>`, before first paint**, so the returning
reader's held keys, their belief, their contradictions and their locked blocks are already
materialised in the first painted frame. Nothing pops in. Changed markers are waiting in the
night. If they completed a pass, the landing account carries an opening block it did not have
before, already in place. The one collectible that cannot be earned in a single visit — `both`,
which needs a stored belief and an incoming link carrying the other one — is the honest reason to
come back.

---

## C. Mechanics

### C.1 The reading surface

**One static route, `/`.** The initial HTML contains **all twelve accounts, every block, every
aside**, in nav order. With JavaScript disabled that document is the site: a complete, readable,
scrollable twelve-section essay whose every link works. With JavaScript (`html[data-loop-js]`,
set synchronously by the bootstrap before first paint) CSS collapses it to the one selected
account with zero reflow, which is how CLS stays at 0.

**An account renders as:**

```html
<section id="section-dog" class="account" aria-labelledby="h-dog" data-slug="dog">
  <h2 id="h-dog" tabindex="-1">the dog</h2>
  <p class="standfirst">…standfirst…</p>
  <nav class="night" aria-label="the night"> … twelve slots … </nav>
  <div class="blocks">
    <div class="blk" data-id="dog-1">…prose, with inline &lt;details&gt;…</div>
    <div class="blk" data-id="dog-1a" data-needs="switch:one-press">…</div>
    <div class="blk" data-id="dog-2">…</div>
  </div>
  <a class="ask" href="/?s=lamp" data-ask> … the ask card … </a>
</section>
```

`.blk` is a `<div role="paragraph">`, **not** a `<p>`: `<details>` is flow content and is not
legal inside `<p>`, and validity matters here because a malformed `<p>` is repaired by the parser
into a shape that breaks the inline aside. `role="paragraph"` restores the semantics for assistive
technology at zero byte cost.

**The prose is compiled to an HTML string on the server** by `src/content/compile.ts` and injected
with `dangerouslySetInnerHTML`. Two reasons, both load-bearing: it keeps React's inline flight
payload from duplicating a deep element tree for 5000 words (§E), and it means the prose is never
hydrated, never re-rendered and never owned by React at all. The compiler escapes `&<>"` in all
corpus text before it substitutes any markup, and a unit test feeds it hostile strings.

### C.2 A bracketed word becomes a pressable word

`Aside.word` appears in its block's `text` wrapped in square brackets, exactly once, character
for character. The compiler replaces that span with:

```html
<details class="aside" data-key="dog:two-clicks">
  <summary>the second click</summary>
  <span class="aside-body">a click is a switch. two clicks is two switches, or one switch pressed twice.</span>
</details>
```

and, for the single aside in the corpus carrying `open: true`, the `<details>` is emitted with the
`open` attribute already set.

CSS makes it inline without disturbing the line:

```css
.aside            { display: inline; }
.aside > summary  { display: inline; list-style: none; cursor: pointer;
                    text-decoration: underline;
                    text-decoration-style: dotted;
                    text-decoration-thickness: from-font;
                    text-underline-offset: 0.22em;
                    position: relative; }
.aside > summary::-webkit-details-marker { display: none; }
.aside > .aside-body { display: block; }           /* forces its own line, under the word */
```

A block-level child inside an inline `<details>` fragments the inline box and puts the aside body
on a line of its own, indented under the sentence, with the rest of the block continuing after it.
That is the "opens in place under the line" behaviour the concept asks for and it costs no
JavaScript. **WP-A must ship a rendered-geometry test** asserting, at 360 px and 1280 px, that the
aside body's rect starts below the summary's line box and that the block's left edge is unchanged
by opening — if a browser ever fragments differently, the fallback is
`.aside-body { display:block; margin-inline-start: 0 }` inside a `.blk { display: flow-root }`
container, which is already how `.blk` is declared.

**The hit area.** `<summary>` gets a 44 px hit box without touching line height:

```css
.aside > summary::after {
  content: ''; position: absolute; left: -2px; right: -2px;
  top: 50%; height: 44px; transform: translateY(-50%);
}
```

The overhang lives in the leading, not in the layout. Two copy laws make it safe, and both are
tested (§H.2): **no block may contain two pressable words on the same rendered line, or on
vertically adjacent lines**, verified at 360 px and at 200 % zoom.

**Signifiers (two on every state, never colour alone).** Rest: dotted rule. Hover: rule thickens
to 2 px and the word takes `--c-accent` at its verified ratio. `:focus-visible`: 2 px
`--c-focus` outline, 2 px offset, rule unchanged. Open: `aria-expanded="true"` (native). Held:
the rule becomes **solid**, permanently, whether or not the aside is open.

### C.3 What pressing does

One delegated `toggle` listener on `document` (capture, passive) in the client runtime. On a
`<details>` opening:

1. `knowledge.grantKey(el.dataset.key)` — idempotent, persisted immediately, debounced to disk.
2. The `<summary>`'s rule becomes solid via `data-held` on the `<details>`, set by the runtime.
3. Every account whose state changes as a result gets its night slot re-marked **changed**, and
   the polite live region announces `<title> — it says more now` for each (joined, one
   announcement).
4. Any contradiction whose `needs` are now all held is recorded, the hub ticks, and the hub runs
   a single 320 ms Ember pulse.
5. `beacon('word_pressed', { account })` — once per session, the R2 instrument.
6. `opens[key] += 1`. On the third open the engine grants the synthetic key `thrice:<key>` (§C.5).

**Nothing in the account currently being read changes.** No block appears, nothing reflows below
the reader's eye, no text is rewritten. That is the rule that protects CLS and it is also better
storytelling.

### C.4 Keys

- A key is granted the moment its aside is **opened**, and only then. Closing it again does
  nothing; the key is never spent, never lost, never revoked.
- The one aside carrying `open: true` is granted at boot, in the account that owns it, on first
  arrival. Endowed progress is therefore genuine: one of twelve accounts read and one of ~forty
  words held before the reader has done anything.
- Keys persist in `loop:v2.keys` (§C.12). Storage failure is silent and total: the site works and
  simply forgets.
- **The key graph is flat by construction and by test:** every `Block.needs` names an aside id or
  a synthetic key; no block is behind more than one key (the schema enforces it — `needs` is
  singular); there are no chains; every account is fully readable from an empty key set; and no
  account locks a block behind a key it emits itself. `tests/unit/corpus.test.ts` asserts all four.

### C.5 Synthetic keys

`Block.needs` is a `KeyId`, which is a string. **The shipped corpus uses only real aside ids**, so
everything below is inert today. The engine must support it anyway, because it is the only way the
frozen schema can express the concept's pass openings, contradiction effects and empty-handed
ending, and the writer may reach for it. The namespace is reserved: a `needs` value that is not an
aside id and not in this table fails `auditCorpus`.

| synthetic key | granted when |
|---|---|
| `pass:2`, `pass:3` | the pass counter reaches 2 / 3 (all twelve accounts entered, capped at 3) |
| `contra:<id>` | that contradiction's `needs` are all held — this is how §4.4's "both accounts gain a line" and "a third block appears in `lamp`" are authored |
| `contra:all` | all five contradictions held — this is the resolution line in `four seconds` |
| `empty-handed` | the reader holds **zero** real keys |
| `silent-pass` | twelve accounts entered with zero real keys held |
| `all-twelve` | twelve accounts entered (gates the belief choice) |
| `thrice:<key>` | that aside has been opened three or more times |

A synthetic key behaves exactly like a real one everywhere except in the share codec, which
carries only the real aside bitfield and recomputes synthetics on arrival. `empty-handed` and
`silent-pass` are the only keys that can be *lost*; because blocks are evaluated only at account
entry, a block behind one of them simply is not there the next time the reader enters.

### C.6 Locked blocks

**The materialisation rule, and it is architectural.** The set of keys used to lay out an account
is captured when that account is **entered** and is not consulted again until the next entry. It
lives in the runtime as `entryKeys` and it is the only input to which blocks exist.

*Why it holds CLS at 0:* a block that is going to exist in this reading exists before the account
is painted for the first time, and no block ever appears while the reader is looking at it. What
happens live is the night's changed marker, which is a fixed-size, position-reserved element.

**How it is implemented without shipping the corpus to the browser.** Every block of every account
is already in the initial HTML. Visibility is attribute-driven:

```css
html[data-loop-js] .blk[data-needs]:not([data-held])      { display: none; }
html[data-loop-js] .account                               { display: none; }
html[data-loop-js][data-s="dog"] #section-dog             { display: block; }   /* ×12, static */
.blk[data-belief="hill"]                                  { display: none; }    /* no-JS default */
html[data-belief="hill"] .blk[data-belief="hill"]         { display: block; }
html[data-belief="hill"] .blk[data-belief="valley"]       { display: none; }
```

- **Before first paint**, `src/lib/boot.ts` (a classic, inline, ≤ 2 KB script in `<head>`) reads
  `loop:v2`, sets `html[data-loop-js]`, `html[data-motion]`, `html[data-belief]` and
  `html[data-s]` from the URL, and appends one `<style id="loop-keys">` containing
  `html[data-loop-js] #section-<entry-slug> .blk[data-needs="<key>"]{display:block!important}`
  for every held key. `!important` because the stylesheet's position relative to the injected
  style is not guaranteed by the framework. Only the entry account's rules are emitted, which is
  what makes the entry-time rule true on a cold load.
- **At hydration and on every subsequent entry**, the runtime sets `data-held` on the entering
  account's locked blocks in a `useLayoutEffect`, then flips `html[data-s]` **in the same
  effect** so attributes and visibility change in one paint. On the first entry it then removes
  `#loop-keys`; the computed result is identical, so nothing flashes.
- **The corpus is never imported by client code.** Tier B carries the engine, not the story.

**Showing a returning reader that an account changed.** An account `a` is *changed* iff it is in
`visited` **and** there exists a block in `a` whose `needs` is in the current effective key set
and was **not** in the key set recorded at `a`'s last entry. The per-account entry masks live in
`loop:v2.entry` as base64url aside bitfields (§C.12). Entering `a` rewrites its mask, so the
marker clears exactly when the reader has actually seen the new material.

**The appearing-block animation budget.** A block that is new to *this* entry gets
`data-new="true"` for one entry. It animates **opacity 0 → 1 over 240 ms** and its hairline left
rule draws with `transform: scaleY(0 → 1)` on a `::before` over 320 ms, `--ease-enter`. Nothing
else. **No height, no margin, no transform on the block box, no `content-visibility` flip.** The
space is already allocated in the frame the account is swapped in, so the animation cannot move
anything: opacity and transform are composited properties and are excluded from layout by
definition. Under reduced motion both are omitted and the rule is drawn at full height at once.
The hairline left rule is permanent, not just during the animation — it is how the reader sees
which sentences are new.

`four seconds` sets `blankWhenLocked` and renders its locked blocks differently — §C.10.

### C.7 Navigation — the night

Twelve slots, one `<nav class="night" aria-label="the night">` per account in the DOM (only the
active account is displayed, so exactly one is ever rendered to the user), each slot a **real
anchor**:

```html
<a href="/?s=switch" data-slug="switch" data-state="changed" aria-current="page"?>
  <span class="mark" aria-hidden="true"></span>
  <span class="label">switch</span>
  <span class="gap" aria-hidden="true">…standfirst…</span>
  <span class="u-sr">switch — it says more now</span>
</a>
```

**Three states, never colour alone:**

| state | shape | accessibility tree |
|---|---|---|
| `unread` | hollow mark: 1 px `--c-border-strong` ring, no fill | `switch` |
| `read` | filled mark + an inner hairline rule | `switch — read` |
| `changed` | filled mark + a **second short bar** above the mark | `switch — it says more now` |

`data-state` is server-rendered as `unread` for all twelve except the landing account, and
corrected by the runtime before first paint is not required — the marks are fixed-size and
position-reserved, so correcting them at hydration costs no layout shift. `aria-current="page"` is
set by the runtime on the active slot.

Clicks are intercepted by the runtime and turned into `pushState` (§C.11); modified clicks,
middle clicks and no-JS clicks all fall through to the real `href`, which is a real static route.

**The `ask` control.** One fixed element at the bottom of every screen, `position: fixed`, present
from frame one, never relocating:

```html
<a class="ask-bar" href="/?s=lamp" data-ask>
  <span class="ask-text">ask the streetlight</span>
  <span class="hub u-num" data-found="1">1/5</span>
</a>
```

Its text is the active account's `Account.ask` verbatim and its destination is `Account.next`.
It is the site's one primary CTA (rubric B2, D4). The hub is inside the bar, always rendered,
`visibility: hidden` at `n = 0` so its box is reserved and the tick to `1/5` shifts nothing. The
hub is a separate focusable element only on desktop, where it links to `/?s=four-seconds`; on
phones it is decorative and the same destination is reachable from the night.

At the **foot of each account** sits the **ask card**: a full-salience block-level `<a>` carrying
the next account's title and its standfirst. That is rubric E2, earned on every content unit.

### C.8 Progress — three finite sets, all diegetic

| set | size | how it is shown | number ever printed? |
|---|---|---|---|
| accounts | 12 | the night's twelve slots: filled / hollow / changed | no |
| pressable words | ~40 | **in the text**: dotted rule = unpressed, solid rule = held, permanently. The page literally gets more solid as the reader works. In `four seconds`, the ones they do not hold are blank rules of exact width | no |
| contradictions | 5 | `n/5` in Ember, in the hub, from `n ≥ 1` | yes — the only counter on the site |

**Endowed progress on arrival** is genuine on both of the first two sets: the reader lands *inside*
`dog`, so one slot is filled before they act, and the first aside is rendered already open, so one
word is held. Neither is cosmetic; both are the real state that everything else reads.

`n/5` is the only numeral the UI may print. The corpus may print `11:04`, `four`, `six` and `ten`
(concept voice rule 8). `tests/copy.spec.ts` asserts no other numeral renders.

### C.9 The belief choice

- **Offered** at the foot of `four seconds`. `Corpus.choice` is not a block, so the renderer
  always server-renders it there inside a `.blk[data-needs="all-twelve"]` wrapper and the runtime
  sets `data-held` on that wrapper at entry when `visited.size >= 12` **or** a belief is already
  stored. It therefore materialises by exactly the same entry rule as every locked block, with no
  shift, and `all-twelve` is the one synthetic key the engine always computes.
- **Rendered** as two real anchors, `/?s=four-seconds&b=valley` and `/?s=four-seconds&b=hill`,
  labelled from `Corpus.choice.options[].label` (outcome, never mechanism), under
  `Corpus.choice.prompt`.
- **Stored** as `loop:v2.belief` (`0` none, `1` valley, `2` hill) and mirrored onto
  `html[data-belief]`.
- **What it changes:** every `Block.belief` in the corpus. The concept places these in `lamp`,
  `window`, `switch`, `road` and the last line of `four seconds`. Because the switch is a single
  attribute on `<html>` and both variants are already in the DOM, changing belief **re-renders in
  place with no network, no remount and no layout shift beyond the two blocks that swap** — and
  those swap inside the current account only when the reader is standing in `four seconds`, where
  the swap is the point. In the four other accounts the new frame block materialises at their next
  entry, like everything else.
- **Changed back in one tap:** the other option stays on screen and stays enabled; picking it
  flips the attribute back. `pushState` on each choice, so Back also reverses it.
- Zero-JS readers see the `valley` variants (the CSS default) and the two links work as links;
  they cannot persist a choice. This is the one enhancement that is JS-only, and it is stated as
  such in §H.4 E4.

### C.10 `four seconds`

The twelfth account is the only one composed at runtime, and it is composed from attributes, not
from JavaScript string-building.

- Every block in `four seconds` carries `needs`. The account carries `blankWhenLocked: true`.
- Held blocks render as ordinary prose, in story order.
- **A locked block renders as a blank rule of exactly its own width**, achieved by rendering the
  real sentence with `color: transparent; user-select: none;` and `aria-hidden="true"` (set by the
  runtime at entry), with a `border-bottom: 1px solid var(--c-border-strong)` on each line box via
  `box-decoration-break: clone` on an inline wrapper. Because the invisible text is the real text,
  the blank's width, its wrapping and its line count are exact, for free, at every viewport.
  Beside it sits `see also` and a real link to the account that emits the missing key —
  `EMITTERS` in `knowledge.ts` computes that map. That is the index mechanic, at the ending, as
  the strongest open loop the site can draw.
- **Order:** `.blocks` in this account is `display: flex; flex-direction: column;` and
  `html[data-loop-js] #section-four-seconds .blk[data-needs]:not([data-held]) { order: 1 }`. Held
  and unlocked blocks keep source (story) order; blanks fall to the end keeping their relative
  story order. Zero-JS readers get the whole thing as continuous prose.
- **Zero keys.** Every block in the shipped `four seconds` carries `needs`, so a reader who
  arrives holding nothing gets the heading, the standfirst, **seven blank rules with their
  `see also` links**, and the ask card to `dog` at full salience. That is the concept's
  `you weren't here.` rendered as shape instead of as a sentence, and it is the strongest version
  of it: the reader sees the exact dimensions of what they have not asked for. No gate, no error,
  no scold, and `four seconds` is never locked.
- **The resolution.** The last blocks to unlock are the ones the reader reaches only by holding
  the keys the five contradictions need. The payoff must be larger than the promise — this is the
  site's only clickbait exposure and §H.4 H prices it at −8 if it is not.

### C.11 The URL, and the share link

**Route.** One static route `/`. `?s=<slug>` selects the account; `?b=<valley|hill>` carries the
belief; `#n=<base64url>` carries a shared state. `/s/<slug>` is retained as a prerendered alias
whose only job is `generateMetadata`, and it `replaceState`s to `/?s=<slug>` on arrival.
`#section-<slug>` remains a valid anchor for the zero-JS document and is normalised to `?s=` on
load. Only `src/lib/url-state.ts` touches `location` or `history`.

**History rule, unchanged from `05` §C.10:** `pushState` for a deliberate act (a night slot, the
ask control or card, an arrow or digit key, a belief choice); `replaceState` for everything
passive (anchor normalisation, alias redirect, restoring from storage). Back always leaves in one
press from wherever the reader deliberately went.

**The state codec — `src/lib/share.ts`, rewritten in place.** Binary, then base64url with padding
stripped. Let `N = allAsides(CORPUS).length` and `A = ceil(N / 8)`; the payload length is
`L = 5 + A`.

| offset | bytes | meaning |
|---|---|---|
| 0 | 1 | `(version & 0x0F) \| ((belief & 0x03) << 4) \| ((pass & 0x03) << 6)`; version = `1`, belief 0 none / 1 valley / 2 hill, pass 0–3 |
| 1 | 1 | XOR of bytes `2 … L-1`, seeded `0x5A` |
| 2–3 | 2 | visited bitfield, little-endian, bit *i* = `ACCOUNT_IDS[i]`, 12 bits used |
| 4 | 1 | contradictions bitfield, bit *i* = `CORPUS.contradictions[i]`, 5 bits used |
| 5 … 4+A | A | aside bitfield: aside *i* is bit `i % 8` of byte `5 + floor(i / 8)`, in `allAsides()` order — **the order may never be rearranged, only appended to** (schema comment, enforced by `tests/unit/share.test.ts`) |

At the shipped corpus's 43 asides: `A = 6`, `L = 11` bytes, `ceil(11 × 8 / 6)` = **15 base64url
characters**, so a full share URL is `https://<host>/?s=road#n=` + 15 ≈ 45 characters. (The
concept's fixed 5-byte field assumed "~40" and would have silently dropped three asides; this is
the reason the field is computed, not constant.) The codec is forward-compatible: a
payload with `A' < A` (an older, shorter corpus) is accepted and zero-extended; `A' > A`,
`L < 6`, `L > 13`, a version other than `1`, or a failed checksum is **rejected silently** — the
site loads normally with the reader's own state and never shows an error, exactly as the loop
codec did.

**What an inbound link does.** It restores *understanding*, never identity.

- Keys, visited accounts and contradictions from the link are **unioned** into the reader's own
  state. A link can only ever give; it can never take away what the reader earned.
- Belief is applied only if the reader has none. A link carrying the opposite belief never
  overwrites the reader's own; the mismatch is held for the session and is not itself a
  collectible. (The shipped corpus authors the `both` contradiction from two ordinary aside keys,
  not from a cross-visit belief clash, so no special case is needed.)
- `pass` takes the maximum of the two.
- The account named by `?s=` is entered. The caption line `someone read it this way` appears in
  the live region for 3.5 s. **The site never claims the reader is someone else** and never
  attributes the state to a person, a name or a count.
- Writing: `send the night as you have it` copies
  `location.origin + '/?s=' + slug + '#n=' + encodeState(knowledge)` via
  `navigator.clipboard.writeText`, falling back to a hidden `<input>` + `execCommand('copy')`.
  The hash is never written to the address bar by the site itself, so Back is never polluted.

### C.12 Storage

One versioned key, `loop:v2`, wrapped by `src/lib/storage.ts`. Every read and write is
`try/catch`'d; every failure returns the default; the site is fully functional without storage and
simply forgets. `sessionStorage` holds exactly one key, `loop:sid`, owned by the beacon. **No
accounts, no forms, no email field, ever.**

```ts
export interface LoopState {
  v: 2;
  /** real aside ids, in grant order, max 96 */
  keys: string[];
  /** aside id -> number of times opened, max 96 entries (drives thrice:<key>) */
  opens: Record<string, number>;
  /** account ids, in first-entry order */
  visited: string[];
  /** account id -> entry count */
  visits: Record<string, number>;
  /** contradiction ids earned */
  collected: string[];
  /** account id -> base64url aside bitfield held at that account's LAST entry */
  entry: Record<string, string>;
  /** 0 none, 1 valley, 2 hill */
  belief: 0 | 1 | 2;
  /** full passes, capped at 3 */
  pass: number;
  /** explicit override; default 'auto' */
  motion: 'auto' | 'reduce';
}
```

Never read during render (hydration mismatch). Read by `boot.ts` before paint and by the runtime
inside an effect. Writes debounced 500 ms, flushed on `pagehide`.

### C.13 Copy law and the fixed string table

**No visible string may appear on the site that is not either (a) in `src/content/accounts.ts`,
or (b) in this table.** Adding one is an edit to this section and needs the architect.

| string | where | fixed by |
|---|---|---|
| `the lights went out for four seconds.` | `<h1>`, line 1 | concept §5.1 |
| `twelve things were awake.` | `<h1>`, line 2 | concept §5.1 |
| `gentle mode` | footer, the motion toggle | concept §5.1 |
| `keep this` | footer | concept §5.1 |
| `send the night as you have it` | footer | concept §5.1 |
| `see also` | `four seconds`, beside each blank rule | concept §3, §4.3 |
| `someone read it this way` | live region, on an inbound share link | concept §4.6 |
| `read` · `it says more now` · `changed` | night slots, accessibility tree only | concept §4.5 |
| `n/5` (n = 1…5) | the hub | concept §4.4 |
| `loop` | the `keep this` PNG signature; `Loop` in metadata | product name, `05` §I.5 |
| `Loop — the lights went out for four seconds.` | `<title>`, og:title | concept §4.1 |
| `twelve things were awake. ask any of them.` | meta description, og:description | concept §4.1 |
| `skip to the account` | skip link | **architect, this document** — the only string not fixed elsewhere; G2 requires a skip link and nothing in the concept names one. Flagged for the writer's sign-off. |

Account titles, standfirsts, `ask` strings, block prose, aside bodies and the belief prompt and
labels all come from the corpus. Forbidden anywhere, asserted by `tests/copy.spec.ts`:
`read more`, `learn more`, `click here`, `next`, `click`, `tap`, `scroll`, `discover`,
`experience`, `journey`, `immersive`, `imagine`, any countdown, any count of people, any
`live`/`now`/`right now` construction, any sign-up prompt, and any numeral other than `11:04`,
`four`, `six`, `ten` and `n/5`.

### C.14 Beacon

`src/lib/beacon.ts`, retained wholesale; only the event names change. Refuses to send under DNT /
GPC. Session id in `sessionStorage`. No cookies, no fingerprinting, no PII. Five wire events, each
deduped to once per session (per account for `account_viewed`):

| event | fires when | why |
|---|---|---|
| `session_start` | on init | the denominator |
| `word_pressed` | the first `<details>` open, payload `{ account }` | **the R2 instrument** — target ≥ 70 % of sessions within 15 s |
| `account_viewed` | an account has been active ≥ 1000 ms, payload `{ account }` | depth |
| `contradiction_found` | the first contradiction earned, payload `{ id, n }` | the moment the site acquires a solution |
| `time_on_site_30s` | 30 s accrued while visible | dwell |

**Measurement of record.** An engaged session fired `word_pressed`, **or** `account_viewed` for
≥ 2 distinct accounts, **or** `time_on_site_30s`. Non-bounce rate = engaged ÷ `session_start`.
Target ≥ 0.90.

### C.15 Keyboard

The document is an ordinary scrolling document, so the keyboard map takes as little as possible.

| key | action |
|---|---|
| `Tab` / `Shift+Tab` | skip link → `<h1>` region → the account heading → the night's twelve slots → the pressable words in reading order → the ask card → the ask bar → footer |
| `Enter` / `Space` on a `<summary>` | native toggle — grants the key |
| `→` | the active account's `next` (the same destination as the ask control) |
| `←` | the previous account in nav order |
| `1`–`9`, `0`, `-`, `=` | accounts 1–12 |
| `Esc` | close every open aside in the active account; if none is open, do nothing |

**Scope.** These are handled only when `document.activeElement` is `<body>`, the account region,
a `<summary>` or a night slot, and never when `Meta`/`Ctrl`/`Alt` is held. `preventDefault()` is
called only for keys we handle. **`Space`, `↑`, `↓`, `Home`, `End`, `PageUp` and `PageDown` are
never bound**, because they belong to the scroller and to the screen reader. There is no
scroll-jacking, no wheel binding and no swipe navigation: native scroll is the reading gesture and
the site does not touch it.

### C.16 Reduced motion — the complete variant

`html[data-motion="reduce"]` is the resolved value, written synchronously by `boot.ts` and
thereafter by `use-motion-preference.ts`. `gentle mode` toggles it in page, with `aria-pressed`
and a filled pip, without reload.

| thing | motion | reduced motion |
|---|---|---|
| `<h1>` | paints at 35 %, settles to 100 % at 300 ms | paints at 100 % in frame one |
| a `<details>` opening | no animation either way — a `<details>` toggle is never animated on this site | identical |
| a new locked block | opacity 0 → 1, 240 ms; left rule `scaleY` 0 → 1, 320 ms | no animation; the block and its full-height rule are simply there |
| account swap | 160 ms cross-fade on the `.account` box, opacity only | none; the swap is instantaneous |
| the hub ticking | 320 ms Ember pulse | the numeral changes; no pulse |
| a night mark becoming changed | 200 ms opacity on the second bar | the bar is simply there |
| the ambient figure | one procedural figure per account, phase-locked to the 4000 ms clock, ≤ 6 % opacity delta, ≤ 8 px travel, ≥ 6 s period, never above 8 % alpha behind type | **the authored still at phase 0.25, drawn once, complete**; the clock is never started |

**Nothing is lost under reduced motion.** Every word is still pressable, every key still fires,
every contradiction still lands, every blank is still exact. `tests/reduced-motion.spec.ts` keeps
its uniform-image floor and adds an assertion that `document.getAnimations()` is empty one second
after load in every account.

---

## D. Architecture

### D.1 The directory tree after the change

```
loopsite/
├── design/                     01 … 09, 10 (concept), 11 (this file)
├── public/og/loop.svg          regenerated: no ring, the meta title only
├── scripts/
│   ├── audit-perf.mjs          kept; Lighthouse + byte gate
│   └── bundle-budget.mjs       kept; + the new document budget (§E)
├── perf-baseline.json          re-recorded by WP-N
├── src/
│   ├── app/
│   │   ├── layout.tsx          <html>, tokens, boot script, skip link, metadata
│   │   ├── page.tsx            the twelve accounts, server-rendered, force-static
│   │   ├── globals.css         tokens (kept) + the reading layer
│   │   ├── not-found.tsx       the <h1> and a full-salience link to `the dog`
│   │   ├── icon.svg            regenerated
│   │   ├── s/[slug]/page.tsx   prerendered alias, generateMetadata
│   │   ├── s/[slug]/AliasRedirect.tsx
│   │   └── api/beacon/route.ts kept verbatim
│   ├── components/
│   │   ├── read/
│   │   │   ├── AccountSection.tsx   server; <section>, <h2>, standfirst, blocks, ask card
│   │   │   ├── Blocks.tsx           server; dangerouslySetInnerHTML of the compiled prose
│   │   │   ├── AskCard.tsx          server
│   │   │   └── BeliefChoice.tsx     server; two anchors inside a locked block
│   │   ├── night/
│   │   │   ├── TheNight.tsx         server; the twelve-slot <nav>
│   │   │   ├── AskBar.tsx           server; the fixed control + the hub
│   │   │   ├── Runtime.tsx          **the one client island**
│   │   │   └── LiveRegion.tsx       client; aria-live="polite"
│   │   ├── shell/
│   │   │   ├── SkipLink.tsx         server
│   │   │   ├── MotionToggle.tsx     client
│   │   │   └── Footer.tsx           server shell + client controls
│   │   └── ui/                      Button, Toggle, VisuallyHidden, KeepButton, ShareButton
│   ├── content/
│   │   ├── schema.ts           FROZEN — the content contract
│   │   ├── accounts.ts         the writer's file — the entire text of the site
│   │   └── compile.ts          Block -> HTML string; server-only; escaping + brackets
│   ├── figures/
│   │   ├── index.ts            slug -> () => Promise<Figure>
│   │   ├── Ambient.tsx         client; the one canvas, lazily mounted
│   │   └── dog.ts … road.ts    ≤ 40 lines each, draw(ctx, phase, geom, reduced)
│   ├── lib/
│   │   ├── types.ts            REWRITTEN by WP-N, then frozen
│   │   ├── knowledge.ts        NEW — the key/lock/contradiction engine
│   │   ├── share.ts            REWRITTEN — the state codec
│   │   ├── storage.ts          loop:v2
│   │   ├── boot.ts             the inline pre-paint bootstrap (was hero-bootstrap.ts)
│   │   ├── beacon.ts  url-state.ts  use-motion-preference.ts  use-canvas.ts
│   │   ├── use-lazy-mount.ts   tokens.ts  motion.ts  rng.ts  clock.ts  keep.ts
│   ├── styles/
│   │   ├── read.css            the prose layer (WP-A)
│   │   ├── night.css           the night, the ask bar, the hub (WP-C)
│   │   ├── ui.css              footer controls (WP-D)
│   │   └── motion.css          shared keyframes + the reduced-motion layer (WP-C)
└── tests/
    ├── fixtures.ts             zero console errors / pageerrors / >=400
    ├── smoke.spec.ts           WP-D
    ├── reading.spec.ts         WP-A  (zero-JS, pre-opened aside, DOM shape, measure)
    ├── keys.spec.ts            WP-B  (grant, persist, interleave, no layout shift)
    ├── navigation.spec.ts      WP-C  (nav state encoding, history, keyboard, ask)
    ├── share.spec.ts           WP-D  (round trip, union, silent reject)
    ├── copy.spec.ts            WP-A  (the fixed string table, forbidden words, numerals)
    ├── reduced-motion.spec.ts  WP-C
    ├── a11y.spec.ts            WP-D  (axe, keyboard walk)
    ├── accounts/<slug>.spec.ts WP-C  (twelve, one per account)
    └── unit/
        ├── compile.test.ts     WP-A
        ├── corpus.test.ts      EXISTS — the writer's; inherited by WP-B, extended with auditCorpus
        ├── knowledge.test.ts   WP-B
        ├── share.test.ts       WP-D
        └── rng.test.ts         kept
```

**Deleted:** `src/lib/ring-store.ts`, `ring-geometry.ts`, `garden-seed.ts`, `audio.ts`,
`hero-bootstrap.ts` (replaced by `boot.ts`); `src/components/ring/**`, `src/components/hero/**`,
`src/components/shell/{AppShell,Corridor,Ringway,NextArc,SoundToggle}.tsx`,
`src/components/shell/shell.css`, `src/components/ui/SoundPetal.tsx`; **all of
`src/sections/**`** including `registry.ts` and `shells.tsx`; `tests/hidden.spec.ts`,
`tests/rooms.spec.ts`, `tests/rooms/**`, `tests/unit/geometry.test.ts`.

**There are now zero shared files.** The registry is gone — the corpus *is* the manifest — and
`tests/accounts/` has one owner. The append-only rules in `CLAUDE.md` no longer apply because
nothing is shared; the one-agent-one-directory rule still does.

### D.2 Module APIs

```ts
// src/lib/types.ts — rewritten by WP-N, frozen thereafter
import type { AccountId, Belief, KeyId } from '@/content/schema';

export interface LoopState { /* exactly as §C.12 */ }

export type BeaconEventName =
  | 'session_start' | 'word_pressed' | 'account_viewed'
  | 'contradiction_found' | 'time_on_site_30s';

export type AccountState = 'unread' | 'read' | 'changed';

export interface Knowledge {
  keys: ReadonlySet<KeyId>;            // REAL keys only
  effective: ReadonlySet<KeyId>;       // real + synthetic (§C.5)
  opens: Readonly<Record<KeyId, number>>;
  visited: ReadonlySet<AccountId>;
  contradictions: ReadonlySet<string>;
  belief: Belief | null;
  pass: number;                        // 0..3
  entry: Readonly<Record<string, ReadonlySet<KeyId>>>;
}

export interface KeyDelta {
  key: KeyId;
  /** accounts whose state moved to `changed` because of this grant */
  changed: AccountId[];
  /** contradictions earned in the same tick */
  contradictions: string[];
}
```

```ts
// src/lib/knowledge.ts — NEW. Pure except for the storage calls it makes.
import type { Account, AccountId, Aside, Belief, Corpus, KeyId } from '@/content/schema';

export const CORPUS: Corpus;
export const ACCOUNTS: ReadonlyMap<AccountId, Account>;
/** allAsides(CORPUS) — the bit order of the share codec. Never rearranged. */
export const ASIDES: readonly Aside[];
export const ASIDE_BIT: ReadonlyMap<KeyId, number>;
/** key -> the account whose aside emits it (drives `see also`) */
export const EMITTERS: ReadonlyMap<KeyId, AccountId>;
/** key -> the accounts that have a block needing it */
export const CONSUMERS: ReadonlyMap<KeyId, readonly AccountId[]>;

export function readKnowledge(): Knowledge;
export function subscribe(fn: (k: Knowledge) => void): () => void;

export function grantKey(id: KeyId): KeyDelta;
export function noteOpen(id: KeyId): void;
export function markEntered(id: AccountId): void;   // rewrites that account's entry mask
export function setBelief(b: Belief | null): void;

export function effectiveKeys(k: Knowledge): ReadonlySet<KeyId>;
export function accountState(id: AccountId, k: Knowledge): AccountState;
/** the ids of the blocks that exist for this account under these keys, in render order */
export function visibleBlockIds(id: AccountId, keys: ReadonlySet<KeyId>, belief: Belief | null): string[];
export function mergeIncoming(s: SharedState): KeyDelta[];

/** the four corpus laws, exported so the unit test and the runtime agree */
export function auditCorpus(c: Corpus): string[];   // [] means clean
```

```ts
// src/lib/share.ts — rewritten in place
export const CODEC_VERSION = 1;

export interface SharedState {
  version: 1;
  belief: 0 | 1 | 2;
  pass: number;                 // 0..3
  visited: number;              // 12-bit mask
  contradictions: number;       // 5-bit mask
  asides: Uint8Array;           // A bytes, §C.11
}

export function encodeState(k: Knowledge): string;             // base64url, unpadded
export function decodeState(code: string): SharedState | null; // null on any failure, silently
export function shareUrl(slug: string, code: string): string;
export function copyToClipboard(text: string): Promise<boolean>;
/** the base64url aside bitfield used for `loop:v2.entry` */
export function encodeAsideMask(keys: ReadonlySet<KeyId>): string;
export function decodeAsideMask(mask: string): Set<KeyId>;
```

```ts
// src/lib/storage.ts — same shape, new state
export const DEFAULT_STATE: LoopState;
export function readState(): LoopState;
export function writeState(patch: Partial<LoopState>): void;   // debounced 500 ms
export function flushState(): void;
export function markVisited(slug: string): void;
export function markFound(id: string): void;
export function __resetStorageForTest(): void;
```

```ts
// src/lib/boot.ts
export const BOOT: string;   // <= 2 KB classic script source, inlined in <head>
```

```ts
// src/content/compile.ts — server only
import type { Account, Block } from './schema';
/** escapes &<>" then substitutes <details> for every [bracketed word] */
export function compileBlock(block: Block, asides: readonly Aside[]): string;
/** memoised at module scope; one string per account */
export function compileAccount(a: Account): { id: string; html: string; blocks: string[] };
```

```ts
// src/figures/index.ts
export interface Figure {
  draw(ctx: CanvasRenderingContext2D, phase: number, w: number, h: number, dpr: number): void;
  /** the authored still; called once under reduced motion at phase 0.25 */
  still(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number): void;
}
export const FIGURES: Record<AccountId, () => Promise<{ default: Figure }>>;
```

**Retained verbatim from WP0, frozen:** `clock.ts`, `beacon.ts` (names only change),
`url-state.ts`, `use-motion-preference.ts`, `use-canvas.ts`, `use-lazy-mount.ts`, `tokens.ts`,
`motion.ts`, `rng.ts`, `keep.ts`, `src/app/api/beacon/route.ts`.

### D.3 The component tree, and the server/client line

```
<html data-loop-js data-motion data-belief data-s data-theme>
 <head> <style>globals</style> <script id="loop-boot">BOOT</script> </head>
 <body>
  <a class="skip-link" href="#section-dog">skip to the account</a>          server
  <main id="main">
    <h1 id="loop-title"> … the premise, two lines … </h1>                   server, LCP
    <canvas id="ambient" aria-hidden="true"></canvas>                       client, lazy
    <section id="section-dog"  class="account"> … </section>                server  ×12
      <h2 tabindex="-1">…</h2> <p class="standfirst">…</p>
      <nav class="night" aria-label="the night"> 12 × <a> </nav>            server
      <div class="blocks"> N × .blk (dangerouslySetInnerHTML) </div>        server
      <a class="ask card"> … the next account … </a>                        server
    …
    <p id="loop-live" aria-live="polite" class="u-sr"></p>                  client
    <a class="ask-bar" href="/?s=…"> … <span class="hub">1/5</span> </a>    server + client attrs
  </main>
  <footer> gentle mode · keep this · send the night as you have it </footer> client controls
  <NightRuntime />                                                          client, no DOM
 </body>
</html>
```

**Server-rendered and never hydrated:** the `<h1>`, all twelve `<section>`s including every block
and every aside, the night, the ask card, the ask bar, the skip link, the footer frame. This is
the whole document; it is why the site is complete with zero JavaScript.

**Client:** exactly one island, `<NightRuntime>`, which renders no DOM of its own. It:

- reads `loop:v2` and adopts whatever `boot.ts` already did;
- attaches one delegated `toggle` listener, one delegated `click` listener and one `keydown`
  listener, all on `document`;
- owns account entry: `markEntered`, set `data-held` / `data-new` / `aria-hidden` on the entering
  account's blocks, flip `html[data-s]`, scroll to top, move focus to the new `<h2>`, all in one
  `useLayoutEffect` so it is one paint;
- owns the night's `data-state` attributes, `aria-current`, the hub, and the live region;
- owns the belief attribute, the share button, `keep this`, and `gentle mode`;
- mounts `<Ambient>` on `requestIdleCallback` (or a 1200 ms timeout) and only when
  `html[data-motion]` is `auto` **or** a still is authored.

Because the runtime mutates attributes rather than re-rendering markup, there is no hydration
mismatch anywhere and React never touches the prose.

**The lazy-mount boundary** is `<Ambient>` and nothing else. `use-lazy-mount.ts` gates it on the
canvas being in view; `FIGURES[slug]()` is a `import()` per account, so a reader who never leaves
`dog` downloads one figure. If the perf gate is ever tight, **the entire ambient layer is the
first thing that goes**: nothing functional, accessible or narrative depends on it.

### D.4 `src/lib/clock.ts` now

Retained, unchanged in API, and now diegetic: the 4000 ms `SWEEP_MS` *is* the four seconds.

- `startClock()` is called **only by `<Ambient>` on mount**, not by the shell. A reader under
  reduced motion, or before the idle callback fires, runs **no `requestAnimationFrame` at all**.
  This is a deliberate change from the ring build and it is worth several points of TBT.
- `subscribeFrame` remains the only way to get a frame. There is still exactly one rAF in the
  application and `src/lib/clock.ts` still owns it.
- `ClockFrame.isReturn` (true on the single frame where `revolution % 6 === 0`, i.e. every 24 s)
  drives one Ember tick on the hub, and nothing else.
- `setDirection` and `setPeriod` are retained but unused by the product.
- Under reduced motion `<Ambient>` calls `figure.still()` once and never subscribes.

---

## E. Performance plan

**Budgets, unchanged and hard:** Tier A (render-blocking: the stylesheet + the inline bootstrap)
**≤ 14 KB gz**; Tier B (first-party JS on the landing route, excluding the React/Next floor)
**≤ 90 KB gz**; Tier C (total JS transferred on the landing route) **≤ 230 KB gz**; total CSS
≤ 14 KB gz; fonts **0 bytes**; raster images **0 bytes**. `pnpm budget` gates all of them.

**One new budget, and it is the only genuinely new risk in this build.** The document now carries
~5000 words. `scripts/bundle-budget.mjs` gains two assertions against the prerendered
`.next/server/app/index.html`:

| what | budget |
|---|---|
| the HTML document, gzipped | **≤ 40 KB gz, hard** |
| the inline RSC flight payload (`self.__next_f.push`), gzipped | **≤ 18 KB gz, hard** |

**How the initial HTML stays small.**

1. **Accounts are one route, not twelve, and they are not code-split.** Code-splitting prose is
   the wrong instinct: a lazily fetched account cannot be in the initial HTML, which forfeits A1
   outright, and twelve round trips cost far more than ~12 KB gz of text. The text ships once, in
   the document, compressed.
2. **The prose is injected as one compiled HTML string per account.** React's flight payload then
   carries twelve strings instead of a tree of several thousand element descriptors. Measured on
   the scaffold's own numbers, the tree form roughly doubles the document; the string form costs
   the text plus about 8 %.
3. **No corpus JavaScript reaches the browser.** Locked blocks, belief variants and the
   `four seconds` blanks are all attribute-and-CSS mechanisms (§C.6, §C.9, §C.10), so Tier B
   carries the engine — `knowledge.ts`, `share.ts`, `storage.ts`, `beacon.ts`, `url-state.ts`,
   the runtime island — and not one word of the story. Projected Tier B: **12–18 KB gz**, against
   the 14.5 KB the ring scaffold shipped and the 39.0 KB the finished ring site shipped.
4. **Tier A is the existing stylesheet plus the boot script.** The reading layer adds roughly
   1.5 KB gz of CSS and the twelve static `html[data-s]` rules about 0.15 KB gz; the deleted
   `ring.css` and `shell.css` return more than that. Projected Tier A: **≤ 8 KB gz** of 14.
5. **Zero third-party origins**, zero fonts, zero images, zero embeds — unchanged and
   non-negotiable.

**CLS 0, by construction.**

- `html[data-loop-js]`, `html[data-s]`, `html[data-belief]`, `html[data-motion]` and every held
  key's reveal rule are all applied **synchronously in `<head>`, before first paint**. The JS
  layout *is* the first paint; there is no reflow to shift.
- No block ever materialises while its account is on screen (§C.6).
- The hub, the changed markers and the night's marks are all fixed-size and position-reserved.
- A `<details>` toggle is user-initiated and is excluded from CLS by definition; it is also the
  only thing on the site that changes layout after load.
- No media, no embeds, no fonts — nothing with an unknown intrinsic size exists.

**Lighthouse targets** (CI mobile simulate, the median of three runs), unchanged from `05` §H.1
except where the narrative form moves them:

| metric | CI gate | local |
|---|---|---|
| FCP | **< 1.0 s** | < 0.6 s |
| LCP | < 1.8 s | < 1.0 s |
| TTI | < 2.5 s | < 1.5 s |
| TBT | **< 120 ms** (was 150; there is no rAF on load now) | < 80 ms |
| CLS | **0** | **0** |
| INP | < 100 ms | < 100 ms |
| Performance | **≥ 0.95** | ≥ 0.98 |
| Accessibility | **1.00** | **1.00** |

The `06` §G rule stands: the perf gate reads LCP as FCP when Lighthouse's own trace shows the LCP
element painted in the FCP frame, because against localhost Lantern treats every script as
render-blocking.

---

## F. Typography and layout for reading

### F.1 Type

**No webfont. Zero font bytes, zero font requests.** Prose is set in a system serif stack,
because this is a short story and the old sans stack is a UI voice:

```css
--font-read: "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua",
             Georgia, "Times New Roman", serif;
```

The existing `--font-sans` stack stays for the night, the hub, the footer and every control, so
the interface and the story are visibly different registers — which also keeps E1 honest.

| role | size | line-height | notes |
|---|---|---|---|
| `<h1>` | `clamp(1.5rem, 1.18rem + 1.42vw, 2.25rem)` | 1.18 | two lines, `--font-sans`, `text-wrap: balance`, the LCP element |
| `<h2>` account title | `clamp(1.25rem, 1.12rem + 0.56vw, 1.625rem)` (`--text-h3`) | 1.2 | `--font-read` |
| standfirst | `--text-sm` | 1.45 | `--c-text-secondary` |
| **block prose** | `clamp(1.0625rem, 1.02rem + 0.28vw, 1.1875rem)` → **17 px … 19 px** | **1.62** | `--font-read`, `--c-text` at 17.5 : 1 |
| aside body | `1em` of the block, set in `--font-sans` at `0.9375em` | 1.5 | `--c-text-secondary` at 9.2 : 1 |
| night label | `--text-xs` | 1.2 | `--font-sans`, `--ls-label` |
| hub `n/5` | `--text-sm` | 1 | `--font-sans`, `--c-accent-3` (Ember) at 10.4 : 1 |

**Measure.** `--measure-read: 34rem` (≈ 62 characters at 17 px). The `.blocks` column is
`max-width: var(--measure-read)`, centred, with `--gutter` (`max(1rem, safe-area)`) on phones. At
1440 px the column stays at 34 rem and the night takes the right-hand rail; the prose never
stretches.

**Block rhythm.** `.blk + .blk { margin-top: 1.45em }` — one and a half lines, so the eye sees a
paragraph break without a rule. A block behind a key additionally carries a 2 px hairline left
rule at `--c-accent-dim`, inset `-1.25rem` on desktop and `-0.75rem` on phones, permanent, so the
reader can see exactly which sentences are new in a re-read. `.blocks { display: flow-root }`
keeps the inline-`<details>` fragmentation contained to the block.

### F.2 The `<summary>` affordance

It must read as an ordinary word and be obviously pressable. The resolution is a **dotted rule
plus a hover/focus transition**, never a colour change at rest, never a button chrome:

| state | rendering |
|---|---|
| rest, unpressed | inherits the prose colour; `text-decoration: underline dotted`, `from-font` thickness, `0.22em` offset |
| rest, held | identical, but **solid** |
| hover | rule thickens to 2 px; the word takes `--c-accent`; 120 ms transition |
| `:focus-visible` | `outline: 2px solid var(--c-focus); outline-offset: 2px;` the rule is unchanged |
| open | `aria-expanded="true"` (native) and the aside body is on screen |
| active | the word takes `--c-accent-hi` for the duration of the press |

Hit area: 44 px tall via the `::after` overhang in §C.2, ≥ 8 px of clear space guaranteed by the
copy law that forbids two pressable words on the same or adjacent rendered lines. `cursor:
pointer`. `-webkit-tap-highlight-color: transparent` with a real `:active` state in its place.

### F.3 Phone layout

**360 × 640.** Gutter 16 px. Top to bottom, in flow:

| element | height | y |
|---|---|---|
| `<h1>`, two lines at 24 px / 1.18 | 58 | 20 – 78 |
| `<h2>` + standfirst | 52 | 94 – 146 |
| **the night**, `repeat(auto-fit, minmax(44px, 1fr))`, gap 8 → 6 × 2 | 96 | 162 – 258 |
| block 1 (≈ 5 lines at 17 px / 1.62) | 138 | 278 – 416 |
| the already-open aside, inside block 1 | — | on screen |
| … the document scrolls … | | |
| **the fixed ask bar** | 56 + safe area | bottom |

`.blocks` carries `padding-bottom: calc(72px + env(safe-area-inset-bottom))` so the last line
always clears the bar. The premise, the account, the twelve slots with eleven holes, the first
block and its open aside are all in the first viewport.

**320 × 568.** Identical construction; the night falls to 5 columns × 3 rows (auto-fit, 44 px
minimum, 8 px gap: 5 × 44 + 4 × 8 = 252 ≤ 288 available). Block 1 begins at y ≈ 300 with 212 px
of reading above the bar. `scrollWidth === clientWidth` at 320 and at a 180 px layout viewport
(200 % zoom), where auto-fit falls to 3 columns × 4 rows and **no slot is ever off-screen** —
this is the F1 deduction the outgoing site lost a point to, fixed by construction rather than by
a media query.

**The fixed ask bar.** `position: fixed; left: 0; right: 0; bottom: 0;`
`padding: 6px var(--gutter) max(10px, env(safe-area-inset-bottom));` a single 44 px-tall row
holding the ask text (flex: 1, left) and the hub (right). It is in the thumb zone from frame one,
it never relocates between accounts, and it is the only fixed element on the page. **It declares
`pointer-events: none` on the bar and `pointer-events: auto` on its two children** — the standing
rule from `08` §6 that earned two rubric points on the ring build; any new fixed overlay ships
the same pair.

**Desktop (≥ 900 px).** A three-column frame: an empty left rail, the 34 rem prose column centred,
and the night as a fixed right-hand vertical list of twelve rows at `right: var(--gutter)`,
vertically centred, each row 44 px tall with its label and, on hover or focus, the account's
standfirst as a gap subline (rubric E3). The ask bar becomes a bottom-right card, 208 × 64,
clear of the prose column at every width down to 900 px.

**Spacing floor.** Every interactive target is ≥ 44 × 44 with ≥ 8 px of clear space — night
slots, the ask bar's two children, the footer's three controls, the belief options and the
`see also` links. `tests/a11y.spec.ts` measures every `<a>` and `<button>` rect at 320, 360, 393,
412, 180 (200 % zoom), 1024 and 1440 and fails on any pair closer than 8 px. This is the F3
deduction the outgoing site lost a point to.

### F.4 Focus, contrast and colour

- Focus: 2 px `--c-focus` outline at 2 px offset on every interactive element, in both schemes,
  verified by the keyboard walk in `tests/a11y.spec.ts`.
- Contrast: the existing verified palette is retained unchanged, so every ratio in `05` §E still
  holds. Prose 17.5 : 1, secondary 9.2 : 1, Ember hub 10.4 : 1, borders ≥ 5.3 : 1.
- **No state is encoded by colour alone, anywhere:** night slots differ by fill and by bar count;
  pressable words by dotted versus solid; the changed marker is a second bar; the belief choice
  shows `aria-pressed` and a filled pip. Ember is used for the hub and for nothing else.
- `100dvh` / `100svh` on the account shell; `prefers-color-scheme` handled by the existing
  `:root` blocks; pinch-zoom never disabled (`maximumScale: 5`).

---

## G. Work packages

**Five packages. One teardown that runs alone and first; then four that run in parallel with
disjoint owned paths and no shared file.** `package.json` `dependencies` is frozen.

### WP-N — Teardown and skeleton *(runs alone, blocking)*

**Owns:** everything, for the duration.

**Deliverables.**

1. Delete everything in the "Deleted" list at §D.1. Nothing ring-shaped survives, including every
   ring assertion inside the retained specs.
2. Rewrite `src/lib/types.ts` to §D.2 and **freeze it**. Rewrite `src/lib/storage.ts` to
   `loop:v2` (§C.12) keeping its public API. Rename `hero-bootstrap.ts` → `boot.ts` and write the
   pre-paint bootstrap of §C.6 in full, **≤ 2 KB raw**, as a classic inline script: it sets
   `data-loop-js`, `data-motion`, `data-belief`, `data-s`, and injects `#loop-keys`. **Freeze
   `boot.ts`** — it is contract, and four agents depend on the attributes it writes.
3. Write `src/lib/knowledge.ts` complete to the §D.2 signatures, including `auditCorpus`, the
   synthetic-key namespace (§C.5) and the entry-mask logic (§C.6). It is handed to WP-B, who owns
   it thereafter.
4. Write `src/content/compile.ts` to the §D.2 signature with strict escaping, and
   `tests/unit/compile.test.ts` with hostile-string cases. Handed to WP-A.
5. Rewrite `src/app/{layout,page,not-found}.tsx`, `src/app/s/[slug]/page.tsx`,
   `src/components/read/**`, `src/components/night/**` and `src/components/shell/**` to the §D.3
   tree, as **working, plain, token-only** implementations. Rewrite `globals.css`: keep every
   token block and the `[data-motion="reduce"]` block verbatim, delete every ring rule, add the
   twelve static `html[data-s]` rules and the locked-block rules of §C.6.
6. Rewrite `tests/fixtures.ts` (account slugs, no ring helpers) and stub the nine spec files at
   §D.1 so every owner has a file to fill. **`src/content/accounts.ts` and
   `tests/unit/corpus.test.ts` already exist and are the writer's — do not rewrite either; make
   `corpus.test.ts` pass and hand it to WP-B.** Extend `scripts/bundle-budget.mjs` with the two
   document budgets of §E and re-record `perf-baseline.json`.
7. Regenerate `public/og/loop.svg` and `src/app/icon.svg` with no ring.

**Acceptance.** `pnpm verify` is **green**, and `/` renders **the real corpus for at least one
account** — `dog`, from `src/content/accounts.ts`, with its four blocks, its asides as real
`<details>`, the first one already open, the night, and the ask bar. With JavaScript disabled the
raw response body contains all twelve `<section id="section-*">`. Tier A ≤ 8 KB gz, Tier B
≤ 20 KB gz, document ≤ 40 KB gz, CLS 0.

**Must not.** Write any prose; change `src/content/schema.ts`; add a dependency; implement the
ambient figures, the share codec, the contradiction effects or the belief choice.

---

### WP-A — The reading surface

**Owns:** `src/components/read/**`, `src/content/compile.ts`, `src/app/page.tsx`,
`src/app/layout.tsx`, `src/app/not-found.tsx`, `src/app/s/[slug]/**`, `src/styles/read.css`,
`tests/reading.spec.ts`, `tests/copy.spec.ts`, `tests/unit/compile.test.ts`.

**Deliverables.** The exact DOM of §C.1; the bracketed-word → `<details>` compiler and the
inline-aside CSS of §C.2 including the 44 px `::after` and all six `<summary>` states; the
pre-opened aside; the block rhythm, measure, type scale and hairline key rule of §F.1–F.2; the
`four seconds` blank rendering of §C.10 (the transparent-text rule, `box-decoration-break`, the
`order: 1` reflow and the `see also` links); the ask card; the metadata of §C.13; the
zero-JS document; `copy.spec.ts` enforcing the fixed string table, the forbidden words, the
numeral law, the ≤ 55-word block cap and the "no two pressable words on the same or adjacent
rendered line" law at 360 px and 200 % zoom.

**Acceptance.** With JavaScript disabled: all twelve accounts, every block, every aside readable,
every link working, one `<h1>`, twelve `<section aria-labelledby>`. With JavaScript: a
`<summary>` press at `waitUntil: 'commit'` + 200 ms opens its aside. The aside body's rect starts
below its summary's line box and the block's left edge does not move. Zero axe serious/critical.
`copy.spec.ts` green across all twelve accounts.

**Must not touch.** `src/lib/**`, `src/components/night/**`, `src/figures/**`,
`src/app/globals.css`, `scripts/**`, any other spec file.

---

### WP-B — The knowledge engine

**Owns:** `src/lib/knowledge.ts`, `src/lib/storage.ts`, `src/components/night/Runtime.tsx`,
`src/components/read/BeliefChoice.tsx`, `tests/keys.spec.ts`, `tests/unit/knowledge.test.ts`,
`tests/unit/corpus.test.ts`.

**Deliverables.** Key granting, persistence and idempotence (§C.3, §C.4); the synthetic-key
namespace (§C.5); the entry-time materialisation rule and the `data-held` / `data-new` /
`aria-hidden` pass, in one `useLayoutEffect` with the `html[data-s]` flip (§C.6); the entry-mask
`changed` computation; the five contradictions and the hub; the belief choice, its storage, its
`html[data-belief]` mirror and its one-tap reversal (§C.9); `auditCorpus` and the four corpus
laws; the live-region announcements.

**Acceptance.** A key granted in one account marks the right slots changed **in the same frame**
and changes nothing in the account on screen. Reloading restores every key, every contradiction,
the belief and the pass. Entering an account with a new key interleaves the block **between** the
existing blocks, in its authored position, with `layout-shift` entries summing to **0** across
the whole navigation. Every account renders from an empty key set. No key is emitted and consumed
by the same account. Every key has ≥ 1 emitter and ≥ 1 consumer. A corpus that violates any of
the four laws fails `pnpm test:unit`.

**Must not touch.** `src/components/read/**` except `BeliefChoice.tsx`, `src/figures/**`, any
CSS file, `scripts/**`, any other spec file.

---

### WP-C — The night, navigation, layout and the ambient figures

**Owns:** `src/components/night/{TheNight,AskBar,LiveRegion}.tsx`,
`src/components/shell/{SkipLink,MotionToggle,Footer}.tsx`, `src/app/globals.css`,
`src/styles/{night.css,motion.css}`, `src/figures/**`, `tests/navigation.spec.ts`,
`tests/reduced-motion.spec.ts`, `tests/accounts/*.spec.ts`.

**Deliverables.** The twelve-slot night with its three shape-encoded states and its accessibility
text (§C.7); the fixed ask bar and hub with a reserved box; the push/replace history rule; the
keyboard map of §C.15 with its scope discipline; scroll-to-top and focus-to-`<h2>` on a
deliberate move; the phone and desktop layouts of §F.3 at 320 / 360 / 393 / 412 / 180 / 1024 /
1440 including the `pointer-events` pair; the full reduced-motion variant of §C.16;
`<Ambient>`, the twelve ≤ 40-line figures with their authored stills, and the lazy `startClock()`
rule of §D.4; `gentle mode`.

**Acceptance.** All twelve slots hit-test to themselves and navigate to their own account at all
seven viewports, on `/` and inside every account. `scrollWidth === clientWidth` at 320 and 180,
and **no slot is off-screen at 180**. The ask bar's rect is byte-identical on `/` and in every
account. Back leaves in one press from any deliberate move. Under
`contextOptions: { reducedMotion: 'reduce' }` every account renders a non-uniform still,
`document.getAnimations()` is empty after 1 s and **no `requestAnimationFrame` is ever
scheduled**. Every figure's lazy chunk ≤ 2 KB gz.

**Must not touch.** `src/lib/**`, `src/components/read/**`, `src/components/night/Runtime.tsx`,
`src/styles/{read,ui}.css`, `scripts/**`, any other spec file.

---

### WP-D — State codec, sharing, beacon and the QA gate

**Owns:** `src/lib/share.ts`, `src/lib/beacon.ts`, `src/lib/keep.ts`, `src/components/ui/**`,
`src/styles/ui.css`, `scripts/**`, `perf-baseline.json`, `tests/{smoke,share,a11y}.spec.ts`,
`tests/unit/share.test.ts`, `tests/fixtures.ts`, `public/og/**`, `src/app/icon.svg`.

**Deliverables.** The codec of §C.11 exactly, including the variable aside length, the
forward-compatible zero-extension, the silent rejection of every malformed payload, and
`encodeAsideMask` / `decodeAsideMask` for the entry masks; `send the night as you have it` with
its clipboard fallback and the `someone read it this way` caption; the union-only merge and the
`contra:both` rule; `keep this` — `keepPng` compositing the ambient canvas with the night's
twelve marks drawn into it and signed `loop`, falling back to the marks alone when no figure is
mounted; the five beacon events of §C.14; the extended `bundle-budget.mjs` with the document and
flight budgets; `audit-perf.mjs` retuned to the §E table.

**Acceptance.** `encodeState(decodeState(c)) === c` for 10 000 random states and for every
boundary (all bits set, none set, every `A` from 1 to 8). Every one-character mutation of a valid
code either decodes to the same state or is rejected — never throws, never shows an error. A
round trip through a real browser restores keys, visited, contradictions and belief, **unions**
them with existing state and never removes anything. Arriving with the opposite belief earns
`contra:both`. Axe: zero serious or critical on `/`, on `/` after visiting all twelve accounts,
and on one `/s/<slug>`. `pnpm budget` green on every budget in §E.

**Must not touch.** `src/lib/{knowledge,storage,boot,types}.ts`, `src/components/{read,night}/**`
(other than importing them), `src/app/globals.css`, `src/styles/{read,night}.css`, any other
spec file.

### Integration

WP-N merges alone. WP-A/B/C/D branch from it and merge in any order; the paths are disjoint, so
the only integration risk is the attribute contract, which `boot.ts` and `types.ts` fix and
freeze. Every PR runs `pnpm verify` green and states its Tier A / Tier B / document delta from
`pnpm budget`.

---

## H. The QA gate

### H.1 `pnpm verify`

Unchanged in shape: `typecheck → lint → build → budget → unit → e2e → a11y`. It must be green on
every PR. `audit:perf` stays out of `verify` (it costs a Lighthouse run) and is run by WP-D and by
the integrator.

| step | enforces |
|---|---|
| `typecheck` | `tsc --noEmit`, strict, `noUncheckedIndexedAccess`, no `any` escapes |
| `lint` | flat config + the two `no-restricted-syntax` bans — `matchMedia('(prefers-reduced-motion…')` outside `use-motion-preference.ts`, and any `localStorage` member access outside `storage.ts` — **plus a third: `src/content/accounts.ts` may not be imported from any `'use client'` module.** That ban is what keeps the corpus out of Tier B. |
| `build` | `next build` (webpack; `06` §G) |
| `budget` | Tier A ≤ 14 KB gz, Tier B ≤ 90 KB gz, Tier C ≤ 230 KB gz, CSS ≤ 14 KB gz, **document ≤ 40 KB gz**, **flight ≤ 18 KB gz**, fonts 0 B, rasters 0 B, every figure chunk ≤ 2 KB gz |
| `test:unit` | `compile`, `corpus`, `knowledge`, `share`, `rng` |
| `test:e2e` | the suites below on `desktop` (Desktop Chrome), `mobile` (Pixel 7) and `reduced-motion` |
| `test:a11y` | axe + the keyboard walk + the target-geometry sweep |

### H.2 The tests that must be written

**`tests/reading.spec.ts` (WP-A) — zero-JS reading and the pressable word.**
The raw response body contains twelve `<section id="section-*">`, every block of every account and
every aside body. With `javaScriptEnabled: false`: one `<h1>`, all twelve accounts visible in
order, every night slot and every ask card a working `<a href>`, and the already-open aside's
text visible. With JavaScript: a `<summary>` clicked at `commit + 200 ms` sets
`aria-expanded="true"` and its aside body becomes visible; the aside body's rect top ≥ the
summary's line-box bottom; the block's `getBoundingClientRect().left` is unchanged. Exactly one
aside in the whole corpus carries `open`.

**`tests/copy.spec.ts` (WP-A) — the copy law.**
Sweep every rendered leaf with non-zero opacity across all twelve accounts, both schemes, both
motion settings, with zero keys and with all keys. Every string is in the corpus or in the §C.13
table. No forbidden word. No numeral outside `11:04 four six ten n/5`. Every block ≤ 55 words.
No two pressable words on the same or adjacent rendered line at 360 px and at 200 % zoom.

**`tests/keys.spec.ts` (WP-B) — keys, persistence and interleaving without shift.**
(a) Opening an aside grants its key, marks the right slots `changed` in the same frame, and
changes **nothing** inside the account on screen (DOM snapshot of `.blocks` identical before and
after). (b) Reload restores every key, every contradiction, the belief and the pass. (c) Closing
and reopening an aside grants nothing new. (d) With a key seeded in `loop:v2`, entering its
account renders the locked block **between** its neighbours at its authored index, not appended.
(e) A `PerformanceObserver` on `layout-shift`, installed with `addInitScript`, sums **exactly 0**
across: load → open two asides → navigate to two accounts → return → reload. (f) Every account
renders from an empty key set with no missing-block error.

**`tests/navigation.spec.ts` (WP-C) — nav state encoding and history.**
Each of the twelve slots carries one of exactly three `data-state` values; `unread`, `read` and
`changed` differ by **shape**, asserted by comparing computed `border`, `background` and the
presence of the second bar, **with colour normalised away**; each carries the matching
accessibility text. A slot click pushes, an alias redirect replaces, Back leaves in one press.
The full keyboard map of §C.15 works and `Space`/`↑`/`↓`/`PageUp`/`PageDown` still scroll. The ask
bar's rect is identical on `/` and in every account.

**`tests/share.spec.ts` + `tests/unit/share.test.ts` (WP-D) — the round trip.**
Unit: 10 000 random states round-trip exactly; every boundary; a 15-character code at the shipped 43 asides;
every single-character mutation either round-trips or returns `null`; a truncated aside field is
zero-extended; an over-long one is rejected. E2E: a link opened in a fresh context restores
keys, visited, contradictions and belief, **unions** with pre-existing state, shows
`someone read it this way`, and a corrupt `#n=` loads the site silently with the reader's own
state and no console error.

**`tests/reduced-motion.spec.ts` (WP-C).** Project with `contextOptions: { reducedMotion:
'reduce' }`. Every account renders visible, **non-uniform**, non-empty content (the existing
screenshot-variance floor). `document.getAnimations().filter(a => a.playState === 'running')` is
empty after 1 s. `requestAnimationFrame` is never called (counted with an `addInitScript` shim).
Every locked block appears with no animation. `gentle mode` flips `html[data-motion]` without
reload.

**`tests/a11y.spec.ts` (WP-D).** `AxeBuilder` with `wcag2a wcag2aa wcag21a wcag21aa` on `/`, on
`/` after all twelve accounts, and on one `/s/<slug>`: **zero serious, zero critical**. Keyboard
walk: `Tab` reaches the skip link first, the order is §C.15's, every stop has a visible 2 px
focus ring, no trap. Every `<a>`/`<button>`/`<summary>` rect is ≥ 44 px in its tappable dimension
with ≥ 8 px of clear space at 320 / 360 / 393 / 412 / 180 / 1024 / 1440. `aria-live="polite"`
exists and carries the changed announcement. Every `<canvas>` is `aria-hidden="true"`; **there is
no canvas-only information anywhere on this site.**

**`tests/smoke.spec.ts` (WP-D).** `/` returns 200, one `<h1>`; `html[data-loop-js]` and
`html[data-s]` are set within 1000 ms of `waitUntil: 'commit'`; the first `<summary>` press is
handled natively **before React hydrates**; CLS after a full session is `0`; zero console errors,
zero `pageerror`, no response ≥ 400 (the shared fixture, applied to every spec).

**`tests/accounts/<slug>.spec.ts` (WP-C), twelve files.** Each asserts: its `<section>` is in the
raw response body; `/?s=<slug>` activates it and only it; it emits `account_viewed` (intercept
`POST /api/beacon`); its ask control names its `next`; its figure's still renders non-uniform
under reduced motion; and its own authored behaviour — the contradiction it participates in, or,
for `four-seconds`, that zero keys prints exactly one block and that every blank rule's width
equals the rendered width of the sentence it hides.

### H.3 Lighthouse

The §E table, median of three runs, CI mobile simulate. **Performance ≥ 0.95, accessibility
1.00, CLS exactly 0, FCP < 1.0 s.** `scripts/audit-perf.mjs` writes `reports/perf-report.json`
and exits non-zero on any breach.

### H.4 The bounce-risk rubric, restated in full

Score only what is verifiable in the artefact (code inspection, rendered DOM, simulated
conditions). Every item is 0 / partial / full. **Default to zero when ambiguous.**
**The threshold for this project is ≥ 92 with zero Category H penalties.**

**Category A — Speed & Stability (20)**

| # | Item | Pts |
|---|---|---|
| A1 | First meaningful content present in initial HTML (no JS required to see the value prop) | 5 |
| A2 | Critical path ≤ 200 KB; no render-blocking third-party scripts | 4 |
| A3 | Zero layout shift: all media/embeds have reserved dimensions or `aspect-ratio`; fonts metric-matched or `font-display: optional` | 4 |
| A4 | Hero interactive (responds to input) within 1 s; no hydration dependency for first interaction | 4 |
| A5 | No spinner/skeleton occupying the first viewport | 3 |

**Category B — Instant Comprehension (17)**

| # | Item | Pts |
|---|---|---|
| B1 | "What is this?" answerable from the first viewport in ≤ 8 plain words, above the fold at 360×640 | 6 |
| B2 | Exactly one primary CTA; ≤ 2 competing visual attractors in the first viewport | 4 |
| B3 | A concrete, specific instance shown (not only abstraction) in the first viewport | 4 |
| B4 | No carousel, no entry modal, no interstitial, no autoplay audio, no gate before value | 3 |

**Category C — Interaction & Agency (16)**

| # | Item | Pts |
|---|---|---|
| C1 | An input-reactive element in the first viewport, working on **both** pointer and touch | 6 |
| C2 | Interaction feedback < 100 ms; INP budget < 150 ms | 4 |
| C3 | ≥ 3 distinct kinds of interaction available within the first two screens | 3 |
| C4 | Every interactive element has hover + focus-visible + active states and ≥ 2 visual signifiers | 3 |

**Category D — Open Loops & Exploration Pull (17)**

| # | Item | Pts |
|---|---|---|
| D1 | Every viewport ends unresolved (no screen is a closed statement) | 4 |
| D2 | A persistent progress/collection indicator, non-zero on arrival (endowed progress) | 4 |
| D3 | A finite, countable set (7–12) with visible unexplored slots | 4 |
| D4 | A "one more" control that is fixed, instant (< 300 ms), and never relocates | 3 |
| D5 | ≥ 1 genuine surprise/variable-reward element, with no scarcity/timer/punishment mechanics | 2 |

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
| F1 | No horizontal overflow at 320 px; usable at 200 % zoom; pinch-zoom not disabled | 3 |
| F2 | Primary action in the thumb zone with safe-area padding | 3 |
| F3 | All targets ≥ 44 px with ≥ 8 px spacing | 2 |
| F4 | `dvh`/`svh` used for full-height sections; nothing critical hidden by browser chrome | 2 |

**Category G — Accessibility (10) — hard gate**

| # | Item | Pts |
|---|---|---|
| G1 | Full `prefers-reduced-motion` alternative that is *designed*, not stripped | 3 |
| G2 | Complete keyboard operability, logical order, visible focus, skip link, no traps | 3 |
| G3 | Semantic structure + `aria-live` for dynamic state + text equivalent for any canvas/WebGL centrepiece | 2 |
| G4 | Contrast ≥ 4.5:1 text / ≥ 3:1 UI; no state encoded by colour alone | 2 |

**Totals: A 20 + B 17 + C 16 + D 17 + E 10 + F 10 + G 10 = 100.**

**Category H — Trust & Anti-Dark-Pattern — penalties applied after scoring**

| Violation | Penalty |
|---|---|
| Any entry modal, exit-intent popup, or content-obscuring overlay before 30 s / 50 % scroll | **−15** |
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
| 92–100 | **≥ 90 %** | Meets the target |
| 85–91 | 82–89 % | Close; fix A, B, C first |
| 75–84 | 70–81 % | Better than median, misses the mandate |
| 60–74 | 55–69 % | Ordinary good site |
| < 60 | < 55 % | At or below industry median |

**Hard gates — failing any one caps the total at 74:** A1 or A4 zero; B1 zero; any Category H
penalty ≥ 12; Category G total < 6.

### H.5 Where this build earns each item, and the three it can lose

**Scored by construction.** A1: every account's zero-key text is in the initial HTML, so zero-JS
is the *best-case* reading experience, not a fallback. A3/CLS: §E. A4: `<summary>` is interactive
in the first painted frame with no hydration dependency at all. B1: seven plain words in the
`<h1>`, above the fold at 360×640, in the initial HTML. B3: the already-open aside is a concrete
instance in the first viewport. B4/H: no modal, no carousel, no gate, **no audio anywhere** — a
whole penalty class removed. C1: pressable words work on pointer, touch and keyboard
pre-hydration. D2: one of twelve read and one of forty words held before the reader acts, both
genuine. D3: three nested finite sets with visible holes. D4: the ask bar, fixed, never
relocating, naming its destination. E1/E2: enforced by `copy.spec.ts` and by the ask card. E3:
the §H.3-style functional equivalent — each night slot carries a state mark, a specific title, the
account's standfirst as a gap subline on hover/focus and a non-colour visited marker. F1/F2/F3:
the four points the outgoing site lost are all lost to layout decisions this build does not repeat
(auto-fit night, bottom-anchored primary action, 8 px floor asserted in CI). G1–G4: §C.16, §C.15,
§F.4, and there is no canvas-only information anywhere.

**Three items carry real risk, and the auditor should look at them first.**

1. **C1 (6 pts) — the interactive element is smaller and less obvious than a ring.** Compensated
   three ways: the already-open aside teaches in zero words, the dotted rule is a signifier flat
   design forgot, and the *nav* reacts to the press so the feedback is larger than the target. If
   the `word_pressed` beacon shows under 40 % of sessions pressing within 15 s, C1 is a 2, and
   the concept's R2 kill criterion applies.
2. **D5 (2 pts) — the variable reward.** The concept's third-press easter egg does not exist in
   the frozen schema; §I of this document says what replaced it. D5 is scored on the genuine
   variability of *which* contradiction fires first and *when* — an unannounced line that arrives
   the moment two keys meet, determined entirely by the reader's own order, with no scarcity, no
   timer, no streak and no punishment. An auditor who reads that as insufficient should score D5
   at 1 and the build still clears 92.
3. **The clickbait exposure at `four seconds` (−8 if it fails).** The 5/5 resolution must be
   larger than the promise. It is one authored sentence and it is the writer's responsibility, not
   the builders'.

**Projected: 98–100 before defects; a realistic shipped score after the usual regressions is
95–98**, against a 92 gate. Quality of prose is not verifiable in CI and remains the residual
risk, managed by concept §7 and not by this gate.

---

## I. Where the concept was mechanically impossible, and what this document specifies instead

1. **Pass-gated openings.** The concept replaces the landing account's opening block on pass 2
   and 3. `Block` has no pass field and the schema is frozen, and a locked block can only ever
   *appear*, never replace. **Specified instead:** the engine grants the synthetic keys `pass:2`
   and `pass:3` (§C.5) and the writer authors the pass openings as additional blocks at index 0
   with `needs: 'pass:2'` / `'pass:3'`. Interleaving, not replacement — which is the engine's own
   law, and one fewer mechanism.
2. **Contradiction effects.** §4.4 says a contradiction makes "both accounts gain a line" and "a
   third block appears in `lamp`", but `Contradiction` carries only `id`, `needs` and `line`.
   **Specified instead:** `contra:<id>` and `contra:all` synthetic keys, so a contradiction's
   effect is an ordinary locked block and materialises by the ordinary entry rule.
3. **`you weren't here.` and the silent pass.** Both are blocks that must exist only while
   something is *absent*, which no `needs` can express. **Specified instead:** the `empty-handed`
   and `silent-pass` synthetic keys, which are the only two keys that can be lost — safely,
   because blocks are evaluated only at entry.
4. **The third press.** Eight words saying something different on their third press cannot exist:
   `Aside` has exactly one `text` and `<details>` has no press count. **Specified instead:** the
   engine counts opens and grants `thrice:<key>`, so the reward is a block that materialises the
   next time that account is entered. The writer may use it or not. D5 is scored on contradiction
   variability either way (§H.5).
5. **The aside bitfield is variable, not five bytes.** The concept fixes 5 bytes for "~40" words.
   **The delivered corpus has 43**, which that field would have silently truncated.
   **Specified instead:** `A = ceil(N / 8)` bytes, total `L = 5 + A`, forward-compatible
   zero-extension, hard cap 8 bytes / 64 asides. At 43 asides: 11 bytes, **15 base64url
   characters**, a ~45-character share URL.
6. **`<details>` cannot live inside `<p>`.** A block is therefore a `<div class="blk"
   role="paragraph">`, not a paragraph element (§C.1).
7. **A twelve-slot 44 px grid does not fit one row on a phone, and the concept's fixed
   two-row-plus-hub bottom nav would eat 38 % of a 320×568 viewport.** **Specified instead:** the
   night is `repeat(auto-fit, minmax(44px, 1fr))` **in flow** at the top of each account (6×2 at
   360, 5×3 at 320, 3×4 at 200 % zoom — never off-screen, which is the F1 point the outgoing site
   lost), and the *only* fixed element is a single 44 px ask bar carrying the hub. On desktop the
   same DOM becomes the fixed right-hand column.
8. **The corpus cannot be both in the initial HTML and in the client bundle** without paying for
   it twice. **Specified instead:** locked blocks, belief variants and the `four seconds` blanks
   are attribute-and-CSS mechanisms driven by the pre-paint bootstrap and one client island, so
   the story ships exactly once, in the document, and **no corpus JavaScript reaches the
   browser** (§C.6, §E). A lint rule enforces it.
9. **The belief choice cannot persist without JavaScript.** Both options are real anchors and
   both work as links with zero JS, but the choice is only remembered with JavaScript. E4 is
   earned in JS mode; the twelve-way order branch is earned in both. Stated, not hidden.
10. **`keep this` had no meaning without a ring.** **Specified instead:** it composites the
    account's ambient canvas with the night's twelve marks drawn into it, signed `loop`, via the
    retained `keepPng`. With no figure mounted it draws the marks alone. No new copy.
11. **One string had to be fixed by the architect:** the skip link, `skip to the account`. G2
    requires one and nothing in the concept or the schema names it. Flagged in §C.13 for the
    writer's sign-off.
12. **The shipped corpus does not use the synthetic namespace.** Every `Block.needs` in
    `src/content/accounts.ts` is a real aside id. The pass openings, the contradiction-effect
    blocks, the third-press rewards and the `you weren't here.` line therefore do not exist as
    authored content. The engine supports all of them (§C.5); `all-twelve` is the only synthetic
    key it always computes, and it gates the belief choice. `four seconds` at zero keys renders as
    seven blank rules, which is a better `you weren't here.` than the sentence would have been.
13. **The `both` contradiction is authored from two ordinary aside keys**, not from a stored
    belief clashing with an incoming one. The cross-visit rule in concept §4.4 is therefore not
    implemented, and an inbound link's belief simply never overwrites the reader's own.
14. **`src/lib/types.ts` had to be rewritten**, not kept: every type in it (`RingNode`,
    `RingGeometry`, `SectionProps`, `SectionModule`, `LoopState`, `BeaconEventName`) describes the
    ring. WP-N rewrites it once, to §D.2, and freezes it again. `src/lib/hero-bootstrap.ts` is
    renamed `src/lib/boot.ts` for the same reason. Both are named explicitly here because
    `CLAUDE.md` freezes `src/lib/**` and this is the architect's authorisation.
