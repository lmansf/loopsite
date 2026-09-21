# Loop — Visual & Motion System
**Doc 04 · Visual/Motion Design Lead · v1.0**

This system is deliberately concept-agnostic. Whatever "loop" the concept track lands on — cycles, infinity, rhythm, recursion, orbits, feedback — it resolves to the same three primitives defined here: **the Ring** (a closed path), **the Traveller** (something moving along it), and **the Trail** (the decaying memory of where the Traveller has been). Every page, transition, chart, button and easter egg in the site is built from those three. That constraint is what makes the site instantly recognisable after four seconds and still coherent after four minutes.

The hard requirement — 90% of visitors do not bounce — is a *motion and affordance* requirement more than an aesthetic one. Bounce happens for three reasons: nothing is happening (dead page), too much is happening (cognitive bail-out), or nothing is obviously *doable* (no affordance). Sections 1, 4 and 5 attack those three directly.

---

## 1. Design principles

**P1 — Something is always moving, but nothing is ever noisy.**
At any instant, at most **three** independent motion sources are visible in one viewport: one ambient (idle), one reactive (following the pointer/scroll), one state (a transition in flight). Ambient motion is capped at **6% opacity delta, 2° rotation, or 8px travel over ≥6s**. A live page reads as *breathing*; a noisy page reads as *demanding*. Retention lever: removes the "dead page" bail-out without triggering the "too much" bail-out.

**P2 — One clock, many phases.**
Every looping element in the site derives its animation from a **single 8000ms master cycle** with a per-element phase offset, implemented as a negative `animation-delay`. Nothing has its own arbitrary period. The consequence is that unrelated elements periodically fall into visual sync — a sunrise moment the eye notices without being able to name it. Retention lever: rewards continued watching with a pattern that resolves, which is literally the mechanic of a slot machine minus the coercion.

**P3 — Every ending is a doorway.**
No section ends in whitespace. Every section terminates in a **Next Arc** (§6.4): a visible, labelled, scroll-reactive affordance naming the next destination. The user should never have to decide *whether* to continue, only *which way*. Retention lever: eliminates the decision point at which bounce occurs.

**P4 — Motion explains, it does not decorate.**
Any animation longer than 200ms must communicate one of: origin (where this came from), relation (what this belongs to), or state (what changed). Shared-element transitions over cross-fades. If an animation can be removed without losing meaning, it should be shortened to ≤120ms or deleted. Retention lever: keeps perceived speed high; motion that explains never feels like waiting.

**P5 — Calm is a variant, never an absence.**
`prefers-reduced-motion: reduce` produces a *different* design, not a disabled one — still alive, still responsive, still legible as "Loop". Travel becomes tone; rotation becomes opacity; trails become static gradients. Every category in §4 and §7 ships an explicit calm variant. Retention lever: ~25–35% of users have some motion sensitivity; a dead fallback bounces all of them.

---

## 2. Colour

### 2.1 Dark-first, justified
The default theme is dark. Three reasons, in order of weight:

1. **Luminance contrast is the whole visual language.** The Trail primitive is light decaying into darkness. On a light canvas a trail must be drawn as *darkness*, which reads as dirt, not energy. Glow, bloom and additive blending (`mix-blend-mode: screen` / `plus-lighter`) only work over dark ground.
2. **OLED mobile.** Roughly 70%+ of mobile visitors will be on OLED. The canvas `#06070A` drives pixels to near-zero emission: measured OLED power draw scales with subpixel luminance, so a dark canvas cuts panel power meaningfully on a page that is deliberately animating for minutes. It also gives true black-level contrast for the glow, which LCD cannot fake.
   *Why not pure `#000000`:* pure black on OLED causes visible smearing/black-crush during scroll on many panels, and eliminates the elevation ladder. `#06070A` is 1 step off zero — still effectively pixel-off at the subpixel level, but it keeps `surface`/`raised` readable as distinct planes.
3. **Immersion.** A dark canvas hides the browser chrome boundary and makes the viewport feel like a window rather than a document. That is worth measurable dwell time.

The light variant is a genuine design, not an inversion: it swaps glow for **ink weight** — trails become tapering solid strokes with reduced opacity, and the "glow" recipe becomes a soft multiply shadow. It is required for: OS/user preference, print, high-ambient-light outdoor use, and the `forced-colors` path.

