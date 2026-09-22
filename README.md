# Loop

**One ring on a near-black field with a sweep hand already turning when you arrive.
You tap the ring; a node appears where you touched; four seconds later the sweep
comes back around and your node fires, exactly as promised.**

That single rule — put something on the ring and it comes back — is the entire
interaction model for a site of twelve rooms, each of which reinterprets your
same taps as rhythm, pitch, a drawn line, a flock, a fern, a system of orbits, a
woven band, a decaying loop, and finally a field of loops that includes yours.
The ring never leaves the screen; the rooms change around it; the clock never
resets.

No backend. No accounts. No modals. No cookie bar. No webfont. No raster bytes.
One route, one clock, one `requestAnimationFrame` loop.

The authoritative spec is **`design/05-build-spec.md`**. Scaffold decisions and
every place the spec needed a ruling are in **`design/06-wp0-notes.md`**.

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
| `pnpm test:unit` | `node --test` over `tests/unit/` — the share codec, geometry, rng |
| `pnpm test:e2e` | Playwright: smoke, rooms, reduced motion, per-room specs |
| `pnpm test:a11y` | Playwright, axe-core, the `@a11y` suite |
| `pnpm budget` | Byte budgets: Tier A / Tier B / Tier C, per-room chunk ceilings |
| `pnpm audit:perf` | Lighthouse ×3, median gate, writes `reports/perf-report.json` |
| `pnpm analyze` | Bundle treemap (`ANALYZE=true next build --webpack`) |
| **`pnpm verify`** | **typecheck → lint → build → budget → unit → e2e → a11y. Required before every merge.** |

```bash
pnpm verify
```

`pnpm audit:perf` is deliberately **not** part of `verify`: it costs a Lighthouse
run and it gates on hero performance, which WP1 owns. Run it before merging a
change that touches the landing route.

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
src/app/        layout (document + inline bootstrap), page (the one route),
                not-found, s/[slug] (prerendered alias -> ?s=), api/beacon
src/lib/        THE SHARED CONTRACT — clock, ring-store, ring-geometry, share,
                keep, tokens, motion, storage, beacon, audio, url-state, rng,
                use-canvas, use-lazy-mount, use-motion-preference, garden-seed,
                hero-bootstrap, types
src/components/ ring/ (RingStage, RoomLayer), hero/, shell/ (AppShell, Ringway,
                Corridor, NextArc, toggles), ui/
src/sections/   registry.ts (17 reserved slots) + one folder per room
tests/          fixtures + smoke / rooms / a11y / reduced-motion + rooms/<slug>
scripts/        bundle-budget.mjs, audit-perf.mjs
```

- **One clock.** `src/lib/clock.ts` owns the only `requestAnimationFrame` in the
  application. One revolution is **4000 ms**, exactly. Rooms register a draw
  callback with `subscribeFrame`; nothing else may start a rAF.
- **RingStage is persistent.** It mounts once, outside the room switch, and is
  never unmounted, keyed or remounted by navigation. Phase and nodes survive
  every transition.
- **The URL is the state.** Room in `?s=<slug>`, loop in `#l=<base64url>`.
  Only `src/lib/url-state.ts` touches `location` or `history`: `pushState` for a
  deliberate act, `replaceState` for a passive one, so Back always leaves in one
  press.
- **Without JS** the page is a plain, readable, scrollable twelve-section
  document whose links all work. With JS (`html[data-loop-js]`, set before first
  paint by the inline bootstrap) the corridor collapses to `100dvh` and the stage
  takes over — no reflow, CLS 0.
- **Reduced motion is a design**, not a strip: the clock quantizes `phase` to
  twelve steps per revolution, so every room's calm variant is a property of the
  clock rather than a per-room reimplementation.

## Budgets

| Tier | What | Budget |
|---|---|---|
| A | render-blocking (stylesheet + inline bootstrap) | ≤ 14 KB gz, **hard** |
| B | first-party JS on the landing route | ≤ 90 KB gz, **hard** |
| C | total JS on the landing route | ≤ 230 KB gz, soft |
| — | fonts | **0 bytes** |
| — | raster images | **0 bytes** |
| — | each room's lazy chunk | ≤ its declared `budgetKb` |

`pnpm budget` prints and enforces all of them. The framework floor it subtracts
for Tier B is recorded in `perf-baseline.json`; re-record it only with a reason
in the PR.

## Adding a room

```bash
cp -r src/sections/_example src/sections/<your-slug>
```

1. `Shell.tsx` — **server** component: `<section id="section-<slug}">`, one
   `<h2>` (the one-word label), the hook line, a real `<a>` to the next room.
2. `Room.tsx` — **client** component: one `useEffect` keyed on
   `[seed, reducedMotion]`, one `subscribeFrame` draw callback, no rAF of your
   own, no `matchMedia`, no `localStorage`, no mutation of `props.nodes`, and a
   still, complete composition under reduced motion.
