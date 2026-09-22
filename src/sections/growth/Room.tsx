'use client';

/**
 * src/sections/growth/Room.tsx — GROWTH, notch 7 (§D.7).
 *
 * An L-system fern whose branching rule is the visitor's node pattern. One
 * generation per revolution, capped at 7 (tier low: 5). The fern's base sits
 * on the ring at the first node's angle and grows inward across the loop; at
 * the cap its trunk is 2.3·R long, so the tip crosses the far rim and leaves
 * the stage.
 *
 * Geometry is built once per generation per node arrangement into one Path2D
 * per nesting depth and cached by `(angles, radii, variants)` hash. A drag
 * marks the arrangement dirty; the next frame rebuilds exactly one generation
 * (never more than one build per frame) and strokes it. Nothing is allocated
 * in the frame path except on the frame that rebuilds.
 *
 * Reduced motion: the fern is drawn at its final generation, fully formed,
 * with a 160 ms fade-in; node fires change branch alpha only.
 */

import { useEffect, useRef } from 'react';
import { subscribeFrame } from '@/lib/clock';
import { subscribeNodes } from '@/lib/ring-store';
import { pointAt, radiusOfLevel } from '@/lib/ring-geometry';
import { rgba } from '@/lib/tokens';
import { mulberry32 } from '@/lib/rng';
import type { RingNode, SectionProps } from '@/lib/types';
import styles from './room.module.css';
import {
  GEN_CAP,
  GEN_FADE_MS,
  LIT_MS,
  REDUCED_FADE_MS,
  buildFern,
  depthFor,
  fernHash,
  genCapFor,
  heightFor,
  paramsFor,
  segmentCapFor,
  sortByAngle,
  wasDragged,
} from './logic';

const HOOK = 'one more generation';
const HOOK_MS = 3000;
const CACHE_MAX = 12;
const TRUNK_WIDTH = 3.2;
/** With no nodes the fern rises from the bottom of the ring, straight up through it. */
const DEFAULT_BASE_A = 0.5;
const DEFAULT_BASE_R = 8;

interface GenPaths {
  paths: Path2D[];
  width: Float64Array;
  alpha: Float64Array;
  count: number;
  gen: number;
  tipY: number;
}

/** Parse the numbers out of an `rgba(r, g, b, a)` string from tokens.ts. */
function channels(name: string): [number, number, number] {
  const m = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(rgba(name, 1));
  if (!m) return [255, 255, 255];
  return [+(m[1] as string), +(m[2] as string), +(m[3] as string)];
}

