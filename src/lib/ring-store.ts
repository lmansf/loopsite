/**
 * src/lib/ring-store.ts — the node set. The only mutable global state.
 *
 * Spec: design/05-build-spec.md §C.3. FROZEN after WP0.
 *
 * Rooms never mutate the set; they read it through `SectionProps.nodes`.
 */

import type { FireEvent, RingNode } from './types';
import { getFrame, mod1, SWEEP_MS } from './clock';

/** 24 is the share codec's ceiling and a sane audio polyphony ceiling (§J.6). */
export const MAX_NODES = 24;

/** Angles are quantized to 1/256 of a revolution (15.625 ms) on commit (§C.3). */
export const ANGLE_STEPS = 256;

let nodes: RingNode[] = [];
let listeners: Array<(n: readonly RingNode[]) => void> = [];

function newId(): string {
  try {
    return crypto.randomUUID().slice(0, 8);
  } catch {
    return Math.random().toString(16).slice(2, 10);
  }
}

/** Quantize an angle to 1/256 rev. Exported so the share codec and tests agree. */
export function quantizeAngle(a: number): number {
  return mod1(Math.round(mod1(a) * ANGLE_STEPS) / ANGLE_STEPS);
}

function clampLevel(r: number): number {
  return Math.max(0, Math.min(15, Math.round(r)));
}

function emit(): void {
  const snapshot = nodes as readonly RingNode[];
  for (const fn of listeners) {
    try {
      fn(snapshot);
    } catch (err) {
      console.error('[loop] node subscriber threw', err);
    }
  }
}

export function getNodes(): readonly RingNode[] {
  return nodes;
}

/** Returns null at MAX_NODES — the caller flashes the rim, it does not scold. */
export function addNode(a: number, r: number, v = 0): RingNode | null {
  if (nodes.length >= MAX_NODES) return null;
  const node: RingNode = {
    id: newId(),
    a: quantizeAngle(a),
    r: clampLevel(r),
    v: Math.max(0, Math.min(15, Math.round(v))),
    born: getFrame().revolution,
  };
  nodes = [...nodes, node];
  emit();
  return node;
}

export function moveNode(id: string, a: number, r: number): void {
  let changed = false;
  nodes = nodes.map((n) => {
    if (n.id !== id) return n;
    const next = { ...n, a: quantizeAngle(a), r: clampLevel(r) };
    if (next.a !== n.a || next.r !== n.r) changed = true;
    return next;
  });
  if (changed) emit();
}

export function removeNode(id: string): void {
  const next = nodes.filter((n) => n.id !== id);
  if (next.length === nodes.length) return;
  nodes = next;
  emit();
}

/** Returns the removed set so SILENCE can restore it exactly (§C.13). */
export function clearNodes(): RingNode[] {
  const previous = nodes;
  if (previous.length === 0) return [];
  nodes = [];
  emit();
  return previous;
}

export function restoreNodes(nodesIn: readonly RingNode[]): void {
  nodes = nodesIn.slice(0, MAX_NODES).map((n) => ({
    id: n.id || newId(),
    a: quantizeAngle(n.a),
    r: clampLevel(n.r),
    v: Math.max(0, Math.min(15, Math.round(n.v))),
    born: Number.isFinite(n.born) ? n.born : 0,
  }));
  emit();
}

export function subscribeNodes(fn: (n: readonly RingNode[]) => void): () => void {
  listeners = [...listeners, fn];
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

/**
 * Frame-rate-independent firing test (§C.3), additive to §F.4 so that exactly
 * one place in the codebase decides what "the sweep crossed it" means.
 *
 * `out` is reused by the caller to keep the frame loop allocation-free.
 */
export function computeFires(
  p0: number,
  p1: number,
  dir: 1 | -1,
  out: FireEvent[],
  periodMs: number = SWEEP_MS,
): FireEvent[] {
  out.length = 0;
  if (p0 === p1) return out;
  const travelled = dir > 0 ? mod1(p1 - p0) : mod1(p0 - p1);
  // A clamped dt means travelled can never approach a full revolution, but a
  // resumed tab can still hand us a large step. One revolution is the ceiling.
  const capped = Math.min(travelled, 1);
  for (const n of nodes) {
    const behind = dir > 0 ? mod1(p1 - n.a) : mod1(n.a - p1);
    if (behind < capped) out.push({ node: n, lateness: behind * periodMs });
  }
  return out;
}

/** Test-only reset. Not used by the site. */
export function __resetNodesForTest(): void {
  nodes = [];
  listeners = [];
}
