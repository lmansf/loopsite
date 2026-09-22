/**
 * src/lib/rng.ts — deterministic pseudo-randomness.
 *
 * Spec: design/05-build-spec.md §F.4. FROZEN after WP0.
 * Same `?seed=` must always produce the same visuals, so no room may call
 * Math.random() for anything that shows.
 */

/** 32-bit hash of (seed, key) -> [0,1). Stable across runs and platforms. */
export function hashSeed(seed: number, key: string): number {
  let h = (seed | 0) ^ 0x9e3779b9;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** A fast, seedable PRNG. Call the returned function for successive values. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
