# Loop — Visual & Motion System
**Doc 04 · Visual/Motion Design Lead · v1.0**

This system is deliberately concept-agnostic. Whatever "loop" the concept track lands on — cycles, infinity, rhythm, recursion, orbits, feedback — it resolves to the same three primitives defined here: **the Ring** (a closed path), **the Traveller** (something moving along it), and **the Trail** (the decaying memory of where the Traveller has been). Every page, transition, chart, button and easter egg in the site is built from those three. That constraint is what makes the site instantly recognisable after four seconds and still coherent after four minutes.

The 90%-non-bounce requirement is a motion and affordance problem more than an aesthetic one. Bounce has three causes: nothing is happening (dead page), too much is happening (cognitive bail-out), or nothing is obviously *doable* (no affordance). Sections 1, 4 and 5 attack those three directly.

---

## 1. Design principles

**P1 — Something is always moving, but nothing is ever noisy.**
At any instant, at most **three** independent motion sources are visible in one viewport: one ambient (idle), one reactive (following the pointer/scroll), one state (a transition in flight). Ambient motion is capped at **6% opacity delta, 2° rotation, or 8px travel over ≥6s**. A live page reads as *breathing*; a noisy page reads as *demanding*. Lever: kills the dead-page bail-out without triggering the overload one.

**P2 — One clock, many phases.**
Every looping element in the site derives its animation from a **single 8000ms master cycle** with a per-element phase offset, implemented as a negative `animation-delay`. Nothing has its own arbitrary period. Unrelated elements therefore fall periodically into visual sync — a moment the eye notices without being able to name it. Lever: rewards continued watching with a pattern that resolves.

**P3 — Every ending is a doorway.**
No section ends in whitespace. Every section terminates in a **Next Arc** (§6.4): a visible, labelled, scroll-reactive affordance naming the next destination. The user never decides *whether* to continue, only *which way*. Lever: removes the decision point at which bounce occurs.

**P4 — Motion explains, it does not decorate.**
Any animation longer than 200ms must communicate one of: origin (where this came from), relation (what this belongs to), or state (what changed). Shared-element transitions over cross-fades. Anything that can be removed without losing meaning is shortened to ≤120ms or deleted. Lever: motion that explains never feels like waiting.

**P5 — Calm is a variant, never an absence.**
`prefers-reduced-motion: reduce` produces a *different* design, not a disabled one — still alive, still responsive, still legible as "Loop". Travel becomes tone; rotation becomes opacity; trails become static gradients. Every category in §4 and §7 ships an explicit calm variant. Lever: a dead fallback bounces every motion-sensitive visitor.

---

## 2. Colour

### 2.1 Dark-first, justified
The default theme is dark. Three reasons, in order of weight:

1. **Luminance contrast is the whole visual language.** The Trail is light decaying into darkness; on a light canvas it must be drawn as *darkness*, which reads as dirt. Glow, bloom and additive blending (`screen` / `plus-lighter`) only work over dark ground.
2. **OLED mobile.** Most mobile visitors are on OLED, where power draw scales with subpixel luminance — material on a page that animates for minutes — and true black gives the glow a contrast floor LCD cannot fake.
   *Why not pure `#000000`:* pure black on OLED causes visible smearing/black-crush during scroll on many panels, and eliminates the elevation ladder. `#06070A` is 1 step off zero — still effectively pixel-off at the subpixel level, but it keeps `surface`/`raised` readable as distinct planes.
3. **Immersion.** A dark canvas hides the browser-chrome boundary; the viewport reads as a window, not a document.

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
- A two-font pairing costs 2 round trips and 60–120KB before first meaningful paint. One subset is a single same-origin `<link rel=preload>` — no extra DNS/TLS.
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

## 5. The hero — three concepts

All three are image-free (CSS/SVG/canvas only), fit in ≤ 8KB of markup, and reach first interaction in < 300ms after paint. All three share: display line max 18ch, a persistent Ring indicator top-right/bottom-right, and a Next Arc at the fold edge.

### 5.A "The Coil" — a ribbon you can bend
**Layout.** Full-bleed `100dvh`. A single SVG lemniscate (viewBox `0 0 1200 600`, `preserveAspectRatio="xMidYMid slice"`) occupies the centre band. The display line sits *inside* the crossing point of the figure-eight, so the stroke passes behind and in front of the text (two path copies: one under the text, one above with a clip that reveals only the near lobe). Sub-line and a single ghost button sit below, left-aligned on desktop, centred on mobile.

**What moves.** Three travellers (n = 3, phases 0 / 2.67s / 5.33s) run the lemniscate on the 8s clock with 18px comet trails. The path stroke itself has a slow `stroke-dashoffset` drift on `--loop-slow`. The final word of the display line breathes `wght` 560 ↔ 600 on `--loop-double`.

**What reacts.** The path's four cubic control points lerp toward the pointer with weights by proximity (falloff `1/(1+d²/200²)`, max displacement 46px) — the ribbon *bends toward the cursor* and springs back with `--spring-magnetic`. Pointer speed briefly shortens the comet tails (they compress as the path deforms). On touch: the bend follows the finger; a tap anywhere sends a 520ms luminance pulse around the full path.

**First 3 seconds.** 0–180ms: canvas + text fade in (no translate, protects LCP). 180–700ms: path draws itself via `stroke-dashoffset` 1 → 0, `--ease-enter`. 500–900ms: travellers fade up at 0.2 opacity steps. 900–1200ms: the Next Arc and the Ring indicator fade in. By 1200ms everything is live.

**Affordance.** The ribbon visibly deforms under the cursor within 100ms of the first `pointermove` — the discovery is "this thing responds to me". Plus an explicit Next Arc labelled with destination 1.

**Risk.** The affordance is tactile, not navigational: a user who never moves the pointer sees a pretty loop and leaves.

