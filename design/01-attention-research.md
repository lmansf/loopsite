# 01 — Attention & Retention Research Brief
## Target: ≥90% non-bounce. What that actually requires, and how to build it.

**Author:** attention-and-retention research agent
**Status:** authoritative for build decisions; supersedes intuition
**Applies to:** the "Loop" site, whatever Loop turns out to be

---

## 0. First: define the number, or the target is meaningless

"90% of visitors must not bounce" is only defensible if we pin the metric. Three candidate definitions, wildly different difficulty:

| Definition | What counts as non-bounce | Realistic ceiling |
|---|---|---|
| A. GA4 "engaged session" | session ≥10s **OR** ≥2 pageviews **OR** a conversion event | 90% is hard but achievable |
| B. Classic UA bounce | ≥2 pageviews (a second URL) | 90% is near-impossible on cold traffic |
| C. Strict behavioral | ≥30s dwell **AND** ≥1 deliberate interaction **AND** ≥2 content units consumed | 90% is fantasy without qualified traffic |

**Adopt definition A, hardened.** We commit to: *90% of sessions reach ≥10s dwell AND fire at least one intentional interaction event (scroll past 50% of first viewport, a click/tap on an interactive element, or a keyboard activation).* Passive 10-second dwell alone is a cheat — a user reading a loading spinner for 10s is a bounce in everything but the telemetry.

Why this is tractable: Nielsen Norman Group's abandonment research (applying Weibull survival analysis to page-dwell data) shows 99% of web pages exhibit **negative aging** — the hazard of leaving is highest in the first 10 seconds, stays elevated through ~30 seconds, and then the curve flattens hard. Past ~30s, people commonly stay 2+ minutes. So the entire war is fought in the first 30 seconds, and mostly in the first 10. Our design budget should be allocated accordingly: **roughly 70% of design effort into seconds 0–10.**

**Benchmarks to beat.** Cross-industry median GA4 bounce is ~47% (engagement ~53%); top-quartile sites sit near 36% bounce. Content/blog sites run 70–90% bounce; ecommerce 20–47%; SaaS 35–55%. Mobile bounces roughly 12 points worse than desktop (≈51.8% vs ≈39.7%) — a structural gap we must close, not inherit. **A 10% bounce rate would be roughly 4x better than the median site and better than the best-performing category.** This is only reachable if the page is (a) instantly fast, (b) instantly legible, (c) instantly interactive, and (d) structurally hard to finish. Treat any of those four missing as a project failure, not a polish item.

---

## 1. What actually causes bounces, by time window

### 1.1 The 0–3 second window: mechanical failure
Nobody bounces here because of your copy. They bounce because the machine is broken or the page insults them.

**Load time → bounce probability (Google, ~900k mobile landing pages):**

| Load time | Increase in bounce probability |
|---|---|
| 1s → 3s | **+32%** |
| 1s → 5s | **+90%** |
| 1s → 6s | +106% |
| 1s → 10s | **+123%** |

That is *relative increase in probability*, not absolute bounce rate — but the direction is brutal and replicated everywhere. Additional consistent findings: ~53% of mobile visits are abandoned if load exceeds 3s; each 100ms of latency measurably costs conversion in retail A/B tests.

**Core Web Vitals thresholds (measured at the 75th percentile of real users, not lab):**

| Metric | Good | Poor | Our hard budget |
|---|---|---|---|
| LCP (largest contentful paint) | < 2.5s | > 4.0s | **< 1.5s on 4G mid-tier Android** |
| INP (interaction to next paint) | < 200ms | > 500ms | **< 150ms** |
| CLS (cumulative layout shift) | < 0.1 | > 0.25 | **< 0.02** |

We set budgets tighter than "good" because "good" is the median-site bar and we are targeting 4x the median.

**Specific 0–3s killers, ranked by damage:**
1. **Blank screen / spinner.** A spinner is an admission that you have nothing to show. Ship server-rendered or inlined above-the-fold HTML+CSS so first paint is real content, not a skeleton. Skeletons are acceptable *only* for below-fold or secondary content.
2. **Layout shift (CLS).** A user who reaches for a control that jumps is a user who feels the page is hostile. Every image, embed, ad slot, and web font must reserve space (`width`/`height` attributes, `aspect-ratio`, `min-height` on dynamic containers).
3. **FOIT/FOUT font thrash.** Use `font-display: optional` or `swap` with a metric-matched fallback (`size-adjust`, `ascent-override`) so the swap causes zero reflow. Better: system font stack for body, one display face preloaded for the hero only.
4. **Cookie/consent wall, age gate, region interstitial, newsletter modal on entry.** Anything that covers content before content has been seen. An entry modal is the single most efficient bounce generator ever invented; interstitials that hide main content are also a Google mobile ranking penalty. **Rule: zero overlays for the first 30 seconds AND until 50% scroll depth, whichever is later.** Consent, if legally required, must be a non-blocking bottom bar that does not obscure the hero.
5. **Autoplaying sound.** Instant bounce, plus browsers block it anyway. Muted motion is fine; audio must be user-initiated.
6. **Heavy JS blocking interactivity.** A page that is *painted* but not *responsive* for 2s reads as broken. Defer everything non-essential; the first interaction must work off HTML/CSS or a tiny inline script.

