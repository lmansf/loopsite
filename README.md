# the same four seconds

**At 11:04 on a Tuesday, power failed across one valley for four seconds.
Twelve things were awake for it — a dog, a streetlight, a kettle, a moth, a
river, a bus, a radio, a clock, a window, a switch, a road, and the four seconds
themselves. Each tells the four seconds it had. None of them agree and none of
them are lying.**

The site is those twelve accounts, rendered as plain readable prose on one
static route. Certain words inside the prose are pressable: pressing one opens a
short aside in place and grants a **key**. Keys unlock **blocks** — whole
paragraphs that were never there before — inside *other* accounts, interleaved
between the paragraphs the reader has already read, so that a witness they
finished ten seconds ago now says something it did not say. Five
**contradictions** fire the instant the reader holds both halves of a pair that
cannot both be true. The twelfth account, `four seconds`, is composed at runtime
from the keys the reader actually holds, and prints what is missing as blank
rules of the exact width of the sentences they have not earned.

**The sentence is the control surface.** The pressable words are
`<details><summary>` inline in the prose, so the first interaction works in the
first painted frame, before a byte of JavaScript has run, on pointer, on touch,
with a keyboard and with a screen reader. The first one is rendered already
open, so the mechanic is taught in zero words of instruction.

No backend. No accounts. No modals. No cookie bar. No webfont. No raster bytes.
No audio. One route, one clock, and — until the ambient figure mounts — no
`requestAnimationFrame` at all.

The authoritative spec is **`design/11-narrative-build-spec.md`**. Every place it
needed a ruling during the teardown is in **`design/12-wpn-notes.md`**. The text
is frozen in `src/content/accounts.ts` and shaped by `src/content/schema.ts`.

---

## Quick start

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

Node ≥ 22.19, pnpm 10.33.0. `pnpm install` is enough — the Playwright browser is
already on the machine (see **Sandbox environment**).

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm typecheck` | `tsc --noEmit`, strict, `noUncheckedIndexedAccess` |
| `pnpm lint` | ESLint (flat config; `next lint` is not used) |
| `pnpm test:unit` | `node --test` over `tests/unit/` — compile, corpus, knowledge, share, rng |
| `pnpm test:e2e` | Playwright: reading, keys, navigation, share, copy, reduced motion, per-account |
| `pnpm test:a11y` | Playwright, axe-core, the `@a11y` suite |
| `pnpm budget` | Byte budgets: Tier A / B / C, **the document**, **the flight payload** |
| `pnpm audit:perf` | Lighthouse ×3, median gate, writes `reports/perf-report.json` |
| `pnpm analyze` | Bundle treemap (`ANALYZE=true next build`) |
| **`pnpm verify`** | **typecheck → lint → build → budget → unit → e2e → a11y. Required before every merge.** |

`pnpm audit:perf` is deliberately **not** part of `verify`: it costs a Lighthouse
run. Run it before merging a change that touches the landing route.

## Sandbox environment

```bash
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
export CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
export NO_PROXY=localhost,127.0.0.1
export no_proxy=localhost,127.0.0.1
```

- Chromium is **preinstalled**. **Never run `playwright install`.**
- `@playwright/test` is pinned to **1.56.1** because that is the release matching
  Chromium rev **1194**.
- Without the `NO_PROXY`/`no_proxy` pair, `curl`/`fetch` to
  `http://127.0.0.1:3111` returns nothing in this sandbox, which hangs the
  readiness poll in `scripts/audit-perf.mjs`. Chromium itself reaches localhost
  fine — that asymmetry is the confusing part. `playwright.config.ts` sets the
  pair for its own web server.

## Architecture in one screen

```
src/app/         layout (document + inline bootstrap), page (all twelve
                 accounts), not-found, s/[slug] (prerendered alias -> ?s=),
                 api/beacon, globals.css
src/content/     schema.ts (FROZEN contract) · accounts.ts (THE TEXT, frozen)
                 · compile.ts (Block -> HTML string, server only)
src/lib/         THE ENGINE — types, knowledge, graph (generated), storage,
                 boot, share, beacon, url-state, clock, tokens, motion, rng,
                 keep, use-canvas, use-lazy-mount, use-motion-preference
src/components/  read/ (AccountSection, Blocks, AskCard, BeliefChoice)
                 night/ (TheNight, AskBar, Runtime, LiveRegion)
                 shell/ (SkipLink, MotionToggle, Footer) · ui/
src/figures/     the ambient figures, one per account (WP-C)
src/styles/      read.css · night.css · ui.css · motion.css
tests/           fixtures + reading / keys / navigation / share / copy /
                 reduced-motion / a11y / smoke + accounts/<slug> + unit/
scripts/         bundle-budget.mjs, audit-perf.mjs, gen-graph.mjs
```

### The five rules everything else follows from

