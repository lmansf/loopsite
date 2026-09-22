'use client';

/**
 * src/sections/tone/Room.tsx — TONE: the ring as a melodic sequencer.
 *
 * Spec: design/05-build-spec.md §D.3. **OWNED BY WP2.**
 *
 *   - radius is pitch: a minor pentatonic over three octaves indexed by `r`
 *   - each node is a string from the centre, rung as a standing wave
 *     A·sin(2πk·s) with k = 3 + r mod 5, A decaying from 14 px (τ 520 ms)
 *   - a second ring at 0.72R turns at 4/5 the rate (period 5000 ms) and fires
 *     the same nodes a fifth above at its own phase
 *   - 4 s and 5 s coincide every 20 000 ms: both heads cross a = 0 together and
 *     the room runs a single 720 ms full-circuit light sweep. It is a property
 *     of the two periods (secondPhase is a function of the master clock), not
 *     a scripted cue.
 *   - a radial drag glides the pitch and the string's k live, snapping to the
 *     scale on release
 *
 * Everything works identically muted; no visual depends on audio.
 */

import { useEffect, useRef, useState } from 'react';
import { isEnabled, playCue } from '@/lib/audio';
import { subscribeFrame } from '@/lib/clock';
import { pointAt, radiusOfLevel } from '@/lib/ring-geometry';
import { readState } from '@/lib/storage';
import { rgba } from '@/lib/tokens';
import type { FireEvent, SectionProps } from '@/lib/types';
import { SoundPetal, petalRevealed } from '@/components/ui/SoundPetal';
import styles from './room.module.css';
import {
  REALIGN_LIFT_MS,
  REALIGN_SWEEP_MS,
  SECOND_RING,
  STRING_AMPLITUDE,
  depthFor,
  firesBetween,
  freqOfContinuous,
  realignCycle,
  secondPhase,
  stringAmplitude,
  stringK,
} from './logic';

interface StringState {
  /** smoothed radius level: glides while dragging, settles on the scale */
  level: number;
  lastR: number;
  /** clock.t of the last fire by the sweep / by the second ring */
  fire1: number;
  fire2: number;
}

const TWO_PI = Math.PI * 2;
const GLIDE_TAU_MS = 110;
const GUIDE_LEVELS = [0, 5, 10, 15];

