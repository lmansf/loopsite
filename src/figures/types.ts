/**
 * src/figures/types.ts — the ambient contract. **OWNED BY WP-C.**
 * Spec: design/11-narrative-build-spec.md §C.16, §D.3, §D.4.
 *
 * ## Restraint is the brief, and it is enforced here rather than trusted
 *
 * A figure never chooses a colour and never chooses an opacity. `<Ambient>`
 * primes the context before every call — one accent at `BASE` alpha, a 1 px
 * line, round caps — and a figure may only ever make itself QUIETER, by
 * setting `globalAlpha` below 1. There is therefore no figure that can be
 * written which draws above the ceiling, and no review needed to check that
 * twelve separate files all stayed under it.
 *
 * A figure has no imports at all (this one is `import type`, and is erased),
 * so each one's lazy chunk is its own geometry and nothing else — which is how
 * twelve of them fit under the 2 KB-gz-per-chunk ceiling `pnpm budget` gates.
 */
export interface Figure {
  /**
   * Draw the whole composition, from scratch, for `phase` in [0, 1).
   *
   * **Phase 0.25 is the authored still** (§C.16): the complete, at-rest
   * composition, and the only thing a reader under reduced motion ever sees.
   * Every figure must be worth looking at there — a figure whose still is a
   * blank box is a figure that should not ship.
   *
   * Coordinates are CSS pixels; the context is already transformed for DPR.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    phase: number,
    w: number,
    h: number,
    dpr?: number,
  ): void;
}