### 2.2 Palette

**Signature accent — "Filament" `#4FE9C4`** (spring aqua). One accent carries the brand. It is used for exactly three things: the Traveller, the active/current state, and the single primary action on screen. Never for decoration.

**Supporting accents:**
- **"Ion" `#9B8CFF`** (dark) / `#4B39C9` (light) — the *other* direction: backward navigation, history, recursion depth, secondary orbits.
- **"Ember" `#FFA65C`** (dark) / `#8A4406` (light) — heat/attention: discovery, collectibles, easter eggs, count-ups, "new".

**Verified contrast (measured, WCAG 2.1 relative luminance):**

| Pair | Ratio | Verdict |
|---|---|---|
| `#ECEFF6` text on `#06070A` canvas | **17.50:1** | AAA |
| `#ECEFF6` on `#161B26` raised | **14.97:1** | AAA |
| `#A6B0C3` secondary on `#06070A` | **9.23:1** | AAA |
| `#7B8698` muted on `#06070A` | **5.47:1** | AA (body), AA large |
| `#7B8698` muted on `#161B26` raised | **4.68:1** | AA |
| `#4FE9C4` Filament on `#06070A` | **13.22:1** | AAA |
| `#9B8CFF` Ion on `#06070A` | **7.28:1** | AAA |
| `#FFA65C` Ember on `#06070A` | **10.42:1** | AAA |
| `#06070A` on `#4FE9C4` (primary button) | **13.22:1** | AAA |
| `#FFFFFF` on `#5B48D9` (Ion button) | **6.22:1** | AA |
| Light: `#0B0D12` on `#F7F5F0` | **17.84:1** | AAA |
| Light: `#3E4655` on `#F7F5F0` | **8.71:1** | AAA |
| Light: `#5C6575` muted on `#F7F5F0` | **5.39:1** | AA |
| Light: `#0A6E59` Filament on `#F7F5F0` | **5.69:1** | AA |
| Light: `#4B39C9` Ion on `#F7F5F0` | **7.07:1** | AAA |
| Light: `#8A4406` Ember on `#F7F5F0` | **6.62:1** | AAA |

Borders (`#232A38` dark, `#DCD8CF` light) are decorative at 1.40:1 / 1.31:1 and **never** carry meaning alone; any bordered control also has a ≥3:1 fill or text cue. Focus rings use `--c-focus` (`#7CF3D8` dark, 15.03:1) at 2px + 2px offset — a ≥3:1 non-text contrast against both canvas and surface.

### 2.3 Glow recipe
Glow is never `box-shadow: 0 0 40px accent` alone — that produces a grey haze. The recipe is **three stacked layers at different radii and alphas, plus a hard core**:

```css
.glow {
  /* 1. hard core: full-strength 1px ring keeps the edge crisp */
  box-shadow:
    0 0 0 1px color-mix(in oklab, var(--c-accent) 90%, transparent),
    /* 2. near bloom: tight, bright */
    0 0 8px -1px color-mix(in oklab, var(--c-accent) 55%, transparent),
    /* 3. mid bloom */
    0 0 28px -4px color-mix(in oklab, var(--c-accent) 32%, transparent),
    /* 4. far atmosphere: wide, very low alpha, slightly hue-shifted */
    0 0 72px -12px color-mix(in oklab, var(--c-accent-2) 18%, transparent);
}
/* For SVG/canvas travellers, use a filter instead so it blooms over siblings */
.glow-svg { filter:
  drop-shadow(0 0 3px color-mix(in oklab, var(--c-accent) 80%, transparent))
  drop-shadow(0 0 12px color-mix(in oklab, var(--c-accent) 40%, transparent))
  drop-shadow(0 0 40px color-mix(in oklab, var(--c-accent-2) 20%, transparent)); }
```
Rules: glow radius never exceeds **4× the element's own height**; at most **two** glowing elements per viewport; glow alpha drops by 40% when the element is not the active/hovered one. On light theme, `.glow` degrades to `box-shadow: 0 0 0 1px var(--c-accent), 0 6px 18px -8px color-mix(in oklab, var(--c-accent) 45%, transparent)`.

### 2.4 Trail recipe
Two implementations, same visual law: **the trail is the Traveller's position history with exponential alpha decay, τ ≈ 380ms.**

