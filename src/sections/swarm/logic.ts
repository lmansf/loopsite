/**
 * src/sections/swarm/logic.ts — the PURE half of SWARM (§D.5).
 *
 * No DOM, no canvas, no React. Standard boids on a toroidal field, dt-scaled,
 * with a 48 px uniform grid rebuilt each step in O(n). Every buffer is
 * pre-allocated once in `createFlock` / `createPulses` / `createArrow`; nothing
 * in this file allocates per step, which is what lets the room hold its frame
 * budget at tier low on a throttled CPU.
 *
 * Every magic number lives here, named.
 */

import type { QualityTier } from '@/lib/types';

/* ------------------------------------------------------------ constants */

export const MAX_AGENTS = 200;
export const AGENTS_BY_TIER: Readonly<Record<QualityTier, number>> = {
  high: 200,
  mid: 120,
  low: 60,
};

export const CELL_PX = 48;
export const SEP_RADIUS = 18;
export const SEP_WEIGHT = 1.4;
export const ALI_RADIUS = 48;
export const ALI_WEIGHT = 1.0;
export const COH_RADIUS = 48;
export const COH_WEIGHT = 0.9;
/** px/s */
export const MAX_SPEED = 120;
/** px/s² */
export const MAX_FORCE = 220;
/** agents never quite stall — a flock that stops is a flock that died */
const MIN_SPEED = 18;

/** a node fire injects an attractor of this strength, decaying with ATTRACT_TAU_MS */
export const ATTRACT_STRENGTH = 900;
export const ATTRACT_TAU_MS = 600;
/** inside this distance the pull tapers to zero so agents do not jitter on the node */
const ATTRACT_NEAR_PX = 60;
/** on the beat the flock may briefly exceed MAX_SPEED by this factor — the lunge */
const LUNGE_SPEED_BOOST = 2;

/** the pointer is a weak repulsor on desktop */
export const REPEL_STRENGTH = 160;
export const REPEL_RADIUS = 90;
/** a touch tap emits a one-shot repulse pulse instead */
export const TAP_REPEL_STRENGTH = 900;
export const TAP_REPEL_RADIUS = 180;

/** at revolution >= 6 in-room the flock resolves into an arrow for 1.5 s */
export const ARROW_EVERY = 6;
export const ARROW_MS = 1500;
const ARROW_STIFFNESS = 36; // 1/s²
const ARROW_DAMPING = 12; // 1/s
const ARROW_SPEED = 900; // px/s

export const NEAREST_ACCENT = 8;

/** reduced motion: node fires nudge the nearest 12 agents by <= 2 px over 150 ms */
export const NUDGE_COUNT = 12;
export const NUDGE_PX = 2;
export const NUDGE_MS = 150;
/** reduced motion: opacity pulses 0.55 <-> 0.85 over 12 s with phase offsets i/n */
export const PULSE_PERIOD_MS = 12000;
export const PULSE_LO = 0.55;
export const PULSE_HI = 0.85;

export const PULSE_SLOTS = 16;

const GRID_MAX_COLS = 80;
const GRID_MAX_ROWS = 80;
const GRID_CELLS = GRID_MAX_COLS * GRID_MAX_ROWS;
const MAX_DT_MS = 50;
const SEP_R2 = SEP_RADIUS * SEP_RADIUS;
const ALI_R2 = ALI_RADIUS * ALI_RADIUS;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const TAU = Math.PI * 2;

/* ------------------------------------------------------------ the flock */

export interface Flock {
  /** live agent count (<= MAX_AGENTS) */
  n: number;
  cols: number;
  rows: number;
  px: Float32Array;
  py: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  cellOf: Int32Array;
  cellCount: Int32Array;
  cellStart: Int32Array;
  cursor: Int32Array;
  items: Int32Array;
  /** 1 when the agent is one of the NEAREST_ACCENT to the pointer this frame */
  near: Uint8Array;
}

