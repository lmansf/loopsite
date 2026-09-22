'use client';

/**
 * src/sections/orbit/Room.tsx — ORBIT, notch 8 (§D.8).
 *
 * The visitor's nodes as epicycles — circles riding on circles — tracing their
 * true sum. Every harmonic is an integer, so the traced curve always closes;
 * that closure is the payoff and it is genuinely theirs (§J.4).
 *
 * Per frame: the chain of circles at t = phase, the connecting radii, the
 * cached traced curve, the glowing head at P(phase). Pointer proximity to a
 * circle slows that circle's RENDERED phase to 35% for 600 ms and labels its
 * harmonic number in --font-mono; the clock is untouched. The keyboard
 * equivalent is the list of harmonic buttons this room renders: focusing one
 * does what hovering its circle does.
 *
 * Reduced motion: the chain is drawn at t = 0, the traced curve complete and
 * static, the head does not move. Changing a node redraws instantly.
 *
 * Nothing is allocated in the frame path except on the frame that rebuilds
 * the curve (a node changed, or the stage resized).
 */

import { useEffect, useMemo, useRef } from 'react';
import { subscribeFrame } from '@/lib/clock';
import { subscribeNodes } from '@/lib/ring-store';
import { rgba, token } from '@/lib/tokens';
import type { RingNode, SectionProps } from '@/lib/types';
import styles from './room.module.css';
import {
  CHAIN_CAP_MOBILE,
  CLOSED_TERMS,
  CURVE_FADE_MS,
  LABELS,
  NEAR_PX,
  RECONVERGE_MS,
  SAMPLES,
  SAMPLES_MOBILE,
  SLOW_FACTOR,
  SLOW_MS,
  type Term,
  closureGap,
  depthFor,
  evalPoint,
  maxRadius,
  sampleCurve,
  termsFor,
} from './logic';

const HOOK = 'circles on circles';
const HOOK_MS = 3000;
const MAX_TERMS = 24;
const PULSE_MS = 240;
const REVEAL_MS = 720;
const BAND_UNROLL_MS = 1200;
const COMET_FRACTION = 0.055;
const MOBILE_W = 720;

function isMobile(w: number, tier: SectionProps['tier']): boolean {
  return w < MOBILE_W || tier === 'low';
}

