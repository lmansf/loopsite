# 12 — WP-N notes: what the teardown decided

**Doc:** `design/12-wpn-notes.md` · **Author:** WP-N · **Date:** 2026-09-22
**Status:** the record of every place `design/11-narrative-build-spec.md` needed
a ruling while the skeleton was built. The spec still governs; this says what
was done where the spec was a sketch, silent, or in tension with itself.

The same role `design/06-wp0-notes.md` played for the ring build. Read it after
the spec and before you write a line.

---

## A. The one that matters: the engine does not import the story

**Spec §D.2 says `knowledge.ts` exports `CORPUS: Corpus` and
`ACCOUNTS: ReadonlyMap<AccountId, Account>`. Spec §E item 3 and §I.8 say no
corpus JavaScript reaches the browser. Both cannot be true.**

`knowledge.ts` is imported by `Runtime.tsx`, which is the client island. If it
exports the corpus — or derives `ASIDES` / `EMITTERS` / `CONSUMERS` from it at
module scope, which it must — then all ~5000 words land in Tier B, on top of the
document that already carries them. Tree-shaking cannot help: the maps are
computed from the data at runtime, so the data has to be there.

§E is the load-bearing half, so §D.2's sketch gave way. **What the engine needs
is the key graph, not the prose** — which accounts exist, which blocks they have
in what order, what each block needs, which asides each account emits, and what
each contradiction needs. That is about 3 KB raw and under 1 KB gz, and none of
it is a word of the story.

**Decided:**

- `src/lib/graph.ts` — **generated**, prose-free, checked in. It is
  `src/content/accounts.ts` with every string of prose removed.
- `scripts/gen-graph.mjs` regenerates it. The corpus is frozen, so this ran once.
- It cannot drift: `auditCorpus(CORPUS)` compares the graph against the real
  corpus block for block, and `tests/unit/knowledge.test.ts` fails if they
  disagree. That test is the guard; do not delete it.
- Two lint rules, not one. The spec asks for "`accounts.ts` may not be imported
  from a `'use client'` module", which is a custom rule in `eslint.config.mjs`.
  But that rule alone leaves the transitive hole wide open — a client module
  importing `knowledge.ts` would pull the corpus in behind it and lint would be
  silent. So `src/lib/**` is additionally forbidden the import outright, by
  `no-restricted-imports`. Both were proved to fire before they were committed.

**The §D.2 signatures that changed, and what to use instead:**

| §D.2 | shipped | why |
|---|---|---|
| `CORPUS: Corpus` | *gone from `knowledge.ts`* | import `@/content/accounts` directly — from server code only |
| `ACCOUNTS: ReadonlyMap<AccountId, Account>` | `ReadonlyMap<AccountId, GraphAccount>` | prose-free: `{ id, blocks: [{id, needs?, belief?}], asides: KeyId[], blank? }` |
| `ASIDES: readonly Aside[]` | `readonly KeyId[]` | the bit order is all the codec and the engine need |
| `mergeIncoming(s: SharedState)` | `mergeIncoming(s: IncomingState)` | structurally identical, declared locally so the engine does not import `share.ts` and make a cycle |
| — | `GRAPH`, `CONTRADICTIONS`, `SYNTHETIC`, `isSyntheticKey`, `lockedBlockIds`, `encodeAsideMask`, `decodeAsideMask`, `__resetKnowledgeForTest` | added; the mask codec lives here and `share.ts` re-exports it, so the dependency runs one way |

`EMITTERS`, `CONSUMERS`, `ASIDE_BIT`, `readKnowledge`, `subscribe`, `grantKey`,
`noteOpen`, `markEntered`, `setBelief`, `effectiveKeys`, `accountState`,
`visibleBlockIds` and `auditCorpus` are exactly as §D.2 fixes them.

---

## B. The flight payload was the real budget risk, not the document

§E predicted the document at ≤ 40 KB gz and the inline RSC payload at ≤ 18 KB gz.
The document came in at **29.4 KB** with room to spare. The flight payload came
in at **16.8 KB of 18** on the first build — 93 % of a hard budget, before a
single builder had added anything.

The cost was not the prose. It was **the night**: twelve navs of twelve slots is
144 anchors of four elements each, and as JSX that is ~720 element descriptors
in the payload. Rebuilt as one memoised HTML string per account — the same
treatment §E item 2 prescribes for the prose, for the same reason — it dropped
to **15.8 KB**.

`TheNight.tsx` is therefore a string builder rather than JSX. WP-C still owns
every byte of that markup, and the file says so. `scripts/bundle-budget.mjs` now
measures the document and the flight separately and fails on either.

**The standing instruction, in `CLAUDE.md`: static markup that gets repeated
twelve times is a string, not JSX. If you change that, measure it.**

---

## C. Corpus facts that contradict a spec acceptance line

**§G's WP-B acceptance says "Every key has ≥ 1 emitter and ≥ 1 consumer". The
shipped corpus does not satisfy the second half, and the corpus is frozen.**

Of the 43 asides, **17 keys do work** — they unlock a block or earn a
contradiction. The other **26 unlock nothing**: the aside body is the whole
reward. That is a writing decision, not a defect; a key that opens a door is
rarer than a key that is just a good sentence, and that is what makes the
seventeen feel like something.

`tests/unit/knowledge.test.ts` therefore asserts the direction that can actually
be violated by a mistake — **nothing may `needs` a key that nothing grants** —
plus a count of 17, so a future corpus change that rewires the graph is noticed.
WP-B should not "fix" this by editing the corpus.

---

## D. Smaller rulings

