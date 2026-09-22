'use client';

import { useEffect, useRef } from 'react';
import type { AccountId } from '@/content/schema';
import { SWEEP_MS, mod1, startClock, stopClock, subscribeFrame } from '@/lib/clock';
import { dprFor, sizeCanvas } from '@/lib/use-canvas';
import { refreshTokens, rgba } from '@/lib/tokens';
import { FIGURES } from './registry';
import type { Figure } from './types';

/**
 * src/figures/Ambient.tsx — the ambient layer. **OWNED BY WP-C.**
 * Spec: §C.16, §D.3, §D.4.
 *
 * One canvas for the whole site, fixed behind everything, decorative and
 * `aria-hidden`. It is the ONLY caller of `startClock()`, which is why a
 * reader under reduced motion — or before the idle callback fires — runs no
 * `requestAnimationFrame` at all (§D.4).
 *
 * ## The motion rule, and where it departs from §C.16
 *
 * §C.16 specifies a figure "phase-locked to the 4000 ms clock … ≥ 6 s period",
 * which is a perpetual animation. This one is not. **It runs for exactly one
 * revolution — four seconds — when an account is entered, and then stops.**
 *
 * The reason is the brief: a figure must never move while the reader is
 * reading a block, and must cost almost nothing. A background that is still
 * turning on minute four is doing both of the things the ambient layer is
 * forbidden to do, and it holds one `requestAnimationFrame` open for the whole
 * visit for a 7 %-alpha line drawing. Four seconds is also the only honest
 * length for it: the power was out for four seconds, the figure lives for four
 * seconds, and what the reader reads beside is what was left afterwards.
 *
 * So: the phase runs 0.25 → 1.25, every figure comes home to the composition
 * it started from, and the clock is stopped. By the time a reader has finished
 * the first paragraph there is no rAF scheduled anywhere in the application.
 *
 * ## Restraint is enforced, not trusted — and not per stroke
 *
 * A figure never picks a colour and never picks an opacity, and it no longer
 * picks its place on the screen either. The layer decides three things and a
 * figure cannot argue with any of them:
 *
 *   1. **the ceiling.** The drawing is made at full strength and multiplied
 *      down to `CEILING` in one `destination-in` pass, so the brightest pixel
 *      is `CEILING` no matter how many strokes crossed. The old arrangement
 *      primed each stroke at 0.16 and trusted the arithmetic; the bounce audit
 *      measured 37/255 through the navigation, because strokes had overlapped.
 *   2. **the stage.** The figure is given a box that starts below the night
 *      and runs off the bottom of the screen, so what a phone shows is a large
 *      fragment under the prose and never a small complete diagram behind the
 *      furniture. This is why the dog's doorway no longer frames the
 *      navigation grid.
 *   3. **the fade.** Everything above the night is multiplied to zero, so no
 *      figure can put a line behind the premise, the account heading, the
 *      standfirst or the twelve slots — and the edge it fades out on is a
 *      gradient, which is the difference between weather and a border.
 *
 * If the perf gate is ever tight, this is the first thing that goes. Nothing
 * functional, accessible or narrative depends on it (§D.3).
 */

/**
 * The ceiling, in alpha, on anything the ambient layer is allowed to put on
 * the screen — §C.16's "never above 8 % alpha behind type", with a margin.
 *
 * It is not applied per stroke. A figure draws at full strength and the whole
 * drawing is then multiplied down in one `destination-in` pass, so two lines
 * that cross cannot add up to more than one line: whatever a figure does, the
 * brightest pixel on the canvas is exactly this. The previous arrangement
 * primed the context at 0.16 and trusted the arithmetic, and the audit
 * measured 37/255 — 14.5 % — on the row through the navigation, because three
 * strokes had overlapped. The ceiling is now a property of the layer rather
 * than a convention twelve files are asked to keep.
 */
const CEILING = 0.065;

/**
 * 1 px of stroke at a low alpha is a hairline, and a hairline reads as a rule
 * somebody drew on purpose. 1.6 px of the same ink reads as a smudge.
 */
const LINE = 1.6;

/** The ambient layer is never allowed to start where the reader is reading. */
const QUIET_DESKTOP = 0.14;
const QUIET_FALLBACK = 0.62;

/** The desktop night is a fixed rail; nothing is drawn under it. */
const RAIL = 13 * 16;

const STILL = 0.25;

/** §D.3: mount on `requestIdleCallback`, or on a 1200 ms timeout. */
const IDLE_MS = 1200;

const RESIZE_MS = 120;

/** §C.16's account swap: 160 ms, opacity only, and only on a real swap. */
const SWAP_MS = 200;

/** The three things that can move the reader between accounts (§C.11, §C.15). */
const ARMS = ['pointerdown', 'keydown', 'popstate'] as const;