*SVG (deterministic paths — orbits, the Coil):* one `<path>` with a travelling dash and a gradient stroke.
```css
.trail { stroke: url(#trailGrad); stroke-width: 2; fill: none;
  stroke-linecap: round;
  stroke-dasharray: 18 1000;          /* 18px comet body */
  animation: trail-run var(--loop-cycle) linear infinite;
  animation-delay: var(--phase, 0s); }
@keyframes trail-run { to { stroke-dashoffset: -1018; } }
```
with `<linearGradient id="trailGrad">` running `stop-opacity` 0 → 0.25 → 1 across 0%/55%/100% so the tail fades. Length law: tail length = `velocity_px_per_s × 0.38s`, clamped 24–140px.

*Canvas (pointer trails, particle fields):* do **not** clear the frame; paint `fillStyle = rgba(canvasR,canvasG,canvasB, 1 - exp(-dt/380))` over the whole surface each frame, then draw the head with `globalCompositeOperation = 'lighter'`. This gives true exponential decay that is frame-rate independent. Cap the additive layer at 0.85 alpha so overlapping trails never clip to white.

---

## 3. Typography

### 3.1 The pick: one variable font, display-only, with a metrics-matched system fallback
**Decision: `Bricolage Grotesque Variable` (axes `wght` 200–800, `wdth` 75–100, `opsz` 10–48), self-hosted, latin-subset, ~34KB woff2, used for display and numerals only. Body and UI text use the system stack.**

Justification against LCP < 1s:
- A full two-font webfont pairing costs 2 round trips and 60–120KB before first meaningful paint. One subset file is a single `<link rel=preload>` on the same origin, typically resolved inside the HTML's own connection — no extra DNS/TLS.
- The hero display line is the likely LCP element, so the font *is* in the LCP path. This is solved, not avoided: `font-display: optional` + a metrics-overridden local fallback means the first paint happens immediately in the fallback at **identical box metrics**, LCP is recorded at that paint, and the real font swaps in on the next page load from cache with **zero CLS**. If the subset arrives within the ~100ms block period (it usually will, preloaded, same-origin, HTTP/2), it is used on first paint anyway.
- A variable font gives us `wght` and `wdth` as *animatable* axes, which the motion system uses (§7, "weight breathe" and "width morph"). Two static fonts cannot do that. This is the deciding factor: the font is part of the motion system.

```css
@font-face {
  font-family: "Bricolage";
  src: url("/fonts/bricolage-subset.woff2") format("woff2-variations");
  font-weight: 200 800; font-stretch: 75% 100%;
  font-display: optional; unicode-range: U+0000-00FF, U+2010-2027, U+20AC;
}
/* metrics-matched fallback: tuned so fallback and webfont occupy identical boxes */
@font-face {
  font-family: "Bricolage Fallback";
  src: local("Helvetica Neue"), local("Arial"), local("Roboto");
  size-adjust: 101.5%; ascent-override: 92%; descent-override: 24%; line-gap-override: 0%;
}
:root {
  --font-display: "Bricolage", "Bricolage Fallback", system-ui, sans-serif;
  --font-body: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
               "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, "SF Mono", "Cascadia Mono", Menlo, monospace;
}
```
`--font-mono` carries all counters, timers, coordinates and the loop-phase readout, with `font-variant-numeric: tabular-nums` so count-ups don't jitter.

### 3.2 Fluid scale
Fluid between **360px and 1440px** viewport. All values `rem`-based (root 16px), so user zoom is respected.

| Token | clamp() | min → max | Use |
|---|---|---|---|
| `--fs-display` | `clamp(2.75rem, 1.30rem + 6.44vw, 7.00rem)` | 44 → 112px | Hero line |
| `--fs-h1` | `clamp(2.00rem, 1.32rem + 3.02vw, 4.00rem)` | 32 → 64px | Section title |
| `--fs-h2` | `clamp(1.50rem, 1.17rem + 1.48vw, 2.50rem)` | 24 → 40px | Sub-section |
| `--fs-h3` | `clamp(1.25rem, 1.12rem + 0.56vw, 1.625rem)` | 20 → 26px | Card title |
| `--fs-lead` | `clamp(1.125rem, 1.02rem + 0.46vw, 1.4375rem)` | 18 → 23px | Intro paragraph |
| `--fs-body` | `clamp(1.0rem, 0.96rem + 0.19vw, 1.125rem)` | 16 → 18px | Body |
| `--fs-sm` | `clamp(0.875rem, 0.86rem + 0.09vw, 0.9375rem)` | 14 → 15px | Captions, nav |
| `--fs-xs` | `0.75rem` | 12px | Labels, overline |

