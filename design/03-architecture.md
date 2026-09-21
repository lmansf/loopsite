# Loop — Technical Architecture

**Doc:** `design/03-architecture.md`
**Status:** Authoritative. The scaffold step and every build agent follow this document.
**Date:** 2026-09-21
**Target:** ~90% non-bounce ("engaged session") rate, deployed on Vercel.

All version numbers below were resolved against the live npm registry on 2026-09-21 and all
bundle sizes were **measured**, not estimated, by building throwaway Next.js apps in this
sandbox and gzipping the scripts the prerendered HTML actually executes. Where a number is
measured it is marked **(measured)**.

---

## 0. Executive summary of decisions

| Area | Decision | Pin |
|---|---|---|
| Framework | Next.js App Router, default (server) output | `16.3.5` |
| Runtime | React | `19.3.0` / `react-dom` `19.3.0` |
| Language | TypeScript 5.x line (**not** the 7.x native port yet) | `5.9.3` |
| Styling | Tailwind CSS v4 (`@theme` tokens) + a small hand-written critical layer | `4.3.3` |
| Animation | CSS + Web Animations API first; `motion/mini` as the shared primitive | `motion@13.4.0` |
| Graphics | Canvas 2D by default, raw WebGL2 for shader sections. **No three.js.** | — |
| Fonts | One self-hosted variable woff2 via `next/font/local`, metric-matched fallback | — |
| Audio | Web Audio API only, synthesized, opt-in behind a gesture | — |
| State | URL (search params via native History API) + `localStorage`. No state library. | — |
| Analytics | `@vercel/analytics` + `@vercel/speed-insights` + first-party beacon | `2.0.1` / `2.0.0` |
| Test | Playwright `1.56.1` (**must** match the preinstalled Chromium), Lighthouse `13.5.0`, axe-core `4.13.0` | — |

---

## 1. Stack decision and justification

### 1.1 Next.js 16.3.5, App Router

`next@latest` is **16.3.5** today; `react@latest` and `react-dom@latest` are **19.3.0**. Next
16.3.5's peer range is `react: ^18.2.0 || ^19.0.0`, so 19.3.0 is in range. A full
`next build` with exactly this combination succeeds in this sandbox (verified), on both the
default Turbopack builder and the `--webpack` builder.

Why App Router and not Pages Router: the section shells must be real server-rendered HTML so
that the page is readable and explorable before any JavaScript runs, and so that per-section
deep links get real `generateMetadata` output. App Router gives us server components for the
static shell of every section, which is precisely the split the performance plan depends on
(§2.4). We pay for that; see the measured numbers below.

Why not a static export (`output: 'export'`): we want one Route Handler for the engagement
beacon (§4.4). Everything else in the app prerenders to static HTML at build time anyway, so
Vercel serves it from the edge cache identically. Static export would buy us nothing and cost
us the beacon.

Why Next 16 and not 15.5.25: Turbopack is the default production builder (measurably faster
CI), `next typegen` gives us typed route/layout props (`LayoutProps<"/">`, `PageProps<...>`)
which matter when seven agents write routes in parallel, and it is the line Vercel actively
optimises. The cost is real and documented in §2.1 — if we blow the total-transfer budget,
downgrading to `next@15.5.25` is a one-line change that buys back ~30 KB gz.

**Note for the scaffold:** `next lint` no longer exists in Next 16. The lint script is plain
`eslint`, and `eslint-config-next@16.3.5` ships flat-config entrypoints
(`eslint-config-next/core-web-vitals`, `eslint-config-next/typescript`).

### 1.2 TypeScript 5.9.3, not 7.0.2

`typescript@latest` is **7.0.2** (the native-port compiler). We pin **5.9.3**. Reasons: the
Next.js TS plugin, `typescript-eslint` inside `eslint-config-next@16.3.5`, and `@types/three`
are all validated against the 5.x line; `eslint-config-next`'s declared peer is
`typescript: >=3.3.1`, which tells us nothing about 7.x readiness. A compiler swap is not a
risk a seven-agent parallel build should absorb. Revisit after launch.

### 1.3 Styling: Tailwind CSS v4 (`4.3.3`) with `@tailwindcss/postcss@4.3.3`

Picked over plain CSS Modules, on performance grounds:

- **One stylesheet, one render-blocking request.** Tailwind v4's Lightning CSS engine emits
  only the utilities actually used. A baseline Next 16 + Tailwind 4.3.3 build produces a
  single CSS file of **4.0 KB raw / 1.5 KB gzipped (measured)**. With 8–14 sections we budget
  **≤ 14 KB gzipped total CSS**. FCP < 0.6 s requires exactly one small blocking stylesheet.
- **CSS Modules would fragment that.** In App Router, a `*.module.css` imported by a
  `next/dynamic` section becomes an *additional* `<link>` injected when that chunk mounts.
  For lazily mounted sections that means a flash of unstyled section and a real CLS risk at
  the moment of mount — the opposite of what we need.
- **`@theme` is our design-token single source of truth.** Tokens declared in `@theme` compile
  to plain CSS custom properties on `:root`. Canvas and WebGL code reads them at runtime with
  `getComputedStyle(document.documentElement).getPropertyValue('--color-loop-accent')`, so the
  procedural visuals and the DOM never drift. With 5–7 agents this is the difference between a
  coherent site and a patchwork.
- **Zero runtime.** No CSS-in-JS, no style recalculation cost on the main thread during scroll.

Escape hatch, and it is expected to be used: anything Tailwind expresses badly — `@keyframes`,
`@property` registrations, complex `:has()` selectors, per-section CSS variables driven by
JavaScript — goes in a co-located `*.module.css` **inside the section's own folder**, or in
`src/styles/motion.css` for shared keyframes. Tailwind for layout/spacing/typography; raw CSS
for the art.

### 1.4 Animation: CSS + WAAPI first, `motion/mini` second, `motion/react` almost never

Measured cost on a Next 16.3.5 App Router landing route (modern browsers, `noModule`
polyfill chunk excluded, gzip -9):

| Landing page contents | First-load JS (gz) | Delta |
|---|---|---|
| client component, no animation lib | **130.1 KB** | baseline |
| + `import { animate } from "motion/mini"` | **133.6 KB** | **+3.5 KB** |
| + `import { motion } from "motion/react"` | **168.6 KB** | **+38.5 KB** |

`motion@13.4.0` (the canonical package; `framer-motion@13.4.0` is the same codebase and
`motion` simply depends on it) is a **tiered** dependency for us:

1. **Default: CSS.** `@keyframes`, `transition`, `animation-timeline: view()` and
   `scroll()` for scroll-linked effects, `@property` for interpolatable custom properties.
   These run off the main thread and cost **0 KB**.
2. **`motion/mini`** — the WAAPI-backed `animate()` — is the one animation import allowed in
   `src/lib/`. **+3.5 KB gz (measured)** for imperative, interruptible, composited animations
   with a real `finished` promise. Every agent uses `animateEl()` from `src/lib/motion.ts`,
   which wraps it and short-circuits under reduced motion.
3. **`motion/react`** (`<motion.div>`, layout animations, `AnimatePresence`) is **banned from
   the landing route** and allowed inside a lazily mounted section chunk only when a section
   genuinely needs layout projection or exit animations, and only with the architect's sign-off.
   At +38.5 KB gz it is 43% of our entire authored-JS budget.

GSAP (`3.15.0`) is rejected: its core does not tree-shake meaningfully, it duplicates what
WAAPI already does natively for our use cases, and it adds a second animation scheduler
competing with the compositor.

**Reduced motion is architectural, not a per-component afterthought** — see §6.

### 1.5 Graphics: Canvas 2D and raw WebGL2. three.js rejected.

