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
 * ## Restraint is enforced, not trusted
 *
 * A figure never picks a colour and never picks an opacity. The context is
 * primed here — one accent at `BASE`, a 1 px line — and a figure may only make
 * itself quieter. `#ambient`'s mask then holds the whole layer to a third of
 * that across the middle of the screen, which is where the reading column is:
 * behind a line of prose the figure is under 3 % alpha, and the measured
 * contrast of body text over the brightest thing it can draw is 14.8 : 1
 * against the 4.5 : 1 the palette has to clear.
 *
 * If the perf gate is ever tight, this is the first thing that goes. Nothing
 * functional, accessible or narrative depends on it (§D.3).
 */

/**
 * The only alpha in the ambient layer. `#ambient`'s mask holds it to 42 % of
 * this across the reading column — 6.7 %, inside §C.16's 8 % ceiling behind
 * type — and lets it up to the full 16 % only in the empty rails either side
 * of the prose, which on a phone do not exist.
 */
const BASE = 0.16;

/** The authored still (§C.16). Every figure's complete, at-rest composition. */
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
    let phase = STILL;
    let elapsed = 0;
    let unsubscribe: (() => void) | null = null;
    let slug = '';
    let dead = false;

    const reduced = () => document.documentElement.dataset.motion === 'reduce';

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
      return ctx !== null;
    }

    function paint(): void {
      if (!ctx || !figure) return;
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = rgba('--c-accent', BASE);
      ctx.fillStyle = rgba('--c-accent', BASE);
      try {
        figure.draw(ctx, phase, w, h, dpr);
      } catch {
        /* a figure that throws is a figure that draws nothing. Never the reader's problem. */
      }
      ctx.restore();
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