### 5.B "Signal Return" — feedback made visible
**Layout.** Centred display line on a canvas of concentric rings (28 rings, radii 40 → 1400px, 1px strokes, opacity falling `0.28 → 0.02`). Rings are drawn on a single `<canvas>` sized to `devicePixelRatio`, redrawn only when a pulse is active (otherwise the page is a static canvas + CSS-animated overlay).

**What moves.** Idle: one auto-pulse every 8s (the master clock) expanding from centre at 420px/s, amplitude 1px ring displacement, fading over 2.4s. Ring opacity breathes on `--loop-half`.

**What reacts.** Any click/tap emits a pulse from that point. When a pulse reaches the viewport edge it *returns* — a second, dimmer wave travels back inward and, on arriving at the centre, deposits a word: one of the site's destination names, which lands in Ember and remains as a clickable chip. **The feedback loop literally builds the navigation.** Pointer movement bends the nearest 3 rings by up to 6px (displacement field, falloff radius 260px).

**First 3 seconds.** 0–150ms: text + rings fade. 150ms: an automatic first pulse fires from the centre (demonstrates the mechanic unprompted). ~1.6s: it returns and deposits the first destination chip with a `--spring-bounce` landing. 2.4s: a 14px hint label, "tap anywhere", fades in at 60% opacity and fades out after two cycles or on first interaction.

**Affordance.** Self-demonstrating: the site performs the interaction once, then invites it. Strongest "I caused that" feedback of the three.

**Risk.** Needs canvas + rAF for the reactive layer, and tap → wait 1.6s → nav item inserts latency into navigation discovery.

### 5.C "The Orrery" — the map is the hero *(recommended)*
**Layout.** Centre: a 120px core — a filled Filament disc with the glow recipe and a 1px Ion ring. Around it, **6 destination nodes** on 3 nested elliptical orbits (rx/ry: 260/150, 400/230, 540/310 at desktop; scaled to `min(42vw, 300px)` radius on mobile). Each node is a 12px disc + a label that sits outside the orbit on the node's outward side. The display line is *inside* the core's orbit field, set in two lines, with the orbits passing behind it (`mix-blend-mode: screen` on the orbit layer so strokes fade over the text rather than cutting it).

**What moves.** Each node *i* carries `animation-delay: calc(-1 * var(--period) * var(--i) / var(--n))`, so nodes on a ring are evenly phase-distributed and never start from rest. Orbit periods differ per ring to avoid a rigid carousel look: inner `--loop-cycle` (8s), middle `--loop-double` (16s), outer `--loop-slow` (24s). All are integer multiples, so **every 24s the orrery returns to its exact starting configuration** — the Return (P2). Labels counter-rotate to stay upright. Each node drags a 60px Filament trail on its orbit (§2.4 SVG recipe). Orbit strokes breathe 0.10 ↔ 0.22 opacity on `--loop-half`.

**What reacts.**
- *Gravity:* the node nearest the pointer (within 180px) slows to 35% angular velocity and scales 1 → 1.45 with `--spring-magnetic`; its label brightens from `--c-text-muted` to `--c-text` and its trail lengthens to 110px. Slowing, not just scaling, is the detail that sells "gravity".
- *Magnetic pull:* the node also displaces toward the pointer by up to 14px off-orbit, springing back on leave.
- *Pointer field:* the whole orbit system tilts via `rotate3d` up to ±5° following `--px/--py`, lerped at 0.08.
- *Tap/click:* the node detaches, travels to the core along a 520ms arc (`--ease-snap`), the core flashes to 1.0 opacity, and the section transition (§6) begins with that node as the shared element.
- *Touch:* no hover state; instead the node closest to the *last* touch stays enlarged, and nodes are 44px tap targets (12px visual disc + transparent padding).
- *Scroll:* scrolling down winds the orrery inward — orbits contract to 0.55× and fade to 0.3 as the first section rises, so the hero becomes the background rather than disappearing.

**First 3 seconds.** 0–160ms: display line paints in fallback metrics; core fades in at 0 → 0.9. 160–520ms: the three orbit ellipses draw themselves (`stroke-dashoffset`, staggered 60ms, `--ease-enter`). 400–1000ms: the 6 nodes fade and slide into their orbital positions from the core outward, 80ms stagger, `--spring-soft` — reading as *the site unfolding from a single point*. 900–1300ms: labels fade in at 0.75 opacity. 1300ms: motion settles into steady state; the Ring indicator and Next Arc appear. From ~600ms the nodes are already interactive.

**Affordance.** Six labelled, visibly alive, obviously clickable destinations above the fold within one second, plus a Next Arc for users who prefer to scroll. The exploratory structure of the site *is* the hero image.

**Risk.** "Orbiting nav" is a recognisable trope; distinctiveness must come from execution — the gravity slow-down, the trails, the 24s Return, and the fact that the orrery persists as the site's nav rather than being a one-off splash.

### 5.D Recommendation
**Build C, The Orrery, with A's travelling-comet trail treatment on the orbit paths and B's "first pulse fires itself" tactic** (at 700ms, one node briefly pulses and its trail flares, demonstrating interactivity before any input).

Rationale: bounce is decided in the first 3–5 seconds by whether the visitor sees *something worth doing*. C is the only concept that answers "what is here?" and "what can I do?" at once, above the fold — A answers only the second, B answers the first with a 1.6s delay. C also pays a structural dividend: the hero doubles as the persistent map/nav (§6.2), so every return to it reads as coming back around the loop rather than back to a landing page — true for any interpretation of "loop" the concept track picks. Hold B's pulse in reserve as the site's *ending*: the final section returns to the orrery and fires a pulse that re-lights every visited node.

---

## 6. Section transitions and navigation