1. **No corpus JavaScript reaches the browser.** The ~5000 words ship exactly
   once, in the document. Locked blocks, belief variants and the `four seconds`
   blanks are **attribute-and-CSS mechanisms**, driven by a pre-paint inline
   bootstrap and one small client island — never by shipping the story twice.
   `src/lib/knowledge.ts` is the engine and runs on `src/lib/graph.ts`, a
   generated, prose-free projection of the corpus. **Two lint rules enforce
   this** (see *The corpus ban*, below) and `pnpm budget` measures it.

2. **The initial HTML is the whole site.** All twelve accounts, every block,
   every aside. With JavaScript disabled that document is a complete, readable,
   scrollable twelve-section essay whose every link works. With JavaScript
   (`html[data-loop-js]`, set synchronously before first paint) CSS collapses it
   to the one selected account with **zero reflow**, which is how CLS stays at 0.

3. **Nothing materialises while the reader is looking at it.** The key set that
   lays an account out is captured when that account is *entered* and is not
   consulted again until the next entry. What happens live is the night's
   `changed` marker, which is fixed-size and position-reserved.

4. **The URL is the state.** Account in `?s=<slug>`, belief in `?b=`, a shared
   state in `#n=<base64url>`. Only `src/lib/url-state.ts` touches `location` or
   `history`: `pushState` for a deliberate act, `replaceState` for a passive one,
   so Back always leaves in one press.

5. **One clock, and usually not even that.** `src/lib/clock.ts` owns the only
   `requestAnimationFrame` in the application, and `startClock()` is called by
   `<Ambient>` and by nothing else. A reader under reduced motion, or before the
   idle callback fires, runs **no rAF at all**.

### The attribute contract

`src/lib/boot.ts` writes these synchronously in `<head>`, before first paint.
Everything downstream — CSS, the runtime, the tests — reads them and nothing
else. It is frozen: four packages depend on it.

| attribute | values |
|---|---|
| `html[data-loop-js]` | present when JavaScript is on |
| `html[data-motion]` | `auto` \| `reduce` — the resolved value, the stored override beating the OS |
| `html[data-s]` | the selected account slug |
| `html[data-belief]` | `valley` \| `hill` \| `none` |
| `<style id="loop-keys">` | one `display:block!important` rule per held key, for the ENTRY account only |
| `.blk[data-needs]` | this block is behind a key |
| `.blk[data-held]` | …and the reader holds it, as of this entry |
| `.blk[data-new]` | …and it is new to *this* entry, for one entry |
| `.night > a[data-state]` | `unread` \| `read` \| `changed` |

### The corpus ban

```
src/content/accounts.ts  may NOT be imported from any 'use client' module
                         may NOT be imported from src/lib/** at all
```

The first is a custom ESLint rule (`loop/no-corpus-in-client`) in
`eslint.config.mjs`; the second is a `no-restricted-imports` pattern, and it is
the one that closes the transitive hole — a client island importing the engine
must not be able to pull the story in behind it. Server code that needs the
prose imports the corpus directly. `auditCorpus()` takes it as an *argument* for
the same reason.

## Budgets

| Tier | What | Budget |
|---|---|---|
| A | render-blocking (stylesheet + inline bootstrap) | ≤ 14 KB gz, **hard** |
| B | first-party JS on the landing route | ≤ 90 KB gz, **hard** |
| C | total JS on the landing route | ≤ 230 KB gz, soft |
| — | total CSS | ≤ 14 KB gz |
| — | **the prerendered landing document** | **≤ 40 KB gz, hard** |
| — | **the inline RSC flight payload** | **≤ 18 KB gz, hard** |
| — | fonts | **0 bytes** |
| — | raster images | **0 bytes** |
| — | each figure's lazy chunk | ≤ 2 KB gz |

`pnpm budget` prints and enforces all of them. The framework floor it subtracts
for Tier B is recorded in `perf-baseline.json`; re-record it only with a reason
in the PR.

**The flight payload is the one to watch.** The page carries the story twice —
once as HTML and once in the inline payload React reconciles against — so the
prose is injected as one compiled string per account, and the night is built the
same way, rather than as thousands of element descriptors. At the WP-N skeleton
it sits at 15.8 KB of 18. **If you turn static markup into JSX, measure it.**

## The work packages

**The rule: one agent, one directory. A file has exactly one owner.**
There are **no shared files** — the registry is gone, the corpus is the
manifest, and `tests/accounts/` has one owner.

