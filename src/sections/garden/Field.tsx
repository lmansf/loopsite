
/**
 * src/sections/garden/Field.tsx — GARDEN (§D.11). A slow field of drifting
 * rings, each a complete loop you can touch.
 *
 * The field has exactly three honest sources: the 150 shipped seed loops
 * (authored artefacts, build-time constants from @/lib/garden-seed), the
 * loops this ring has kept, and any loop opened from a shared URL this
 * session. Plus one Filament ring: your own loop, which drifts past too.
 * Nothing here is counted, attributed or described. The only copy is the
 * shell's hook line.
 *
 * Touch:
 *   tap a ring       preview it — its nodes appear on the main ring in Ion,
 *                    non-destructively; your own nodes stay put
 *   tap again, or    release the preview
 *   tap empty field
 *   drag a ring in   take it: its loop becomes the main ring. Your own loop
 *                    stays in the field as the Filament ring and dragging
 *                    that one back in restores it exactly
 *   Enter            preview the next ring (keyboard); Shift+Enter takes it
 *
 * THE TWIN can fire here: when your loop matches a seed loop under rotation,
 * both rings light and phase-lock for two revolutions.
 */

import { useEffect, useRef } from 'react';
import { getFrame, phaseOf, subscribeFrame } from '@/lib/clock';
import { GARDEN_SEEDS } from '@/lib/garden-seed';
import { pointAt, radiusOfLevel } from '@/lib/ring-geometry';
import { getNodes, restoreNodes, subscribeNodes } from '@/lib/ring-store';
import { readState } from '@/lib/storage';
import { rgba } from '@/lib/tokens';
import { readUrlState } from '@/lib/url-state';
import type { RingNode, SectionProps } from '@/lib/types';
import { clearField, getLock, publishField, setLock } from '../twin/bus';
import { LOCK_MS } from '../twin/logic';
import {
  alphaFor,
  decodeMany,
  depthFor,
  drift,
  EXCLUSION,
  gridLayout,
  hitLoop,
  makeLoop,
  place,
  visibleCount,
  type FieldLoop,
} from './logic';
import { inStage, localPoint, stageEl } from './stage';

const OWN_RADIUS = 40;
const OWN_DEPTH = 0.1;
/** a press that travels further than this is a drag, not a tap */
const DRAG_PX = 8;
/** the little comet on every mini-ring, in turns */
const TRAIL_TURN = 0.05;
/** colour strings are cached at this many alpha steps */
const ALPHA_STEPS = 40;

interface Press {
  id: number;
  index: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  dragging: boolean;
}