/** A colour between two tokens, as an opaque rgba string. Setup-time only. */
function mix(a: [number, number, number], b: [number, number, number], k: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * k);
  const g = Math.round(a[1] + (b[1] - a[1]) * k);
  const bl = Math.round(a[2] + (b[2] - a[2]) * k);
  return `rgba(${r}, ${g}, ${bl}, 1)`;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function clear(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

export default function Room(props: SectionProps) {
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });

  const rootRef = useRef<HTMLDivElement | null>(null);
  const depthRef = useRef(0);
  const viewedRef = useRef(false);

  useEffect(() => {
    const first = propsRef.current;
    const reduced = first.reducedMotion;
    const root = rootRef.current;

    if (!viewedRef.current) {
      viewedRef.current = true;
      first.onExplore({ name: 'section_viewed', section: first.id });
    }

    /* ------------------------------------------------ the hook line (§I.3) */
    // Shown once on entry for 3 s, dismissed by any input. Only once the hero
    // caption has yielded — before that the <h1> occupies the same slot.
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
    const dim = channels('--c-accent-dim');
    const accent = channels('--c-accent');
    const styleByDepth: string[] = [];
    for (let d = 0; d <= GEN_CAP; d++) styleByDepth.push(mix(dim, accent, d / GEN_CAP));
    const styleHi = rgba('--c-accent-hi', 1);
    const styleEmber = rgba('--c-accent-3', 1);

    /* ------------------------------------------------ node state */
    let latest: readonly RingNode[] = first.nodes;
    let sorted: RingNode[] = sortByAngle(latest);
    let hash = fernHash(sorted);
    const indexOf = new Map<string, number>();
    let dirty = true;
    let dragged = false;

    // Additive to reading `props.nodes`: the store notifies synchronously on a
    // drag, so the rebuild lands on the very next frame rather than after
    // React's next render. The set is the same one props will carry.
    const unsubNodes = subscribeNodes((n) => {
      if (!dragged && wasDragged(latest, n)) dragged = true;
      latest = n;
      dirty = true;
    });

    /* ------------------------------------------------ generation state */
    let gen = reduced ? genCapFor(first.tier) : 1;
    let prevGen = -1;
    let lastRev = first.clock.revolution;
    let fadeT = 0;
    const lit = new Float64Array(GEN_CAP + 1);

    /* ------------------------------------------------ geometry + cache */
    let gw = -1;
    let gh = -1;
    let gR = -1;
    let gcx = -1;
    let gcy = -1;
    let bgGrad: CanvasGradient | null = null;
    let baseGrad: CanvasGradient | null = null;
    const cache = new Map<string, Array<GenPaths | null>>();

    function build(g: number, R: number, cx: number, cy: number, cap: number, segCap: number): GenPaths {
      const t0 = performance.now();
      const baseNode = latest[0];
      const a = baseNode ? baseNode.a : DEFAULT_BASE_A;
      const r = baseNode ? baseNode.r : DEFAULT_BASE_R;
      const base = pointAt(a, r, { cx, cy, R, band: 0, dpr: 1, w: gw, h: gh });
      const params = paramsFor(sorted, g);
      const fern = buildFern({
        gen: g,
        params,
        baseX: base.x,
        baseY: base.y,
        heading: a * Math.PI * 2 + Math.PI, // inward: out of the loop, across it
        height: heightFor(g, cap, R),
        cap: segCap,
        rnd: mulberry32((first.seed ^ 0x6f0d) + g * 7919),
      });
      const paths: Path2D[] = [];
      const width = new Float64Array(g + 1);
      const alpha = new Float64Array(g + 1);
      let w = TRUNK_WIDTH;
      for (let d = 0; d <= g; d++) {
        paths.push(new Path2D());
        if (d > 0) w *= params.lambda[d] as number;
        width[d] = Math.max(0.6, w);
        alpha[d] = 0.35 + 0.55 * (d / Math.max(1, g));
      }
      const s = fern.segs;
      for (let i = 0; i < fern.count; i++) {
        const p = paths[fern.depth[i] as number] as Path2D;
        const j = i * 4;
        p.moveTo(s[j] as number, s[j + 1] as number);
        p.lineTo(s[j + 2] as number, s[j + 3] as number);
      }
      if (root) {
        root.dataset.growthGen = String(g);
        root.dataset.growthSegments = String(fern.count);
        root.dataset.growthCap = String(segCap);
        root.dataset.growthBuildMs = (performance.now() - t0).toFixed(2);
        root.dataset.growthHash = hash;
      }
      return { paths, width, alpha, count: fern.count, gen: g, tipY: fern.tipY };
    }

    function drawFern(ctx: CanvasRenderingContext2D, fern: GenPaths, mul: number, glow: boolean): void {
      ctx.globalCompositeOperation = 'source-over';
      for (let d = 0; d <= fern.gen; d++) {
        ctx.lineWidth = fern.width[d] as number;
        ctx.strokeStyle = styleByDepth[d] as string;
        ctx.globalAlpha = (fern.alpha[d] as number) * mul;
        ctx.stroke(fern.paths[d] as Path2D);
      }
      ctx.globalCompositeOperation = 'lighter';
      if (glow) {
        // a soft halo on the two finest orders: the tips glow, the trunk does not
        for (let d = Math.max(0, fern.gen - 1); d <= fern.gen; d++) {
          ctx.lineWidth = (fern.width[d] as number) + 3;
          ctx.strokeStyle = styleHi;
          ctx.globalAlpha = 0.07 * mul;
          ctx.stroke(fern.paths[d] as Path2D);
        }
      }
      // node fires light the branches at their own depth for 240 ms
      for (let d = 0; d <= fern.gen; d++) {
        const l = lit[d] as number;
        if (l <= 0) continue;
        ctx.lineWidth = (fern.width[d] as number) + 1.5;
        ctx.strokeStyle = styleHi;
        ctx.globalAlpha = 0.9 * (l / LIT_MS) * mul;
        ctx.stroke(fern.paths[d] as Path2D);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }

    const unsubFrame = subscribeFrame(() => {
      const p = propsRef.current;
      if (!p.visible) return;
      const { ctx, bg, geometry: g, clock, fired, tier } = p;
      if (!ctx || !bg || g.R <= 0) return;

      const cap = genCapFor(tier);
      const segCap = segmentCapFor(tier);

      // --- one generation per revolution while the room is active
      if (reduced) {
        gen = cap;
      } else if (clock.revolution !== lastRev) {
        lastRev = clock.revolution;
        if (gen < cap) {
          prevGen = gen;
          gen += 1;
          fadeT = 0;
        }
      }
      if (gen > cap) gen = cap;

      // --- geometry: a resize invalidates every cached path
      if (g.w !== gw || g.h !== gh || g.R !== gR || g.cx !== gcx || g.cy !== gcy) {
        gw = g.w;
        gh = g.h;
        gR = g.R;
        gcx = g.cx;
        gcy = g.cy;
        cache.clear();
        bgGrad = bg.createRadialGradient(g.cx, g.cy + g.R * 0.4, g.R * 0.1, g.cx, g.cy, g.R * 2.1);
        bgGrad.addColorStop(0, rgba('--c-accent-dim', 0.09));
        bgGrad.addColorStop(0.55, rgba('--c-accent-dim', 0.025));
        bgGrad.addColorStop(1, rgba('--c-canvas', 0));
        baseGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 28);
        baseGrad.addColorStop(0, rgba('--c-accent-3', 0.55));
        baseGrad.addColorStop(0.4, rgba('--c-accent-3', 0.16));
        baseGrad.addColorStop(1, rgba('--c-accent-3', 0));
        dirty = true;
      }

      // --- the node arrangement: re-hash only when it changed
      if (dirty) {
        dirty = false;
        sorted = sortByAngle(latest);
        hash = fernHash(sorted);
        indexOf.clear();
        for (let i = 0; i < sorted.length; i++) indexOf.set((sorted[i] as RingNode).id, i);
      }

      let gens = cache.get(hash);
      if (!gens) {
        if (cache.size >= CACHE_MAX) cache.clear();
        gens = new Array<GenPaths | null>(GEN_CAP + 1).fill(null);
        cache.set(hash, gens);
      }
      // At most ONE build per frame: the current generation. A previous
      // generation missing from the cache simply sits out the cross-fade.
      let cur = gens[gen];
      if (!cur) {
        cur = build(gen, g.R, g.cx, g.cy, cap, segCap);
        gens[gen] = cur;
      }
      const prev = prevGen >= 0 && prevGen !== gen ? gens[prevGen] : null;

      // --- fires light their depth
      for (let i = 0; i < fired.length; i++) {
        const ev = fired[i];
        if (!ev) continue;
        const idx = indexOf.get(ev.node.id);
        if (idx === undefined) continue;
        lit[idx % (gen + 1)] = LIT_MS;
      }
      for (let d = 0; d <= GEN_CAP; d++) {
        if ((lit[d] as number) > 0) lit[d] = Math.max(0, (lit[d] as number) - clock.dt);
      }
      fadeT += clock.dt;

      /* ---------------------------------------------- background */
      clear(bg);
      if (bgGrad) {
        const breathe = reduced ? 1 : 1 + 0.1 * Math.sin(clock.phase * Math.PI * 2);
        bg.globalAlpha = breathe;
        bg.fillStyle = bgGrad;
        bg.fillRect(0, 0, g.w, g.h);
        bg.globalAlpha = 1;
      }

      /* ---------------------------------------------- the fern */
      clear(ctx);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const fadeMs = reduced ? REDUCED_FADE_MS : GEN_FADE_MS;
      const k = easeInOut(Math.min(1, fadeT / fadeMs));
      const glow = tier !== 'low';
      if (prev && k < 1) drawFern(ctx, prev, 1 - k, false);
      drawFern(ctx, cur, k, glow);

      // the seed: a warm point where the fern leaves the loop (no allocation:
      // the base point is computed inline rather than through pointAt)
      const baseNode = latest[0];
      const baseA = (baseNode ? baseNode.a : DEFAULT_BASE_A) * Math.PI * 2;
      const baseRho = radiusOfLevel(baseNode ? baseNode.r : DEFAULT_BASE_R, g.R);
      const baseX = g.cx + baseRho * Math.sin(baseA);
      const baseY = g.cy - baseRho * Math.cos(baseA);
      if (baseGrad) {
        const pulse = reduced ? 0.8 : 0.72 + 0.18 * Math.sin(clock.phase * Math.PI * 2);
        ctx.save();
        ctx.translate(baseX, baseY);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = pulse * k;
        ctx.fillStyle = baseGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = styleEmber;
      ctx.globalAlpha = k;
      ctx.beginPath();
      ctx.arc(baseX, baseY, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      /* ---------------------------------------------- depth, monotonic */
      const depth = depthFor(gen, cap, dragged);
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
      cache.clear();
    };
  }, [props.seed, props.reducedMotion]);

  // The canvas the fern is drawn on belongs to the stage and already carries
  // its text equivalent. This element only exposes the build for the QA gate.
  return <div ref={rootRef} className={styles.root} data-room="growth" aria-hidden="true" />;
}