### 6.1 The model: the site is a ring
Destinations are arranged in a **closed ring of N** (6 in the hero). "Forward" is clockwise, "back" is counter-clockwise, and after the last destination comes the first. There is no dead end, ever — that is the structural anti-bounce device.

### 6.2 Transition choreography (forward, 520ms total)
1. **0–120ms — Commit.** The chosen node scales to 1.6, its trail flares to 140px, everything else in the orrery drops to 0.25 opacity. `--ease-snap`.
2. **80–420ms — Wind.** The whole orbit field rotates **+60°** and contracts to 0.55×, translating toward the top-right (where it will live as the Ring indicator). `--ease-loop`. The outgoing section (if any) counter-rotates -18° and fades, so the two layers visibly *wind past each other*.
3. **200–520ms — Arrive.** The chosen node runs a FLIP transition into the incoming section's header glyph (same DOM element, `view-transition-name: node-<id>`), landing with `--spring-snap`. Section content reveals in a 3-step stagger (title 0ms, lead 60ms, body 120ms), each `--dur-4` fade + 12px rise.
4. **420–520ms — Settle.** Ring indicator advances one tick with a 1-frame Ember flash; the section's own ambient loop starts at phase 0 so the new section is in sync with the master clock.

```css
@view-transition { navigation: auto; }
::view-transition-old(root) { animation: wind-out var(--dur-6) var(--ease-loop) both; }
::view-transition-new(root) { animation: wind-in  var(--dur-6) var(--ease-enter) both; }
@keyframes wind-out { to { opacity:0; transform: rotate(-18deg) scale(.94) } }
@keyframes wind-in  { from { opacity:0; transform: rotate(8deg) scale(1.04) } }
html[data-nav="back"] ::view-transition-old(root) { animation-name: unwind-out }
html[data-nav="back"] ::view-transition-new(root) { animation-name: unwind-in }
@keyframes unwind-out { to { opacity:0; transform: rotate(18deg) scale(1.06) } }
@keyframes unwind-in  { from { opacity:0; transform: rotate(-8deg) scale(.96) } }
```

### 6.3 Back-navigation = winding backward
Back is not "the forward animation in reverse" mechanically, but it must *read* as rewind:
- Rotation direction inverts (−60° wind, +18° counter).
- Duration is **0.85×** (442ms) — rewinding is faster than discovering.
- Travellers reverse: `animation-direction: reverse` for the duration of the transition, then restored.
- The Ring indicator tick moves counter-clockwise and momentarily renders in **Ion** rather than Filament — the colour is the semantic cue for "backward/history".
- Stagger order inverts (body → lead → title), so content appears to be un-drawn.
- Scroll position of the previous section is restored *before* the transition completes, so the section re-materialises where the user left it. This is essential: restoring after looks like a bug.

### 6.4 The Next Arc (end-of-section affordance)
Every section ends with a 96px-radius arc segment (120° sweep), 2px Filament stroke at 0.35 opacity, with the next destination's name riding the arc (`textPath`) and a small traveller parked at its start.

- **Scroll-linked fill:** as the section's last 240px scroll into view, `stroke-dashoffset` fills the arc 0 → 100% (`animation-timeline: view()`), the label goes to full opacity, and the traveller walks the arc.
- **Over-scroll commit:** continuing to scroll past the end rubber-bands up to 88px; releasing at ≥60% of that distance commits to the next section. Below 60%, it springs back with `--spring-soft`. Also a plain clickable/tappable target (min 48px tall).
- **Never auto-advances without an explicit gesture.** Auto-advance on dwell is a bounce generator, not a retention device.
- **Reduced motion:** arc renders filled immediately; label always visible; commit is click/tap only.

### 6.5 Persistent nav
A single **Ring indicator**: 44px circle, top-right on desktop (`top: 24px; right: 24px`), **bottom-right on mobile** (`bottom: calc(20px + env(safe-area-inset-bottom)); right: 16px`) to sit in the thumb zone.
- Its arc shows **fraction of destinations visited** (not scroll depth) in Filament; a 4px marker dot shows current position; unvisited segments are `--c-border-strong`.
- Tap/click expands it into the orrery as a **full-screen map overlay** in 360ms (the nodes FLIP out from the ring) — the hero returns as navigation, which is the whole continuity idea.
- Idle: one tick of rotation per master cycle; the marker dot pulses 1 → 1.15 on the beat.
- When all N are visited, the ring closes and runs a single 720ms full-circuit light sweep with an Ember flash — the site's completion reward and the trigger for the closing pulse (§5.D).
- That is the entire chrome. No header bar, no hamburger, no footer nav. Keyboard: `Tab` reaches the ring first; `←`/`→` move along the loop; `Esc` closes the map; a visually-hidden skip link and a live region announce each destination change.

---

## 7. Micro-interactions catalogue

All durations reference §4.3 tokens. "Calm" = the `prefers-reduced-motion: reduce` variant — never nothing.

