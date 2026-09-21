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