Measured cost on the same landing route:

| Approach | First-load JS (gz) | Delta over 130.1 KB baseline |
|---|---|---|
| Canvas 2D / raw WebGL2 (our own code) | ~132–136 KB | **+2–6 KB** (our code only) |
| `regl@2.1.1` | 166.8 KB | **+36.7 KB** |
| `three@0.186.0`, minimal subset¹ | 256.7 KB | **+126.6 KB** |

¹ `WebGLRenderer + Scene + PerspectiveCamera + Mesh + BoxGeometry + MeshBasicMaterial` only,
tree-shaken by Turbopack. Also note `three@0.186.0` ships **no bundled types** — it requires a
separate `@types/three@0.186.0` devDependency, which the build fails without (TS7016).

three.js is a scene-graph, material and loader system. Loop does not have a scene graph; it has
full-screen fragment shaders and 2D particle fields. Paying 126 KB gz for machinery we throw
away is indefensible against a 90% engagement target. **Decision: no three.js anywhere in the
repo.**

- **Canvas 2D** is the default for every generative section. Cost: zero bytes of dependency.
- **Raw WebGL2** for the two or three sections that need per-pixel shading. We ship a ~2 KB
  helper in `src/lib/gl.ts`: context creation with `{ antialias:false, alpha:false,
  powerPreference:'low-power', preserveDrawingBuffer:false }`, program compile/link with error
  reporting, a full-screen-triangle VAO, and a uniform-setter. Fragment shaders are plain
  template-literal strings owned by each section.
- **`regl@2.1.1`** is pre-approved for **at most one** flagship section, behind a
  `next/dynamic` boundary, never on first load. If nobody claims it, it does not enter
  `package.json`.

Every canvas mounts through the shared `useCanvas` hook (§7) so devicePixelRatio caps,
`ResizeObserver` sizing, visibility pausing and RAF budgeting are implemented once.

### 1.6 Fonts: one variable woff2 via `next/font/local`

- **One** variable font file, latin subset, `woff2`, **≤ 40 KB**, placed in
  `src/app/fonts/`. Loaded with `next/font/local`, `display: "swap"`, `preload: true`,
  `adjustFontFallback` enabled, exposed as `--font-loop`.
- `next/font` inlines the `@font-face` rule into the same critical CSS file (no extra CSS
  request), emits `<link rel="preload" as="font" crossorigin>` in the document head, and
  generates `size-adjust` / `ascent-override` / `descent-override` metric overrides for the
  local fallback. That last part is why this beats a raw `@font-face`: the fallback→webfont
  swap reflows **nothing**, which is how we hold **CLS = 0** while still using a brand font.
- **Hard rule for the hero:** the hero's largest contentful element must not depend on the
  webfont. Either it is a canvas/CSS element, or it is text set in the metric-matched fallback
  stack (`ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`) with the
  brand font applied via a class the hero does not use. LCP must never wait on a font fetch.
- No Google Fonts CDN. No second font family. Monospace, where used, is the system stack
  (`ui-monospace, SFMono-Regular, Menlo, monospace`) — zero bytes.

### 1.7 Audio: Web Audio API only, synthesized, opt-in

- **No audio files.** Everything is synthesized: `OscillatorNode`, `BiquadFilterNode`,
  `GainNode`, short `AudioBuffer`s generated with `Math.random()` for noise. Zero network cost,
  infinite variation, and it composes with the procedural visuals.
- `AudioContext` is constructed **lazily inside a user gesture handler** (`pointerdown`), never
  at module scope — otherwise it starts suspended and browsers log warnings.
- Default is **off**. A persistent, keyboard-reachable mute toggle in the shell writes
  `loop:sound` to `localStorage`. The toggle is `aria-pressed`.
- `src/lib/audio.ts` owns the singleton context, a master `GainNode` ramped over 40 ms (never
  set `gain.value` directly — it clicks), and a `playCue(name)` API. Sections never touch
  `AudioContext` directly.
- Audio suspends on `visibilitychange` to hidden and resumes on a gesture.

---

## 2. Performance budgets

### 2.1 The framework floor — state it honestly

Measured today, gzip -9, counting only the scripts the prerendered HTML executes in a modern
browser (the `noModule` legacy-polyfill chunk, 38.5 KB gz, is excluded because modern browsers
never fetch it):

| Configuration | First-load JS (gz) |
|---|---|
| Next **16.3.5** App Router, Turbopack, server component only | 135.6 KB |
| Next **16.3.5** App Router, `--webpack` | 133.3 KB |
| Next **16.3.5** App Router, one trivial client component | **130.1 KB** |
| Next **16.3.5** Pages Router, Turbopack | 118.1 KB |
| Next **15.5.25** App Router, webpack | 104.8 KB |

**A "< 90 KB gzipped initial JS" budget is not achievable on any current Next.js router.** The
React 19.3 + App Router client runtime alone is ~130 KB gz. Any plan that claims otherwise is
wrong, and building against a budget we silently violate is worse than building against an
honest one. So the budget is restated as three tiers, and the 90 KB number is kept where it
actually bites — the code *we* write.

### 2.2 The three-tier JS budget

- **Tier A — render-blocking payload: ≤ 14 KB gzipped, hard.**
  Everything that blocks first paint: the single Tailwind stylesheet (≤ 14 KB gz, currently
  1.5 KB) plus the inline hero bootstrap script (≤ 2 KB, uncompressed, inlined in the HTML).
  There is **no** blocking `<script src>`; Next emits all framework chunks with `async`.
- **Tier B — first-party JS on the landing route: ≤ 90 KB gzipped, hard.**
  Everything we author plus every library we choose, excluding the Next/React runtime. This is
  the number the bundle analyzer and `pnpm audit:perf` gate on. `motion/react` alone would be
  38.5 KB of it, which is why it is banned from this route.
- **Tier C — total JS transferred on the landing route: ≤ 230 KB gzipped, soft.**
  130 KB framework floor + ≤ 90 KB Tier B + 10 KB slack. Breaching Tier C triggers the
  Next 15.5.25 downgrade discussion (−30 KB gz), not a scramble.

Other budgets: **total CSS ≤ 14 KB gz**, **fonts ≤ 40 KB**, **images on the landing route: 0
raster bytes** (everything is generated or SVG), **per-section lazy chunk ≤ 40 KB gz**.

### 2.3 Field / lab metric targets

Measured with Lighthouse 13.5.0's default **mobile simulated throttling**: 1638 Kbps down,
150 ms RTT, **4× CPU slowdown**, 412×823 @ DPR 1.75. That profile is harsh — an *empty*
Next 16 page scores FCP 0.8 s / LCP 1.5 s / TTI 2.0 s / TBT 80 ms on it **(measured)**.

So targets are split by environment, and the CI gate uses the honest one:

| Metric | Target, `throttlingMethod: "provided"` (unthrottled local / desktop field) | Target, Lighthouse default mobile simulate (CI gate) |
|---|---|---|
| FCP | < 0.6 s | < 1.0 s |
| LCP | < 1.0 s | < 1.8 s |
| TTI | < 1.5 s | < 2.5 s |
| TBT | < 100 ms | < 150 ms |
| CLS | **0** | **0** |
| INP | < 100 ms | < 100 ms |
| Lighthouse Performance | ≥ 0.98 | ≥ 0.95 |
| Lighthouse Accessibility | 1.00 | 1.00 |

CLS = 0 is non-negotiable and is achievable: every canvas has an explicit aspect-ratio box,
every lazily mounted section reserves its final height via `min-height` on the server-rendered
shell, the font is metric-matched, and nothing is injected above existing content.

### 2.4 First interaction before hydration — the mechanism

