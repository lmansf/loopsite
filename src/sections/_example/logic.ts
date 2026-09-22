/**
 * The PURE half of a room. No DOM, no canvas, no React, no imports from
 * anything browser-shaped. This is the part you can unit-test with
 * `node --test` (see tests/unit/), and the part reviewers read to understand
 * what the room actually is.
 *
 * Keep every magic number here, named.
 */

import type { RingNode } from '@/lib/types';

/** One drawable mark, in ring space: angle turn, radius level, weight 0..1. */
export interface Mark {
  a: number;
  level: number;
  weight: number;
}

/**
 * The room's interpretation of the visitor's nodes.
 *
 * This example reads each node as a chord across the ring: the node's angle,
 * the node's radius level, and a weight that decays with how long ago the node
 * was placed. It is deterministic — same nodes in, same marks out — which is
 * what makes it testable and what makes `?seed=` honest.
 */
export function marksFor(nodes: readonly RingNode[], revolution: number): Mark[] {
  return nodes.map((n) => {
    const age = Math.max(0, revolution - n.born);
    return {
      a: n.a,
      level: n.r,
      weight: 1 / (1 + age * 0.15),
    };
  });
}

/**
 * Depth is the room's own honest answer to "how much of this did they see?".
 * It is monotonic, in [0,1], and reported at most once per 0.25 step (§F.3).
 */
export function depthFor(nodeCount: number, revolutionsHere: number): number {
  if (nodeCount === 0 && revolutionsHere === 0) return 0;
  let depth = 0.25; // viewed
  if (nodeCount >= 1) depth = 0.5;
  if (nodeCount >= 3) depth = 0.75;
  if (nodeCount >= 3 && revolutionsHere >= 2) depth = 1;
  return depth;
}
