# 06 — WP0 scaffold notes

**Doc:** `design/06-wp0-notes.md` · **Status:** read this before WP1–WP7 start ·
**Date:** 2026-09-22

`design/05-build-spec.md` remains the single source of truth. This file records
(a) every place the spec was internally inconsistent and how the scaffold
resolved it, (b) every place the sandbox or the pinned toolchain forced a
deviation from doc 03 §10, and (c) the handful of scaffold-level design
decisions that builders will code against.

**The governing rule used everywhere below: keep the §F signatures intact.**
Nothing in this file changes a `src/lib/**` API. Where a resolution was needed,
the reading that preserved §F won.

---

## A. Spec inconsistencies resolved

### 1. The radius-level mapping (§C.3 vs §D preamble) — **resolved in favour of "8 = the ring"**

§D writes `ρ(r) = R · (0.58 + 0.042·r)` and, in the same sentence, "level 8 =
exactly R". Those cannot both hold: `0.58 + 0.042·8 = 0.916`.

The invariant is the load-bearing half. §C.3 defines the node type as
"radius level 0..15 (**8 = exactly on the ring**)"; §C.12 makes 8 the default
keyboard radius; the sweep head is drawn at level 8 and must sit *on* the ring;
a tap on the hit band must resolve to 8 or placement feels wrong. So the scaffold
keeps the 0.042 step exactly and shifts the base:

```ts
ρ(r) = R · (1 + 0.042 · (r − 8))          // = R · (0.664 + 0.042·r)
```

Level 0 = `0.664·R`, level 8 = `R`, level 15 = `1.294·R` — still clear of the
`1.45·R` flick-to-remove threshold. Exported from `@/lib/ring-geometry` as
`radiusOfLevel(level, R)`, with `LEVEL_STEP` and `LEVEL_ON_RING` as named
constants. **Rooms must call `radiusOfLevel` rather than re-deriving it.**

### 2. Corridor keys vs focus management (§C.12 vs §C.11) — **the focus scope is the stage plus the active room's heading**

§C.12: corridor keys are handled "only while focus is inside the stage".
§C.11: a deliberate navigation "moves focus to the new room's `<h2>`".

Taken literally together, arrow-key walking stops dead after one press: the first
`→` moves focus out of the stage, so the second `→` is ignored. Resolution: the
key scope is `#stage` **plus** a heading inside
`.room-shell[data-active="true"]`. Nothing else on the page is in scope, so the
rule that matters — never steal a browser or screen-reader key elsewhere — is
intact. WP3 owns corridor navigation and may refine this; the behaviour is
asserted by `tests/rooms.spec.ts`.

### 3. Share code length for 24 nodes (§C.7) — **67 chars, not 68**

§C.7 says "24 nodes (max) = 50 bytes = 68 base64url characters" and also says the
padding is stripped. 50 bytes is 68 base64 characters **with** padding and 67
without. The codec strips padding, so the true unpadded length is 67. The 8-node
(24) and 4-node (14) figures in the spec are already correct for unpadded output.
Asserted in `tests/unit/share.test.ts`. The wire format is unchanged.

### 4. The comet trail's "do not clear the ring layer" (§C.2) — **decay runs on a dedicated trail layer**

Read literally, painting `rgba(canvas, 1 − exp(−dt/380))` over the ring layer
each frame would also smear the ring stroke, the nodes and the captions, because
they share that layer. The scaffold decays an **offscreen trail canvas** with
exactly the specified recipe and tau, composites it under a crisp ring, and draws
the head with `globalCompositeOperation = 'lighter'` capped at 0.85 alpha. The
recipe, the 380 ms tau and the compositing mode are all as specified. WP1 owns
this and may change the implementation as long as the trail stays frame-rate
independent.

### 5. Hidden destinations have titles that are not in §I — **they are identifiers, never rendered**

`SectionModule.title` is required, and §I.2's room-label inventory lists only the
twelve. The five hidden entries carry their slug as `title` (`silence`,
`reverse`, `slow`, `144`, `twin`). They are never listed in the Ringway, never
rendered, and never appear in the DOM — the only acknowledgement they exist is
the `n/5` hub counter (§C.5, §J.10). No copy was invented.

### 6. `SectionModule.blurb` — **reuses §I copy rather than inventing any**

`blurb` feeds `generateMetadata` on `/s/[slug]`. §I closes the inventory, so each
room's blurb is its own hook line from §I.3 verbatim, and `return` (which has no
hook) uses the site description from §I.5, `one ring, twelve rooms, no ending.`
No new copy was written.

### 7. The inline bootstrap is a **classic** script, not `type="module"`

Doc 03 §2.4 says `<script type="module">`. A module script is deferred, so it
runs *after* first paint — which defeats the entire purpose of setting
`html[data-loop-js]` and `html[data-motion]` before the first frame (CLS 0, and
the twelve-step sweep from frame one). It is inlined as a classic script in
`<head>`, tagged `id="loop-boot"` so `scripts/bundle-budget.mjs` can weigh it
separately from Next's own non-blocking inline flight data. Measured: **1572 B
raw, 0.7 KB gz**, against the 2 KB ceiling.