This is the single most important architectural commitment for the bounce target. A visitor
who moves the pointer 300 ms after FCP must see the hero respond, even though React has not
hydrated.

1. **The hero is a server component.** It renders complete, styled HTML: heading, sub, the
   canvas element, the call-to-action, the nav. No `next/dynamic`, no client component in its
   tree, nothing awaiting hydration to be visible.
2. **The hero's ambient motion is pure CSS.** `@keyframes` + `@property`-registered custom
   properties, started by the stylesheet. Running before any JS parses.
3. **A ≤ 2 KB inline `<script type="module">`** in the hero, rendered with
   `dangerouslySetInnerHTML` from a build-time constant in `src/lib/hero-bootstrap.ts`. It:
   - attaches `pointermove` / `pointerdown` / `touchstart` listeners with
     `{ passive: true }` to the hero root;
   - writes `--px` / `--py` custom properties on the hero element (coalesced into one
     `requestAnimationFrame`), which CSS already consumes;
   - checks `matchMedia('(prefers-reduced-motion: reduce)')` and does nothing if it matches;
   - sets `window.__loop = { interacted: false, q: [] }` and pushes a `hero_interacted` event
     into `q` on the first real interaction;
   - adds `data-loop-hero-ready` to `<html>`, which CSS uses to reveal the interactive
     affordance. Nothing depends on JS to be *readable*; JS only makes it *reactive*.
4. **React adopts, it does not replace.** When the hero's client island hydrates, it reads
   `window.__loop.q`, flushes queued events into the real beacon, and takes over the pointer
   handling by removing the bootstrap's listeners (the bootstrap stores them on
   `window.__loop.off`). There is no double-binding and no visual discontinuity, because both
   implementations drive the same two CSS custom properties.
5. **Progressive enhancement everywhere else.** Section navigation is `<a href="#section-id">`
   anchors that work with zero JS; the client router upgrades them. Collectible toggles are
   `<button>`s inside the server-rendered shell that no-op gracefully until hydrated.

### 2.5 Enforcement

Three mechanisms, all runnable in this sandbox:

1. **`pnpm analyze`** → `ANALYZE=true next build --webpack` with
   `@next/bundle-analyzer@16.3.5`, which emits the treemap HTML. (The Turbopack-native
   `next experimental-analyze` also exists in 16.3.5 and gives an interactive UI; use it for
   exploration, use the webpack analyzer for the reproducible artifact.)
2. **`pnpm audit:perf`** → `node scripts/audit-perf.mjs`. Builds, starts `next start` on a
   free port, waits for a 200, runs Lighthouse 13.5.0 programmatically against the preinstalled
   Chromium, asserts the §2.3 CI-gate thresholds *and* the Tier B/Tier C byte budgets computed
   from the build output, prints a table, exits non-zero on any breach. This is the gate.
3. **`scripts/bundle-budget.mjs`**, called by the above and independently runnable: parses
   `.next/server/app/index.html`, sums the gzipped size of every non-`noModule`
   `<script src>`, subtracts a recorded framework-floor baseline stored in
   `perf-baseline.json`, and reports Tier B. Any PR that moves Tier B by more than 5 KB must
   say why in its description.

`pnpm audit:perf` runs on every agent's branch before merge, and in CI.

---

## 3. Project structure

### 3.1 Directory tree

```
loopsite/
├── design/
│   ├── 01-concept.md            # owned by the concept agent
│   ├── 02-visual.md
│   └── 03-architecture.md       # this file
├── public/
│   └── og/                      # build-time-generated OG images (SVG/PNG)
├── scripts/
│   ├── audit-perf.mjs           # Lighthouse + budget gate
│   └── bundle-budget.mjs        # gzip accounting
├── src/
│   ├── app/
│   │   ├── layout.tsx           # <html>, font, tokens, skip link, landmarks
│   │   ├── page.tsx             # the experience, section 0 preselected
│   │   ├── globals.css          # @import "tailwindcss" + @theme + critical layer
│   │   ├── fonts/               # the single variable woff2
│   │   ├── s/[slug]/
│   │   │   └── page.tsx         # deep-link alias; generateStaticParams + metadata
│   │   └── api/
│   │       └── beacon/route.ts  # engagement beacon sink
│   ├── components/
│   │   ├── shell/               # AppShell, SectionNav, SkipLink, ProgressRail
│   │   ├── hero/                # Hero (server) + HeroIsland (client)
│   │   └── ui/                  # Button, Toggle, VisuallyHidden, Poster
│   ├── sections/
│   │   ├── registry.ts          # THE section manifest — see §3.4
│   │   └── <slug>/
│   │       ├── index.ts         # exports the SectionModule
│   │       ├── Shell.tsx        # server component: heading, prose, poster, min-height
│   │       ├── Canvas.tsx       # client component, dynamic(ssr:false)
│   │       ├── logic.ts         # pure, testable, no DOM
│   │       └── section.module.css
│   ├── lib/                     # THE SHARED CONTRACT — scaffold writes this first
│   │   ├── types.ts
│   │   ├── tokens.ts
│   │   ├── motion.ts
│   │   ├── use-motion-preference.ts
│   │   ├── use-lazy-mount.ts
│   │   ├── use-canvas.ts
│   │   ├── gl.ts
│   │   ├── rng.ts
│   │   ├── url-state.ts
│   │   ├── storage.ts
│   │   ├── beacon.ts
│   │   ├── audio.ts
│   │   └── hero-bootstrap.ts
│   └── styles/
│       └── motion.css           # shared @keyframes + reduced-motion layer
├── tests/
│   ├── smoke.spec.ts
│   ├── sections.spec.ts
│   ├── a11y.spec.ts
│   └── reduced-motion.spec.ts
├── .gitignore
├── .npmrc
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── playwright.config.ts
├── pnpm-workspace.yaml
├── postcss.config.mjs
├── README.md
└── tsconfig.json
```

### 3.2 Route strategy — recommended: one canonical route plus prerendered aliases

**`/` is the entire experience.** All 8–14 sections live in one document, stacked, scroll-
explored. This is the right call for an exploratory site for three reasons: no navigation
latency between sections (multi-route means a fetch and a paint between every click, which is
exactly where people bounce); shared WebGL/audio context and shared progress state without
serialization; and a continuous scroll narrative, which is the format's whole point.

**Deep links use search params written through the native History API.** The canonical
explorable state is `/?s=<slug>&seed=<int>&d=<depth>`. Section changes are written with
`window.history.pushState(null, '', url)` (deliberate navigation) or
`window.history.replaceState(...)` (passive scroll-driven sync). Next.js 15+/16 keeps
`useSearchParams()` in sync with native History API calls, so this produces **no server round
trip, no loading state, and no re-render of the server tree** — which a `router.push()` would.

The scroll observer uses **`replaceState` only**. This is the single most important detail for
back/forward behaviour: if passive scrolling pushed history entries, a visitor who scrolls
through ten sections would need ten Back presses to leave, and browsers treat that as a trap.
`pushState` fires only on an explicit act: clicking a nav item, opening a detail overlay,
claiming a collectible.

**`/s/[slug]` is a prerendered alias route**, one static page per section via
`generateStaticParams()`. It renders the *same* `<LoopExperience initialSection={slug} />`
tree, so it is not a different app — it is the same app with a different starting point. Its
job is `generateMetadata()`: per-section title, description and OG image, so shared links
preview correctly and search engines index each section. On arrival it `replaceState`s to
`/?s=<slug>` so the canonical URL is stable from then on.

The URL **hash** is reserved for in-page anchors (`#section-<slug>`) so that the no-JS anchor
navigation in §2.4 keeps working. Hash and search param are synced by `src/lib/url-state.ts`;
no component reads `location` directly.

### 3.3 Code splitting and lazy mounting