export function createFlock(): Flock {
  return {
    n: 0,
    cols: 1,
    rows: 1,
    px: new Float32Array(MAX_AGENTS),
    py: new Float32Array(MAX_AGENTS),
    vx: new Float32Array(MAX_AGENTS),
    vy: new Float32Array(MAX_AGENTS),
    cellOf: new Int32Array(MAX_AGENTS),
    cellCount: new Int32Array(GRID_CELLS + 1),
    cellStart: new Int32Array(GRID_CELLS + 1),
    cursor: new Int32Array(GRID_CELLS + 1),
    items: new Int32Array(MAX_AGENTS),
    near: new Uint8Array(MAX_AGENTS),
  };
}

/** Deterministic initial scatter: the same seed always gives the same flock. */
export function seedFlock(f: Flock, n: number, w: number, h: number, rnd: () => number): void {
  const count = Math.min(MAX_AGENTS, Math.max(0, n));
  for (let i = 0; i < count; i++) {
    f.px[i] = rnd() * w;
    f.py[i] = rnd() * h;
    const a = rnd() * TAU;
    f.vx[i] = Math.cos(a) * MAX_SPEED * 0.5;
    f.vy[i] = Math.sin(a) * MAX_SPEED * 0.5;
  }
  f.n = count;
}

/** After a resize, fold every agent back onto the new torus. */
export function wrapFlock(f: Flock, w: number, h: number): void {
  for (let i = 0; i < f.n; i++) {
    let x = f.px[i]! % w;
    let y = f.py[i]! % h;
    if (x < 0) x += w;
    if (y < 0) y += h;
    f.px[i] = x;
    f.py[i] = y;
  }
}

/* ------------------------------------------------------------ pulses */

/** Attractors (s > 0) and repulse pulses (s < 0). radius 0 = the whole field. */
export interface Pulses {
  x: Float32Array;
  y: Float32Array;
  s: Float32Array;
  radius: Float32Array;
  age: Float32Array;
  /** exp(-age / tau), refreshed by agePulses */
  env: Float32Array;
}

export function createPulses(): Pulses {
  return {
    x: new Float32Array(PULSE_SLOTS),
    y: new Float32Array(PULSE_SLOTS),
    s: new Float32Array(PULSE_SLOTS),
    radius: new Float32Array(PULSE_SLOTS),
    age: new Float32Array(PULSE_SLOTS),
    env: new Float32Array(PULSE_SLOTS),
  };
}

export function addPulse(p: Pulses, x: number, y: number, s: number, radius: number): void {
  let slot = -1;
  let oldest = -1;
  let oldestAge = -1;
  for (let k = 0; k < PULSE_SLOTS; k++) {
    if (p.s[k] === 0) {
      slot = k;
      break;
    }
    if (p.age[k]! > oldestAge) {
      oldestAge = p.age[k]!;
      oldest = k;
    }
  }
  if (slot < 0) slot = oldest;
  p.x[slot] = x;
  p.y[slot] = y;
  p.s[slot] = s;
  p.radius[slot] = radius;
  p.age[slot] = 0;
  p.env[slot] = 1;
}

/** Ages every pulse; returns the beat envelope (0..1) of the strongest attractor. */
export function agePulses(p: Pulses, dtMs: number): number {
  let beat = 0;
  for (let k = 0; k < PULSE_SLOTS; k++) {
    if (p.s[k] === 0) continue;
    const age = p.age[k]! + dtMs;
    p.age[k] = age;
    if (age > ATTRACT_TAU_MS * 6) {
      p.s[k] = 0;
      p.env[k] = 0;
      continue;
    }
    const env = Math.exp(-age / ATTRACT_TAU_MS);
    p.env[k] = env;
    if (p.s[k]! > 0 && env > beat) beat = env;
  }
  return beat;
}

/* ------------------------------------------------------------ the arrow */

export interface Arrow {
  active: boolean;
  age: number;
  tx: Float32Array;
  ty: Float32Array;
}

export function createArrow(): Arrow {
  return { active: false, age: 0, tx: new Float32Array(MAX_AGENTS), ty: new Float32Array(MAX_AGENTS) };
}

/** True on the in-room revolutions where the arrow forms (6, 12, 18, …). */
export function arrowDue(revolutionsHere: number): boolean {
  return revolutionsHere >= ARROW_EVERY && revolutionsHere % ARROW_EVERY === 0;
}