function clear(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function Room(props: SectionProps) {
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });

  const rootRef = useRef<HTMLDivElement | null>(null);
  const depthRef = useRef(0);
  const viewedRef = useRef(false);
  /** keyboard equivalent of pointer proximity: the focused harmonic */
  const focusRef = useRef(-1);
  const slowRequestRef = useRef(-1);

  // The harmonic list is rendered from props (a structural re-render), so it
  // always matches the chain the canvas draws.
  const listTerms = useMemo(
    () =>
      termsFor(
        props.nodes,
        props.geometry.R,
        isMobile(props.geometry.w, props.tier) ? CHAIN_CAP_MOBILE : MAX_TERMS,
      ),
    [props.nodes, props.geometry.R, props.geometry.w, props.tier],
  );

  useEffect(() => {
    const first = propsRef.current;
    const reduced = first.reducedMotion;
    const root = rootRef.current;

    if (!viewedRef.current) {
      viewedRef.current = true;
      first.onExplore({ name: 'section_viewed', section: first.id });
    }

    /* ------------------------------------------------ the hook line (§I.3) */
    let hookShowing = false;
    let hookTimer: ReturnType<typeof setTimeout> | null = null;
    if (document.documentElement.dataset.stageState === 'engaged') {
      hookShowing = true;
      queueMicrotask(() => {
        if (hookShowing) first.say(HOOK, HOOK_MS);
      });
      hookTimer = setTimeout(() => {
        hookShowing = false;
      }, HOOK_MS);
    }
    function dismissHook(): void {
      if (!hookShowing) return;
      hookShowing = false;
      propsRef.current.say('');
    }
    document.addEventListener('pointerdown', dismissHook, true);
    document.addEventListener('keydown', dismissHook, true);

    /* ------------------------------------------------ colours, once */
    const cCurve = rgba('--c-accent', 1);
    const cCurveDim = rgba('--c-accent-dim', 1);
    const cHi = rgba('--c-accent-hi', 1);
    const cCircle = rgba('--c-border-strong', 1);
    const cRadius = rgba('--c-accent-2', 1);
    const cEmber = rgba('--c-accent-3', 1);
    const cLabel = rgba('--c-text-secondary', 1);
    const monoFont = `12px ${token('--font-mono') || 'ui-monospace, monospace'}`;
    const DASH = [3, 7];
    const NO_DASH: number[] = [];

    /* ------------------------------------------------ pointer */
    let px = -1;
    let py = -1;
    const stage = document.getElementById('stage');
    function onMove(e: PointerEvent): void {
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      px = e.clientX - rect.left;
      py = e.clientY - rect.top;
    }
    function onLeave(): void {
      px = -1;
      py = -1;
    }
    stage?.addEventListener('pointermove', onMove, { passive: true });
    stage?.addEventListener('pointerleave', onLeave);
    stage?.addEventListener('pointercancel', onLeave);

    /* ------------------------------------------------ node + curve state */
    let latest: readonly RingNode[] = first.nodes;
    let dirty = true;
    const unsubNodes = subscribeNodes((n) => {
      latest = n;
      dirty = true;
    });

    let terms: Term[] = [];
    const termIndex = new Map<string, number>();
    const samples = new Float32Array(2 * (SAMPLES + 1));
    const scratch = new Float64Array(2);
    let n = SAMPLES;
    let curPath: Path2D | null = null;
    let prevPath: Path2D | null = null;
    let fadeT = CURVE_FADE_MS;
    let revealT = REVEAL_MS;
    let revealed = false;
    let bandT = 0;
    let bandPath: Path2D | null = null;
    let bandOk = false;
    let bandSx = 0;
    let bandSy = 0;
    let bandUx = 0;
    let bandUy = 0;
    let bandL = 0;
    let bandScale = 0;
    let bandMean = 0;

    const centres = new Float64Array(2 * (MAX_TERMS + 1));
    const lag = new Float64Array(MAX_TERMS);
    const slowLeft = new Float64Array(MAX_TERMS);
    const pulse = new Float64Array(MAX_TERMS);
    let hover = -1;
    let lastLabelled = -2;
    let everSlowed = false;

    /* ------------------------------------------------ geometry + gradients */
    let gw = -1;
    let gh = -1;
    let gR = -1;
    let gcx = -1;
    let gcy = -1;
    let bgGrad: CanvasGradient | null = null;
    let headGrad: CanvasGradient | null = null;

    function rebuild(cx: number, cy: number, R: number, h: number, mobile: boolean): void {
      terms = termsFor(latest, R, mobile ? CHAIN_CAP_MOBILE : MAX_TERMS);
      termIndex.clear();
      for (let i = 0; i < terms.length; i++) termIndex.set((terms[i] as Term).id, i);
      n = mobile ? SAMPLES_MOBILE : SAMPLES;
      sampleCurve(terms, cx, cy, n, samples, scratch);

      if (curPath) {
        prevPath = curPath;
        fadeT = 0;
      }
      const path = new Path2D();
      path.moveTo(samples[0] as number, samples[1] as number);
      for (let i = 1; i <= n; i++) path.lineTo(samples[i * 2] as number, samples[i * 2 + 1] as number);
      curPath = path;

      // --- the band: the curve's radial profile unrolled along a straight
      // line that runs from the ring's lower-right toward the Next Arc.
      const startA = 0.42 * Math.PI * 2;
      bandSx = cx + 1.05 * R * Math.sin(startA);
      bandSy = cy - 1.05 * R * Math.cos(startA);
      const endX = cx;
      const endY = h - (mobile ? 128 : 78);
      bandL = Math.hypot(endX - bandSx, endY - bandSy);
      bandOk = bandL >= 60 && terms.length >= CLOSED_TERMS;
      if (bandOk) {
        bandUx = (endX - bandSx) / bandL;
        bandUy = (endY - bandSy) / bandL;
        const nx = -bandUy;
        const ny = bandUx;
        let sum = 0;
        for (let i = 0; i <= n; i++) {
          sum += Math.hypot((samples[i * 2] as number) - cx, (samples[i * 2 + 1] as number) - cy);
        }
        bandMean = sum / (n + 1);
        let dev = 1;
        for (let i = 0; i <= n; i++) {
          const d = Math.abs(
            Math.hypot((samples[i * 2] as number) - cx, (samples[i * 2 + 1] as number) - cy) - bandMean,
          );
          if (d > dev) dev = d;
        }
        bandScale = Math.min(24, 0.12 * R) / dev;
        const bp = new Path2D();
        for (let i = 0; i <= n; i++) {
          const r = Math.hypot((samples[i * 2] as number) - cx, (samples[i * 2 + 1] as number) - cy);
          const off = (r - bandMean) * bandScale;
          const along = (i / n) * bandL;
          const x = bandSx + bandUx * along + nx * off;
          const y = bandSy + bandUy * along + ny * off;
          if (i === 0) bp.moveTo(x, y);
          else bp.lineTo(x, y);
        }
        bandPath = bp;
      } else {
        bandPath = null;
      }

      if (root) {
        const gap = closureGap(terms, cx, cy);
        root.dataset.orbitTerms = String(terms.length);
        root.dataset.orbitSamples = String(n);
        root.dataset.orbitGap = gap.toExponential(3);
        root.dataset.orbitP0 = `${samples[0]},${samples[1]}`;
        root.dataset.orbitP1 = `${samples[n * 2]},${samples[n * 2 + 1]}`;
        root.dataset.orbitMaxR = maxRadius(samples, n, cx, cy).toFixed(1);
      }
    }

    const unsubFrame = subscribeFrame(() => {
      const p = propsRef.current;
      if (!p.visible) return;
      const { ctx, bg, geometry: g, clock, fired, tier } = p;
      if (!ctx || !bg || g.R <= 0) return;
      const mobile = isMobile(g.w, tier);
      const dt = clock.dt;

      if (g.w !== gw || g.h !== gh || g.R !== gR || g.cx !== gcx || g.cy !== gcy) {
        gw = g.w;
        gh = g.h;
        gR = g.R;
        gcx = g.cx;
        gcy = g.cy;
        bgGrad = bg.createRadialGradient(g.cx, g.cy, g.R * 0.15, g.cx, g.cy, g.R * 2.2);
        bgGrad.addColorStop(0, rgba('--c-accent-2', 0.075));
        bgGrad.addColorStop(0.6, rgba('--c-accent-2', 0.02));
        bgGrad.addColorStop(1, rgba('--c-canvas', 0));
        headGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 22);
        headGrad.addColorStop(0, rgba('--c-accent-hi', 0.9));
        headGrad.addColorStop(0.25, rgba('--c-accent-hi', 0.35));
        headGrad.addColorStop(1, rgba('--c-accent-hi', 0));
        dirty = true;
        curPath = null; // a resize is not a change worth cross-fading
      }
      if (dirty) {
        dirty = false;
        rebuild(g.cx, g.cy, g.R, g.h, mobile);
      }
      fadeT += dt;
      const k = reduced ? 1 : easeOut(Math.min(1, fadeT / CURVE_FADE_MS));

      // --- the revelation: the first time the curve closes with ≥ 5 terms
      if (!revealed && terms.length >= CLOSED_TERMS) {
        revealed = true;
        revealT = 0;
        bandT = 0;
      }
      revealT += dt;
      bandT += dt;

      /* ------------------------------------------ proximity + lag dynamics */
      // chain centres at the rendered phases
      const phase = reduced ? 0 : clock.phase;
      let x = g.cx;
      let y = g.cy;
      centres[0] = x;
      centres[1] = y;
      for (let i = 0; i < terms.length; i++) {
        const term = terms[i] as Term;
        const t = phase - clock.dir * (lag[i] as number);
        const ang = Math.PI * 2 * term.k * t + term.phi;
        x += term.A * Math.sin(ang);
        y -= term.A * Math.cos(ang);
        centres[i * 2 + 2] = x;
        centres[i * 2 + 3] = y;
      }

      let near = -1;
      if (px >= 0) {
        let best = NEAR_PX;
        for (let i = 0; i < terms.length; i++) {
          const term = terms[i] as Term;
          const d = Math.abs(
            Math.hypot(px - (centres[i * 2] as number), py - (centres[i * 2 + 1] as number)) - term.A,
          );
          if (d <= best) {
            best = d;
            near = i;
          }
        }
      }
      if (near !== hover) {
        hover = near;
        if (hover >= 0) slowLeft[hover] = SLOW_MS;
      }
      const req = slowRequestRef.current;
      if (req >= 0) {
        slowRequestRef.current = -1;
        if (req < terms.length) slowLeft[req] = SLOW_MS;
      }
      const labelled = hover >= 0 ? hover : focusRef.current < terms.length ? focusRef.current : -1;
      if (labelled !== lastLabelled) {
        lastLabelled = labelled;
        if (root) root.dataset.orbitLabel = labelled >= 0 ? (LABELS[(terms[labelled] as Term).k] as string) : '';
      }

      let anySlowed = false;
      for (let i = 0; i < terms.length; i++) {
        const left = slowLeft[i] as number;
        if (left > 0 && !reduced) {
          lag[i] = (lag[i] as number) + (dt / clock.periodMs) * (1 - SLOW_FACTOR);
          slowLeft[i] = Math.max(0, left - dt);
          anySlowed = true;
          everSlowed = true;
        } else {
          if (left > 0) {
            slowLeft[i] = Math.max(0, left - dt);
            everSlowed = true;
          }
          const l = (lag[i] as number) * Math.exp(-dt / RECONVERGE_MS);
          lag[i] = l < 1e-5 ? 0 : l;
        }
        const pl = pulse[i] as number;
        if (pl > 0) pulse[i] = Math.max(0, pl - dt);
      }
      if (root && (root.dataset.orbitSlowed === '1') !== anySlowed) {
        root.dataset.orbitSlowed = anySlowed ? '1' : '0';
      }
      for (let i = 0; i < fired.length; i++) {
        const ev = fired[i];
        if (!ev) continue;
        const idx = termIndex.get(ev.node.id);
        if (idx !== undefined) pulse[idx] = PULSE_MS;
      }

      /* ------------------------------------------ background */
      clear(bg);
      if (bgGrad) {
        bg.globalAlpha = reduced ? 1 : 1 + 0.08 * Math.sin(clock.phase * Math.PI * 2);
        bg.fillStyle = bgGrad;
        bg.fillRect(0, 0, g.w, g.h);
        bg.globalAlpha = 1;
      }
      if (curPath && tier !== 'low') {
        // the wide halo of the curve lives on the background layer
        bg.globalCompositeOperation = 'lighter';
        bg.lineCap = 'round';
        bg.lineJoin = 'round';
        bg.strokeStyle = cCurve;
        bg.lineWidth = 22;
        bg.globalAlpha = 0.045 * k;
        bg.stroke(curPath);
        bg.lineWidth = 7;
        bg.globalAlpha = 0.07 * k;
        bg.stroke(curPath);
        bg.globalAlpha = 1;
        bg.globalCompositeOperation = 'source-over';
      }

      /* ------------------------------------------ room layer */
      clear(ctx);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (terms.length === 0) {
        // The still for an empty ring: the first circle that is not yet there.
        ctx.setLineDash(DASH);
        ctx.strokeStyle = cCircle;
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(g.cx, g.cy, g.R * 0.42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash(NO_DASH);
        ctx.fillStyle = cHi;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(g.cx, g.cy, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // --- the traced curve, cross-faded from the previous arrangement
      if (prevPath && k < 1) {
        ctx.strokeStyle = cCurve;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.85 * (1 - k);
        ctx.stroke(prevPath);
      }
      if (curPath && terms.length > 0) {
        ctx.strokeStyle = cCurveDim;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.16 * k;
        ctx.stroke(curPath);
        ctx.strokeStyle = cCurve;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.85 * k;
        ctx.stroke(curPath);
        if (revealT < REVEAL_MS && !reduced) {
          const rk = 1 - revealT / REVEAL_MS;
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = cHi;
          ctx.lineWidth = 2 + 6 * rk;
          ctx.globalAlpha = 0.5 * rk;
          ctx.stroke(curPath);
          ctx.globalCompositeOperation = 'source-over';
        }
      }

      // --- the chain: circles on circles, and the radii that connect them
      ctx.lineWidth = 1;
      for (let i = 0; i < terms.length; i++) {
        const term = terms[i] as Term;
        const cxi = centres[i * 2] as number;
        const cyi = centres[i * 2 + 1] as number;
        const nx = centres[i * 2 + 2] as number;
        const ny = centres[i * 2 + 3] as number;
        const isLabelled = i === labelled;
        ctx.strokeStyle = isLabelled ? cRadius : cCircle;
        ctx.globalAlpha = isLabelled ? 0.9 : i === 0 ? 0.4 : 0.22;
        ctx.lineWidth = isLabelled ? 1.5 : 1;
        ctx.beginPath();
        ctx.arc(cxi, cyi, term.A, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = cRadius;
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cxi, cyi);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        const pl = pulse[i] as number;
        if (pl > 0) {
          const pk = pl / PULSE_MS;
          ctx.strokeStyle = cEmber;
          ctx.globalAlpha = 0.7 * pk;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cxi, cyi, term.A + (reduced ? 6 : 10 * (1 - pk)), 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // the pen: where the chain ends
      if (terms.length > 0) {
        const ex = centres[terms.length * 2] as number;
        const ey = centres[terms.length * 2 + 1] as number;
        ctx.fillStyle = cRadius;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(ex, ey, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- the harmonic label, in --font-mono, at the labelled circle
      if (labelled >= 0) {
        const term = terms[labelled] as Term;
        const cxi = centres[labelled * 2] as number;
        const cyi = centres[labelled * 2 + 1] as number;
        const ox = cxi + term.A * 0.7071;
        const oy = cyi - term.A * 0.7071;
        ctx.fillStyle = cRadius;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(ox, oy, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = monoFont;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillStyle = (slowLeft[labelled] as number) > 0 ? cHi : cLabel;
        ctx.fillText(LABELS[term.k] as string, ox + 7, oy - 7);
      }

      // --- the head on the true curve, glowing, with a comet behind it
      if (terms.length > 0 && headGrad) {
        const hi = Math.floor(phase * n);
        if (!reduced) {
          const len = Math.max(4, Math.floor(n * COMET_FRACTION));
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = cHi;
          for (let j = len; j >= 1; j--) {
            const a = (((hi - j) % (n)) + n) % n;
            const b = (((hi - j + 1) % (n)) + n) % n;
            ctx.globalAlpha = 0.85 * (1 - j / len) * k;
            ctx.lineWidth = 1 + 2 * (1 - j / len);
            ctx.beginPath();
            ctx.moveTo(samples[a * 2] as number, samples[a * 2 + 1] as number);
            ctx.lineTo(samples[b * 2] as number, samples[b * 2 + 1] as number);
            ctx.stroke();
          }
          ctx.globalCompositeOperation = 'source-over';
        }
        evalPoint(terms, phase, g.cx, g.cy, scratch);
        ctx.save();
        ctx.translate(scratch[0] as number, scratch[1] as number);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.85 * k;
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = cHi;
        ctx.globalAlpha = k;
        ctx.beginPath();
        ctx.arc(scratch[0] as number, scratch[1] as number, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- the next affordance: the curve unrolls into a band toward the arc
      if (bandOk && bandPath) {
        const uk = reduced ? 1 : easeOut(Math.min(1, bandT / BAND_UNROLL_MS));
        ctx.save();
        if (uk < 1) {
          // the band grows along its own line, toward the arc
          ctx.beginPath();
          ctx.rect(0, 0, g.w, bandSy + bandUy * bandL * uk);
          ctx.clip();
        }
        ctx.strokeStyle = cCurveDim;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.55 * k;
        ctx.stroke(bandPath);
        ctx.restore();
        if (uk >= 1) {
          const bi = Math.min(n, Math.max(0, Math.floor(phase * n)));
          const r = Math.hypot((samples[bi * 2] as number) - g.cx, (samples[bi * 2 + 1] as number) - g.cy);
          const off = (r - bandMean) * bandScale;
          const along = phase * bandL;
          const mx = bandSx + bandUx * along - bandUy * off;
          const my = bandSy + bandUy * along + bandUx * off;
          ctx.fillStyle = cHi;
          ctx.globalAlpha = 0.9 * k;
          ctx.beginPath();
          ctx.arc(mx, my, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      /* ------------------------------------------ depth, monotonic */
      const depth = depthFor(terms.length, everSlowed);
      if (depth > depthRef.current) {
        depthRef.current = depth;
        p.onExplore({ name: 'depth_reached', section: p.id, depth });
      }
    });

    return () => {
      unsubFrame();
      unsubNodes();
      if (hookTimer) clearTimeout(hookTimer);
      hookShowing = false;
      document.removeEventListener('pointerdown', dismissHook, true);
      document.removeEventListener('keydown', dismissHook, true);
      stage?.removeEventListener('pointermove', onMove);
      stage?.removeEventListener('pointerleave', onLeave);
      stage?.removeEventListener('pointercancel', onLeave);
    };
  }, [props.seed, props.reducedMotion]);

  // The keyboard equivalent of hovering a circle: one button per harmonic.
  // Focusing one slows its circle and shows its label, exactly like the pointer.
  return (
    <div ref={rootRef} className={styles.root} data-room="orbit">
      {listTerms.length > 0 ? (
        <ol className={styles.terms} aria-label="orbit">
          {listTerms.map((t, i) => (
            <li key={t.id}>
              <button
                type="button"
                className="u-num"
                onFocus={() => {
                  focusRef.current = i;
                  slowRequestRef.current = i;
                }}
                onBlur={() => {
                  if (focusRef.current === i) focusRef.current = -1;
                }}
              >
                {LABELS[t.k]}
              </button>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