export default function Room(props: SectionProps) {
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });

  const depthRef = useRef(0);
  const viewedRef = useRef(false);
  const [petal, setPetal] = useState(false);

  useEffect(() => {
    const first = propsRef.current;
    if (!viewedRef.current) {
      viewedRef.current = true;
      first.onExplore({ name: 'section_viewed', section: first.id });
    }

    let petalShown = isEnabled() || readState().sound || petalRevealed();
    // Deferred by a microtask: a setState in an effect body cascades a render.
    if (petalShown) queueMicrotask(() => setPetal(true));

    const strings = new Map<string, StringState>();
    const fires2: FireEvent[] = [];
    let prevPhase2 = secondPhase(first.clock.revolution, first.clock.phase);
    let prevCycle = realignCycle(first.clock.revolution, first.clock.phase);
    let realignAge = Infinity;
    let realigned = false;
    let dragged = false;

    const unsubscribe = subscribeFrame(() => {
      const p = propsRef.current;
      if (!p.visible) return;
      const { ctx, bg, geometry: g, clock, nodes, fired, reducedMotion, tier } = p;
      if (!ctx || !bg || g.R <= 0) return;
      const { cx, cy, R } = g;
      const dt = clock.dt;
      const t = clock.t;
      const phase = clock.phase;

      /* ---------------------------------------------------------- events */

      if (!petalShown && nodes.length >= 1) {
        petalShown = true;
        setPetal(true);
      }

      // the second ring: its own phase, its own fires, a fifth above
      const phase2 = secondPhase(clock.revolution, phase);
      firesBetween(prevPhase2, phase2, clock.dir, nodes, fires2, clock.periodMs * 1.25);
      prevPhase2 = phase2;

      // the realignment: five inner revolutions = four outer ones = 20 s
      const cycle = realignCycle(clock.revolution, phase);
      if (cycle !== prevCycle) {
        prevCycle = cycle;
        realignAge = 0;
        realigned = true;
        playCue('chime', { freq: 880 });
      }
      realignAge += dt;

      // strings: keep one per node, glide the level, remember fires
      const seen = new Set<string>();
      for (const n of nodes) {
        seen.add(n.id);
        let s = strings.get(n.id);
        if (!s) {
          s = { level: n.r, lastR: n.r, fire1: -Infinity, fire2: -Infinity };
          strings.set(n.id, s);
        }
        if (n.r !== s.lastR) {
          dragged = true;
          s.lastR = n.r;
        }
        if (reducedMotion) s.level = n.r;
        else s.level += (n.r - s.level) * (1 - Math.exp(-dt / GLIDE_TAU_MS));
      }
      for (const id of strings.keys()) if (!seen.has(id)) strings.delete(id);

      for (const ev of fired) {
        const s = strings.get(ev.node.id);
        if (!s) continue;
        s.fire1 = t;
        playCue('tone', { freq: freqOfContinuous(s.level) });
      }
      for (const ev of fires2) {
        const s = strings.get(ev.node.id);
        if (!s) continue;
        s.fire2 = t;
        playCue('tone', { freq: freqOfContinuous(s.level) * 1.5, gain: 0.7 });
      }

      /* ---------------------------------------------------------- background */

      clear(bg);
      const density = 0.04 + 0.02 * (Math.min(nodes.length, 8) / 8);
      const breathe = reducedMotion ? 1 : 1 + 0.06 * Math.cos(phase2 * TWO_PI);
      const grad = bg.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 2.1);
      grad.addColorStop(0, rgba('--c-accent-2', density * 0.8 * breathe));
      grad.addColorStop(0.5, rgba('--c-accent', density * 0.6 * breathe));
      grad.addColorStop(1, rgba('--c-canvas', 0));
      bg.fillStyle = grad;
      bg.fillRect(0, 0, g.w, g.h);

      /* ---------------------------------------------------------- room layer */

      clear(ctx);
      ctx.lineCap = 'round';

      // the pitch guide: four faint octave-ish circles, so the field reads as
      // a scale even before the first node
      for (const lvl of GUIDE_LEVELS) {
        ctx.strokeStyle = rgba('--c-accent', lvl === 0 ? 0.09 : 0.05);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, radiusOfLevel(lvl, R), 0, TWO_PI);
        ctx.stroke();
      }

      // the second ring at 0.72R — 1 px at 26% so it never competes with the ring
      const R2 = R * SECOND_RING;
      ctx.strokeStyle = rgba('--c-accent-2', 0.26);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, R2, 0, TWO_PI);
      ctx.stroke();

      // its comet: a short arc behind the head
      if (!reducedMotion) {
        const segs = tier === 'low' ? 4 : 8;
        const tail = 0.07;
        for (let i = 0; i < segs; i++) {
          const a0 = phase2 - clock.dir * (tail - (tail * i) / segs);
          const a1 = a0 + clock.dir * (tail / segs + 0.002);
          ctx.strokeStyle = rgba('--c-accent-2', 0.6 * ((i + 1) / segs) ** 2);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          arcTurn(ctx, cx, cy, R2, a0, a1);
          ctx.stroke();
        }
      }
      const head2 = { x: cx + R2 * Math.sin(phase2 * TWO_PI), y: cy - R2 * Math.cos(phase2 * TWO_PI) };
      const halo = ctx.createRadialGradient(head2.x, head2.y, 0, head2.x, head2.y, 14);
      halo.addColorStop(0, rgba('--c-accent-2', 0.5));
      halo.addColorStop(1, rgba('--c-accent-2', 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(head2.x, head2.y, 14, 0, TWO_PI);
      ctx.fill();
      ctx.fillStyle = rgba('--c-accent-2', 1);
      ctx.beginPath();
      ctx.arc(head2.x, head2.y, 3, 0, TWO_PI);
      ctx.fill();

      // the hub
      ctx.fillStyle = rgba('--c-accent', 0.7);
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, TWO_PI);
      ctx.fill();

      // the strings
      const samples = tier === 'low' ? 18 : 36;
      for (const n of nodes) {
        const s = strings.get(n.id);
        if (!s) continue;
        const end = pointAt(n.a, s.level, g);
        const dx = end.x - cx;
        const dy = end.y - cy;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const since1 = t - s.fire1;
        const since2 = t - s.fire2;
        const recent = Math.min(since1, since2);

        if (reducedMotion) {
          // straight line; alpha, not amplitude, encodes the last fire (1200 ms)
          const k = Number.isFinite(recent) ? Math.max(0, 1 - recent / 1200) : 0;
          ctx.strokeStyle = rgba('--c-accent', 0.3 + 0.55 * k);
          ctx.lineWidth = 1 + k;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
        } else {
          const A = Math.max(stringAmplitude(since1), 0.7 * stringAmplitude(since2));
          const k = stringK(s.level);
          const tint = since2 < since1 ? '--c-accent-2' : '--c-accent';
          ctx.strokeStyle = rgba(tint, 0.25 + (0.6 * A) / STRING_AMPLITUDE);
          ctx.lineWidth = 1 + (0.8 * A) / STRING_AMPLITUDE;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          // the wave breathes at the string's own pitch class, so two strings
          // never look identical while ringing
          const wobble = Math.sin(t / (60 + 9 * k));
          for (let i = 1; i <= samples; i++) {
            const u = i / samples;
            const off = A * Math.sin(TWO_PI * k * u) * wobble;
            ctx.lineTo(cx + dx * u + nx * off, cy + dy * u + ny * off);
          }
          ctx.stroke();
        }

        // the pitch mark: a halo whose size is the note's ring-down
        const ring = Number.isFinite(recent) ? Math.max(0, 1 - recent / 520) : 0;
        ctx.strokeStyle = rgba('--c-accent-hi', 0.35 + 0.5 * ring);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(end.x, end.y, 10 + 10 * ring, 0, TWO_PI);
        ctx.stroke();

        // where the string crosses the second ring, a small ion bead
        const bead = Math.max(0, 1 - since2 / 400);
        if (bead > 0) {
          const bx = cx + (dx / len) * R2;
          const by = cy + (dy / len) * R2;
          ctx.fillStyle = rgba('--c-accent-2', 0.9 * bead);
          ctx.beginPath();
          ctx.arc(bx, by, 2 + 3 * bead, 0, TWO_PI);
          ctx.fill();
        }
      }

      // the realignment: one 720 ms full-circuit light sweep in accent-hi
      if (reducedMotion) {
        if (realignAge < REALIGN_LIFT_MS * 3) {
          const k = Math.min(1, realignAge / REALIGN_LIFT_MS);
          ctx.strokeStyle = rgba('--c-accent-hi', 0.55 * (1 - k * 0.6));
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(cx, cy, R, 0, TWO_PI);
          ctx.stroke();
        }
      } else if (realignAge < REALIGN_SWEEP_MS) {
        const k = realignAge / REALIGN_SWEEP_MS;
        const headA = clock.dir > 0 ? k : 1 - k;
        const segs = tier === 'low' ? 12 : 24;
        const tail = 0.3;
        for (let i = 0; i < segs; i++) {
          const a0 = headA - clock.dir * (tail - (tail * i) / segs);
          const a1 = a0 + clock.dir * (tail / segs + 0.003);
          ctx.strokeStyle = rgba('--c-accent-hi', 0.85 * ((i + 1) / segs) ** 2 * (1 - k * 0.4));
          ctx.lineWidth = 3;
          ctx.beginPath();
          arcTurn(ctx, cx, cy, R, a0, a1);
          ctx.stroke();
        }
        ctx.strokeStyle = rgba('--c-accent-hi', 0.2 * (1 - k));
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, TWO_PI);
        ctx.stroke();
      }

      /* ---------------------------------------------------------- depth */

      const depth = depthFor(nodes, dragged, realigned);
      if (depth > depthRef.current) {
        depthRef.current = depth;
        p.onExplore({ name: 'depth_reached', section: p.id, depth });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [props.seed, props.reducedMotion]);

  const g = props.geometry;
  return (
    <SoundPetal x={g.cx} y={g.cy + g.R + 26} show={petal && g.R > 0} className={styles.petal} />
  );
}

/** An arc between two normalized turns (0 = 12 o'clock), in either order. */
function arcTurn(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
): void {
  const lo = Math.min(a0, a1) * TWO_PI - Math.PI / 2;
  const hi = Math.max(a0, a1) * TWO_PI - Math.PI / 2;
  ctx.arc(cx, cy, r, lo, hi);
}

/** Clear a layer in device pixels, leaving the CSS-pixel transform intact. */
function clear(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}