### 1.2 The 3–10 second window: comprehension failure
The page works. Now: *what is this, and why should I care?* NN/g's finding is direct — to earn minutes of attention you must communicate the value proposition within ~10 seconds.

Bounce causes here:
- **No answer to "what is this?"** in the first viewport, in plain language. Clever taglines that require a second read are a tax on a budget of ~5 seconds.
- **Abstraction without an example.** "Loop is a platform for X" is worse than showing one concrete loop doing something.
- **Cognitive overload.** More than ~5–7 competing visual elements in the first viewport, three equally-weighted CTAs, a mega-menu, and a carousel all fighting for the same attention. Hick's Law: choice time rises with the log of the number of options. One primary action, one secondary, everything else subordinate.
- **Carousels.** Well-replicated finding: the vast majority of hero-carousel clicks go to slide 1, with sharp drop-offs after; auto-rotation also hurts accessibility and comprehension. **Banned.**
- **Stock-photo generic-ness.** Reads as "this is the same as the last twelve sites" → bounce by pattern-match. Novelty is the entire reason a user gives you a second chance.
- **Mismatch with referrer promise.** If the link said one thing and the page says another, bounce is immediate and correct. Every inbound campaign/landing pair must be message-matched.

### 1.3 The 10–30 second window: motivation failure
They understand it and haven't found a reason to continue. The hazard rate is still high; the curve doesn't flatten until ~30s.

Bounce causes here:
- **The first viewport is a complete, closed statement.** If the hero resolves everything, the correct user behavior is to leave. **Every screen must end in an open loop.**
- **No visible next step / dead-end scroll.** Long uniform scroll with no landmarks feels like work.
- **Interactivity that costs more than it pays.** A form, a login wall, a "choose your role" gate before any value has been delivered.
- **Nothing responded to them.** A page that never reacts to hover, tap, scroll, or cursor feels like a poster, not a place. Agency is the difference between reading and exploring.
- **Mobile friction**: tiny tap targets, horizontal overflow, a sticky header eating 25% of a 640px viewport, `100vh` sections that are actually taller than the visible area on iOS Safari.

---

## 2. Attention mechanics: how each works, evidence strength, implementation, failure mode

Evidence grades: **A** = robust replicated experimental/behavioral-economics support plus consistent web-analytics corroboration. **B** = solid theory with good but partial or context-dependent empirical support. **C** = practitioner consensus, weak formal evidence, still worth using.

### 2.1 Curiosity gap (information-gap theory — Loewenstein, 1994) — **A**
**How:** Curiosity spikes when a person becomes aware of a *specific, small, closable* gap in their knowledge. Not vague mystery — a precisely-shaped hole. Curiosity is strongest at intermediate uncertainty: a gap that is ~70% filled.
**Implementation:** Every card, section heading, and link label states enough that the reader can *almost* predict the answer. Pattern: `<known anchor> + <specific unresolved variable>` — e.g. "3,412 loops have run today. One of them has never been closed." Show a partially-revealed artifact (a blurred cell in a grid, a counter with one digit obscured, a node in a graph labeled "?").
**Failure mode:** Clickbait. If the payoff is smaller than the gap implied, trust collapses and the *next* gap is ignored — the mechanic self-destructs after one betrayal. Rule: the payoff must be ≥ the promise, every time, no exceptions.

### 2.2 Zeigarnik effect / open loops — **B** (original effect replicates unevenly; the *behavioral* version — unfinished tasks with visible state drive return — is strong)
**How:** Interrupted or incomplete tasks retain cognitive accessibility; the mind keeps them in working memory. In product terms: visible incompleteness creates pull.
**Implementation:** Persist a visible, unfinished state in `localStorage` — "You've seen 4 of 12 loops", a partially-filled ring in the header, a trail of visited nodes on a map. Cut sections mid-thought at the fold boundary so the next screen is the completion. Never let the viewport end on a period; end it on a colon.
**Failure mode:** Anxiety/guilt framing ("You've left 8 things unfinished!") reads as nagging and drives people away. Keep it neutral-to-inviting; never use red, never use a countdown for it.