Ratio at min viewport ≈ **1.25 (major third)**; at max ≈ **1.5**, so the hierarchy opens up on desktop where there is room for drama.

### 3.3 Letter-spacing and optical rules
Tracking is a function of size — tight on display, open on small caps. Implement as a token per step, not ad hoc:

```css
--ls-display: -0.035em;  /* ≥56px */
--ls-h1:      -0.025em;  /* 32–55px */
--ls-h2:      -0.015em;  /* 24–31px */
--ls-body:     0em;      /* 16–23px */
--ls-sm:       0.005em;  /* 14–15px */
--ls-label:    0.14em;   /* 12px overline/caps — always uppercase, always 500 wght */
```
Also: display text sets `font-optical-sizing: auto`, `text-wrap: balance` on headings ≤4 lines, `text-wrap: pretty` on paragraphs, and `hanging-punctuation: first` where supported. Display weight is **600**, never 700+ at large sizes (the counters close up). Body is **400**, UI labels **500**.

### 3.4 Measure
- Body prose: `max-width: 68ch` (≈ 640–700px), target 60–75 characters.
- Lead paragraph: `max-width: 54ch`.
- Hero display line: `max-width: 18ch` — forces 2–3 lines, which is the shape the hero layout is designed around.
- Line-height: display `0.94`, h1 `1.02`, h2 `1.12`, h3 `1.25`, body `1.6`, small `1.45`. Display line-height below 1 is intentional and safe because the Bricolage subset has predictable ascenders; verify no clipping with `padding-block: 0.08em` on display blocks.

---

## 4. Motion language

### 4.1 Named easings
```css
--ease-loop:    cubic-bezier(0.65, 0.00, 0.35, 1.00); /* symmetric in-out: cyclic things */
--ease-drift:   cubic-bezier(0.37, 0.00, 0.63, 1.00); /* ~sine in-out: idle/ambient only */
--ease-enter:   cubic-bezier(0.16, 1.00, 0.30, 1.00); /* expo-out: things arriving */
--ease-exit:    cubic-bezier(0.70, 0.00, 0.84, 0.00); /* expo-in: things leaving */
--ease-snap:    cubic-bezier(0.20, 0.90, 0.10, 1.00); /* fast commit: presses, toggles */
--ease-orbit:   linear;                                /* constant angular velocity — never ease a rotation */
--ease-elastic: cubic-bezier(0.34, 1.56, 0.64, 1.00); /* ≤1 use per viewport */
```
**Rule:** never ease a continuous rotation or an orbit — non-linear angular velocity reads as a stutter, not a style. `--ease-orbit` exists so that this is a deliberate token choice rather than an omission.

### 4.2 Spring parameters (JS springs, e.g. Motion/`useSpring`)
Simulated at 1000Hz to the 0.15% threshold; `linear()` equivalents included so the same curve can be used in pure CSS with no JS.

| Token | k / c / m | ζ | Settle | Overshoot | Use |
|---|---|---|---|---|---|
| `--spring-soft` | 260 / 26 / 1 | 0.81 | 558ms | 1.3% | Panel/card entrance, layout shifts |
| `--spring-snap` | 420 / 32 / 1 | 0.78 | 443ms | 1.8% | Toggles, nav commit, FLIP transitions |
| `--spring-magnetic` | 180 / 20 / 1 | 0.75 | 646ms | 2.9% | Magnetic buttons, pointer-followers |
| `--spring-bounce` | 300 / 18 / 1 | 0.52 | 778ms | 14.6% | Collectible pickup, easter egg only |

