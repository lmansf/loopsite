/**
 * src/sections/return/logic.ts — the PURE half of RETURN. No DOM, no React.
 *
 * Spec: design/05-build-spec.md §D.12. RETURN is ORIGIN again but lit; the
 * field, ripples and second ring are shared from ../origin/logic.
 */

/** The twelve, in notch order (§F.5). A constant here keeps the room's pure
 *  half free of the registry (which imports this room's index). */
export const ROOM_ORDER: readonly string[] = [
  'origin',
  'pulse',
  'tone',
  'trail',
  'swarm',
  'mirror',
  'growth',
  'orbit',
  'loom',
  'wear',
  'garden',
  'return',
];

/** ORIGIN's notch is lit from the first frame — endowed progress (§C.5). */
export function isLit(slug: string, visited: readonly string[]): boolean {
  return slug === 'origin' || visited.includes(slug);
}

/** Notch numbers (1..12) of every visited room, for the traces at 1.3 R. */
export function litNotches(visited: readonly string[]): number[] {
  const out: number[] = [];
  ROOM_ORDER.forEach((slug, i) => {
    if (isLit(slug, visited)) out.push(i + 1);
  });
  return out;
}

/** The twelfth notch has lit: every room has genuinely been visited. */
export function allLit(visited: readonly string[]): boolean {
  return ROOM_ORDER.every((slug) => isLit(slug, visited));
}

/** Traces at 1.3 R, one twelfth of the circle each. */
export const TRACE_R = 1.3;

/** The final line fades in over 900 ms (160 ms under reduced motion). */
export const FINAL_LINE_MS = 900;
export const FINAL_LINE_STILL_MS = 160;
export const FINAL_LINE = 'it was always going to come back.';

/** RETURN: 0.25 viewed, 0.5 traces seen, 0.75 door opened, 1.0 final line shown. */
export function returnDepth(tracesSeen: boolean, doorOpened: boolean, finalLine: boolean): number {
  let d = 0.25;
  if (tracesSeen) d = 0.5;
  if (doorOpened) d = Math.max(d, 0.75);
  if (finalLine) d = 1;
  return d;
}