| # | Name | Trigger | Feedback | Duration / easing | Calm variant |
|---|---|---|---|---|---|
| 1 | **Magnetic button** | Pointer within 120px | Button translates 0.28× toward pointer, max 14px; label shifts 0.4× of that (parallax inside the button) | follow lerp 0.12/frame; release `--spring-magnetic` 646ms | No translate. Border `--c-border` → `--c-accent`, 120ms `--ease-snap` |
| 2 | **Press** | `pointerdown` | `scale(0.97)`, glow alpha ×1.3 | `--dur-1` 80ms `--ease-snap` | Background darkens 8%, 80ms |
| 3 | **Ripple** | `pointerup` on a surface | Circle from the exact contact point, 0 → 2.2× element diagonal, opacity 0.22 → 0 | `--dur-4` 420ms `--ease-exit` | One 120ms 12% accent flash on the whole element |
| 4 | **Cursor trail** | `pointermove` (desktop, `hover:hover` only) | 14px Filament dot lagging the cursor at lerp 0.18, with a canvas trail decaying at τ=380ms; dot scales to 2.4× and inverts over interactive elements | continuous | Disabled; native cursor only, with a 2px accent focus ring emphasis |
| 5 | **Ring fill** | Section enters view (40% threshold) | Progress arc sweeps `stroke-dashoffset` to the target value | `--dur-6` 520ms `--ease-loop` | Arc rendered at final value; 150ms opacity fade |
| 6 | **Count-up** | Number enters view | Tabular-num count from 0 with an ease-out tick (frame-decimated to ~24 updates so digits are readable) | 900ms `--ease-enter` | Final value immediately + 150ms Ember colour flash |
| 7 | **Tilt card** | Pointer over card | `rotate3d` ±7° toward pointer, translateZ 14px, specular highlight (radial-gradient tracking `--px/--py` at 8% white) | follow lerp 0.14; reset `--spring-soft` | No rotation. `translateY(-2px)` → removed; instead border → accent + surface lift, 120ms |
| 8 | **Hover lift** | Pointer over list item | `translateY(-4px)`, shadow 0→18px, accent left-edge bar scales Y 0→1 | in `--dur-2` 120ms; out `--dur-3` 180ms `--ease-exit` | Edge bar only, fades in 120ms, no transform |
| 9 | **Text reveal** | Block enters view (25%) | Per-word: opacity 0→1, `translateY(0.4em)`, blur 4px→0; 28ms stagger, max 18 words then whole-line stagger | `--dur-5` 360ms `--ease-enter` | Whole block fades, 160ms, no translate/blur |
| 10 | **Scroll-linked morph** | Section scroll progress | An SVG shape interpolates between two path states (same point count) — e.g. circle → lemniscate — driven by `animation-timeline: view()` | scroll-bound, `linear` | Two discrete states, swap at 50% with a 150ms cross-fade |
| 11 | **Collectible pickup** | Click on a discoverable token | Token scales 1→1.4→0, spins 180°, flies along a 320ms arc to the Ring indicator, which pulses `--spring-bounce` and increments | 520ms total; arc `--ease-snap`, landing `--spring-bounce` | Token fades out 150ms; ring counter increments with a 150ms Ember flash |
| 12 | **Easter egg reveal** | Hidden condition (e.g. traversing the loop 3×, or the 45s idle escalation) | A dormant node ignites: Ember glow ramps 0→1, a 720ms full-path light sweep, one 8px screen-space bloom | `--dur-7` 720ms `--ease-enter` | Node appears with a 200ms fade in Ember; no sweep, no bloom |
| 13 | **Beat pulse** | Master clock crossing point (every 4s) | Ring marker dot 1→1.15→1; active nav label `wght` +40 | 320ms `--ease-drift` | Opacity 0.85→1→0.85 over 1200ms, no scale |
| 14 | **Input focus** | `:focus-visible` | 2px `--c-focus` ring at 2px offset appears instantly; a 1-cycle glow breathe confirms | ring 0ms, breathe 600ms | Ring only, no breathe |
| 15 | **Link underline** | Hover on inline link | Underline (`background-image` gradient, 1.5px) wipes in left→right, then on unhover wipes out right→left — the stroke never reverses, it *continues*, completing a loop | `--dur-3` 180ms `--ease-loop` | Underline opacity 0.4→1, 120ms |
| 16 | **Toggle / segmented control** | Click | Filament pill FLIPs to the new segment, overshooting 4% | `--dur-4` 240ms `--ease-spring-snap` | Pill moves with a 120ms linear transition, no overshoot |
| 17 | **Copy / confirm** | Click on a copy affordance | Icon morphs to a check via `stroke-dashoffset`; a 600ms arc completes around the button, then reverts | 240ms morph, 600ms arc `--ease-loop` | Icon swaps instantly; text label "Copied" appears for 1.6s |
| 18 | **Drag the orrery** | Pointer drag on the hero background | Orbit field rotates 1:1 with horizontal drag; on release, angular momentum decays exponentially (τ = 900ms) back into clock-sync, snapping to the nearest phase | inertial; resync `--dur-8` 1200ms `--ease-loop` | Drag disabled; `←`/`→` step the field 60° with a 180ms transition |
| 19 | **Empty/loading state** | Any async wait > 120ms | A single traveller runs a 48px lemniscate — the loading indicator is the site's own motif, never a generic spinner | `--loop-half` linear infinite | Static lemniscate with an opacity breathe 0.5↔0.9 over 3s |
| 20 | **Section-complete tick** | Section fully scrolled | Ring segment fills, 1-frame Ember flash, Next Arc gains full opacity | 360ms `--ease-loop` | Segment fills instantly; Next Arc label already visible |

---

## 8. Mobile layout rules