### 2.3 Variable-ratio reward — **A** (one of the most robust findings in all of behavioral psychology)
**How:** Rewards on an unpredictable schedule produce far higher and more persistence-resistant response rates than fixed schedules. Dopaminergic response tracks *prediction error*, i.e. surprise, not the reward itself.
**Implementation:** The "one more" surface — a shuffle/next control where the returned item is drawn from a pool with genuinely variable quality/type: most items are good, ~1 in 8 is unusual (a rare visual treatment, an unexpected interaction, a hidden mode). Never announce the odds; never gate the rare item behind a wait.
**Failure mode:** This is the mechanic closest to a dark pattern. Hard limits: no artificial scarcity, no timers, no "spend to reroll", no streak-loss punishment, no infinite feed with no exit. Variability must select *which good thing*, never *whether* a good thing. The user must always be able to see and reach the end.

### 2.4 Direct manipulation within the first second — **A** (Shneiderman's direct-manipulation principles; response-time literature)
**How:** Sub-100ms response feels like direct causation ("I did that"); 100ms–1s feels like a machine responding; >1s breaks flow. Agency converts a reader into a participant, and participants don't bounce.
**Implementation:** One hero element that responds to *pointer movement alone* — no click required, therefore no commitment and no decision cost. Cursor-following distortion, parallax layers keyed to `pointermove`, a physics/field simulation, type that reacts to proximity. It must be running and reactive at first paint (CSS or a <10KB inline script), never awaiting hydration. On touch: bind the same effect to `touchmove` and, failing that, to device orientation or an autonomous idle animation.
**Failure mode:** Interaction that has no meaning ("wiggle for its own sake") is noise; and if it hijacks scroll or eats the first tap, it's a bounce cause. Never bind the primary interaction to scroll-jacking.

### 2.5 Progressive disclosure — **A**
**How:** Show the minimum to act; reveal depth on demand. Reduces initial cognitive load (Miller/Cowan working-memory limits: ~4 chunks reliably) while preserving depth for the motivated.
**Implementation:** Layer 1 = one sentence + one image + one control. Layer 2 = expandable detail (`<details>`, accordion, inline expand) *in place*, no navigation. Layer 3 = a dedicated page. Each layer must be a legitimate stopping point AND advertise the next.
**Failure mode:** Hiding the *value proposition* behind a disclosure. Disclose the how, never the what. Also: accordions that hide content needed for a decision cause thrash and back-button bounces.

### 2.6 Endowed progress — **A** (Nunes & Drèze, 2006: car-wash cards pre-stamped 2/10 vs 0/8 — same effort required — nearly doubled completion, ~34% vs ~19%)
**How:** People who perceive themselves as already underway complete at far higher rates. Progress toward a goal, not the goal, drives persistence.
**Implementation:** On first load, the progress indicator is **not** at zero. "Loop 1 of 7 — begun" the moment the hero renders; scrolling one screen fills the second segment. Award progress for things they've already done ("you've explored 2 already").
**Failure mode:** Fake progress that doesn't map to anything real (a bar that fills at a fixed rate regardless of behavior) is detectable and insulting. The bar must be a true function of state.

### 2.7 "One more" loops — **B/A** (combination of 2.3 and short, legible action cycles)
**How:** A loop that is short (<10s), has a clear outcome, and whose exit control is also its re-entry control. The next iteration must be cheaper than leaving.
**Implementation:** A single persistent primary control ("Again" / "Next loop") fixed in the thumb zone on mobile and near the content on desktop, that never moves, never reloads the page, and animates the transition in <300ms. Keep the item count visible so it feels finite.
**Failure mode:** Infinite scroll with no end state → people feel manipulated, and analytically you get long sessions but no depth events. Use a finite, countable set with a real ending, and make the ending a reward.

### 2.8 Narrative pull — **B**
**How:** Narrative transportation: causally-linked sequences with a protagonist and unresolved tension are retained and pursued more than lists of facts. "And then" is weak; "but/therefore" is strong.
**Implementation:** Order the page as a causal chain where each section's existence is justified by the previous one's unresolved question. Use second person. Introduce one concrete specific (a named thing, a real number, a date) in the first 30 words — specificity is what makes narrative grip.
**Failure mode:** Long-form storytelling before value. If a user must read 300 words to learn what the site is, the narrative is a wall. Value first, narrative as the vehicle for depth.

### 2.9 Visible affordances & signifiers (Norman) — **A**
**How:** People only interact with what they can *see* is interactive. Flat design's great sin was removing signifiers; multiple studies show weak-signifier UIs raise task time and failure rates.
**Implementation:** Every interactive element gets ≥2 of: distinct background/fill, border, elevation/shadow, underline, icon, or cursor change — plus a hover state, a **visible focus ring** (`:focus-visible`, ≥3:1 contrast, 2px, 2px offset), and an active/pressed state. Never rely on color alone. Non-obvious interactive surfaces (a canvas, a map, a grid) get an explicit first-run hint ("drag anywhere") that fades after first interaction.
**Failure mode:** "Mystery meat" navigation and icon-only controls without labels. Also over-signification: if everything looks clickable, nothing is salient.