export default function Room(props: SectionProps) {
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });
  const depthRef = useRef(0);
  const viewedRef = useRef(false);

  useEffect(() => {
    const first = propsRef.current;
    const seed = first.seed;
    const stage = stageEl();

    // ---- the field ---------------------------------------------------------
    const own = makeLoop('own', 'own', getNodes(), seed);
    own.radius = OWN_RADIUS;
    own.depth = OWN_DEPTH;
    const state = readState();
    const kept = decodeMany(state.kept, 'kept', 'k', seed);
    const code = readUrlState().loopCode;
    const shared = code ? decodeMany([code], 'shared', 's', seed) : [];
    const seeds = decodeMany(GARDEN_SEEDS, 'seed', 'g', seed);
    const loops: FieldLoop[] = [own, ...kept, ...shared, ...seeds];
    const seedOffset = 1 + kept.length + shared.length;
    publishField(seeds, -1);

    /** your loop, kept aside while a field loop is on the main ring */
    let ownStash: readonly RingNode[] | null = null;
    /** the own ring hides while the main ring is a fresh copy of a field loop */
    let mirrorHidden = false;
    let adoptedSet: readonly RingNode[] | null = null;
    let preview = -1;
    let press: Press | null = null;
    let previewed = false;
    let ownSpotted = false;
    let adopted = false;
    let layoutKey = '';

    const colours = new Map<string, string>();
    let colourAge = 0;
    function col(name: string, alpha: number): string {
      const q = Math.round(Math.max(0, Math.min(1, alpha)) * ALPHA_STEPS);
      const key = name + q;
      let v = colours.get(key);
      if (!v) {
        v = rgba(name, q / ALPHA_STEPS);
        colours.set(key, v);
      }
      return v;
    }

    if (!viewedRef.current) {
      viewedRef.current = true;
      first.onExplore({ name: 'section_viewed', section: first.id });
    }

    const unsubNodes = subscribeNodes((n) => {
      if (mirrorHidden && n !== adoptedSet) mirrorHidden = false;
      if (!ownStash) own.nodes = n;
    });

    function adopt(index: number): void {
      const loop = loops[index];
      if (!loop || loop.nodes.length === 0) return;
      const rev = getFrame().revolution;
      if (loop.kind === 'own') {
        if (!ownStash) return;
        const back = ownStash;
        ownStash = null;
        mirrorHidden = false;
        preview = -1;
        restoreNodes(back);
        own.nodes = getNodes();
        publishField(seeds, -1);
        return;
      }
      const current = getNodes();
      if (!ownStash && current.length > 0) {
        ownStash = current;
        own.nodes = current;
      }
      adopted = true;
      preview = -1;
      restoreNodes(loop.nodes.map((n) => ({ ...n, born: rev })));
      adoptedSet = getNodes();
      mirrorHidden = ownStash === null;
      publishField(seeds, index - seedOffset);
    }

    function cyclePreview(): void {
      const g = propsRef.current.geometry;
      const n = Math.min(visibleCount(propsRef.current.tier, g.w, g.h), loops.length);
      let i = preview;
      for (let k = 0; k <= n; k++) {
        i++;
        if (i >= n) {
          preview = -1;
          return;
        }
        const loop = loops[i];
        if (loop && loop.nodes.length > 0 && !(loop.kind === 'own' && mirrorHidden)) {
          preview = i;
          previewed = true;
          return;
        }
      }
      preview = -1;
    }

    // ---- drawing -------------------------------------------------------------
    const unsubFrame = subscribeFrame(() => {
      const p = propsRef.current;
      if (!p.visible) return;
      const { ctx, bg, geometry: g, clock, reducedMotion, tier } = p;
      if (!ctx || !bg || g.R <= 0) return;

      if (++colourAge > 300) {
        colourAge = 0;
        colours.clear();
      }

      const count = Math.min(visibleCount(tier, g.w, g.h), loops.length);

      // --- background: a quiet glow around the ring, a cooler one far off
      clear(bg);
      const glow = bg.createRadialGradient(g.cx, g.cy, g.R * 0.5, g.cx, g.cy, g.R * 2.2);
      glow.addColorStop(0, col('--c-accent', 0.045));
      glow.addColorStop(1, col('--c-canvas', 0));
      bg.fillStyle = glow;
      bg.fillRect(0, 0, g.w, g.h);
      const far = bg.createRadialGradient(
        g.w * 0.85,
        g.h * 0.9,
        0,
        g.w * 0.85,
        g.h * 0.9,
        Math.max(g.w, g.h) * 0.7,
      );
      far.addColorStop(0, col('--c-accent-2', 0.035));
      far.addColorStop(1, col('--c-canvas', 0));
      bg.fillStyle = far;
      bg.fillRect(0, 0, g.w, g.h);

      // --- layout
      if (reducedMotion) {
        const key = `${g.w}x${g.h}x${count}`;
        if (key !== layoutKey) {
          layoutKey = key;
          gridLayout(loops, count, g.w, g.h, g.cx, g.cy, g.R, seed);
        }
      } else {
        layoutKey = '';
        for (let i = 0; i < count; i++) {
          const loop = loops[i] as FieldLoop;
          drift(loop, clock.dt, g.w, g.h);
          place(loop, g.w, g.h, g.cx, g.cy, g.R);
        }
      }

      // --- the twin lock
      const lock = getLock();
      let lockedIndex = -1;
      let env = 0;
      if (lock) {
        if (clock.t >= lock.until) {
          setLock(null);
        } else {
          lockedIndex = seedOffset + lock.index;
          const left = (lock.until - clock.t) / LOCK_MS;
          env = Math.min(1, left * 4) * Math.min(1, (1 - left) * 8 + 0.2);
        }
      }

      // --- the field
      clear(ctx);
      for (let i = 0; i < count; i++) {
        const loop = loops[i] as FieldLoop;
        if (!loop.onScreen || loop.nodes.length === 0) continue;
        if (loop.kind === 'own' && mirrorHidden) continue;
        if (press && press.dragging && press.index === i) continue;
        if (loop.kind === 'own') ownSpotted = true;
        const alpha = alphaFor(loop, reducedMotion, clock.t, i, count);
        const locked = i === lockedIndex;
        const phase = locked ? clock.phase : phaseOf(i, count);
        drawMini(ctx, col, loop, loop.x, loop.y, alpha, phase, clock.dir, {
          previewed: i === preview,
          locked,
          env,
          trail: !reducedMotion && tier !== 'low',
        });
      }

      // --- a ring being carried in
      if (press && press.dragging) {
        const loop = loops[press.index];
        if (loop) {
          const inside = Math.hypot(press.dx - g.cx, press.dy - g.cy) < g.R;
          drawMini(ctx, col, loop, press.dx, press.dy, 0.85, clock.phase, clock.dir, {
            previewed: true,
            locked: false,
            env: 0,
            trail: !reducedMotion,
          });
          if (inside) {
            ctx.lineWidth = 1;
            ctx.strokeStyle = col('--c-accent-2', 0.5);
            ctx.beginPath();
            ctx.arc(g.cx, g.cy, g.R, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }

      // --- the preview, on the main ring, in Ion, non-destructive
      const shown = loops[preview];
      if (shown && shown.nodes.length > 0) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = col('--c-accent-2', 0.3);
        ctx.beginPath();
        ctx.arc(g.cx, g.cy, g.R, 0, Math.PI * 2);
        ctx.stroke();
        for (const n of shown.nodes) {
          const pt = pointAt(n.a, n.r, g);
          ctx.fillStyle = col('--c-accent-2', 0.18);
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = col('--c-accent-2', 0.9);
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // --- both rings lit: the main ring's share of the twin lock
      if (lockedIndex >= 0 && env > 0) {
        for (const [width, a] of [
          [7, 0.1],
          [3, 0.28],
          [1.5, 0.9],
        ] as const) {
          ctx.lineWidth = width;
          ctx.strokeStyle = col('--c-accent-hi', a * env);
          ctx.beginPath();
          ctx.arc(g.cx, g.cy, g.R, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = col('--c-accent-hi', 0.45 * env);
        for (const n of p.nodes) {
          const pt = pointAt(n.a, n.r, g);
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // --- depth, monotonic, at most once per 0.25 step
      const depth = depthFor(previewed, ownSpotted, adopted);
      if (depth > depthRef.current) {
        depthRef.current = depth;
        p.onExplore({ name: 'depth_reached', section: p.id, depth });
      }
    });

    // ---- input -------------------------------------------------------------
    function onPointerDown(e: PointerEvent): void {
      if (!stage || !inStage(e.target)) return;
      const g = propsRef.current.geometry;
      if (g.R <= 0) return;
      const pt = localPoint(e, stage);
      const count = Math.min(visibleCount(propsRef.current.tier, g.w, g.h), loops.length);
      const hit = hitLoop(loops, count, pt.x, pt.y);
      if (hit >= 0) {
        const loop = loops[hit];
        if (!loop || loop.nodes.length === 0 || (loop.kind === 'own' && mirrorHidden)) return;
        press = { id: e.pointerId, index: hit, x: pt.x, y: pt.y, dx: pt.x, dy: pt.y, dragging: false };
        return;
      }
      if (preview >= 0 && Math.hypot(pt.x - g.cx, pt.y - g.cy) > EXCLUSION * g.R) preview = -1;
    }

    function onPointerMove(e: PointerEvent): void {
      if (!stage || !press || e.pointerId !== press.id) return;
      const pt = localPoint(e, stage);
      press.dx = pt.x;
      press.dy = pt.y;
      if (!press.dragging && Math.hypot(pt.x - press.x, pt.y - press.y) > DRAG_PX) press.dragging = true;
    }

    function onPointerUp(e: PointerEvent): void {
      if (!stage || !press || e.pointerId !== press.id) return;
      const done = press;
      press = null;
      const g = propsRef.current.geometry;
      const pt = localPoint(e, stage);
      if (done.dragging) {
        if (Math.hypot(pt.x - g.cx, pt.y - g.cy) < g.R) {
          adopt(done.index);
          e.stopPropagation();
        }
        return;
      }
      preview = preview === done.index ? -1 : done.index;
      if (preview >= 0) previewed = true;
    }

    function onPointerCancel(e: PointerEvent): void {
      if (press && e.pointerId === press.id) press = null;
    }

    function onKeyDown(e: KeyboardEvent): void {
      if (!inStage(e.target) || e.key !== 'Enter') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      if (e.shiftKey) {
        if (preview >= 0) adopt(preview);
        return;
      }
      cyclePreview();
    }

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('pointercancel', onPointerCancel, true);
    window.addEventListener('keydown', onKeyDown, true);

    return () => {
      unsubFrame();
      unsubNodes();
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('pointercancel', onPointerCancel, true);
      window.removeEventListener('keydown', onKeyDown, true);
      clearField();
    };
  }, [props.seed, props.reducedMotion]);

  return null;
}

/* -------------------------------------------------------------- helpers */

interface MiniStyle {
  previewed: boolean;
  locked: boolean;
  env: number;
  trail: boolean;
}

const STROKE: Record<FieldLoop['kind'], string> = {
  own: '--c-accent',
  kept: '--c-text-secondary',
  shared: '--c-accent-2',
  seed: '--c-text-muted',
};

const DOT: Record<FieldLoop['kind'], string> = {
  own: '--c-accent',
  kept: '--c-text',
  shared: '--c-accent-2',
  seed: '--c-text-secondary',
};

function theta(turn: number): number {
  return turn * Math.PI * 2 - Math.PI / 2;
}

/** One mini-ring: its circle, its nodes as 2 px dots, and its own sweep head. */
function drawMini(
  ctx: CanvasRenderingContext2D,
  col: (name: string, alpha: number) => string,
  loop: FieldLoop,
  x: number,
  y: number,
  alpha: number,
  phase: number,
  dir: 1 | -1,
  style: MiniStyle,
): void {
  const r = loop.radius;
  let stroke = STROKE[loop.kind];
  let dot = DOT[loop.kind];
  let ringAlpha = alpha;
  let width = 1;
  if (style.previewed) {
    stroke = '--c-accent-2';
    dot = '--c-accent-2';
    ringAlpha = Math.max(alpha, 0.95);
    width = 1.5;
  }
  if (style.locked) {
    stroke = '--c-accent-hi';
    dot = '--c-accent-hi';
    ringAlpha = 1;
    width = 1.5;
    ctx.lineWidth = 5;
    ctx.strokeStyle = col('--c-accent-hi', 0.22 * style.env);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.lineWidth = width;
  ctx.strokeStyle = col(stroke, ringAlpha);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = col(dot, Math.min(1, alpha + 0.25));
  const dotR = loop.kind === 'own' || style.previewed || style.locked ? 2.5 : 2;
  for (const n of loop.nodes) {
    const rho = radiusOfLevel(n.r, r);
    const t = theta(n.a);
    ctx.beginPath();
    ctx.arc(x + rho * Math.cos(t), y + rho * Math.sin(t), dotR, 0, Math.PI * 2);
    ctx.fill();
  }

  if (style.trail) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = col('--c-accent', Math.min(1, alpha + 0.1));
    ctx.beginPath();
    ctx.arc(x, y, r, theta(phase - TRAIL_TURN * dir), theta(phase), dir < 0);
    ctx.stroke();
  }
  const ht = theta(phase);
  ctx.fillStyle = col('--c-accent-hi', Math.min(1, alpha + 0.35));
  ctx.beginPath();
  ctx.arc(x + r * Math.cos(ht), y + r * Math.sin(ht), 1.6, 0, Math.PI * 2);
  ctx.fill();
}

/** Clear a layer in device pixels, leaving the CSS-pixel transform intact. */
function clear(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}