```css
--ease-spring-soft: linear(0,.0732,.2212,.3971,.5565,.6918,.8021,.8803,.935,.9722,.9938,1.006,1.0113,1.0127,1.0119,1.01,1.0079,1.0057,1.004,1.0026,1.0016,1.0009,1);
--ease-spring-snap: linear(0,.0779,.2325,.4081,.573,.7119,.8201,.8987,.9545,.9875,1.0063,1.0153,1.0181,1.0173,1.0148,1.0115,1.0084,1.0058,1.0037,1.0021,1.001,1.0004,1);
--ease-spring-magnetic: linear(0,.0686,.2132,.3894,.5541,.6968,.8142,.8984,.9568,.9953,1.0163,1.0263,1.0286,1.0266,1.0223,1.0174,1.0127,1.0085,1.0053,1.0029,1.0012,1.0001,1);
--ease-spring-bounce: linear(0,.1584,.4661,.7788,.9984,1.1151,1.1462,1.1227,1.0776,1.032,1,.9828,.9786,.9821,.9889,.9954,1,1.0025,1.0031,1.0026,1.0016,1.0007,1);
```

### 4.3 Duration scale
```
--dur-1:   80ms   press/release, colour-only
--dur-2:  120ms   hover in, small state
--dur-3:  180ms   hover out, tooltip, icon swap
--dur-4:  240ms   card lift, reveal, ripple
--dur-5:  360ms   in-page panel, FLIP short
--dur-6:  520ms   section transition (primary)
--dur-7:  720ms   hero choreography beat
--dur-8: 1200ms   full-screen wind/unwind
```
Loop periods are a separate, harmonically related family — **all integer divisors/multiples of the master cycle**:
```
--loop-cycle: 8000ms   (master)
--loop-half:  4000ms
--loop-double:16000ms
--loop-slow: 24000ms
```

### 4.4 The Loop signature: "One Clock, Many Phases"
This is the single motif that makes the site feel authored. Formally:

> Every cyclic element *i* of a set of *n* animates on period `T = --loop-cycle`, with phase `φᵢ = (i / n) · T`, implemented as `animation-delay: calc(-1 * var(--loop-cycle) * var(--i) / var(--n))`. Because the delay is negative, elements start mid-cycle and are never "waiting". Every `T` seconds the whole set returns to its initial configuration simultaneously — **the Return**, the site's recurring payoff moment.

The canonical path is the **Bernoulli lemniscate** (∞), parameterised so a traveller moves along it at near-constant speed:

```
x(t) = a · cos(θ) / (1 + sin²θ)
y(t) = a · sin(θ)·cos(θ) / (1 + sin²θ)      θ = 2π · (t/T + φ)
```
`a` = half the available width. At θ = π/2 and 3π/2 the traveller passes through the crossing point — that instant is the site's beat, and UI accents (ring pulse, nav tick, ember flicker) are aligned to it.

Implementation, no JS required:
```css
@property --loop-t { syntax: "<number>"; inherits: true; initial-value: 0; }
:root { animation: loop-clock var(--loop-cycle) linear infinite; }
@keyframes loop-clock { from { --loop-t: 0 } to { --loop-t: 1 } }

/* a traveller on an SVG path, phase-offset */
.traveller {
  offset-path: path("M0,0 C 120,-90 280,-90 400,0 C 280,90 120,90 0,0"); /* lemniscate */
  offset-rotate: auto;
  animation: travel var(--loop-cycle) linear infinite;
  animation-delay: calc(-1 * var(--loop-cycle) * var(--i) / var(--n));
}
@keyframes travel { to { offset-distance: 100% } }
```
Anything that cannot use `offset-path` (older Safari on the traveller *and* the trail together) falls back to a rotating wrapper with counter-rotating child — visually a circle rather than a figure-eight, which is an acceptable degradation because the Ring primitive still reads.

### 4.5 Idle motion (what moves when the user does nothing)
Idle motion exists to prove the page is alive. Budget: **one ambient system per viewport**, all of it on the compositor (`transform`, `opacity`, `filter` only), total ≤ 2% CPU on a 2019 mid-tier Android.

| Layer | Motion | Amplitude | Period | Easing |
|---|---|---|---|---|
| Background field | vertical drift + parallax by depth | 8–24px | `--loop-slow` (24s) | `--ease-drift` |
| The Traveller | full path circuit | full | `--loop-cycle` | `--ease-orbit` |
| Glow breathe | opacity 0.62 ↔ 0.88 | 26% | `--loop-half` | `--ease-drift` |
| Display text | `wght` 560 ↔ 600 on the *final word only* | 40 units | `--loop-double` | `--ease-drift` |
| Ring indicator | 1 tick advance | — | `--loop-cycle` | step |