/**
 * §C.16 gives the entering account a 160 ms cross-fade, and
 * `design/12-wpn-notes.md` §D.8 scopes it to `[data-swap]` so it can never
 * apply on load — painting the first viewport from opacity 0 is the one thing
 * this build is built around not doing. WP-C sets the attribute; this is the
 * only client module WP-C owns, and it is already watching `html[data-s]` for
 * the figure, so it sets it here.
 *
 * It is never set under reduced motion, where the swap is instantaneous, and
 * it is never set for the value the document arrived with — only for a change
 * from one account to another, which is what "a swap" means.
 */
function markSwap(slug: string): void {
  if (document.documentElement.dataset.motion === 'reduce') return;
  const section = document.getElementById(`section-${slug}`);
  if (!section) return;
  section.dataset.swap = 'true';
  window.setTimeout(() => {
    delete section.dataset.swap;
  }, SWAP_MS);
}

export function Ambient() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const found = ref.current;
    if (!found) return;
    const canvas: HTMLCanvasElement = found;

    let ctx: CanvasRenderingContext2D | null = null;
    let figure: Figure | null = null;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let stageTop = 0;
    let stageH = 0;
    let veilV: CanvasGradient | null = null;
    let veilH: CanvasGradient | null = null;
    let phase = STILL;
    let elapsed = 0;
    let unsubscribe: (() => void) | null = null;
    let slug = '';
    let dead = false;

    const reduced = () => document.documentElement.dataset.motion === 'reduce';

    /**
     * Where the figure is allowed to be, and how strong it is allowed to be
     * there — both of which are the layer's job and not a figure's.
     *
     * **The stage.** The audit's first finding was that the dog's doorway drew
     * a thin rectangle around the navigation grid, so it read as a stray
     * outline rather than as a drawing. The cause is that every figure
     * composed itself in the middle of the viewport, and on a phone the middle
     * of the viewport is the twelve-slot night. So the figure no longer gets
     * the viewport: it gets a stage that begins below the navigation and runs
     * off the bottom of the screen, and the canvas is faded to nothing across
     * everything above it. The night, the premise, the account heading and the
     * standfirst now sit on bare canvas at every phone size, and what the
     * reader sees of the figure is a large fragment low on the screen rather
     * than a small complete diagram behind the furniture.
     *
     * The bottom of the night is measured rather than guessed, once per entry
     * and per resize, because it moves with the label wrap and the viewport.
     */
    function quietBelow(): number {
      if (w >= 900) return h * QUIET_DESKTOP;
      for (const el of document.querySelectorAll('.night')) {
        const r = el.getBoundingClientRect();
        if (r.height > 8) return Math.min(h * 0.86, Math.max(h * 0.3, r.bottom + 16));
      }
      return h * QUIET_FALLBACK;
    }

    /** The veil: the ceiling and the fade, as one multiply over the drawing. */
    function shape(): void {
      if (!ctx) return;
      const quiet = quietBelow();
      stageTop = Math.round(quiet * 0.5);
      stageH = Math.round(h * 1.06) - stageTop;

      const at = (px: number) => Math.min(1, Math.max(0, px / Math.max(1, h)));
      const v = ctx.createLinearGradient(0, 0, 0, h);
      let last = 0;
      const stop = (px: number, a: number) => {
        const p = Math.max(last, at(px));
        last = p;
        v.addColorStop(p, `rgba(0,0,0,${a})`);
      };
      stop(0, 0);
      stop(quiet * 0.5, 0);
      stop(quiet, CEILING * 0.3);
      stop(quiet + h * 0.16, CEILING);
      stop(h, CEILING);
      veilV = v;

      /* Desktop: the night is a fixed rail down the right-hand side and the
         prose is a 34 rem column in the middle. Nothing is drawn under the
         rail at all, and the column gets a little over half of what the empty
         left rail gets — which is the only place on the site where the figure
         is allowed to be seen properly. */
      if (w < 900) {
        veilH = null;
        return;
      }
      const g = ctx.createLinearGradient(0, 0, w, 0);
      const col = Math.min(544, w * 0.9) / 2;
      const wide = w >= 1200;
      const hx = (px: number) => Math.min(1, Math.max(0, px / Math.max(1, w)));
      let lastx = 0;
      const stopx = (px: number, a: number) => {
        const p = Math.max(lastx, hx(px));
        lastx = p;
        g.addColorStop(p, `rgba(0,0,0,${a})`);
      };
      stopx(0, 1);
      if (wide) {
        stopx(w / 2 - col - 64, 1);
        stopx(w / 2 - col, 0.55);
        stopx(w / 2 + col, 0.55);
      }
      stopx(w - RAIL - 96, 1);
      stopx(w - RAIL + 8, 0);
      stopx(w, 0);
      veilH = g;
    }

    function measure(): boolean {
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (cw < 2 || ch < 2) return false;
      const d = dprFor(cw, ch);
      if (ctx && cw === w && ch === h && d === dpr) return true;
      w = cw;
      h = ch;
      dpr = d;
      ctx = sizeCanvas(canvas, w, h, dpr);
      if (ctx) shape();
      return ctx !== null;
    }

    function paint(): void {
      if (!ctx || !figure) return;
      const g = ctx;
      g.clearRect(0, 0, w, h);
      g.save();
      g.translate(0, stageTop);
      g.lineWidth = LINE;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      // Full strength, because the ceiling is applied to the finished drawing
      // below and not to each stroke. A figure may still make itself quieter.
      g.strokeStyle = rgba('--c-accent', 1);
      g.fillStyle = rgba('--c-accent', 1);
      try {
        figure.draw(g, phase, w, stageH, dpr);
      } catch {
        /* a figure that throws is a figure that draws nothing. Never the reader's problem. */
      }
      g.restore();

      // The veil. `destination-in` multiplies what is already there, so this
      // is the ceiling and the fade in one pass and overlapping strokes come
      // out of it at exactly the same strength as a single one.
      g.save();
      g.globalCompositeOperation = 'destination-in';
      if (veilV) {
        g.fillStyle = veilV;
        g.fillRect(0, 0, w, h);
      }
      if (veilH) {
        g.fillStyle = veilH;
        g.fillRect(0, 0, w, h);
      }
      g.restore();
    }

    /** Stop the clock. After this there is no rAF scheduled in the application. */
    function halt(): void {
      unsubscribe?.();
      unsubscribe = null;
      stopClock();
    }

    /** The four seconds, once, and then the still. */
    function run(): void {
      if (!measure() || !figure) return;
      phase = STILL;
      paint();
      if (reduced()) return;
      elapsed = 0;
      startClock();
      unsubscribe = subscribeFrame((frame) => {
        elapsed += frame.dt;
        if (elapsed >= SWEEP_MS || reduced()) {
          halt();
          phase = STILL;
          paint();
          return;
        }
        phase = mod1(STILL + elapsed / SWEEP_MS);
        paint();
      });
    }

    function enter(): void {
      const next = document.documentElement.dataset.s ?? '';
      if (next === slug) return;
      slug = next;
      halt();
      figure = null;
      if (ctx) ctx.clearRect(0, 0, w, h);
      const load = FIGURES[next as AccountId];
      if (!load) return;
      void load()
        .then((mod) => {
          // The reader may have moved on while the chunk was in flight.
          if (dead || document.documentElement.dataset.s !== slug) return;
          figure = mod.default;
          // A theme may have flipped since the last read; the cache is one line.
          refreshTokens();
          shape();
          run();
        })
        .catch(() => {
          /* a figure that will not load is an account without one, which is fine */
        });
    }

    /* ---- mount on idle, never on the critical path (§D.3) ---- */
    const ric = (window as unknown as { requestIdleCallback?: typeof requestIdleCallback })
      .requestIdleCallback;
    let idle = 0;
    let timer = 0;
    if (typeof ric === 'function') idle = ric(() => enter(), { timeout: IDLE_MS });
    else timer = window.setTimeout(enter, IDLE_MS);

    /* ---- a swap is a move the reader made, and nothing else ----
       The document does not settle on its account in one step: at `/?s=road`
       the runtime writes `data-s=dog` and then `data-s=road` inside its entry
       effect, which is two attribute changes before the reader has done
       anything. Watching for a CHANGE is therefore not enough to tell a swap
       from an arrival, and an arrival must never fade in (`12` §D.8). So the
       cross-fade is armed by the first press, key or Back — the three things
       that can move the reader — and is not armed before one happens. */
    let armed = false;
    const arm = () => {
      armed = true;
      for (const type of ARMS) window.removeEventListener(type, arm, true);
    };
    for (const type of ARMS) window.addEventListener(type, arm, { capture: true, passive: true });

    /* ---- the account the reader is in, and nothing else, decides the figure ---- */
    let last = document.documentElement.dataset.s ?? '';
    const watcher = new MutationObserver(() => {
      const next = document.documentElement.dataset.s ?? '';
      if (next !== last) {
        if (armed) markSwap(next);
        last = next;
      }
      enter();
    });
    watcher.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-s'],
    });

    /* ---- resize: redraw the still at the new box. Debounced, never on `resize`. ---- */
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const observer = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (measure()) paint();
      }, RESIZE_MS);
    });
    observer.observe(canvas);

    return () => {
      dead = true;
      if (resizeTimer) clearTimeout(resizeTimer);
      if (timer) clearTimeout(timer);
      if (idle && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idle);
      for (const type of ARMS) window.removeEventListener(type, arm, true);
      watcher.disconnect();
      observer.disconnect();
      halt();
    };
  }, []);

  return <canvas id="ambient" aria-hidden="true" ref={ref} />;
}

export default Ambient;
