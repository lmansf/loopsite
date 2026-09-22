/**
 * src/lib/clock.ts — ONE requestAnimationFrame loop for the whole application.
 *
 * Spec: design/05-build-spec.md §C.4.
 *
 * FROZEN after WP0. No room, component or hook may start its own rAF; register
 * a draw callback with `subscribeFrame` instead.
 */

import type { ClockFrame, QualityTier } from './types';

/** One revolution. The master constant of the entire site. */
export const SWEEP_MS = 4000;

/** dt is clamped so a backgrounded tab cannot fire 900 nodes on return (§C.3). */
const MAX_DT = 50;

/** The site was running before you got here: phase is seeded a third of the way round. */
const SEED_PHASE = 0.33;

/** Reduced motion renders twelve discrete sweep steps per revolution (§C.4). */
const REDUCED_STEPS = 12;

export function mod1(x: number): number {
  const m = x % 1;
  return m < 0 ? m + 1 : m;
}

/* ------------------------------------------------------------------ easing */

/** cubic-bezier(.65,0,.35,1) — the `--ease-loop` token, evaluated in TS. */
function easeLoop(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const p1x = 0.65;
  const p2x = 0.35;
  const p1y = 0;
  const p2y = 1;
  const bez = (a: number, b: number, u: number) => {
    const v = 1 - u;
    return 3 * v * v * u * a + 3 * v * u * u * b + u * u * u;
  };
  // Bisection on x; 24 iterations is well under a pixel of error.
  let lo = 0;
  let hi = 1;
  let u = t;
  for (let i = 0; i < 24; i++) {
    u = (lo + hi) / 2;
    if (bez(p1x, p2x, u) < t) lo = u;
    else hi = u;
  }
  return bez(p1y, p2y, u);
}

/* ------------------------------------------------------------------ state */

interface Subscriber {
  fn: (f: ClockFrame) => void;
  priority: number;
}

const frame: ClockFrame = {
  t: 0,
  dt: 0,
  phase: SEED_PHASE,
  revolution: 0,
  dir: 1,
  periodMs: SWEEP_MS,
  isReturn: false,
  tier: 'high',
};

/** The unquantized phase. `frame.phase` is the value rooms read. */
let rawPhase = SEED_PHASE;

let subscribers: Subscriber[] = [];
let rafId = 0;
let running = false;
let lastTs = 0;

let slowFrames = 0;
const TIERS: QualityTier[] = ['high', 'mid', 'low'];

let reduced = false;
let motionObserver: MutationObserver | null = null;

/** Period easing state for SLOW (§C.13). */
let periodFrom = SWEEP_MS;
let periodTo = SWEEP_MS;
let periodEaseMs = 0;
let periodEaseT = 0;

/* ------------------------------------------------------------------ motion */

function readMotionFromDom(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.dataset.motion === 'reduce';
}

/**
 * Additive to §F.4: lets a test or the shell force the clock's reduced-motion
 * reading. Normal operation reads `html[data-motion]`, which `useMotionPreference`
 * owns — the two can never disagree because there is only one signal.
 */
export function setReducedMotion(value: boolean): void {
  reduced = value;
  applyPhase();
}

function applyPhase(): void {
  frame.phase = reduced ? Math.floor(rawPhase * REDUCED_STEPS) / REDUCED_STEPS : rawPhase;
}

/* ------------------------------------------------------------------ loop */