/**
 * Lay the flock out as an arrow centred on the ring, pointing from (cx,cy)
 * toward (toX,toY): 60% of agents along the shaft, 40% on the two barbs.
 */
export function layoutArrow(
  arrow: Arrow,
  n: number,
  cx: number,
  cy: number,
  toX: number,
  toY: number,
  R: number,
): void {
  let dx = toX - cx;
  let dy = toY - cy;
  const d = Math.hypot(dx, dy);
  if (d < 1) {
    dx = 0;
    dy = 1;
  } else {
    dx /= d;
    dy /= d;
  }
  const nx = -dy;
  const ny = dx;
  const len = 0.9 * R;
  const tailX = cx - dx * len * 0.5;
  const tailY = cy - dy * len * 0.5;
  const tipX = cx + dx * len * 0.5;
  const tipY = cy + dy * len * 0.5;
  const nHead = Math.max(2, Math.floor(n * 0.4));
  const nShaft = Math.max(1, n - nHead);
  const headLen = 0.42 * len;
  const headHalf = 0.58; // tan 30°
  for (let i = 0; i < nShaft && i < n; i++) {
    const t = (i + 0.5) / nShaft;
    const side = i & 1 ? 3 : -3;
    arrow.tx[i] = tailX + dx * t * len + nx * side;
    arrow.ty[i] = tailY + dy * t * len + ny * side;
  }
  const perSide = Math.max(1, nHead / 2);
  for (let j = 0; j < nHead && nShaft + j < n; j++) {
    const i = nShaft + j;
    const side = j & 1 ? 1 : -1;
    const t = ((j >> 1) + 0.5) / perSide;
    arrow.tx[i] = tipX - dx * t * headLen + nx * side * t * headLen * headHalf;
    arrow.ty[i] = tipY - dy * t * headLen + ny * side * t * headLen * headHalf;
  }
  arrow.active = true;
  arrow.age = 0;
}

/* ------------------------------------------------------------ the grid */

export function buildGrid(f: Flock, w: number, h: number): void {
  const cols = Math.min(GRID_MAX_COLS, Math.max(1, Math.ceil(w / CELL_PX)));
  const rows = Math.min(GRID_MAX_ROWS, Math.max(1, Math.ceil(h / CELL_PX)));
  f.cols = cols;
  f.rows = rows;
  const cells = cols * rows;
  const { n, px, py, cellOf, cellCount, cellStart, cursor, items } = f;
  cellCount.fill(0, 0, cells);
  for (let i = 0; i < n; i++) {
    let cx = (px[i]! / CELL_PX) | 0;
    let cy = (py[i]! / CELL_PX) | 0;
    if (cx < 0) cx = 0;
    else if (cx >= cols) cx = cols - 1;
    if (cy < 0) cy = 0;
    else if (cy >= rows) cy = rows - 1;
    const c = cy * cols + cx;
    cellOf[i] = c;
    cellCount[c] = cellCount[c]! + 1;
  }
  cellStart[0] = 0;
  for (let c = 0; c < cells; c++) {
    cellStart[c + 1] = cellStart[c]! + cellCount[c]!;
    cursor[c] = cellStart[c]!;
  }
  for (let i = 0; i < n; i++) {
    const c = cellOf[i]!;
    items[cursor[c]!] = i;
    cursor[c] = cursor[c]! + 1;
  }
}

/* ------------------------------------------------------------ steering */

/** Scratch outputs of `steer` — module-level so the hot loop never allocates. */
let sx = 0;
let sy = 0;

/** Reynolds steering: desired = norm(d)·MAX_SPEED, force = desired − v, clamped. */
function steer(dx: number, dy: number, vx: number, vy: number): void {
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) {
    sx = 0;
    sy = 0;
    return;
  }
  let fx = (dx / d) * MAX_SPEED - vx;
  let fy = (dy / d) * MAX_SPEED - vy;
  const m = Math.hypot(fx, fy);
  if (m > MAX_FORCE) {
    fx *= MAX_FORCE / m;
    fy *= MAX_FORCE / m;
  }
  sx = fx;
  sy = fy;
}

/**
 * One boids step. `beat` is the current attractor envelope (from agePulses)
 * and raises the speed cap so the flock visibly lunges on the beat.
 */
