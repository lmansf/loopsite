/**
 * src/sections/twin/logic.ts — the pure half of THE TWIN. No DOM.
 *
 * Spec: design/05-build-spec.md §C.13. Your loop matches a GARDEN loop under
 * rotation when: same node count n >= 3, and there is one rotation offset δ
 * such that every node's angle is within ±1/64 rev of a garden node's angle
 * plus δ, with each matched radius level within ±1.
 */

import type { RingNode } from '@/lib/types';

export const MIN_TWIN_NODES = 3;
export const ANGLE_TOL = 1 / 64;
export const LEVEL_TOL = 1;
/** both rings lock for two revolutions */
export const LOCK_MS = 8000;

function mod1(x: number): number {
  const m = x % 1;
  return m < 0 ? m + 1 : m;
}

/** shortest distance between two angles on the circle, in turns */
export function angleDistance(a: number, b: number): number {
  const d = mod1(a - b);
  return Math.min(d, 1 - d);
}

/** True when `a` equals `b` under some rotation, within the §C.13 tolerances. */
export function matchesUnderRotation(a: readonly RingNode[], b: readonly RingNode[]): boolean {
  const n = a.length;
  if (n !== b.length || n < MIN_TWIN_NODES) return false;
  const first = a[0] as RingNode;
  const used = new Array<boolean>(n);
  // δ is fixed by pairing the first node of `a` with each node of `b` in turn.
  for (let j = 0; j < n; j++) {
    const delta = (b[j] as RingNode).a - first.a;
    used.fill(false);
    let ok = true;
    for (let i = 0; i < n && ok; i++) {
      const an = a[i] as RingNode;
      const target = an.a + delta;
      let found = false;
      for (let k = 0; k < n; k++) {
        if (used[k]) continue;
        const bn = b[k] as RingNode;
        if (angleDistance(target, bn.a) <= ANGLE_TOL + 1e-9 && Math.abs(an.r - bn.r) <= LEVEL_TOL) {
          used[k] = true;
          found = true;
          break;
        }
      }
      if (!found) ok = false;
    }
    if (ok) return true;
  }
  return false;
}

/** Index of the first candidate loop that twins `nodes`, or -1. `skip` is never matched. */
export function findTwin(
  nodes: readonly RingNode[],
  candidates: readonly { nodes: readonly RingNode[] }[],
  skip = -1,
): number {
  if (nodes.length < MIN_TWIN_NODES) return -1;
  for (let i = 0; i < candidates.length; i++) {
    if (i === skip) continue;
    if (matchesUnderRotation(nodes, (candidates[i] as { nodes: readonly RingNode[] }).nodes)) return i;
  }
  return -1;
}

/** A cheap signature of a node set, so the same set never re-fires the lock. */
export function signature(nodes: readonly RingNode[]): string {
  return nodes
    .map((n) => `${Math.round(n.a * 256)}:${n.r}`)
    .sort()
    .join(',');
}