3. `logic.ts` — the pure, testable half. No DOM.
4. Your slot in `src/sections/registry.ts` **already imports your folder** — you
   usually do not need to touch that file at all.
5. `tests/rooms/<your-slug>.spec.ts` — copy `tests/rooms/_example.spec.ts`.
6. `pnpm verify`.

Read `src/sections/_example/Room.tsx` first. It is heavily commented and it is
the contract.

## File ownership map

**The rule: one agent, one directory. A file has exactly one owner.** There are
exactly two shared things and both are append-only with pre-reserved slots:
`src/sections/registry.ts` and the `tests/rooms/` directory.

| WP | Owns | Registry slots |
|---|---|---|
| **WP0** | everything below, initially. After merge: `src/lib/**` (except `audio.ts`), `src/app/**` (except `layout.tsx`), `src/sections/_example/**`, `src/sections/registry.ts`, `tests/fixtures.ts`, `tests/smoke.spec.ts`, `tests/rooms.spec.ts`, `tests/a11y.spec.ts`, `tests/reduced-motion.spec.ts`, `scripts/**`, `perf-baseline.json` | — |
| **WP1** | `src/components/ring/**`, `src/components/hero/**`, `src/lib/hero-bootstrap.ts`, `src/app/layout.tsx`, `src/sections/origin/**`, `src/sections/return/**`, `tests/rooms/origin.spec.ts`, `tests/rooms/return.spec.ts` | WP1-1, WP1-2 |
| **WP2** | `src/sections/pulse/**`, `src/sections/tone/**`, `src/lib/audio.ts`, `src/components/ui/SoundPetal.tsx`, `tests/rooms/pulse.spec.ts`, `tests/rooms/tone.spec.ts` | WP2-1, WP2-2 |
| **WP3** | `src/sections/trail/**`, `src/components/shell/**`, `src/components/ui/KeepButton.tsx`, `src/components/ui/ShareButton.tsx`, `tests/rooms/trail.spec.ts`, `tests/navigation.spec.ts` | WP3-1 |
| **WP4** | `src/sections/swarm/**`, `src/sections/mirror/**`, `tests/rooms/swarm.spec.ts`, `tests/rooms/mirror.spec.ts` | WP4-1, WP4-2 |
| **WP5** | `src/sections/growth/**`, `src/sections/orbit/**`, `tests/rooms/growth.spec.ts`, `tests/rooms/orbit.spec.ts` | WP5-1, WP5-2 |
| **WP6** | `src/sections/loom/**`, `src/sections/wear/**`, `tests/rooms/loom.spec.ts`, `tests/rooms/wear.spec.ts` | WP6-1, WP6-2 |
| **WP7** | `src/sections/garden/**`, `src/sections/silence|reverse|slow|144|twin/**`, `tests/rooms/garden.spec.ts`, `tests/hidden.spec.ts` | WP7-1, WP7-H1..H5 |

**Frozen after WP0:** every file in `src/lib/**` except `src/lib/audio.ts`, and
`package.json`'s `dependencies`. A room agent who needs a change to a shared
module opens an issue; the architect makes the change. A room agent editing
`src/lib/types.ts` is the failure mode that costs the swarm a day.

**Merge order:** WP0 → WP1 → WP3 → WP2 → WP4 → WP5 → WP6 → WP7.

## Copy

Every word on the site is listed in **§I of `design/05-build-spec.md`**.
**No word may appear on the site that is not in that inventory.** Adding one
requires editing §I first. Permanently forbidden: any count of people, any
"live" / "online now" language, any invented activity, any attribution of a loop
to a person, any countdown, any streak, any sign-up prompt, and any
`read more` / `learn more` / `click here`.

## Deploy

Vercel, default Next.js preset, pnpm, **zero configuration**.

1. Import the repository in Vercel.
2. Framework preset: Next.js (auto-detected). Build command `pnpm build`,
   install command `pnpm install`, output directory default.
3. No environment variables are required. No datastore. No secrets.
4. Deploy.

Security headers live in `next.config.ts`, so they apply identically in dev, in
`next start` and in production, and they are covered by tests. There is no
`vercel.json`; Vercel already serves `/_next/static/*` immutably.

`@vercel/analytics` and `@vercel/speed-insights` mount only when the `VERCEL` /
`VERCEL_ENV` environment variables are present — i.e. on every preview and
production deploy, and on no local run (their script is served by the platform
and 404s off it, which would break the zero-console-errors gate).

`/api/beacon` is the first-party engagement sink: it logs one JSON line and
returns 204. In production those lines land in Vercel's runtime logs. Swapping
the `console.log` for a log drain or a KV write does not touch a line of client
code.