---

## B. Additive API (nothing in §F changed)

These are **additions**. Every signature in §F.4 works verbatim as written.

| Module | Addition | Why |
|---|---|---|
| `clock.ts` | `subscribeFrame(fn, priority = 0)` — lower runs first | The shell's frame driver must fill `fired[]` before any room reads it. Child effects run before parent effects in React, so mount order cannot be relied on. **Rooms always use the default.** |
| `clock.ts` | `mod1`, `setReducedMotion`, `__resetClockForTest` | `mod1` is the §C.3 firing test's helper; `setReducedMotion` lets a test force the reading the clock normally takes from `html[data-motion]`. |
| `ring-store.ts` | `computeFires(p0, p1, dir, out, periodMs)`, `quantizeAngle`, `ANGLE_STEPS` | Exactly one place in the codebase decides what "the sweep crossed it" means (§C.3). `out` is reused so the frame loop allocates nothing. |
| `ring-geometry.ts` | `radiusOfLevel`, `isOnBand`, `LEVEL_STEP`, `LEVEL_ON_RING` | See note A.1. `isOnBand` is the §C.3 placement test. |
| `use-canvas.ts` | `sizeCanvas`, `dprFor` | RingStage drives three canvases from one ResizeObserver; the DPR policy lives in one function. |
| `storage.ts` | `flushState`, `DEFAULT_STATE`, `__resetStorageForTest` | `flushState` forces the debounced write out on `pagehide`. |
| `url-state.ts` | `readUrlState`, `normalizeAnchorUrl`, `DEFAULT_SECTION` | `#section-<slug>` → `?s=<slug>` on arrival (§C.10), outside React. |
| `use-motion-preference.ts` | `getMotionPreference`, `useMotionToggle` | Canvas code needs the resolved value without a hook. |
| `audio.ts` | `subscribeAudio` | The sound control needs the on/off state. **WP2 owns this file and may reshape anything in it except the §F.4 signatures.** |

---

## C. How a room gets current data (read this before writing a room)

React must never re-render at 60 fps. The contract:

- `SectionProps` is an ordinary props object. React re-renders a room **only**
  when something structural changes: `nodes`, `geometry`, `ctx`, `bg`, `tier`,
  `reducedMotion`, `seed`.
- `props.clock` and `props.fired` are **stable object identities** that the ring's
  frame driver mutates in place. They are always current without a re-render.
- Therefore a room keeps `const propsRef = useRef(props)` synced by an effect
  with **no dependency array**, and reads `propsRef.current` inside its draw
  callback. Closing over the props the effect was created with gives you stale
  `nodes` after the first tap.

`src/sections/_example/Room.tsx` demonstrates all of this and is heavily
commented. Copy that folder.

The ordering guarantee: the ring's frame driver subscribes at priority `-1000`,
so `fired[]` is filled before any room's callback runs on the same frame.

---

## D. Toolchain deviations from doc 03 §10

1. **`tsconfig.json` gains `"allowImportingTsExtensions": true`.** The unit tests
   import `../../src/lib/share.ts` so Node 22's built-in type stripping can run
   them with no extra dependency. Legal because `noEmit` is set.
2. **`playwright.config.ts`: `reducedMotion` moved under `contextOptions`.**
   Playwright 1.56 does not accept it as a top-level `use` option; doc 03 §10.10
   wrote it at the top level and it no longer typechecks.
3. **`playwright.config.ts`: `testMatch: /.*\.spec\.ts$/` and
   `testIgnore: ['**/unit/**']`** so Playwright does not try to collect the
   `node:test` unit files, and **`workers: 4`** locally (doc 03 left it
   `undefined`).
4. **`eslint.config.mjs` pins `settings.react.version = '19.3.0'`.**
   `eslint-plugin-react@7.37.5` calls `context.getFilename()`, removed in ESLint
   10, when auto-detecting the React version; pinning skips that code path. This
   is the only reason `pnpm lint` runs at all on eslint 10.11.0.
5. **`eslint.config.mjs` disables `@next/next/no-html-link-for-pages`.** Loop is
   ONE route. Every in-site link is a real `<a href>` so it works with zero JS,
   middle-click and screen readers, and all history is written by
   `src/lib/url-state.ts`. `next/link` would run the app router instead, which is
   precisely what this architecture must not do.
6. **`eslint.config.mjs` disables `react-hooks/static-components` for
   `RoomLayer.tsx`.** A lazily-loaded room is resolved from a module-level cache
   keyed by slug; its identity is stable for the lifetime of the page.
7. **React 19 lint: refs may not be assigned during render.** Every
   `ref.current = value` sync is an effect with no dependency array. This is why
   `LoopRuntime` is held in `useState` (created once, mutated in place) rather
   than in a ref — it has to be readable during render to be passed through
   context.