Every section is split in two:

- **`Shell.tsx` — a server component.** Ships as HTML, costs ~0 KB of JS. Contains the
  `<section id>` landmark, `<h2>`, the prose, a static SVG or CSS "poster" that stands in for
  the visual, and a `min-height` matching the final rendered height. Rendered for **every**
  section on first paint. This is what makes the page fully readable and navigable before any
  section chunk loads, and what keeps CLS at 0.
- **`Canvas.tsx` — a client component**, imported by the shell as:

  ```ts
  const Canvas = dynamic(() => import('./Canvas'), { ssr: false, loading: () => null });
  ```

  `ssr: false` because a canvas has no meaningful server output and SSR-ing it only inflates
  the RSC payload. `loading: () => null` because the poster is already in the DOM underneath.

**Mounting is gated by IntersectionObserver, not by scroll position.** `useLazyMount` (in
`src/lib/`) returns `[ref, mounted]`:

```ts
// rootMargin gives us ~one viewport of runway so the chunk is parsed before it is seen
useLazyMount({ rootMargin: '150% 0px', threshold: 0 })
```

Three stages, so a section never costs anything before it is near:

1. **Far** — shell HTML only.
2. **Near (within 1.5 viewports)** — `mounted` flips true, `next/dynamic` fetches the chunk.
   For the two or three sections after the hero we also emit a
   `<link rel="prefetch" as="script">` during idle time via `requestIdleCallback`.
3. **Visible (`intersectionRatio > 0.2`)** — the section's RAF loop starts and `onExplore`
   begins reporting. Leaving the viewport cancels the RAF and releases the WebGL context if
   the section owns one.

The hero is exempt from all of this: it is never dynamic, never lazy, and its island is the
only client component in the initial tree.

### 3.4 The section component interface — every section implements this

`src/sections/registry.ts` is the manifest. It is the **only** file more than one agent edits,
it is append-only, and each agent appends exactly one line per section they own.

```ts
// src/lib/types.ts — written by the scaffold, never edited by section agents
export type SectionId = string & { readonly __brand: 'SectionId' };

export type ExploreEventName =
  | 'section_viewed'
  | 'section_interacted'
  | 'depth_reached'
  | 'collectible_found'
  | 'section_completed';

export interface ExploreEvent {
  name: ExploreEventName;
  section: SectionId;
  /** 0..1 — how deeply this section has been explored. Monotonic. */
  depth?: number;
  /** Small, non-PII, JSON-serialisable. Max 8 keys. */
  detail?: Record<string, string | number | boolean>;
}

export interface SectionProps {
  /** Stable id; also the DOM id as `section-${id}` and the `?s=` value. */
  id: SectionId;
  /** True when this section is the URL-selected one. Drives focus, not visibility. */
  active: boolean;
  /** True when >20% visible. Sections MUST NOT run a RAF loop when false. */
  visible: boolean;
  /** Resolved once, in the shell. Sections MUST NOT call matchMedia themselves. */
  reducedMotion: boolean;
  /** Per-section deterministic seed from `?seed=`. Same seed ⇒ same visuals. */
  seed: number;
  /** Report engagement. Idempotent per (name, section, depth) — the shell dedupes. */
  onExplore: (event: ExploreEvent) => void;
}

export interface SectionModule {
  id: SectionId;
  /** Nav label and <h2> text. */
  title: string;
  /** One sentence, used for `generateMetadata` on /s/[slug]. */
  blurb: string;
  /** Server component. Must render a landmark, an <h2>, prose, and reserve height. */
  Shell: React.ComponentType<{ children?: React.ReactNode }>;
  /** Client component, loaded via next/dynamic(ssr:false). */
  load: () => Promise<{ default: React.ComponentType<SectionProps> }>;
  /** Reserved height so CLS stays 0. CSS length, e.g. '100dvh' or 'min(100dvh, 720px)'. */
  reservedHeight: string;
  /** Declared gz budget for this section's chunk, in KB. CI asserts it. */
  budgetKb: number;
}
```

Lifecycle contract every section agent must honour:

1. Do all setup in a single `useEffect` keyed on `[seed, reducedMotion]`.
2. Start the RAF loop only when `visible` is true; cancel it in the cleanup and on
   `visibilitychange`.
3. Call `onExplore({ name: 'section_viewed', section: id })` once on first visibility. The
   shell dedupes, but do not spam it.
4. Call `onExplore({ name: 'depth_reached', section: id, depth })` at most once per 0.25 step
   of depth.
5. Never read `window`/`document` outside an effect. Never call `matchMedia`. Never touch
   `localStorage` directly — use `src/lib/storage.ts`.
6. Release everything in cleanup: `cancelAnimationFrame`, `ResizeObserver.disconnect()`,
   `gl.getExtension('WEBGL_lose_context')?.loseContext()`, detach audio nodes.
7. Respect `reducedMotion === true` by rendering a **static, still, complete** composition —
   not a blank box. Reduced motion means no motion, not no content.

---

## 4. Vercel specifics

### 4.1 Output mode and `vercel.json`

**Default output** (`.next`, server), not `output: 'export'`. Every page still prerenders
statically at build time; we keep the server only for the beacon Route Handler. Vercel
auto-detects Next.js and pnpm from `pnpm-lock.yaml`.

**No `vercel.json` is needed.** Vercel already applies
`Cache-Control: public, max-age=31536000, immutable` to `/_next/static/*`, which is content
hashed. Headers we actually want that Vercel does *not* set by default go in
`next.config.ts`'s `headers()` (full text in §10), so they are version controlled with the code
and apply identically in `next dev`, `next start` and production — which a `vercel.json` does
not. Specifically:

- **Security (all routes):** `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `X-Frame-Options: DENY`,
  `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`.
- **Fonts:** `/_next/static/media/*` already gets the immutable header from Vercel; we do not
  duplicate it.
- **Beacon route:** `Cache-Control: no-store`.
- **CSP** is deliberately deferred to a post-launch PR. The hero bootstrap is an inline
  script, so a strict CSP needs a per-request nonce, which forces the landing page out of
  static prerendering and costs us the edge cache — a bad trade before launch. Ship with the
  headers above; add nonce-based CSP later if it is ever needed.

If a `vercel.json` becomes necessary (e.g. to pin `"regions"`), keep it to that one key.

### 4.2 `@vercel/analytics@2.0.1` and `@vercel/speed-insights@2.0.0`

Both are free-tier, zero-config, no API keys. Measured cost of mounting **both**: first-load
JS goes 130.1 → **132.4 KB gz, i.e. +2.3 KB (measured)**. That is because the components are
thin loaders; the real scripts come from `/_vercel/insights/script.js` and
`/_vercel/speed-insights/script.js` on the *same origin* (no third-party DNS/TLS handshake,
no impact on LCP) and are injected with `defer`.

Mounted once, in `src/app/layout.tsx`:

```tsx
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
// ... <Analytics /> <SpeedInsights /> as the last children of <body>
```

Speed Insights gives us real-user LCP / CLS / INP / TTFB, which is the only honest check on
§2.3 — lab numbers from this sandbox are a gate, not a truth.

### 4.3 Computing bounce rate from Vercel Analytics — and why it is not enough

Vercel Web Analytics reports Visitors, Page Views and **Bounce Rate** natively, where a bounce
is a session with a single page view. **For Loop that metric is useless and will read ~100%**:
the entire site is one route, so every session is a one-page-view session by construction.

Two corrections:

1. **Make the alias routes count.** Because `/s/[slug]` are real routes, an in-page navigation
   that upgrades to a soft route change registers as an additional page view. We do *not*
   contort the app for this, but it means Vercel's bounce rate becomes weakly meaningful:
   sessions that reached a second section via the nav will not be bounces.
2. **Custom events.** `import { track } from '@vercel/analytics'` lets us send
   `track('engaged')`. Note that **custom events in Vercel Web Analytics are a paid-plan
   feature**; on Hobby they are silently dropped. So `track()` is called behind
   `NEXT_PUBLIC_VERCEL_CUSTOM_EVENTS === '1'` and is *not* the measurement of record.

**The measurement of record is our own beacon**, below. Operational definition:

> **Engaged session** = a session that fired **any** of: `hero_interacted`, OR
> `section_viewed` for ≥ 2 distinct sections, OR `time_on_site_30s`.
> **Non-bounce rate** = engaged sessions ÷ total sessions (sessions being distinct
> `session_start` events).

Target: ≥ 0.90.

### 4.4 The first-party engagement beacon

**Client (`src/lib/beacon.ts`), ~1.2 KB:**

- Refuses to send if `navigator.doNotTrack === '1'`, `window.doNotTrack === '1'`,
  `navigator.msDoNotTrack === '1'`, or `navigator.globalPrivacyControl === true`. In that case
  every API becomes a no-op and nothing is stored.
- Session id: `crypto.randomUUID()` in `sessionStorage` under `loop:sid`. **No cookies, no
  localStorage, no fingerprinting, no IP handling on our side, no PII.** It dies with the tab.
- Events are **deduped by name** (each of the four fires at most once per session) and **queued
  and flushed** — on `visibilitychange → hidden`, on `pagehide`, and on a 10 s idle timer —
  via `navigator.sendBeacon('/api/beacon', blob)`, falling back to
  `fetch(..., { keepalive: true })`. Never `unload`.
- Flushes `window.__loop.q` (the pre-hydration queue from §2.4) on init, so a `hero_interacted`
  that happened at 300 ms is not lost.

**The four events:**

| Event | Fires when |
|---|---|
| `hero_interacted` | first `pointermove`/`pointerdown`/`touchstart`/`keydown` inside the hero |
| `section_viewed` | a section crosses 20% visibility (payload: `{ section }`), max once per section |
| `depth_reached` | a section reports `depth ≥ 0.75` (payload: `{ section, depth }`) |
| `time_on_site_30s` | a 30 s timer that only accrues while `document.visibilityState === 'visible'` |

Plus `session_start` on init, which is the denominator.

**Server (`src/app/api/beacon/route.ts`):**

```ts
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (Array.isArray(body?.events) && body.events.length <= 32) {
      console.log(JSON.stringify({ t: 'loop.beacon', sid: body.sid, events: body.events }));
    }
  } catch { /* swallow — a beacon must never 500 */ }
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
```

It logs and returns 204. **No datastore.** In production these lines land in Vercel's runtime
logs; if we ever want aggregates we point a Vercel Log Drain at them, or swap the `console.log`
for a Vercel KV write, without touching a single line of client code. Shipping with a no-op
sink is deliberate: the client contract is what has to be right at launch, and the client
contract is testable locally today.

---

## 5. State management

**No state library.** No Zustand, no Redux, no Jotai. The state has exactly three shapes and
each has a natural home:

1. **Explorable state → the URL.** `?s=<slug>` (current section), `?seed=<int>` (procedural
   seed — every generative section derives its RNG from `hashSeed(seed, sectionId)` in
   `src/lib/rng.ts`, so a shared URL reproduces the exact same visuals), `?d=<0..N>` (max depth
   reached, for shareable "I got this far" links). Owned entirely by
   `src/lib/url-state.ts`, which exposes `useUrlState()` returning
   `{ section, seed, depth, setSection, setSeed, bumpDepth }`. Writes go through native
   `history.pushState`/`replaceState` per §3.2. **Search params, not hash**, because they are
   readable server-side on `/s/[slug]` and because the hash is already spent on anchors.
2. **Progress and collectibles → `localStorage`**, under a single versioned key `loop:v1`
   holding `{ visited: string[], collected: string[], maxDepth: number, sound: boolean,
   motion: 'auto'|'reduce' }`. `src/lib/storage.ts` wraps it:

   ```ts
   // Every read and write is try/catch'd. Safari private mode, blocked site data,
   // quota exhaustion and SSR all return the default — they never throw upward.
   export function readState(): LoopState { try { ... } catch { return DEFAULT; } }
   export function writeState(patch: Partial<LoopState>): void { try { ... } catch {} }
   ```

   Rules: never read during render (hydration mismatch); read in a `useEffect` and flip a
   `hydratedFromStorage` flag. Writes are debounced at 500 ms. If storage is unavailable the
   site is fully functional and simply forgets between visits — no warning, no degraded UI.
3. **Ephemeral UI state → `useState` local to the component.** Cross-section coordination (the
   progress rail, the nav's active item) goes through **one** React context,
   `LoopContext`, created in `src/components/shell/AppShell.tsx` and exposing
   `{ reducedMotion, seed, activeSection, onExplore, progress }`. One context, provided once,
   near the top, with a stable value memo. That is the entire "global state".

---

## 6. Accessibility and reduced-motion architecture

### 6.1 One hook, one CSS layer

**`src/lib/use-motion-preference.ts`** is the only place in the repo that calls
`matchMedia('(prefers-reduced-motion: reduce)')`:

```ts
export function useMotionPreference(): 'auto' | 'reduce'
```

It subscribes to the media query's `change` event (so a mid-session OS change is honoured),
merges in the user's explicit override from `localStorage` (`motion: 'auto' | 'reduce'`), is
SSR-safe (returns `'reduce'` on the server — we degrade *toward* safety), and syncs
`document.documentElement.dataset.motion`. `AppShell` calls it once and passes the boolean down
as `SectionProps.reducedMotion`. **ESLint rule: `matchMedia('(prefers-reduced-motion` is banned
outside that file.**

**`src/styles/motion.css`** carries the CSS half, keyed on the same signal so CSS and JS can
never disagree:

```css
@layer motion {
  :root[data-motion='reduce'],
  :root:not([data-motion='auto']) { /* pre-JS default is safe */ }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
:root[data-motion='reduce'] *,
:root[data-motion='reduce'] *::before,
:root[data-motion='reduce'] *::after { /* same three declarations */ }
```

`src/lib/motion.ts`'s `animateEl()` checks the same flag and, under reduce, jumps straight to
the end keyframe and resolves. Sections receive `reducedMotion` and render a **still
composition** — a single frame of the generative system, fully formed. Never an empty box, and
never a "reduced motion not supported" message.

There is also a visible in-page **Motion** toggle in the shell (`auto` / `reduce`), because a
non-trivial number of people want stillness without changing an OS setting.

### 6.2 Landmarks, focus and skip links

- **Landmarks:** `<header>` (nav), one `<main id="main">`, `<section aria-labelledby>` per
  section each containing exactly one `<h2>`, `<footer>`. Exactly one `<h1>`, in the hero.
  Heading levels never skip.
- **Skip link:** the first focusable element in `<body>`,
  `<a class="skip-link" href="#main">Skip to the experience</a>`, visually hidden until
  `:focus-visible`, then pinned top-left with a high-contrast background. A second skip link,
  "Skip to section list", precedes the hero.
- **Focus management on section change:** when `setSection()` runs from a deliberate
  navigation, move focus to the target section's `<h2>` (given `tabIndex={-1}`) and announce it
  via an `aria-live="polite"` region in the shell. Scroll-driven changes do **not** move focus —
  stealing focus from a scrolling reader is hostile.
- **Canvas accessibility:** every `<canvas>` gets `role="img"` and a real `aria-label`
  describing what it depicts, or `aria-hidden="true"` when purely decorative and the section's
  meaning is carried by adjacent text. Interactive canvases additionally expose a parallel
  keyboard control (arrow keys / +/−) bound to real `<button>`s in a visually-hidden toolbar,
  so the section is completable without a pointer.
- **Focus visibility:** a single global `:focus-visible` ring using a token
  (`outline: 2px solid var(--color-loop-focus); outline-offset: 3px`). `outline: none` without
  a replacement is an ESLint/review failure.
- **Contrast:** all text ≥ 4.5:1 against its *rendered backdrop*, including over canvas. Where
  text sits over generative visuals, it sits on a token-defined scrim, not on raw output.
- **Keyboard map:** `Tab`/`Shift+Tab` through sections and controls; `↑`/`↓` or `j`/`k` move
  between sections; `Esc` closes any overlay and returns focus to its trigger; `?` opens a
  shortcuts dialog (focus-trapped, `aria-modal`).
- **Gate:** axe-core scan with **zero** violations at severity `serious` or `critical`, and
  Lighthouse Accessibility = 1.00. Both enforced in `pnpm audit:perf` / `pnpm test:e2e`.

---

## 7. Mobile

- **Viewport units:** `100dvh` for full-height sections, never `100vh` — `vh` is the *large*
  viewport on iOS, so `100vh` sections are clipped by the URL bar and then resize when it
  collapses, which is both a visual bug and a CLS event. Use `svh` only where a section must
  never be taller than the smallest viewport. Fallback order:
  `min-height: 100vh; min-height: 100dvh;`.
- **Pointer Events only.** `pointerdown` / `pointermove` / `pointerup` / `pointercancel`. No
  `mouse*` + `touch*` pairs, no synthetic-click de-duplication logic. Use
  `element.setPointerCapture(e.pointerId)` for drags, and always handle `pointercancel` —
  iOS fires it liberally.
- **Passive listeners everywhere**, explicitly: `{ passive: true }` on every `pointermove`,
  `touchstart`, `touchmove`, `wheel` and `scroll` listener. The one exception is a drag surface
  that must call `preventDefault()`; there, set `touch-action: none` in CSS **instead of**
  going non-passive, which keeps the listener off the compositor's critical path.
- **No 300 ms tap delay:** guaranteed by `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
  (Next's default metadata viewport, which we configure explicitly). We do **not** ship a
  FastClick-style shim.
- **Scroll-jank / `will-change` discipline:** `will-change` is applied *only* while an element
  is animating and removed on completion (`animateEl()` does this automatically). A permanent
  `will-change: transform` on many elements promotes each to its own compositor layer and
  exhausts GPU memory on mid-range Android, which produces exactly the stutter it was meant to
  prevent. Animate only `transform` and `opacity`. Never animate `top`/`left`/`width`/
  `height`/`box-shadow`/`filter: blur()` on scroll. Prefer CSS
  `animation-timeline: view()` over a JS scroll handler — it runs off the main thread. Where a
  JS scroll handler is unavoidable, it may only write CSS custom properties, coalesced into one
  `requestAnimationFrame`, and must never read layout (no `getBoundingClientRect()` in a scroll
  handler; cache from a `ResizeObserver`).
- **devicePixelRatio caps:** `useCanvas` sizes every backing store as
  `Math.min(window.devicePixelRatio || 1, isCoarsePointer ? 2 : 2)` and, for any section
  declaring `heavy: true`, `1.5`. A DPR-3 phone rendering full-screen at native resolution is
  9× the fill rate of DPR-1 and is the number one cause of thermal throttling on mobile. We
  also cap total backing-store area at ~2.5 M pixels and scale DPR down to fit. Resize is
  driven by `ResizeObserver` (debounced 100 ms), never by the `resize` event.
- **Frame budgeting:** one shared RAF loop in `src/lib/use-canvas.ts` drives every visible
  section; sections register a `tick(dt)` callback. `dt` is clamped to 50 ms so a backgrounded
  tab does not produce a physics explosion on return. If `dt` exceeds 32 ms for 30 consecutive
  frames, the loop drops a global quality tier (fewer particles, lower DPR), broadcast through
  `LoopContext`.
- **Touch targets:** ≥ 44×44 CSS px, with `padding` rather than `transform: scale()`.
- **`overscroll-behavior: contain`** on any internally scrollable panel so the page behind does
  not rubber-band.

---

## 8. Testing and QA — runnable in this sandbox

### 8.1 Exact packages and versions

| Package | Version | Why this exact pin |
|---|---|---|
| `@playwright/test` | **`1.56.1`** | **Critical.** The sandbox has Chromium revision **1194** preinstalled at `/opt/pw-browsers`, and we must not run `playwright install`. Playwright 1.56.x is the only line that resolves chromium → rev 1194 (1.57.0 → 1200, 1.58.0 → 1208 … 1.63.0 → 1243). Verified: `@playwright/test@1.56.0/1.56.1` both map to 1194, and `chromium.launch()` succeeds against the preinstalled binary (Chrome **141.0.7390.37**). Pinning `1.63.0` (`latest`) would try to download rev 1243 and fail. |
| `lighthouse` | **`13.5.0`** | Requires Node `>=22.19`; sandbox has **22.22.2**. Verified working headless against the preinstalled Chromium via `CHROME_PATH`. |
| `@axe-core/playwright` | **`4.13.0`** | Matches `axe-core` 4.13.0; integrates as a Playwright fixture. |
| `axe-core` | **`4.13.0`** | Pinned explicitly so the rule set cannot drift under us. |
| `@next/bundle-analyzer` | **`16.3.5`** | Must match `next`. |

Every Playwright and Lighthouse invocation needs:

```
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
NO_PROXY=localhost,127.0.0.1   # and no_proxy — the sandbox HTTPS proxy otherwise
no_proxy=localhost,127.0.0.1   # swallows requests to the local next server
```

The `NO_PROXY` pair is not optional: without it, `curl`/`fetch` to `http://127.0.0.1:3000`
returns nothing in this sandbox (verified — `000` without it, `200` with it), which makes
readiness polling in `audit-perf.mjs` and Playwright's `webServer` hang. Chromium itself reaches
localhost fine, which is why Lighthouse appeared to work while `curl` did not — a confusing
failure mode worth knowing about.

### 8.2 Test suites

**`tests/smoke.spec.ts`**
- `/` returns 200 and renders an `<h1>`.
- **Hero interactive within 1 s:** navigate with `waitUntil: 'commit'`, then assert
  `html[data-loop-hero-ready]` appears within 1000 ms; dispatch a `pointermove` over the hero
  and assert the `--px` custom property on the hero root changed — i.e. interaction works,
  asserted independently of React hydration.
- **No console errors:** `page.on('console')` + `page.on('pageerror')` collected into an array
  that must be empty at the end of every test (shared fixture, applied to all specs).
- No failed network requests (`response.status() >= 400`).
- CLS after a full scroll-through is `0` (read via a `PerformanceObserver` injected with
  `addInitScript`).

**`tests/sections.spec.ts`**
- Every entry in `registry.ts` has a `<section id="section-<slug>">` in the initial HTML
  (asserted against the raw response body, not the hydrated DOM — this is the progressive-
  enhancement guarantee).
- Scrolling to each section mounts its canvas within 2 s and emits `section_viewed` (asserted
  by intercepting `POST /api/beacon` with `page.route`).
- `/s/<slug>` returns 200 for every slug, and its `<title>` and `og:description` are
  section-specific.
- Deep link `/?s=<slug>` lands scrolled to that section; **Back** returns to the previous
  section in one press (guards the `replaceState`-only rule from §3.2).
- Beacon events `hero_interacted`, `section_viewed`, `depth_reached`, `time_on_site_30s` all
  fire under a scripted "engaged visitor" scenario.

**`tests/a11y.spec.ts`**
- `AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()` on `/`,
  on `/` after scrolling to the last section (so lazily mounted content is scanned), and on one
  `/s/<slug>`. Zero `serious`/`critical` violations.
- Keyboard-only walk: `Tab` from the top reaches the skip link first; activating it moves focus
  into `<main>`; every section is reachable; focus is never trapped outside a dialog.
- Every `<canvas>` has `aria-label` or `aria-hidden="true"`.

**`tests/reduced-motion.spec.ts`**
- A project in `playwright.config.ts` with `use: { reducedMotion: 'reduce' }`.
- Every section still renders visible, non-empty content (assert each section's bounding box is
  non-zero and a screenshot is not uniform).
- No element reports a running animation:
  `document.getAnimations().filter(a => a.playState === 'running')` is empty after 1 s.
- The in-page Motion toggle flips `html[data-motion]` and takes effect without reload.

**`pnpm audit:perf`** (`scripts/audit-perf.mjs`) — the gate described in §2.5. Also writes
`perf-report.json`, which is committed on release branches so regressions are diffable.

### 8.3 Commands

```
pnpm dev            # next dev
pnpm build          # next build
pnpm start          # next start
pnpm lint           # eslint  (note: `next lint` does not exist in Next 16)
pnpm typecheck      # tsc --noEmit
pnpm test:e2e       # playwright test
pnpm audit:perf     # build + next start + lighthouse + byte budgets, exits non-zero on breach
pnpm analyze        # ANALYZE=true next build --webpack
pnpm verify         # typecheck && lint && test:e2e && audit:perf   ← pre-merge gate
```

---

## 9. Parallel build plan — 5–7 agents, one repo, no conflicts

### 9.1 The rule

**One agent, one directory. A file has exactly one owner.** Merge conflicts in a swarm come
almost entirely from two agents editing the same file; if ownership is a partition of the file
tree, conflicts cannot happen. There are exactly two shared files, both append-only.

### 9.2 Phase 0 — the scaffold agent runs alone (blocking)

Nothing else starts until this is merged. It produces:

- every file in §10 verbatim;
- **the complete `src/lib/` contract** — all thirteen modules, fully implemented, typed and
  exported. Not stubs. Section agents must be able to `import { useCanvas } from '@/lib/use-canvas'`
  on their first line of work;
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/s/[slug]/page.tsx`,
  `src/app/api/beacon/route.ts`;
- `src/components/shell/*` (AppShell, LoopContext, SectionNav, SkipLink, ProgressRail,
  MotionToggle, SoundToggle);
- `src/sections/registry.ts` containing **one worked reference section** (`sections/_example/`)
  that implements `SectionModule` end to end, including a canvas, reduced-motion still mode,
  `onExplore` calls and a `section.module.css`. Every other agent copies this folder as their
  starting point. A reference implementation removes more ambiguity than any amount of prose;
- `src/app/globals.css` with the full `@theme` token set;
- the four test specs with the shared no-console-errors fixture, plus `playwright.config.ts`;
- `scripts/audit-perf.mjs` and `scripts/bundle-budget.mjs`, with a recorded framework baseline;
- a green `pnpm verify` on an empty site. **Phase 0 does not end until `pnpm verify` passes.**

### 9.3 Phase 1 — parallel

| Agent | Owns (exclusive write) | May read |
|---|---|---|
| **A1 — Hero & shell polish** | `src/components/hero/**`, `src/components/shell/**`, `src/lib/hero-bootstrap.ts`, `src/app/layout.tsx` | everything |
| **A2 — Sections 1–3** | `src/sections/<s1>/**`, `<s2>/**`, `<s3>/**` | `src/lib/**` |
| **A3 — Sections 4–6** | `src/sections/<s4..s6>/**` | `src/lib/**` |
| **A4 — Sections 7–9** | `src/sections/<s7..s9>/**` | `src/lib/**` |
| **A5 — Sections 10–12** | `src/sections/<s10..s12>/**` | `src/lib/**` |
| **A6 — Audio, collectibles, progress** | `src/lib/audio.ts`, `src/components/ui/**`, `src/app/s/[slug]/page.tsx`, `public/og/**` | everything |
| **A7 — QA, perf, a11y** | `tests/**`, `scripts/**`, `playwright.config.ts`, `README.md` | everything |

**Shared, append-only, coordinated:**

1. `src/sections/registry.ts` — each section agent appends exactly one `import` and one array
   entry, in the slot pre-reserved for them by Phase 0 (the scaffold writes numbered
   `// SLOT A2-1` … comment markers, so two agents appending never touch the same line).
2. `package.json` `dependencies` — **frozen**. Adding a dependency requires the architect's
   approval and a Tier B budget line. `regl` is the only pre-approved addition, for one section.

**Also frozen after Phase 0:** every file in `src/lib/**` except `audio.ts` (A6's). If a section
agent needs a change to a shared hook, they open an issue; the architect makes the change. A
section agent editing `src/lib/types.ts` is the failure mode that costs the swarm a day.

### 9.4 Integration cadence

- Each agent works on `agent/<name>` off `main`, rebases before every push.
- Merge order is fixed: A1 → A7 → A2 → A3 → A4 → A5 → A6. A1 first because everything renders
  inside the shell; A7 second so the gate exists before the bulk of the code lands.
- **Every PR must pass `pnpm verify`**, and must state its Tier B delta from
  `scripts/bundle-budget.mjs`. A section chunk exceeding its declared `budgetKb` fails CI.
- Definition of done for a section: shell renders server-side; canvas mounts lazily; reduced
  motion renders a complete still; `onExplore` fires `section_viewed` and `depth_reached`;
  keyboard-operable; axe clean; chunk within budget; no console output.

---

## 10. Scaffold — exact commands and files

### 10.1 Commands

```bash
cd /home/user/loopsite

# Do NOT use create-next-app. Write the files below verbatim, then:
pnpm install

# One-time environment exports for every QA command in this sandbox:
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
export CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
export NO_PROXY=localhost,127.0.0.1
export no_proxy=localhost,127.0.0.1
# Never run `pnpm exec playwright install` — the browser is already there.

pnpm typecheck && pnpm build && pnpm verify
```

### 10.2 `package.json`

```json
{
  "name": "loopsite",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@10.33.0",
  "engines": { "node": ">=22.19.0" },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test:e2e": "playwright test",
    "audit:perf": "node scripts/audit-perf.mjs",
    "audit:bundle": "node scripts/bundle-budget.mjs",
    "analyze": "ANALYZE=true next build --webpack",
    "verify": "pnpm typecheck && pnpm lint && pnpm test:e2e && pnpm audit:perf"
  },
  "dependencies": {
    "@vercel/analytics": "2.0.1",
    "@vercel/speed-insights": "2.0.0",
    "motion": "13.4.0",
    "next": "16.3.5",
    "react": "19.3.0",
    "react-dom": "19.3.0"
  },
  "devDependencies": {
    "@axe-core/playwright": "4.13.0",
    "@next/bundle-analyzer": "16.3.5",
    "@playwright/test": "1.56.1",
    "@tailwindcss/postcss": "4.3.3",
    "@types/node": "26.6.2",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "axe-core": "4.13.0",
    "eslint": "10.11.0",
    "eslint-config-next": "16.3.5",
    "lighthouse": "13.5.0",
    "tailwindcss": "4.3.3",
    "typescript": "5.9.3"
  }
}
```

### 10.3 `next.config.ts`

```ts
import type { NextConfig } from 'next';
import withBundleAnalyzer from '@next/bundle-analyzer';

const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  compiler: { removeConsole: { exclude: ['error', 'warn'] } },
  async headers() {
    return [
      { source: '/:path*', headers: SECURITY_HEADERS },
      { source: '/api/beacon', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    ];
  },
};

export default withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })(nextConfig);
```

### 10.4 `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

### 10.5 `postcss.config.mjs`

```js
const config = { plugins: { '@tailwindcss/postcss': {} } };
export default config;
```

### 10.6 `eslint.config.mjs`

```js
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='matchMedia'][arguments.0.value=/prefers-reduced-motion/]",
          message: 'Use useMotionPreference() from @/lib/use-motion-preference instead.',
        },
        {
          selector: "MemberExpression[object.name='localStorage']",
          message: 'Use readState/writeState from @/lib/storage instead.',
        },
      ],
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**']),
]);
```

### 10.7 `pnpm-workspace.yaml`

```yaml
ignoredBuiltDependencies:
  - sharp
  - unrs-resolver
  - '@playwright/test'
  - esbuild
```

(pnpm 10 blocks lifecycle scripts by default; listing them here documents the intent. In
particular `@playwright/test`'s install script must **not** run — the browser is preinstalled.)

### 10.8 `.npmrc`

```
engine-strict=true
auto-install-peers=true
strict-peer-dependencies=false
prefer-frozen-lockfile=true
```

### 10.9 `.gitignore`

```
# dependencies
/node_modules
/.pnp
.pnp.*

# next.js
/.next/
/out/
/build

# testing
/coverage
/test-results/
/playwright-report/
/blob-report/
/playwright/.cache/
perf-report.json

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env
.env*

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
```

### 10.10 `playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test';

const PORT = 3111;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    video: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    {
      name: 'reduced-motion',
      testMatch: /reduced-motion\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], reducedMotion: 'reduce' },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: baseURL,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: { NO_PROXY: 'localhost,127.0.0.1', no_proxy: 'localhost,127.0.0.1' },
  },
});
```

### 10.11 `vercel.json`

**Not created.** All headers live in `next.config.ts` (§10.3) so they apply in dev, in
`next start` and in production identically, and are covered by tests. Vercel already serves
`/_next/static/*` with `Cache-Control: public, max-age=31536000, immutable`. Add a
`vercel.json` only if we later need `"regions"`.

### 10.12 `README.md` skeleton

```md
# Loop

An exploratory, generative, mostly-client-side web experience. 8–14 sections, procedural
visuals, no backend, no auth, no paid APIs.

## Quick start

    pnpm install
    pnpm dev            # http://localhost:3000

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm lint` / `pnpm typecheck` | ESLint / tsc |
| `pnpm test:e2e` | Playwright: smoke, sections, a11y, reduced motion |
| `pnpm audit:perf` | Lighthouse + byte-budget gate (fails on regression) |
| `pnpm analyze` | Bundle treemap |
| `pnpm verify` | Everything above. Required before merge. |

## Sandbox environment

    export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
    export CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
    export NO_PROXY=localhost,127.0.0.1
    export no_proxy=localhost,127.0.0.1

Chromium is preinstalled. **Never run `playwright install`.**
`@playwright/test` is pinned to 1.56.1 because that is the release matching Chromium rev 1194.

## Architecture

See `design/03-architecture.md`. In particular: the section interface (`SectionModule`),
the `src/lib/` contract, the performance budgets, and the file-ownership map.

## Adding a section

1. `cp -r src/sections/_example src/sections/<slug>`
2. Implement `Shell.tsx` (server), `Canvas.tsx` (client), `logic.ts` (pure).
3. Register it in `src/sections/registry.ts` in your reserved slot.
4. `pnpm verify`.

## Deploy

Vercel, default Next.js preset, pnpm. No environment variables required.
```

---

## 11. Risks and the escape hatches

| Risk | Mitigation |
|---|---|
| Framework floor (130 KB gz) makes Tier C tight | Downgrade `next` to `15.5.25` (−30 KB gz, measured). One-line change; App Router API is compatible. |
| A section agent reaches for `motion/react` | Banned from the landing route by review; `bundle-budget.mjs` fails the PR on the +38.5 KB jump. |
| WebGL context limit (browsers cap ~8–16 live contexts) | Sections release contexts on exit via `WEBGL_lose_context`; `useCanvas` keeps a global registry and forcibly reclaims the least-recently-visible context beyond 4. |
| Lighthouse in CI is flaky on a shared runner | `audit:perf` runs Lighthouse 3× and asserts the **median**; budgets have the headroom shown in §2.3. |
| Vercel custom events are paid-tier | The first-party beacon is the measurement of record; `track()` is behind a flag. |
| Reduced motion turns a section into a blank box | `reduced-motion.spec.ts` asserts non-empty, non-uniform rendering for **every** section. |
| Two agents edit `registry.ts` | Pre-reserved numbered slots written by Phase 0, so appends never touch the same line. |

---

## 12. Appendix — verification log (2026-09-21, this sandbox)

- Node **22.22.2**, npm **10.9.7**, pnpm **10.33.0**.
- `npm view` latest: `next` 16.3.5, `react`/`react-dom` 19.3.0, `typescript` 7.0.2 (5.9.3 is
  latest 5.x), `tailwindcss`/`@tailwindcss/postcss` 4.3.3, `motion`/`framer-motion` 13.4.0,
  `three` 0.186.0, `regl` 2.1.1, `gsap` 3.15.0, `@vercel/analytics` 2.0.1,
  `@vercel/speed-insights` 2.0.0, `@playwright/test` 1.63.0, `lighthouse` 13.5.0,
  `axe-core`/`@axe-core/playwright` 4.13.0, `eslint` 10.11.0, `eslint-config-next` 16.3.5,
  `@types/node` 26.6.2, `@types/react`/`@types/react-dom` 19.3.0, `@types/three` 0.186.0.
- `next@16.3.5` + `react@19.3.0` + `tailwindcss@4.3.3`: `next build` succeeds on Turbopack
  (4.6 s compile) and on `--webpack` (5.4 s).
- First-load JS, gzip -9, `noModule` chunk excluded: Next 16 App Router server-only 135.6 KB;
  one client component 130.1 KB; `--webpack` 133.3 KB; Next 16 Pages Router 118.1 KB;
  Next 15.5.25 App Router 104.8 KB.
- Deltas over the 130.1 KB client baseline: `motion/mini` **+3.5 KB**; `motion/react`
  **+38.5 KB**; `regl@2.1.1` **+36.7 KB**; `three@0.186.0` minimal subset **+126.6 KB**;
  `@vercel/analytics` + `@vercel/speed-insights` together **+2.3 KB**.
- Baseline Tailwind CSS output: 4,065 bytes raw / 1,468 bytes gzipped.
- `three@0.186.0` has no bundled types; the build fails with TS7016 without
  `@types/three@0.186.0`.
- Playwright↔Chromium map: 1.63.0→1243, 1.62.0→1234, 1.61.0→1228, 1.60.0→1223, 1.59.0→1217,
  1.58.0→1208, 1.57.0→1200, **1.56.1→1194**, 1.55.0→1187. `/opt/pw-browsers` has **1194**.
  `chromium.launch()` on 1.56.x against it returns Chrome **141.0.7390.37**.
- `lighthouse@13.5.0` runs headless with
  `CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`; on a trivial Next 16 page
  it scored Performance 1.00 / Accessibility 1.00, FCP 0.8 s, LCP 1.5 s, TTI 2.0 s, TBT 80 ms,
  CLS 0, under its default mobile profile (1638 Kbps, 150 ms RTT, 4× CPU, 412×823 @ 1.75).
- Local HTTP from the shell requires `NO_PROXY`/`no_proxy=localhost,127.0.0.1` (`000` without,
  `200` with).
- `next lint` no longer exists in Next 16; `next experimental-analyze` (Turbopack-only) does.
