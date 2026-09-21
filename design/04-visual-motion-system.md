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