export function stepFlock(
  f: Flock,
  dtMs: number,
  w: number,
  h: number,
  pulses: Pulses,
  pointerOn: boolean,
  pointerX: number,
  pointerY: number,
  arrow: Arrow,
  beat: number,
): void {
  const dt = Math.min(dtMs, MAX_DT_MS) / 1000;
  if (dt <= 0 || w <= 0 || h <= 0 || f.n === 0) return;
  buildGrid(f, w, h);
  const { n, px, py, vx, vy, cellOf, cellStart, items, cols, rows } = f;
  const halfW = w * 0.5;
  const halfH = h * 0.5;
  const speedCap = arrow.active ? ARROW_SPEED : MAX_SPEED * (1 + LUNGE_SPEED_BOOST * beat);

  for (let i = 0; i < n; i++) {
    let x = px[i]!;
    let y = py[i]!;
    let ux = vx[i]!;
    let uy = vy[i]!;
    let fx = 0;
    let fy = 0;

    if (arrow.active) {
      // a damped spring to the agent's slot: the flock IS the arrow
      fx = ARROW_STIFFNESS * (arrow.tx[i]! - x) - ARROW_DAMPING * ux;
      fy = ARROW_STIFFNESS * (arrow.ty[i]! - y) - ARROW_DAMPING * uy;
    } else {
      let sepX = 0;
      let sepY = 0;
      let aliX = 0;
      let aliY = 0;
      let cohX = 0;
      let cohY = 0;
      let cnt = 0;
      let sepCnt = 0;

      const cell = cellOf[i]!;
      const ccx = cell % cols;
      const ccy = (cell / cols) | 0;
      for (let oy = -1; oy <= 1; oy++) {
        let ry = ccy + oy;
        if (ry < 0) ry += rows;
        else if (ry >= rows) ry -= rows;
        for (let ox = -1; ox <= 1; ox++) {
          let rx = ccx + ox;
          if (rx < 0) rx += cols;
          else if (rx >= cols) rx -= cols;
          const c = ry * cols + rx;
          const end = cellStart[c + 1]!;
          for (let q = cellStart[c]!; q < end; q++) {
            const j = items[q]!;
            if (j === i) continue;
            let dx = px[j]! - x;
            let dy = py[j]! - y;
            if (dx > halfW) dx -= w;
            else if (dx < -halfW) dx += w;
            if (dy > halfH) dy -= h;
            else if (dy < -halfH) dy += h;
            const d2 = dx * dx + dy * dy;
            if (d2 > ALI_R2) continue;
            cnt++;
            aliX += vx[j]!;
            aliY += vy[j]!;
            cohX += dx;
            cohY += dy;
            if (d2 < SEP_R2 && d2 > 1e-4) {
              sepX -= dx / d2;
              sepY -= dy / d2;
              sepCnt++;
            }
          }
        }
      }

      if (sepCnt > 0) {
        steer(sepX, sepY, ux, uy);
        fx += sx * SEP_WEIGHT;
        fy += sy * SEP_WEIGHT;
      }
      if (cnt > 0) {
        steer(aliX, aliY, ux, uy);
        fx += sx * ALI_WEIGHT;
        fy += sy * ALI_WEIGHT;
        steer(cohX / cnt, cohY / cnt, ux, uy);
        fx += sx * COH_WEIGHT;
        fy += sy * COH_WEIGHT;
      }
      const fm = Math.hypot(fx, fy);
      if (fm > MAX_FORCE) {
        fx *= MAX_FORCE / fm;
        fy *= MAX_FORCE / fm;
      }

      // the heartbeat: attractors and repulse pulses, outside the boid clamp
      for (let k = 0; k < PULSE_SLOTS; k++) {
        const s = pulses.s[k]!;
        if (s === 0) continue;
        const dx = pulses.x[k]! - x;
        const dy = pulses.y[k]! - y;
        const d = Math.hypot(dx, dy);
        if (d < 1e-3) continue;
        const radius = pulses.radius[k]!;
        let falloff: number;
        if (radius > 0) {
          if (d >= radius) continue;
          falloff = 1 - d / radius;
        } else {
          falloff = d < ATTRACT_NEAR_PX ? d / ATTRACT_NEAR_PX : 1;
        }
        const a = (s * pulses.env[k]! * falloff) / d;
        fx += dx * a;
        fy += dy * a;
      }

      // the pointer is a weak repulsor
      if (pointerOn) {
        const dx = x - pointerX;
        const dy = y - pointerY;
        const d = Math.hypot(dx, dy);
        if (d < REPEL_RADIUS && d > 1e-3) {
          const a = (REPEL_STRENGTH * (1 - d / REPEL_RADIUS)) / d;
          fx += dx * a;
          fy += dy * a;
        }
      }
    }

    ux += fx * dt;
    uy += fy * dt;
    const sp = Math.hypot(ux, uy);
    if (sp > speedCap) {
      ux *= speedCap / sp;
      uy *= speedCap / sp;
    } else if (sp < MIN_SPEED && !arrow.active) {
      if (sp < 1e-4) {
        ux = 0;
        uy = -MIN_SPEED;
      } else {
        ux *= MIN_SPEED / sp;
        uy *= MIN_SPEED / sp;
      }
    }
    x += ux * dt;
    y += uy * dt;
    if (x < 0) x += w;
    else if (x >= w) x -= w;
    if (y < 0) y += h;
    else if (y >= h) y -= h;
    px[i] = x;
    py[i] = y;
    vx[i] = ux;
    vy[i] = uy;
  }
}