| WP | Owns |
|---|---|
| **WP-N** | the teardown and this skeleton. Merged alone, first. Nothing after it. |
| **WP-A** | `src/components/read/**`, `src/content/compile.ts`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/not-found.tsx`, `src/app/s/[slug]/**`, `src/styles/read.css`, `tests/reading.spec.ts`, `tests/copy.spec.ts`, `tests/unit/compile.test.ts` |
| **WP-B** | `src/lib/knowledge.ts`, `src/lib/graph.ts`, `src/lib/storage.ts`, `scripts/gen-graph.mjs`, `src/components/night/Runtime.tsx`, `src/components/read/BeliefChoice.tsx`, `tests/keys.spec.ts`, `tests/unit/knowledge.test.ts`, `tests/unit/corpus.test.ts` |
| **WP-C** | `src/components/night/{TheNight,AskBar,LiveRegion}.tsx`, `src/components/shell/{SkipLink,MotionToggle,Footer}.tsx`, `src/app/globals.css`, `src/styles/{night.css,motion.css}`, `src/figures/**`, `tests/navigation.spec.ts`, `tests/reduced-motion.spec.ts`, `tests/accounts/*.spec.ts` |
| **WP-D** | `src/lib/{share,beacon,keep}.ts`, `src/components/ui/**`, `src/styles/ui.css`, `scripts/{bundle-budget,audit-perf}.mjs`, `perf-baseline.json`, `tests/{smoke,share,a11y}.spec.ts`, `tests/unit/share.test.ts`, `tests/fixtures.ts`, `public/og/**`, `src/app/icon.svg` |

**Frozen, and not by convention — by the cost of changing them:**
`src/lib/types.ts`, `src/lib/boot.ts`, `src/content/schema.ts`,
`src/content/accounts.ts`, and `package.json`'s `dependencies`. All four
builders code against `types.ts` and against the attributes `boot.ts` writes; a
change to either costs four agents. Open an issue instead.

**Merge order:** WP-N alone, then WP-A / WP-B / WP-C / WP-D in any order. The
paths are disjoint, so the only integration risk is the attribute contract,
which `boot.ts` and `types.ts` fix.

## Copy

**No visible string may appear on the site that is not either (a) in
`src/content/accounts.ts`, or (b) in the fixed table at
`design/11-narrative-build-spec.md` §C.13.** Adding one is an edit to that
section and needs the architect. The whole of (b) is:

> `the lights went out for four seconds.` · `twelve things were awake.` ·
> `gentle mode` · `keep this` · `send the night as you have it` · `see also` ·
> `someone read it this way` · `read` · `it says more now` · `changed` ·
> `n/5` · `loop` · `skip to the account`

`n/5` is the only numeral the UI may print; the corpus may print `11:04`,
`four`, `six` and `ten`. Permanently forbidden anywhere: `read more`,
`learn more`, `click here`, `next`, `click`, `tap`, `scroll`, `discover`,
`experience`, `journey`, `immersive`, `imagine`, any countdown, any count of
people, any `live` / `now` construction, and any sign-up prompt.
`tests/copy.spec.ts` enforces it.

## Deploy

Vercel, default Next.js preset, pnpm, **zero configuration**.

1. Import the repository in Vercel.
2. Framework preset: Next.js (auto-detected). Build command `pnpm build`,
   install command `pnpm install`, output directory default.
3. No environment variables are required. No datastore. No secrets.
4. Deploy.

Security headers live in `next.config.ts`, so they apply identically in dev, in
`next start` and in production. There is no `vercel.json`.

`@vercel/analytics` and `@vercel/speed-insights` mount only when the `VERCEL` /
`VERCEL_ENV` environment variables are present — i.e. on every preview and
production deploy, and on no local run (their script is served by the platform
and 404s off it, which would break the zero-console-errors gate).

`/api/beacon` is the first-party engagement sink: it logs one JSON line and
returns 204. No cookies, no fingerprinting, no PII, and it refuses to send at
all under DNT / GPC.

## Status

The ring build scored **96 / 100** on the bounce-risk rubric across three audit
passes (`design/07`, `08`, `09`). That site has been replaced; the rubric has
not. It is restated in full at `design/11-narrative-build-spec.md` §H.4 and the
threshold is unchanged: **≥ 92 with zero Category H penalties**.

| Audit pass | Score | Result |
|---|---|---|
| 1 (`design/13-bounce-audit-narrative.md`) | 93 / 100 | cleared by one point; six fixes prescribed |
| 2 (`design/14-bounce-audit-narrative-2.md`) | **99 / 100** | zero penalties, all hard gates passed |

The one deduction pass 2 found — the prerendered night marked the landing
account as read on every route, so a scripting-off reader arriving at `/s/road`
was told `the dog — read` — has since been fixed: each night marks its own
account.

Verified on that build:

| Gate | Result |
|---|---|
| `pnpm verify` | green — 96 unit · 362 e2e · 48 a11y, zero failures |
| Lighthouse mobile (3-run median) | performance 99 · accessibility 100 · best practices 100 · SEO 100 · FCP = LCP 906 ms · TBT 65 ms · TTI 2.0 s · CLS 0 |
| bytes (gzip) | render-blocking 9.1 KB · first-party JS 12.1 KB · total JS 150.5 KB · document 31.1 KB · inline RSC 16.6 KB · fonts 0 · images 0 · third-party 0 |

What the auditor would still watch, in its own words: the hook is a dotted
underline on an ordinary word, which is the quietest affordance this project
has shipped; the night's reaction to a press is honest but small at 10 × 2 px;
and a 320 px phone still spends 380 of its 568 px before the story starts.
