# the same four seconds — working rules

Read `design/11-narrative-build-spec.md` first. It is the single source of truth
and it supersedes every other document, including `design/05-build-spec.md`,
which described the ring and is now history. `design/12-wpn-notes.md` records the
places the spec needed a ruling during the teardown and what the skeleton
decided. `design/10-narrative-concept.md` is intent; `design/09-bounce-audit-3.md`
lists the properties the outgoing site earned full marks on — do not lose them.

## Ownership

**One agent, one directory. A file has exactly one owner.** The ownership map is
in `README.md` ("The work packages"). Do not edit a file you do not own — not to
fix a typo, not to unblock yourself. Open an issue instead.

**There are no shared files.** The ring's append-only registry is gone; the
corpus is the manifest, and `tests/accounts/` has one owner. The
one-agent-one-directory rule still holds.

- **Never edit `src/content/accounts.ts` or `src/content/schema.ts`.** The text
  is finished and frozen, and the contract was frozen before the text. Twelve
  accounts, 84 blocks, 43 asides (exactly one with `open: true`), 14 locked
  blocks interleaved across the eleven readable accounts, 8 belief blocks in 4
  accounts, 5 contradictions. `tests/unit/corpus.test.ts` proves it.
  **No builder writes prose.**
- **Never edit `src/lib/types.ts` or `src/lib/boot.ts`.** All four packages code
  against the types, and against the attributes the bootstrap writes before
  first paint. Changing either costs four agents. They were rewritten once, by
  WP-N, under the explicit authorisation in spec §I.14, and re-frozen.
- **`src/lib/graph.ts` is generated.** If it ever disagrees with the corpus,
  `tests/unit/knowledge.test.ts` fails; regenerate with
  `node --experimental-strip-types scripts/gen-graph.mjs > src/lib/graph.ts`.
  Do not hand-edit it.
- **`package.json` `dependencies` is frozen.** A new dependency needs the
  architect's approval and a Tier B budget line.

## Non-negotiables

- **No corpus JavaScript may reach the browser.** The prose is server-rendered
  HTML only. Locked blocks, belief variants and the `four seconds` blanks are
  attribute-and-CSS mechanisms driven by the pre-paint bootstrap and one client
  island. `src/content/accounts.ts` may not be imported from any `'use client'`
  module, and may not be imported from `src/lib/**` at all; both are lint
  errors. The engine reads `src/lib/graph.ts`, which has no prose in it.
- **One `requestAnimationFrame` in the whole application**, owned by
  `src/lib/clock.ts`, and `startClock()` is called by `<Ambient>` and by nothing
  else. Under reduced motion no rAF is ever scheduled;
  `tests/reduced-motion.spec.ts` counts.
- **Nothing materialises while the reader is looking at it.** The key set that
  lays an account out is captured at *entry* and not consulted again until the
  next entry. Layout shift across a whole session must sum to exactly **0**.
- Nothing calls `matchMedia('(prefers-reduced-motion…')` outside
  `use-motion-preference.ts`, and nothing touches `localStorage` outside
  `storage.ts`. Both are lint errors.
- Nothing reads `window` / `document` outside an effect, and no component
  re-renders the prose: the runtime mutates attributes, never markup.
- Under reduced motion every account renders a **still, complete composition** —
  never a blank box. `tests/reduced-motion.spec.ts` fails on a uniform image.
- **No visible string may appear on the site that is not in
  `src/content/accounts.ts` or in the fixed table at spec §C.13.** No fake
  counts, no invented people, no "live" language, no countdowns, no sign-up
  prompts, no `read more` / `learn more` / `click here` / `next`. `n/5` is the
  only numeral the UI may print.
- Every interactive target is ≥ 44 × 44 with ≥ 8 px of clear space, at 320, 360,
  393, 412, **180** (200 % zoom), 1024 and 1440. No horizontal overflow at any
  of them — and watch `visibility: hidden`, which still lays out and still
  counts toward `scrollWidth`.

## Watch the flight payload

The document carries the story twice: once as HTML, once in the inline RSC
payload. The budget is **18 KB gz, hard**, and the skeleton already uses 15.8 of
it. That is why the prose and the night are injected as compiled strings rather
than JSX. **If you turn static markup into JSX, run `pnpm budget` before you
push.**

## Before every push

```bash
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
export CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
export NO_PROXY=localhost,127.0.0.1
export no_proxy=localhost,127.0.0.1

pnpm verify
```

`pnpm verify` = `typecheck → lint → build → budget → unit → e2e → a11y`.
It must be green, and your PR must state its Tier A / Tier B / document /
flight delta from `pnpm budget`.

Never run `pnpm exec playwright install` — Chromium rev 1194 is preinstalled at
`/opt/pw-browsers`, which is why `@playwright/test` is pinned to 1.56.1.