**Escalation rule:** after **20s of no input**, amplitude increases by 1.35× and the Next Arc (§6.4) begins a 3-cycle attention pulse (scale 1 → 1.04, opacity +0.15). After **45s**, one previously-hidden discoverable (§7.13) surfaces with an Ember flicker. This is the anti-bounce heartbeat; it resets on any pointermove/scroll/key. Never escalate more than twice, and never escalate while the tab is hidden (`document.visibilityState`) or while `prefers-reduced-motion` is set.

**Hard stop:** all ambient animation pauses on `visibilitychange → hidden` and when the element is outside the viewport (`IntersectionObserver` → `animation-play-state: paused`). This is both a battery rule and a QA item.

### 4.6 Reactive motion (pointer / touch / scroll / tilt)
- **Pointer position** is published once per frame as `--px`, `--py` (0–1, viewport-normalised) and `--pdx`, `--pdy` (velocity, px/frame, clamped ±40) on `:root` from a single rAF loop. Nothing else may attach a `pointermove` listener. Consumers read the variables. Pointer influence is **lerped**, not assigned: `current += (target - current) * 0.12` per frame (≈ 180ms visual lag) — this is what makes it feel like a field rather than a cursor.
- **Parallax depth** is a per-element `--depth` from 0 (fixed) to 1 (fully reactive): `transform: translate3d(calc((var(--px) - .5) * var(--depth) * 40px), calc((var(--py) - .5) * var(--depth) * 28px), 0)`. Max total travel 40px — beyond that it reads as broken layout.
- **Magnetic radius** for buttons: 120px; pull factor 0.28 of the offset, capped at 14px; released with `--spring-magnetic`.
- **Scroll** drives only two things: section progress (0–1 per section, via `animation-timeline: view()`) and the Ring indicator. Scroll-jacking is forbidden. Scroll-linked *morphs* are allowed; scroll-linked *travel* (things flying across the screen as you scroll) is capped at 15% of viewport height.
- **Tilt** (`deviceorientation`) is opt-in only, gated behind a user gesture on iOS, capped at **±6° mapped from ±20° of device rotation**, low-pass filtered (α = 0.15), and auto-disabled if the device reports rotation faster than 90°/s (user is walking). Tilt never controls anything functional — it is pure depth.

### 4.7 `prefers-reduced-motion` — the calm variant, category by category

| Category | Full | Calm (reduce) |
|---|---|---|
| Idle ambient drift | 8–24px travel | **0px travel.** Opacity 0.80 ↔ 0.92 over 12s, `--ease-drift`. Still alive. |
| The Traveller | orbits the path, 8s | Stops at θ = π/2 (the crossing point). Its glow breathes 0.7 ↔ 1.0 over 10s. |
| Trails | 18px comet + decay | Static gradient stroke along the full path, alpha 0.10 → 0.45. The path stays visible. |
| Section transition | 520ms wind + shared element | 180ms cross-fade + 0px translate; shared element still recolours over 180ms so the relation reads. |
| Scroll-linked morph | continuous | Two discrete states, switched at 50% with a 150ms opacity transition. |
| Parallax / tilt | ±40px / ±6° | Disabled entirely. Depth is conveyed by static blur (2px) and opacity instead. |
| Hover lift | translateY(-4px) + scale | Border colour → `--c-accent` and background → `--c-surface-raised` over 120ms. |
| Press | scale(0.97) | Background darkens 8% over 80ms. |
| Ripple | expanding circle 420ms | Single 120ms full-element flash at 12% accent. |
| Count-up | 900ms ticking number | Final value rendered immediately; one 150ms accent colour flash. |
| Ring fill | animated arc sweep | Arc drawn at final value immediately; 150ms opacity fade-in. |
| Text reveal | per-word stagger | Whole block fades in, 160ms, no translate. |
| Page load choreography | 1200ms sequence | 200ms single fade. Content is interactive immediately. |
| Auto-escalation (§4.5) | amplitude ramp | Replaced by a *static* change: the Next Arc gains a visible label after 20s. No motion. |

Implementation is centralised — components do not write their own media queries; they consume `--dur-*` and `--amp-*` tokens that the reduced-motion block overrides globally (see `tokens.css`, §9).

---
