/**
 * src/components/ring/ring-state.ts — the two things the ring layer shares
 * with the two rooms WP1 owns. Pure module state, no DOM, no React.
 *
 * Spec: design/05-build-spec.md §B (the seed node), §D.12 (the door).
 *
 * THE SEED NODE. §B: "one node already sits on the ring at angle 0.62 rev,
 * pulsing each time the sweep passes — the site was running before you got
 * here." It is placed by the site, not the visitor, so it is NOT in the node
 * store (`data-node-count` is 0 on arrival; the QA gate asserts exactly that).
 * The ring layer draws it, pulses it, and lets the visitor grab it; the moment
 * they touch it, it is promoted into the store and becomes theirs. Removed, it
 * does not come back. ORIGIN reads it here to ripple when the sweep passes.
 *
 * THE DOOR. §D.12: a 14° gap in the ring stroke at a = 0 with a threshold
 * line. The ring stroke belongs to RingStage, so RETURN asks for the gap here
 * rather than drawing on the ring layer.
 */

export const SEED_A = 0.62;
export const SEED_R = 8;
/** The seed is drawn at 60% of a normal node's alpha (§D.1). */
export const SEED_ALPHA = 0.6;

export interface Seed {
  a: number;
  r: number;
}

let seed: Seed | null = { a: SEED_A, r: SEED_R };
let door = false;

/** The site's seed node, or null once the visitor has taken or removed it. */
export function getSeed(): Seed | null {
  return seed;
}

export function setSeed(next: Seed | null): void {
  seed = next;
}

/** RETURN opens the door; the ring layer draws the gap and the threshold. */
export function setRingDoor(open: boolean): void {
  door = open;
}

export function hasRingDoor(): boolean {
  return door;
}

/** The door gap: 14° total, centred on 12 o'clock (§D.12). */
export const DOOR_GAP_TURN = 14 / 360;