/* ------------------------------------------------------------ queries */

/**
 * The k agents nearest (x,y), by insertion into the caller's fixed buffers
 * (sorted ascending by squared distance). Returns how many were written.
 */
export function nearestK(
  f: Flock,
  x: number,
  y: number,
  k: number,
  outIdx: Int32Array,
  outD2: Float32Array,
): number {
  let count = 0;
  for (let i = 0; i < f.n; i++) {
    const dx = f.px[i]! - x;
    const dy = f.py[i]! - y;
    const d2 = dx * dx + dy * dy;
    if (count === k && d2 >= outD2[k - 1]!) continue;
    let j = count < k ? count++ : k - 1;
    while (j > 0 && outD2[j - 1]! > d2) {
      outD2[j] = outD2[j - 1]!;
      outIdx[j] = outIdx[j - 1]!;
      j--;
    }
    outD2[j] = d2;
    outIdx[j] = i;
  }
  return count;
}

/* ------------------------------------------------------------ reduced motion */

/** Deterministic per-index jitter in [-0.5, 0.5) with no RNG state. */
function jitter(i: number): number {
  const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v) - 0.5;
}

/**
 * The still formation: a Vogel (sunflower) spiral about the ring's centre,
 * every agent heading tangentially — a flock frozen mid-circuit around the
 * ring. Velocities carry only orientation here.
 */
export function layoutFormation(f: Flock, n: number, cx: number, cy: number, radius: number): void {
  const count = Math.min(MAX_AGENTS, Math.max(0, n));
  for (let i = 0; i < count; i++) {
    const r = radius * Math.sqrt((i + 0.5) / count);
    const th = i * GOLDEN_ANGLE;
    f.px[i] = cx + r * Math.cos(th);
    f.py[i] = cy + r * Math.sin(th);
    const heading = th + Math.PI / 2 + jitter(i) * 0.7;
    f.vx[i] = Math.cos(heading) * MAX_SPEED;
    f.vy[i] = Math.sin(heading) * MAX_SPEED;
  }
  f.n = count;
}

/** Opacity of agent i at clock time t under reduced motion (§D.5). */
export function stillAlpha(t: number, i: number, n: number): number {
  const phase = t / PULSE_PERIOD_MS + i / Math.max(1, n);
  return PULSE_LO + (PULSE_HI - PULSE_LO) * (0.5 + 0.5 * Math.sin(phase * TAU));
}

/* ------------------------------------------------------------ depth */

/** 0.25 viewed, 0.5 first lunge, 0.75 pointer/tap interaction, 1.0 arrow seen. */
export function depthFor(lunged: boolean, interacted: boolean, arrowSeen: boolean): number {
  if (arrowSeen) return 1;
  if (interacted) return 0.75;
  if (lunged) return 0.5;
  return 0.25;
}