function tick(ts: number): void {
  rafId = requestAnimationFrame(tick);
  if (lastTs === 0) lastTs = ts;
  const dt = Math.min(ts - lastTs, MAX_DT);
  lastTs = ts;

  // --- quality tiers: 30 consecutive slow frames drops one tier, never raises.
  if (dt > 32) {
    slowFrames++;
    if (slowFrames >= 30) {
      const i = TIERS.indexOf(frame.tier);
      if (i < TIERS.length - 1) frame.tier = TIERS[i + 1] as QualityTier;
      slowFrames = 0;
    }
  } else {
    slowFrames = 0;
  }

  // --- period easing (SLOW)
  if (periodEaseMs > 0) {
    periodEaseT = Math.min(periodEaseT + dt, periodEaseMs);
    const k = easeLoop(periodEaseT / periodEaseMs);
    frame.periodMs = periodFrom + (periodTo - periodFrom) * k;
    if (periodEaseT >= periodEaseMs) {
      periodEaseMs = 0;
      frame.periodMs = periodTo;
    }
  }

  frame.t += dt;
  frame.dt = dt;

  const before = rawPhase;
  rawPhase += (frame.dir * dt) / frame.periodMs;

  let wrapped = false;
  if (frame.dir > 0) {
    while (rawPhase >= 1) {
      rawPhase -= 1;
      frame.revolution += 1;
      wrapped = true;
    }
  } else {
    while (rawPhase < 0) {
      rawPhase += 1;
      // revolution never goes below 0 (§C.4)
      if (frame.revolution > 0) frame.revolution -= 1;
      wrapped = true;
    }
  }
  void before;

  applyPhase();
  frame.isReturn = wrapped && frame.revolution % 6 === 0;

  for (let i = 0; i < subscribers.length; i++) {
    const s = subscribers[i];
    if (!s) continue;
    try {
      s.fn(frame);
    } catch (err) {
      // A broken room must never stop the clock for the rest of the site.
      console.error('[loop] frame subscriber threw', err);
    }
  }
}

function onVisibility(): void {
  if (document.visibilityState === 'hidden') {
    // Pause: cancel the rAF. We do NOT simulate the missing minutes (§C.4).
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  } else if (running && rafId === 0) {
    // Resume from the recorded phase: a fresh timestamp baseline, no fast-forward.
    lastTs = 0;
    rafId = requestAnimationFrame(tick);
  }
}

/* ------------------------------------------------------------------ API */

/** Idempotent. Called once by AppShell. */
export function startClock(): void {
  if (running || typeof window === 'undefined') return;
  running = true;
  reduced = readMotionFromDom();
  applyPhase();

  motionObserver = new MutationObserver(() => {
    const next = readMotionFromDom();
    if (next !== reduced) {
      reduced = next;
      applyPhase();
    }
  });
  motionObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-motion'],
  });

  document.addEventListener('visibilitychange', onVisibility);
  lastTs = 0;
  if (document.visibilityState !== 'hidden') rafId = requestAnimationFrame(tick);
}

export function stopClock(): void {
  if (!running) return;
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  document.removeEventListener('visibilitychange', onVisibility);
  motionObserver?.disconnect();
  motionObserver = null;
}

/**
 * Register a per-frame callback. Returns its unsubscribe function.
 *
 * `priority` is additive to §F.4 and defaults to 0: lower runs first. The shell's
 * frame driver uses a negative priority so that `fired[]` is filled before any
 * room reads it. Rooms should always use the default.
 */
export function subscribeFrame(fn: (f: ClockFrame) => void, priority = 0): () => void {
  const entry: Subscriber = { fn, priority };
  subscribers = [...subscribers, entry].sort((a, b) => a.priority - b.priority);
  return () => {
    subscribers = subscribers.filter((s) => s !== entry);
  };
}

/** The live frame object. It is mutated in place; do not retain a destructured copy. */
export function getFrame(): ClockFrame {
  return frame;
}

export function setDirection(dir: 1 | -1): void {
  frame.dir = dir;
}

/** SLOW eases 4000 -> 16000 ms over `easeMs` with --ease-loop (§C.13). */
export function setPeriod(ms: number, easeMs = 0): void {
  if (easeMs <= 0) {
    frame.periodMs = ms;
    periodEaseMs = 0;
    return;
  }
  periodFrom = frame.periodMs;
  periodTo = ms;
  periodEaseMs = easeMs;
  periodEaseT = 0;
}

/** Phase offsets for any set of n siblings: φᵢ = i/n (§C.4). */
export function phaseOf(i: number, n: number): number {
  if (n <= 0) return frame.phase;
  return mod1(frame.phase + i / n);
}

/** Test-only reset. Not used by the site. */
export function __resetClockForTest(): void {
  stopClock();
  rawPhase = SEED_PHASE;
  frame.t = 0;
  frame.dt = 0;
  frame.revolution = 0;
  frame.dir = 1;
  frame.periodMs = SWEEP_MS;
  frame.isReturn = false;
  frame.tier = 'high';
  subscribers = [];
  applyPhase();
}