- **Viewport units:** `100dvh` for full-height sections with `100svh` as the fallback declaration order (`height: 100svh; height: 100dvh;`). Never `100vh` — it causes the URL-bar jump that makes the hero's bottom affordance invisible at exactly the wrong moment. Use `100lvh` only for backgrounds that may legitimately extend under chrome.
- **Thumb zones (right-handed, 390×844 reference):** *easy* = bottom 0–35% and the right 70% of it; *stretch* = middle 35–70%; *hard* = top 30% and the top-left corner. Therefore: the Ring indicator, the Next Arc and every primary action sit in the easy zone. Decorative and display content occupies the hard zone. Never put a destructive action adjacent to a primary one in the easy zone (min 12px separation, and prefer different zones).
- **Bottom-anchored actions:** `position: fixed; inset-inline: 0; bottom: 0; padding-bottom: max(16px, env(safe-area-inset-bottom)); padding-top: 12px;` with a `backdrop-filter: blur(12px)` and a top hairline. The bar hides on scroll-down (translateY 100%, 180ms `--ease-exit`) and returns on scroll-up (`--ease-enter`) so it never covers content the user is reading.
- **Safe areas:** `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`. Every fixed/absolute edge element adds the corresponding `env(safe-area-inset-*)`. Horizontal insets matter in landscape on notched devices: `padding-inline: max(16px, env(safe-area-inset-left), env(safe-area-inset-right))`.
- **Touch targets:** 48×48px minimum hit area (visual mark may be smaller — use transparent padding or `::after` expansion). Spacing between adjacent targets ≥ 8px.
- **Hover replacement:** every hover behaviour is wrapped in `@media (hover: hover) and (pointer: fine)`. On touch, the equivalent affordance is: (a) `:active` press feedback within 80ms — never wait for `touchend`; (b) `touch-action: manipulation` to kill the 300ms delay; (c) the "hovered" state becomes a *persistent selected* state applied to the last-touched item; (d) magnetic/gravity effects are replaced by a one-shot pulse at the touch point.
- **Motion on touch:** pointer-field parallax is driven by scroll position instead of pointer position. Tilt is opt-in only (§4.6). Cursor trail does not exist; the ripple (#3) is its replacement.
- **Type:** body never below 16px (prevents iOS zoom-on-focus); display bottoms out at 44px; the 18ch measure gives a 2–3 line hero on a 390px screen — check for no orphan word on line 3.
- **Performance budget on mobile:** ≤ 3 simultaneously animating compositor layers, canvas at `min(devicePixelRatio, 2)`, and the ambient system drops to half frame rate (rAF every other frame) when `navigator.hardwareConcurrency <= 4` or `navigator.connection.saveData` is true.

---

## 9. `tokens.css` — complete, paste-ready

```css
/* ============================================================
   LOOP — tokens.css  v1.0
   Order: reset → palette → semantic → type → space → motion
   ============================================================ */

/* ---------- 1. Reset ---------- */
*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; }
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%;
       scroll-behavior: smooth; }
body { min-height: 100svh; min-height: 100dvh;
       font-family: var(--font-body); font-size: var(--fs-body);
       line-height: 1.6; letter-spacing: var(--ls-body);
       color: var(--c-text); background: var(--c-canvas);
       -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
       overflow-x: clip; }
img, svg, video, canvas { display: block; max-width: 100%; }
button, input, select, textarea { font: inherit; color: inherit; }
button { background: none; border: 0; cursor: pointer; touch-action: manipulation; }
a { color: inherit; text-decoration: none; }
h1,h2,h3,h4 { font-family: var(--font-display); font-weight: 600;
              text-wrap: balance; font-optical-sizing: auto; }
p { text-wrap: pretty; }
:focus-visible { outline: 2px solid var(--c-focus); outline-offset: 2px;
                 border-radius: var(--r-sm); }
:focus:not(:focus-visible) { outline: none; }
::selection { background: var(--c-accent); color: var(--c-canvas); }

/* ---------- 2. Palette (raw) ---------- */
:root {
  /* Filament — signature */
  --p-fil-100:#E6FFF8; --p-fil-300:#9CF6E0; --p-fil-400:#7CF3D8;
  --p-fil-500:#4FE9C4; --p-fil-600:#22C9A3; --p-fil-700:#0A6E59; --p-fil-900:#04332A;
  /* Ion — support 1 */
  --p-ion-300:#C3BAFF; --p-ion-400:#9B8CFF; --p-ion-500:#7B68F5;
  --p-ion-600:#5B48D9; --p-ion-700:#4B39C9; --p-ion-900:#231A63;
  /* Ember — support 2 */
  --p-emb-300:#FFC79A; --p-emb-400:#FFA65C; --p-emb-500:#F5842A;
  --p-emb-700:#8A4406; --p-emb-900:#3D1E02;
  /* Neutrals (cool, slightly blue) */
  --p-n-0:#06070A;  --p-n-50:#0D1016; --p-n-100:#161B26; --p-n-200:#1E2431;
  --p-n-300:#232A38; --p-n-400:#2E374A; --p-n-500:#4A5566; --p-n-600:#7B8698;
  --p-n-700:#A6B0C3; --p-n-800:#CDD4E0; --p-n-900:#ECEFF6; --p-n-1000:#FFFFFF;
  /* Warm paper neutrals (light theme) */
  --p-w-50:#FFFFFF; --p-w-100:#FCFBF8; --p-w-200:#F7F5F0; --p-w-300:#EDEAE2;
  --p-w-400:#DCD8CF; --p-w-500:#B8B3A8;
  /* Status */
  --p-ok:#4FE9C4; --p-warn:#FFA65C; --p-err:#FF6B6B; --p-err-700:#B3221F;
}

/* ---------- 3. Semantic tokens — DARK (default) ---------- */
:root, [data-theme="dark"] {
  color-scheme: dark;
  --c-canvas:          var(--p-n-0);     /* 17.50:1 vs text  */
  --c-surface:         var(--p-n-50);
  --c-surface-raised:  var(--p-n-100);
  --c-surface-overlay: color-mix(in oklab, var(--p-n-50) 82%, transparent);
  --c-border:          var(--p-n-300);
  --c-border-strong:   var(--p-n-400);
  --c-text:            var(--p-n-900);   /* 17.50:1 */
  --c-text-secondary:  var(--p-n-700);   /*  9.23:1 */
  --c-text-muted:      var(--p-n-600);   /*  5.47:1 */
  --c-text-inverse:    var(--p-n-0);
  --c-accent:          var(--p-fil-500); /* 13.22:1 */
  --c-accent-hi:       var(--p-fil-400); /* 15.03:1 */
  --c-accent-dim:      var(--p-fil-600);
  --c-accent-2:        var(--p-ion-400); /*  7.28:1 — back/history/recursion */
  --c-accent-3:        var(--p-emb-400); /* 10.42:1 — discovery/heat */
  --c-on-accent:       var(--p-n-0);     /* 13.22:1 on Filament */
  --c-on-accent-2:     var(--p-n-1000);  /*  6.22:1 on --p-ion-600 */
  --c-focus:           var(--p-fil-400);
  --c-ok:   var(--p-ok); --c-warn: var(--p-warn); --c-error: var(--p-err);
  --c-trail-0: color-mix(in oklab, var(--c-accent) 0%,  transparent);
  --c-trail-1: color-mix(in oklab, var(--c-accent) 35%, transparent);
  --c-trail-2: var(--c-accent-hi);
  --shadow-1: 0 1px 2px rgb(0 0 0 / .5);
  --shadow-2: 0 8px 24px -8px rgb(0 0 0 / .65);
  --shadow-3: 0 24px 64px -24px rgb(0 0 0 / .8);
  --glow-1: 0 0 8px -1px color-mix(in oklab, var(--c-accent) 55%, transparent);
  --glow-2: 0 0 28px -4px color-mix(in oklab, var(--c-accent) 32%, transparent);
  --glow-3: 0 0 72px -12px color-mix(in oklab, var(--c-accent-2) 18%, transparent);
  --glow-full: 0 0 0 1px color-mix(in oklab, var(--c-accent) 90%, transparent),
               var(--glow-1), var(--glow-2), var(--glow-3);
  --grid-line: color-mix(in oklab, var(--p-n-500) 22%, transparent);
  --blend-traveller: plus-lighter;
}

/* ---------- 4. Semantic tokens — LIGHT ---------- */
[data-theme="light"] {
  color-scheme: light;
  --c-canvas:          var(--p-w-200);   /* 17.84:1 vs text */
  --c-surface:         var(--p-w-50);
  --c-surface-raised:  var(--p-w-50);
  --c-surface-overlay: color-mix(in oklab, var(--p-w-50) 86%, transparent);
  --c-border:          var(--p-w-400);
  --c-border-strong:   var(--p-w-500);
  --c-text:            #0B0D12;          /* 17.84:1 */
  --c-text-secondary:  #3E4655;          /*  8.71:1 */
  --c-text-muted:      #5C6575;          /*  5.39:1 */
  --c-text-inverse:    var(--p-w-50);
  --c-accent:          var(--p-fil-700); /*  5.69:1 */
  --c-accent-hi:       var(--p-fil-700);
  --c-accent-dim:      var(--p-fil-600);
  --c-accent-2:        var(--p-ion-700); /*  7.07:1 */
  --c-accent-3:        var(--p-emb-700); /*  6.62:1 */
  --c-on-accent:       var(--p-w-50);
  --c-on-accent-2:     var(--p-w-50);
  --c-focus:           var(--p-ion-700);
  --c-error: var(--p-err-700);
  --c-trail-0: color-mix(in oklab, var(--c-accent) 0%,  transparent);
  --c-trail-1: color-mix(in oklab, var(--c-accent) 28%, transparent);
  --c-trail-2: var(--c-accent);
  --shadow-1: 0 1px 2px rgb(20 18 14 / .08);
  --shadow-2: 0 8px 24px -10px rgb(20 18 14 / .16);
  --shadow-3: 0 24px 64px -28px rgb(20 18 14 / .22);
  /* light theme trades glow for ink weight */
  --glow-1: 0 0 0 1px color-mix(in oklab, var(--c-accent) 70%, transparent);
  --glow-2: 0 6px 18px -8px color-mix(in oklab, var(--c-accent) 45%, transparent);
  --glow-3: 0 0 0 0 transparent;
  --glow-full: var(--glow-1), var(--glow-2);
  --grid-line: color-mix(in oklab, #0B0D12 10%, transparent);
  --blend-traveller: multiply;
}
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) { /* duplicate of [data-theme=light] block */
    color-scheme: light;
    --c-canvas:var(--p-w-200); --c-surface:var(--p-w-50);
    --c-surface-raised:var(--p-w-50);
    --c-surface-overlay:color-mix(in oklab,var(--p-w-50) 86%,transparent);
    --c-border:var(--p-w-400); --c-border-strong:var(--p-w-500);
    --c-text:#0B0D12; --c-text-secondary:#3E4655; --c-text-muted:#5C6575;
    --c-text-inverse:var(--p-w-50);
    --c-accent:var(--p-fil-700); --c-accent-hi:var(--p-fil-700);
    --c-accent-2:var(--p-ion-700); --c-accent-3:var(--p-emb-700);
    --c-on-accent:var(--p-w-50); --c-on-accent-2:var(--p-w-50);
    --c-focus:var(--p-ion-700); --c-error:var(--p-err-700);
    --glow-1:0 0 0 1px color-mix(in oklab,var(--c-accent) 70%,transparent);
    --glow-2:0 6px 18px -8px color-mix(in oklab,var(--c-accent) 45%,transparent);
    --glow-3:0 0 0 0 transparent; --glow-full:var(--glow-1),var(--glow-2);
    --grid-line:color-mix(in oklab,#0B0D12 10%,transparent);
    --blend-traveller:multiply;
  }
}

/* ---------- 5. Type ---------- */
:root {
  --font-display:"Bricolage","Bricolage Fallback",system-ui,sans-serif;
  --font-body:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,
              "Helvetica Neue",Arial,sans-serif;
  --font-mono:ui-monospace,"SF Mono","Cascadia Mono",Menlo,monospace;
  --fs-display:clamp(2.75rem,1.30rem + 6.44vw,7rem);
  --fs-h1:clamp(2rem,1.32rem + 3.02vw,4rem);
  --fs-h2:clamp(1.5rem,1.17rem + 1.48vw,2.5rem);
  --fs-h3:clamp(1.25rem,1.12rem + 0.56vw,1.625rem);
  --fs-lead:clamp(1.125rem,1.02rem + 0.46vw,1.4375rem);
  --fs-body:clamp(1rem,0.96rem + 0.19vw,1.125rem);
  --fs-sm:clamp(0.875rem,0.86rem + 0.09vw,0.9375rem);
  --fs-xs:0.75rem;
  --lh-display:0.94; --lh-h1:1.02; --lh-h2:1.12; --lh-h3:1.25;
  --lh-body:1.6; --lh-sm:1.45;
  --ls-display:-0.035em; --ls-h1:-0.025em; --ls-h2:-0.015em;
  --ls-body:0em; --ls-sm:0.005em; --ls-label:0.14em;
  --measure:68ch; --measure-lead:54ch; --measure-display:18ch;
}

/* ---------- 6. Space, radius, layout, z ---------- */
:root {
  --sp-1:0.25rem; --sp-2:0.5rem;  --sp-3:0.75rem; --sp-4:1rem;
  --sp-5:1.5rem;  --sp-6:2rem;    --sp-7:3rem;    --sp-8:4rem;
  --sp-9:6rem;    --sp-10:8rem;
  --gutter:max(1rem,env(safe-area-inset-left),env(safe-area-inset-right));
  --gutter-b:max(1rem,env(safe-area-inset-bottom));
  --content-max:76rem;
  --r-sm:6px; --r-md:12px; --r-lg:20px; --r-xl:32px; --r-full:9999px;
  --tap-min:48px;
  --z-bg:0; --z-content:10; --z-nav:80; --z-overlay:90; --z-cursor:100;
}

/* ---------- 7. Motion ---------- */
:root {
  --ease-loop:cubic-bezier(.65,0,.35,1);
  --ease-drift:cubic-bezier(.37,0,.63,1);
  --ease-enter:cubic-bezier(.16,1,.3,1);
  --ease-exit:cubic-bezier(.7,0,.84,0);
  --ease-snap:cubic-bezier(.2,.9,.1,1);
  --ease-orbit:linear;
  --ease-elastic:cubic-bezier(.34,1.56,.64,1);
  --ease-spring-soft:linear(0,.0732,.2212,.3971,.5565,.6918,.8021,.8803,.935,.9722,.9938,1.006,1.0113,1.0127,1.0119,1.01,1.0079,1.0057,1.004,1.0026,1.0016,1.0009,1);
  --ease-spring-snap:linear(0,.0779,.2325,.4081,.573,.7119,.8201,.8987,.9545,.9875,1.0063,1.0153,1.0181,1.0173,1.0148,1.0115,1.0084,1.0058,1.0037,1.0021,1.001,1.0004,1);
  --ease-spring-magnetic:linear(0,.0686,.2132,.3894,.5541,.6968,.8142,.8984,.9568,.9953,1.0163,1.0263,1.0286,1.0266,1.0223,1.0174,1.0127,1.0085,1.0053,1.0029,1.0012,1.0001,1);
  --ease-spring-bounce:linear(0,.1584,.4661,.7788,.9984,1.1151,1.1462,1.1227,1.0776,1.032,1,.9828,.9786,.9821,.9889,.9954,1,1.0025,1.0031,1.0026,1.0016,1.0007,1);
  --dur-1:80ms;  --dur-2:120ms; --dur-3:180ms; --dur-4:240ms;
  --dur-5:360ms; --dur-6:520ms; --dur-7:720ms; --dur-8:1200ms;
  --loop-cycle:8000ms; --loop-half:4000ms;
  --loop-double:16000ms; --loop-slow:24000ms;
  /* amplitudes — components must read these, never hardcode */
  --amp-drift:24px; --amp-parallax:40px; --amp-lift:4px;
  --amp-tilt:7deg;  --amp-magnet:14px;  --amp-breathe:0.26;
  --amp-scale-press:0.97; --amp-scale-hover:1.03;
  --trail-len:18px; --trail-tau:380ms;
  --phase-n:6; /* default set size for phase offsets */
  --follow-lerp:0.12;
}
/* phase helper: set --i on each child */
.loop-set > * { animation-delay: calc(-1 * var(--loop-cycle) * var(--i) / var(--phase-n)); }

@property --loop-t { syntax:"<number>"; inherits:true; initial-value:0; }
@property --px { syntax:"<number>"; inherits:true; initial-value:0.5; }
@property --py { syntax:"<number>"; inherits:true; initial-value:0.5; }
:root { animation: loop-clock var(--loop-cycle) linear infinite; }
@keyframes loop-clock { from{--loop-t:0} to{--loop-t:1} }

/* ---------- 8. Reduced motion — calm variant, not off ---------- */
@media (prefers-reduced-motion: reduce) {
  :root {
    --dur-1:60ms; --dur-2:100ms; --dur-3:120ms; --dur-4:150ms;
    --dur-5:160ms; --dur-6:180ms; --dur-7:200ms; --dur-8:220ms;
    --loop-cycle:12000ms; --loop-half:12000ms;
    --loop-double:12000ms; --loop-slow:12000ms;
    --amp-drift:0px; --amp-parallax:0px; --amp-lift:0px;
    --amp-tilt:0deg;  --amp-magnet:0px;  --amp-breathe:0.12;
    --amp-scale-press:1; --amp-scale-hover:1;
    --trail-len:0px; --follow-lerp:1;
    --ease-spring-soft:var(--ease-snap);
    --ease-spring-snap:var(--ease-snap);
    --ease-spring-magnetic:var(--ease-snap);
    --ease-spring-bounce:var(--ease-snap);
    --ease-elastic:var(--ease-snap);
    scroll-behavior:auto;
  }
  /* travel dies; luminance lives */
  .traveller, .orbit-node { animation-name: calm-breathe !important;
    animation-duration: var(--loop-cycle) !important;
    animation-timing-function: var(--ease-drift) !important; offset-distance:25% !important; }
  .trail { animation: none !important; stroke-dasharray: none !important; opacity:.4; }
  .parallax, .tilt { transform: none !important; }
  @keyframes calm-breathe { 0%,100%{opacity:.7} 50%{opacity:1} }
  /* never remove all motion — only cap it */
  *, *::before, *::after {
    animation-duration: var(--dur-5); animation-iteration-count: 1;
    transition-duration: var(--dur-3);
  }
  .is-ambient, .is-ambient * {
    animation-duration: var(--loop-cycle) !important;
    animation-iteration-count: infinite !important;
  }
}
@media (prefers-reduced-transparency: reduce) {
  :root { --c-surface-overlay: var(--c-surface); }
  .glass { backdrop-filter: none; }
}
@media (prefers-contrast: more) {
  :root { --c-text-muted: var(--c-text-secondary); --c-border: var(--c-border-strong); }
}
@media (forced-colors: active) {
  :root { --c-accent: Highlight; --c-text: CanvasText; --c-canvas: Canvas; }
  .glow, .traveller { forced-color-adjust: none; }
}

/* ---------- 9. Base utilities ---------- */
.u-glow { box-shadow: var(--glow-full); }
.u-measure { max-width: var(--measure); }
.u-display { font-family:var(--font-display); font-size:var(--fs-display);
  line-height:var(--lh-display); letter-spacing:var(--ls-display);
  max-width:var(--measure-display); padding-block:0.08em; }
.u-label { font-size:var(--fs-xs); letter-spacing:var(--ls-label);
  text-transform:uppercase; font-weight:500; color:var(--c-text-muted); }
.u-num { font-family:var(--font-mono); font-variant-numeric:tabular-nums; }
.u-sr { position:absolute; width:1px; height:1px; padding:0; margin:-1px;
  overflow:hidden; clip-path:inset(50%); white-space:nowrap; }
@media (hover: hover) and (pointer: fine) { .u-hover-lift:hover {
  transform: translateY(calc(-1 * var(--amp-lift)));
  transition: transform var(--dur-2) var(--ease-snap); } }
```

---

## 10. Visual QA checklist (20 items)

1. **Contrast:** every text/background pair measures ≥ 4.5:1 (≥ 3:1 for ≥24px or ≥19px bold) in *both* themes; measured on the final composited pixels, including text over gradients and glow.
2. **Non-text contrast:** focus rings, active borders and the Ring indicator's filled vs unfilled segments measure ≥ 3:1 against adjacent colours.
3. **Colour is never the sole cue:** visited/unvisited, forward/back and error states each carry a second cue (shape, icon, position, label).
4. **One accent rule:** no viewport contains more than one primary Filament action; no viewport contains more than two glowing elements.
5. **Idle budget:** with the pointer parked, at most three independent motion sources are visible; each obeys the amplitude caps in §4.5.
6. **One clock:** every looping animation's period is `--loop-cycle` or an integer multiple/divisor; verify visually that a full Return occurs every 24s.
7. **Phase offsets:** elements in a set start mid-cycle (negative delays) — nothing visibly "begins" when it scrolls into view unless that is the intent.
8. **Reduced motion:** with `prefers-reduced-motion: reduce`, the page is still visibly alive (something changes within 12s), nothing translates more than 2px, and every interaction still gives feedback within 150ms.
9. **Reduced motion parity:** no functionality, label or destination is reachable only via a motion-dependent affordance.
10. **Keyboard:** full traversal of the loop by keyboard alone; focus order matches visual order; `:focus-visible` is never clipped by `overflow: hidden`; `Esc` closes the map overlay; focus returns to the trigger.
11. **Screen reader:** each destination change announces via a live region; the orrery exposes real links (not `div`s with click handlers); decorative SVG is `aria-hidden`.
12. **LCP:** hero display text paints < 1.0s on a simulated Moto G4 / Slow 4G; the font swap causes **zero** CLS (measure CLS ≤ 0.02 total).
13. **No layout shift from motion:** all animation uses `transform`/`opacity`/`filter`; no animated `width`, `height`, `top`, `left`, or `margin` anywhere.
14. **Frame rate:** hero and one section transition sustain ≥ 55fps on a mid-tier Android; no long task > 120ms during the load choreography.
15. **Backgrounded pages are silent:** with the tab hidden or the element off-screen, all `rAF` loops and CSS animations are paused (verify via DevTools performance recording).
16. **dvh correctness:** on iOS Safari and Android Chrome, the hero's bottom affordance is visible both before and after the URL bar collapses.
17. **Safe areas:** on a notched device in both orientations, no fixed element is occluded and nothing sits under the home indicator.
18. **Touch:** every interactive target is ≥ 48×48px with ≥ 8px separation; press feedback appears within 80ms of `pointerdown`; no hover-only affordance exists on touch.
19. **Back navigation:** browser back restores scroll position *before* the transition completes, runs the counter-clockwise (Ion) variant, and never re-plays the hero load choreography.
20. **Dead ends:** every section ends in a Next Arc with a named destination; no scroll position in the site produces a screen with no visible onward action.

---

### Appendix — open dependencies on the concept track
- Final destination count N (system assumes 6; 4–8 works without change, >8 requires a second orbit ring and a Ring indicator redesign).
- Destination names ≤ 14 characters each, so orbit labels do not collide at mobile radii.
- Whether the "loop" reading is spatial (orbits) or temporal (rhythm/feedback). If temporal, swap the lemniscate path for a phase-shifted waveform and keep everything else — the three primitives (Ring, Traveller, Trail) are unchanged.