### 2.10 Novelty vs familiarity — **B** (Berlyne's inverted-U for arousal/preference; MAYA — "most advanced yet acceptable")
**How:** Preference peaks at moderate novelty. Too familiar = ignored; too novel = unusable and abandoned. Processing fluency drives liking, so novelty must sit in the *content/aesthetic* layer, not the *interaction* layer.
**Implementation:** **Novel surface, conventional skeleton.** Unusual typography, color, motion, and one genuinely new central interaction — sitting on top of completely standard conventions: logo top-left links home, scroll scrolls down one viewport per wheel gesture, back button works, links are links, the primary CTA is a button-shaped button. Never invent navigation.
**Failure mode:** "Experimental" sites that reinvent scroll or hide navigation. These score well in design galleries and bounce at 80%+.

### 2.11 Autoplay-without-sound motion — **B**
**How:** Motion captures attention pre-attentively (the visual system is tuned to it) and signals liveness — "this place is running right now."
**Implementation:** One looping, muted, `playsinline`, `preload="metadata"` element or CSS/canvas animation in the first viewport. Keep it under ~1.5MB, or use a canvas/SVG animation instead of video. It must not be the LCP element; and it must be subordinate to the headline, not competing with it.
**Failure mode:** Multiple simultaneous moving things = flicker, cognitive overload, and for vestibular-sensitive users, nausea. Any motion over ~5s duration or large-area parallax needs a `prefers-reduced-motion` alternative (see §4). Never loop a distracting motion behind text.

### 2.12 Cursor-reactive elements — **C/B**
**How:** The tightest possible perception-action loop; creates the sense that the page is aware of you. Cheap, high novelty, zero commitment.
**Implementation:** `pointermove` listener, throttled via `requestAnimationFrame`, writing to CSS custom properties (`--mx`, `--my`) consumed by `transform`/`filter`/gradient positions. Compositor-only properties (`transform`, `opacity`) — never `top/left/width`. Magnetic buttons (elements that lean toward the cursor within ~80px) measurably increase hover dwell and click-through in practitioner tests.
**Failure mode:** Useless on touch (60% of traffic — never make it load-bearing), expensive on low-end CPUs, and custom cursors that *replace* the system cursor hurt usability. Feature-detect `(hover: hover) and (pointer: fine)`.

### 2.13 Scroll-driven storytelling — **B**
**How:** Converts a passive scroll into a control input; each scroll increment yields a state change, which is a micro-reward, which sustains the scroll.
**Implementation:** `IntersectionObserver` for section reveals, or native CSS scroll-driven animations (`animation-timeline: view()`) with a JS/static fallback. Scroll must remain 1:1 — the page moves exactly as far as the user scrolled. Pinned sections are allowed only if they release predictably, have a visible progress indicator, and are ≤3 viewport-heights of scroll.
**Failure mode:** **Scroll-jacking** (overriding scroll distance/direction) is the highest-bounce pattern in modern web design: it breaks the scrollbar, keyboard paging, trackpad momentum, `Ctrl+F`, and assistive tech. Also: content that only exists after an animation completes is invisible to search engines and to anyone with JS disabled or reduced-motion on.