1. **`src/lib/types.ts` keeps `ClockFrame`, `QualityTier` and a new
   `CanvasGeometry`.** §D.2 lists only the five narrative types, but `clock.ts`
   is retained verbatim and imports the first two, and `use-canvas.ts` needs the
   third now that `ring-geometry.ts` is deleted. `RingGeometry` became
   `CanvasGeometry { w, h, dpr }` — exactly what
   `Figure.draw(ctx, phase, w, h, dpr)` takes.

2. **`src/components/shell/{LoopContext,LiveRegion}.tsx` were deleted**, though
   §D.1's "Deleted" list does not name them. `LoopContext` carried the ring
   stage's context and has no counterpart in the new tree; `LiveRegion` moved to
   `src/components/night/` where §D.1 puts it.

3. **`LiveRegion` is a server component**, not a client one as §D.1 marks it. It
   has no state: the runtime writes its `textContent` directly, because an
   announcement that waits for a re-render is an announcement that misses the
   frame the press happened in. `'use client'` would buy a client chunk for an
   empty `<p>`. WP-C may promote it if it ever needs state.

4. **Twelve ask bars, not one.** §C.7 wants one fixed control whose text is the
   active account's `ask` and whose destination is its `next`. Server-rendering
   one bar means it carries the landing account's text until hydration, which is
   a visible wrong-word flash for anyone arriving at `/?s=road`. Twelve bars are
   rendered and CSS shows the one matching `html[data-s]`, so the bar is right in
   the first painted frame for every URL, with no JavaScript and no rewrite.
   Their boxes are identical by construction, which is what §H.2 asks for.

5. **The hub prints nothing at zero, not `0/5`.** §C.8 says `n/5` is the only
   numeral the UI may print, and `0` is not one of them. The box is reserved with
   `min-width: 3ch` so the tick to `1/5` shifts nothing.

6. **The night's `gap` subline is `display: none` at rest, not
   `visibility: hidden`.** A hidden-but-laid-out tooltip still contributes to
   `documentElement.scrollWidth`; at 320 px it cost **102 px of horizontal
   overflow**, which is the exact rubric F1 deduction the outgoing site lost a
   point to. It is absolutely positioned, so showing it still moves nothing.

7. **The desktop ask card sizes to its text.** At a fixed 208 px the longer
   `ask` strings wrapped to two lines, so the bar's height — and therefore its
   `y`, since it is bottom-anchored — differed between accounts by 1.7 px. It is
   now a fixed 64 px tall with `width: auto; min-width: 208px` and a nowrapped
   label, anchored right, so it grows leftward and never overflows. On phones it
   still wraps, because nowrap at a 180 px layout viewport would overflow.

8. **The premise does not fade in under reduced motion, and the account swap
   does not fade in on load.** `:root { animation: loop-clock … infinite }` —
   the ring's perpetual `--loop-t` driver — is gone; a permanently running
   animation on `:root` would fail §H.2's "`getAnimations()` is empty after 1 s"
   in every project. The `.account` cross-fade of §C.16 is scoped to
   `[data-swap]`, which WP-C sets for one frame on entry: applied on load it
   would paint the first viewport from opacity 0, which is the one thing this
   build is built around not doing.

9. **`src/lib/share.ts` is signatures only.** §G forbids WP-N to implement the
   codec and §G gives it to WP-D. `encodeState` returns `''` and `decodeState`
   returns `null` — both safe, because an empty code is never copied and a null
   decode is exactly what a malformed payload must produce. The byte layout is
   written out in full in the file header so WP-D implements a specification
   rather than a guess. `encodeAsideMask` / `decodeAsideMask` *are* implemented,
   in `knowledge.ts` and re-exported, because `loop:v2.entry` needs them from the
   first entry onwards.

10. **`ShareButton` copies a plain account link until the codec lands**, rather
    than doing nothing or copying a half-formed code. It is a real, working link
    to the right account that simply carries no state yet.

11. **Relative imports inside `src/lib/**` and `src/content/**` carry explicit
    `.ts` extensions.** `pnpm test:unit` is `node --test` over the TypeScript
    sources; a test that imports `…/share.ts` makes that module ESM, and ESM
    does not resolve extensionless relative specifiers. The old code got away
    with it only because every such import was `import type`, which is erased.

12. **`compile.ts` imports `EMITTERS` from the engine** to build the `see also`
    link beside each blank rule in `four seconds`. It is server-only, so this
    costs nothing in the browser. Each link carries the emitting account's title
    in a visually hidden span, so a screen reader never hears a bare `see also`.

13. **`tests/unit/knowledge.test.ts` is not a stub.** §G.6 asks WP-N to stub the
    nine *spec* files; the unit tests are a different list. This one carries the
    graph-integrity guard from §A above, which has to exist the moment the graph
    does. WP-B owns and extends it.

---

## E. What WP-N deliberately did not do

The spec's WP-N "Must not" list, and where the work went instead:

| not done | whose | what is there now |
|---|---|---|
| the ambient figures, `src/figures/**` | WP-C | nothing. `useCanvas` is retuned and waiting; `clock.ts` is untouched and unstarted |
| the share codec | WP-D | the signatures, the byte layout in full, and the mask codec it shares with the entry masks |
| the contradiction effects | WP-B | the engine counts contradictions and ticks the hub; `contra:<id>` and `contra:all` are computed; no authored effect exists in the corpus to trigger |
| the belief choice | WP-B | the two anchors are server-rendered inside a `.blk[data-needs="all-twelve"]` wrapper, the attribute mirror works, and the CSS swap is in `globals.css`; the storage and reversal polish is WP-B's |
| any prose | the writer | none was written. Every visible string is from the corpus or from §C.13 |