8. **`package.json` scripts** follow the orchestrator's list (`dev`, `build`,
   `start`, `typecheck`, `lint`, `test:unit`, `test:e2e`, `test:a11y`, `budget`,
   `audit:perf`, `verify`) rather than doc 03 §10.2's shorter list.
   `verify = typecheck → lint → build → budget → unit → e2e → a11y`.
   **`audit:perf` is deliberately not in `verify`**: it costs a Lighthouse run
   and it gates on hero performance, which WP1 owns. `audit:bundle` is kept as an
   alias of `budget` for doc 03 compatibility.
9. **`@vercel/analytics` and `@vercel/speed-insights` render only when `VERCEL`
   or `VERCEL_ENV` is set.** Their script is served by the platform and 404s off
   it, which produces two console errors on every local run — and "zero console
   errors" is a gate we keep honestly rather than by filtering it in the fixture.
   They are present on every preview and production deploy.
10. **`src/app/api/beacon/route.ts` keeps `runtime = 'edge'`** as doc 03 §4.4
    specifies. Next 16.3.5 prints a deprecation warning for it at build time.
    Harmless today; if it ever becomes an error, switch to `'nodejs'` — the
    handler is runtime-agnostic.
11. **`perf-baseline.json` records a 174.3 KB gz framework floor**, measured from
    this repo's own `/_not-found` route (no first-party client code, but it does
    carry the root layout). Doc 03 §12's 130.1 KB was measured on a different
    configuration and does not match Turbopack's output here. `pnpm budget`
    measures the floor live every run, gates on the recorded number, and warns if
    the two drift by more than 5 KB.

---

## E. Scaffold-level decisions builders inherit

1. **Reserved slots ship as working placeholders.** §G says WP0 must not
   implement any room beyond `_example`. The scaffold instead registers all
   seventeen slots with a placeholder that renders a minimal but non-blank
   composition (`src/components/ring/PlaceholderRoom.tsx`), so the site is
   navigable end to end and every QA suite — reduced-motion stills, the Ringway,
   the corridor, `/s/<slug>` metadata — is meaningful today rather than after
   WP7. **Builders delete the `PlaceholderRoom` import from their `Room.tsx` and
   draw their own room.** Nothing else depends on it.
2. **`_example` is reachable at `/?s=_example` but is not a corridor room.** It
   has `notch: null`, never appears in the Ringway, and has no shell in the
   twelve-section document. `bySlug` falls back to it so `tests/rooms/_example.spec.ts`
   can drive it.
3. **`html[data-motion]` carries the RESOLVED value**, always `auto` or `reduce`,
   written synchronously by the inline bootstrap and thereafter by
   `useMotionPreference()`. The CSS layer, the clock (via a `MutationObserver`)
   and the toggle all read that one attribute, so they cannot disagree. §E's
   `:root[data-motion="reduce"]` block is written out verbatim in `globals.css`,
   as §E requires.
4. **`data-stage-state="engaged"` is set on `<html>`**, not on `#stage`. §E's
   selector is `[data-stage-state="engaged"] #loop-title`, which needs an
   *ancestor* of the title; the stage is the title's sibling.
5. **`#stage` carries `data-node-count`**, which is how the QA suite measures
   "feedback within 100 ms" without pixel-diffing an animating canvas. Keep it.
6. **The 150 GARDEN seed codes are generated and frozen** in
   `src/lib/garden-seed.ts` (3025 characters of share codes). They decode with
   `decodeLoop`. They are authored artefacts; WP7 must not attribute them to
   anyone or count them as people.
7. **`src/lib/gl.ts` is not created** (§F.2) and `motion/react` and `three.js`
   remain banned. `motion/mini` is imported only by `src/lib/motion.ts`.
8. **The ghost-node self-demo is implemented in `RingStage`** at 6000 ms and
   14 000 ms, cancelled permanently by any real input, with no third. WP1 owns
   the polish.
9. **WEAR's `vigor`, the hidden-destination triggers, the Next Arc escalation,
   the sound petal, the 144 clock face and the RETURN door are NOT implemented.**
   They belong to their work packages. The hooks they need — `collected[]`
   bookkeeping, `markFound`, `setDirection`, `setPeriod`, `clearNodes` /
   `restoreNodes`, the `n/5` hub counter render — are all in place.
10. **`Esc` lifts the ring into a held state and the next tap or `Space` restores
    it exactly** (§J.9), implemented in `AppShell`. It does **not** yet mark
    `silence` as collected — that trigger (0 nodes for one continuous revolution)
    is WP7's.

---

## F. Measured at scaffold time

| | |
|---|---|
| Tier A (render-blocking) | **7.5 KB gz** (CSS 6.8 + inline bootstrap 0.7) / 14 KB |
| Tier B (first-party landing JS) | **14.5 KB gz** / 90 KB — WP0 acceptance was ≤ 20 KB |
| Tier C (total landing JS) | **188.8 KB gz** / 230 KB soft |
| Framework floor | 174.3 KB gz (Next 16.3.5 + React 19.3.0, Turbopack, incl. root layout) |
| Fonts | **0 bytes** |
| Raster images | **0 bytes** |
| Largest lazy chunk | 3.6 KB gz (the placeholder rooms) |
| `pnpm verify` | green — 19 unit, 107 e2e, 16 a11y |