### 2.14 Easter eggs & discoverable secrets — **C**
**How:** Discovery is intrinsically rewarding and generates sharing behavior; the *rumor* of secrets increases exploration more than the secrets themselves.
**Implementation:** 3–5 hidden interactions with escalating discoverability: (1) trivially findable (hover the logo 3s), (2) findable by curious poking (a specific key, a triple-click, drag an element off-screen), (3) genuinely obscure (a konami-style sequence, a URL parameter, a console message). Log discovery to `localStorage` and surface a subtle counter ("2 of 5 found") — this converts easter eggs into a collectible set, which is the far stronger mechanic.
**Failure mode:** Secrets that gate real value (accessibility disaster) or that fire accidentally and disrupt (never bind to plain `Escape`, `Space`, or arrow keys — those belong to the user's OS and AT).

### 2.15 Collectibles / completion sets — **A** (goal-gradient + completion bias; Endowed Progress compounds it)
**How:** A visible set with visible gaps is one of the strongest exploration drivers known. Effort accelerates as the set nears completion (goal gradient).
**Implementation:** A persistent "collection" surface — a grid of N slots, filled slots rendered, empty slots showing a silhouette (not blank — the silhouette is the curiosity gap). Persist in `localStorage`, keyed and versioned. N should be 7–12: large enough to be a set, small enough to feel completable in one session.
**Failure mode:** N too large → hopeless → abandonment. Anything that resets progress → betrayal. Requiring an account to save progress → bounce at the login wall. **Never gate the set behind sign-up.**

### 2.16 Personalization — **B**
**How:** Self-relevance dramatically increases attention allocation (cocktail-party effect). Even trivially shallow personalization (time of day, locale, referrer, returning-visitor status) raises perceived relevance.
**Implementation:** Zero-data personalization only — no login, no tracking, no PII: local time ("good evening"), `Intl.DateTimeFormat().resolvedOptions().timeZone` for a city-scale reference, returning-visitor greeting from `localStorage`, referrer-aware framing, `prefers-color-scheme`. Show it in the first viewport so it lands within the comprehension window.
**Failure mode:** Creepiness cliff — naming precise location, inferring identity, or showing "we see you're from <Company>" reads as surveillance and increases bounce. Keep it warm and obviously local-only; say so.

### 2.17 Social proof — **A** (Cialdini; strongest under uncertainty and when the referent group is similar)
**How:** Under ambiguity, people use others' behavior as evidence of correctness. Works best with specific numbers and identifiable others; weak with vague claims.
**Implementation:** Live/near-live activity — "142 loops running right now", a ticker of recent anonymous actions, a heatmap of what others explored. Specific, verifiable, low-stakes. Static logo walls are near-useless for a novel concept.
**Failure mode:** **Fabricated social proof is fraud** — never invent counts or activity. If the real numbers are small, use them honestly or use a different mechanic. Also, low numbers displayed prominently are *negative* social proof ("3 people have visited") — show a number only if it's impressive or reframed (total-since-launch, or a non-count like "most explored today").

---

## 3. What makes people click DEEPER rather than just scroll

Scrolling is cheap and low-commitment; clicking is a decision. A click-through requires the user to believe the destination is **specific, near, and cheap to undo**.

### 3.1 Link design that earns clicks
- **Descriptive, information-scented labels.** Information Foraging Theory (Pirolli & Card) is the operative model: users follow "scent" — cues that predict the value of a destination. "Read more" has zero scent. "See how loop #7 broke" has high scent. **Ban generic labels sitewide.**
- **Make links look like links.** In body copy: underlined and color-differentiated. Contrast ≥4.5:1 against background and ≥3:1 against surrounding text if distinguished by color.
- **Show the destination's shape.** A label plus a type/size cue ("Interactive · ~40s", "3 min read", "12 items") reduces uncertainty cost, which is the main reason people don't click.
- **Target size:** ≥44×44px effective hit area on all devices (WCAG 2.2 AA requires ≥24×24 CSS px; we hold to the Apple 44pt / Material 48dp standard). Extend the hit area with padding or a `::after` overlay, not by making text huge.

### 3.2 "Next" affordances
- **One unambiguous Next per screen**, in a consistent location, that *names the next thing* rather than saying "Next" (serial-position and scent both improve).
- **Bottom-of-content "next" is mandatory.** A page whose content ends with whitespace is a page that ends the session. The end of every unit must present the next unit at full salience — a large card, not a text link.
- **Keyboard/`J`-style advancement** and a visible keyboard hint for power users; `→`/`←` where the structure is sequential (but never steal arrow keys from a scrolling page — bind them only within a focused component).
- **Persistent progress + position.** "3 / 12" tells the user the cost of continuing, which is what makes continuing feel safe.

### 3.3 Teaser cards (the workhorse)
Optimal card anatomy, in priority order:
1. **Visual** — distinct per card (never repeated stock), aspect-ratio locked, lazy-loaded below the fold with `decoding="async"`.
2. **Specific title** containing a concrete noun or number.
3. **One-line gap-opening subline** — states the setup, withholds the resolution.
4. **Metadata chip** — type, duration, difficulty, or count. Reduces uncertainty.
5. **A state marker** — unvisited / visited / new. Visited-state marking is one of the oldest and best-supported web usability findings (it prevents re-treading and highlights the unexplored).
6. **Whole card is the hit target**, with hover elevation + scale ≤1.02 and a real `<a>` wrapping it (so middle-click, right-click, and screen readers all work).

Card count: show **6–9** at a decision point. Below 4 feels thin; above ~12 triggers choice paralysis (Hick's Law; the Iyengar & Lepper jam study is the canonical illustration even if its effect size is contested — the direction is safe).

### 3.4 Unresolved questions as navigation
Make headings and card titles *questions the user cannot answer from the card alone but feels they nearly could*. Two patterns that work:
- **Partial reveal:** show the artifact but blur/crop/redact the payload. The user clicks to un-redact.
- **Counterfactual:** "Everyone who tried this got the same answer. Except one." — a specific anomaly is irresistible.

### 3.5 Choose-your-path structures
Branching converts a reader into an author. Implementation:
- Offer **exactly 2–3 branches**, labeled by outcome not mechanism ("Show me the fast version" / "Take me through it").
- Branches must be **real** (different content) and **reversible** (an always-visible "other path" affordance). Irreversible choices with unknown stakes cause hesitation and bounce.
- Each branch is a distinct URL (History API `pushState` at minimum) so back works, sharing works, and analytics can see depth.
- Pair with endowed progress: choosing a path immediately advances the progress indicator.

---

## 4. Accessibility & reduced-motion: excluded users bounce at 100%

Every accessibility failure is a bounce with extra steps. ~15–20% of users have a disability; a meaningful fraction of all users enable reduced motion; keyboard and screen-reader users are disproportionately likely to be high-intent.

**Non-negotiables:**

1. **`prefers-reduced-motion: reduce`** — not "disable animation", *substitute* it. Parallax → static composition. Scroll-triggered slide-ins → instant opacity-only fade ≤150ms, or no transition. Auto-playing loops → a still frame with a play control. Cursor-reactive physics → a calm, non-moving alternative that still looks designed. The reduced-motion experience must be a first-class design, not a stripped carcass — otherwise we've just moved the bounce.
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: .01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: .01ms !important;
       scroll-behavior: auto !important;
     }
   }
   ```
   Plus a JS guard: `const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches` to skip initializing motion systems entirely (saves CPU too). Also respect `prefers-reduced-transparency` and `prefers-contrast`.
2. **Keyboard parity.** Every interaction reachable by `Tab`, activatable by `Enter`/`Space`. Logical DOM order == visual order. A visible `:focus-visible` ring everywhere, never `outline: none` without a replacement. A skip-link as the first focusable element. No keyboard traps; `Escape` closes anything overlaid.
3. **Screen readers.** Semantic HTML first (`<main>`, `<nav>`, `<section>` with `aria-labelledby`, real headings in order, real buttons and links). Canvas/WebGL centerpieces need a parallel text/DOM representation — an `aria-label` plus an adjacent, readable summary of the same information. Dynamic updates (progress, collection counts, new content) go in `aria-live="polite"` regions. Decorative motion gets `aria-hidden="true"`.
4. **Color & contrast.** ≥4.5:1 body text, ≥3:1 large text and UI/graphical objects. Never encode state (visited, found, active) in color alone — add a shape, icon, or label.
5. **Zoom & reflow.** Usable at 200% zoom and at 320 CSS px width with no horizontal scroll. Don't disable pinch-zoom (`maximum-scale=1` is banned).
6. **No time limits.** No auto-advancing content, no disappearing-after-Ns affordances, no timeouts.
7. **Works without JS for the core message.** The value proposition, primary nav, and primary content must be in the initial HTML. Enhancement layers on top.

---

## 5. Mobile-first specifics (≈60% of traffic; ~52–60% depending on measurement method)

Mobile bounces ~12 points worse than desktop by default. We must design mobile as the primary case and desktop as the enhancement.

- **Thumb zone.** On a one-handed grip, the comfortable reach is the lower ~⅔ of the screen, biased toward the dominant-thumb side; the top corners are the hardest reach. **Primary actions go bottom-center**, in a fixed bar with `padding-bottom: env(safe-area-inset-bottom)`. Top-right hamburgers are the worst-placed control on a modern phone.
- **Touch targets.** ≥44×44 CSS px, with ≥8px of spacing between adjacent targets. Measure the *hit area*, not the glyph.
- **Viewport height.** `100vh` is wrong on mobile — it's the largest viewport, so content is cut off behind browser chrome. Use `100dvh` (with `100vh` as the fallback declaration first) or, better, `min-height: 100svh` for hero sections so nothing critical hides. Test with the URL bar both expanded and collapsed.
- **No hover.** Gate hover effects behind `@media (hover: hover) and (pointer: fine)`. Every hover-revealed piece of information must also be visible or tap-revealed on touch. Beware the "first tap = hover" double-tap bug.
- **Touch equivalents for pointer mechanics.** Cursor-reactive hero → `touchmove` drag, device-tilt (`deviceorientation`, permission-gated on iOS), or a self-running ambient animation. Never ship a hero whose only interaction requires a mouse.
- **Weight budget.** ≤200KB critical path (HTML+CSS+blocking JS), ≤1MB total first-viewport payload, ≤3 fonts files. Responsive images via `srcset`/`sizes` and AVIF/WebP with fallbacks.
- **Text.** ≥16px body (prevents iOS input zoom), line length 35–50 characters, ≥1.5 line-height. No text over busy imagery without a scrim.
- **Gestures.** Support vertical scroll natively; never intercept it. Horizontal card rails must use CSS scroll-snap with visible partial next-card ("peek") so the affordance is obvious, plus `overscroll-behavior-x: contain`.
- **Layout.** No horizontal overflow at 320px. Sticky headers ≤56px and auto-hiding on scroll-down.

---

## 6. The 100-point Bounce-Risk Audit

An auditor agent applies this to the built site. **Score only what is verifiable in the artifact** (code inspection, rendered DOM, simulated conditions). Every item is scored 0 / partial / full. Default to zero when ambiguous — this rubric is deliberately strict.

### Category A — Speed & Stability (20 pts) — gates the 0–3s window
| # | Item | Pts |
|---|---|---|
| A1 | First meaningful content present in initial HTML (no JS required to see the value prop) | 5 |
| A2 | Critical path ≤200KB; no render-blocking third-party scripts | 4 |
| A3 | Zero layout shift: all media/embeds have reserved dimensions or `aspect-ratio`; fonts metric-matched or `font-display: optional` | 4 |
| A4 | Hero interactive (responds to input) within 1s; no hydration dependency for first interaction | 4 |
| A5 | No spinner/skeleton occupying the first viewport | 3 |

### Category B — Instant Comprehension (17 pts) — the 3–10s window
| # | Item | Pts |
|---|---|---|
| B1 | "What is this?" answerable from the first viewport in ≤8 plain words, above the fold at 360×640 | 6 |
| B2 | Exactly one primary CTA; ≤2 competing visual attractors in first viewport | 4 |
| B3 | A concrete, specific instance shown (not only abstraction) in the first viewport | 4 |
| B4 | No carousel, no entry modal, no interstitial, no autoplay audio, no gate before value | 3 |

### Category C — Interaction & Agency (16 pts)
| # | Item | Pts |
|---|---|---|
| C1 | An input-reactive element in the first viewport, working on **both** pointer and touch | 6 |
| C2 | Interaction feedback <100ms; INP budget <150ms | 4 |
| C3 | ≥3 distinct kinds of interaction available within the first two screens | 3 |
| C4 | Every interactive element has hover + focus-visible + active states and ≥2 visual signifiers | 3 |

### Category D — Open Loops & Exploration Pull (17 pts)
| # | Item | Pts |
|---|---|---|
| D1 | Every viewport ends unresolved (no screen is a closed statement) | 4 |
| D2 | A persistent progress/collection indicator, non-zero on arrival (endowed progress) | 4 |
| D3 | A finite, countable set (7–12) with visible unexplored slots | 4 |
| D4 | A "one more" control that is fixed, instant (<300ms), and never relocates | 3 |
| D5 | ≥1 genuine surprise/variable-reward element, with no scarcity/timer/punishment mechanics | 2 |

### Category E — Depth & Click-Through Architecture (10 pts)
| # | Item | Pts |
|---|---|---|
| E1 | Zero generic link labels ("read more", "click here", "learn more") anywhere | 3 |
| E2 | Bottom of every content unit presents a full-salience next unit | 3 |
| E3 | Teaser cards carry visual + specific title + gap subline + metadata + visited state | 2 |
| E4 | Branch/path choice offered with 2–3 reversible, real, URL-addressable options | 2 |

### Category F — Mobile (10 pts)
| # | Item | Pts |
|---|---|---|
| F1 | No horizontal overflow at 320px; usable at 200% zoom; pinch-zoom not disabled | 3 |
| F2 | Primary action in the thumb zone with safe-area padding | 3 |
| F3 | All targets ≥44px with ≥8px spacing | 2 |
| F4 | `dvh`/`svh` used for full-height sections; nothing critical hidden by browser chrome | 2 |

### Category G — Accessibility (10 pts) — hard gate, see below
| # | Item | Pts |
|---|---|---|
| G1 | Full `prefers-reduced-motion` alternative that is *designed*, not stripped | 3 |
| G2 | Complete keyboard operability, logical order, visible focus, skip link, no traps | 3 |
| G3 | Semantic structure + `aria-live` for dynamic state + text equivalent for any canvas/WebGL centerpiece | 2 |
| G4 | Contrast ≥4.5:1 text / ≥3:1 UI; no state encoded by color alone | 2 |

**Category totals: A 20 + B 17 + C 16 + D 17 + E 10 + F 10 + G 10 = 100.**

### Category H — Trust & Anti-Dark-Pattern (−) — penalties, applied after scoring
| Violation | Penalty |
|---|---|
| Any entry modal, exit-intent popup, or content-obscuring overlay before 30s/50% scroll | **−15** |
| Fabricated social proof, fake counts, fake scarcity, countdown timers | **−15** |
| Scroll-jacking or any override of native scroll distance/direction | **−12** |
| Sign-up/email wall before any value delivered | **−12** |
| Curiosity gap whose payoff is smaller than the promise (clickbait) | **−8** |
| Progress indicator not backed by real state | **−6** |
| Infinite feed with no visible end state | **−5** |
| Autoplay audio | **−10** |

### Score → estimated non-bounce mapping

| Score | Estimated non-bounce (10s + interaction) | Verdict |
|---|---|---|
| 92–100 | **≥90%** | Meets the target |
| 85–91 | 82–89% | Close; fix the gaps in A, B, C first |
| 75–84 | 70–81% | Better than median, misses the mandate |
| 60–74 | 55–69% | Ordinary good site |
| <60 | <55% | At or below industry median |

**Hard gates (failing any one caps the total at 74 regardless of points earned):**
- A1 or A4 scored zero (page is slow or dead on arrival)
- B1 scored zero (nobody knows what this is)
- Any Category H penalty ≥12 applied
- Category G total <6 (accessibility exclusion = guaranteed bounce for a whole user class)

Rationale for the 92 threshold: getting from a median ~53% engagement to 90% requires *simultaneously* eliminating mechanical bounce (A), comprehension bounce (B), and motivation bounce (C/D). Partial credit across categories produces partial results; the mapping is deliberately super-linear at the top because the last 8 points are the ones that convert "good site" into "site people don't leave."

---

## 7. Top 15 design mandates, ordered by expected impact on the 90% target

1. **Server-render the value proposition.** The headline, the concrete example, and the primary control exist in the initial HTML bytes. No JS dependency, no spinner, no skeleton in the first viewport. *(Kills the largest bounce bucket: 0–3s mechanical failure.)*
2. **LCP <1.5s, CLS <0.02, INP <150ms on mid-tier Android over 4G.** Treat these as build-breaking thresholds, not aspirations. 1s→3s is +32% bounce probability; 1s→5s is +90%.
3. **Answer "what is this?" in ≤8 plain words, above the fold at 360×640,** paired with one concrete instance. Clever before clear is the #1 self-inflicted wound.
4. **Ship one input-reactive hero element that is alive at first paint** and works on touch as well as pointer. Agency in the first second converts a reader into a participant.
5. **Zero overlays, gates, modals, or audio for the first 30 seconds and 50% scroll.** No consent wall over the hero, no newsletter popup, no sign-in. This is a hard prohibition, not a preference.
6. **Every viewport ends unresolved.** No screen may be a complete, closed statement. Audit screen-by-screen at 360×640 and 1440×900.
7. **Non-zero progress on arrival.** A visible indicator that already shows movement before the user has done anything (endowed progress ≈ doubled completion in the canonical study).
8. **A finite collectible set of 7–12 with visible empty slots**, persisted locally, never gated behind an account.
9. **One fixed "one more" control** — same position always, <300ms transition, no page reload, count visible.
10. **Novel surface, conventional skeleton.** All the weirdness in typography, color, motion, and the central interaction; none of it in navigation, scroll, links, or the back button. Never scroll-jack.
11. **Ban generic link labels and dead-end page bottoms.** Every content unit terminates in a full-salience, specifically-labeled next unit — information scent is what converts scrollers into clickers.
12. **Design the reduced-motion experience as a first-class variant,** not a disabled one — and gate all motion systems behind the media query in JS so they never even initialize.
13. **Mobile is the primary target:** thumb-zone primary action with safe-area padding, ≥44px targets with ≥8px gaps, `dvh`/`svh` heights, no hover-only information, ≤200KB critical path.
14. **Full keyboard + screen-reader parity, including a text equivalent for any canvas/WebGL centerpiece.** Excluded users bounce at 100%, and this is also the cheapest category to lose points in.
15. **No dark patterns, ever** — no fake counts, no countdowns, no scarcity, no exit-intent, no streak punishment. Variable reward selects *which* good thing appears, never *whether* one does. One betrayal disables every curiosity mechanic on the site permanently.

---

### Sources
- [Google / Think with Google — mobile page speed benchmarks](https://business.google.com/ca-en/think/marketing-strategies/mobile-page-speed-new-industry-benchmarks/)
- [NN/g — How Long Do Users Stay on Web Pages?](https://www.nngroup.com/articles/how-long-do-users-stay-on-web-pages/)
- [NN/g — Website Response Times](https://www.nngroup.com/articles/website-response-times/)
- [web.dev — How the Core Web Vitals thresholds were defined](https://web.dev/articles/defining-core-web-vitals-thresholds)
- [CXL — What is a good bounce rate? Industry benchmarks](https://cxl.com/guides/bounce-rate/benchmarks/)
- [Bounce Rate Benchmarks 2026: Industry and Channel Data](https://www.digitalapplied.com/blog/bounce-rate-benchmarks-2026-industry-channel-data)
- [Statista — Mobile web traffic share worldwide](https://www.statista.com/statistics/277125/share-of-website-traffic-coming-from-mobile-devices/)
- Loewenstein (1994) information-gap theory; Nunes & Drèze (2006) endowed progress; Berlyne inverted-U; Pirolli & Card information foraging; Norman affordances/signifiers; Shneiderman direct manipulation; WCAG 2.2 AA.
