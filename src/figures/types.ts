/**
 * src/figures/types.ts — the ambient contract. **OWNED BY WP-C.**
 * Spec: design/11-narrative-build-spec.md §C.16, §D.3, §D.4.
 *
 * ## Restraint is the brief, and it is enforced here rather than trusted
 *
 * A figure never chooses a colour, never chooses an opacity and never chooses
 * where on the screen it lands. `<Ambient>` primes the context before every
 * call — one accent, a soft line, round caps — draws into a STAGE that begins
 * below the navigation, and then multiplies the finished drawing down to the
 * ceiling in one pass. A figure may still make itself quieter with
 * `globalAlpha`; it cannot make itself louder, it cannot accumulate past the
 * ceiling by crossing two strokes, and it cannot put a line behind the
 * premise, the heading or the twelve slots. No review is needed to check that
 * twelve separate files all stayed under it.
 *
 * ## One rule a figure does own: no closed rectangle
 *
 * The bounce audit found figures reading as "a stray outline or a rendering
 * bug rather than as a drawing", because six of the twelve drew an
 * axis-aligned `strokeRect` at roughly the size of the navigation grid. A
 * faint box behind an interface is read as part of the interface. Draw open
 * contours, arcs, curves and fragments; two corners of a window say window,
 * and a whole one says box.
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
   * `w` and `h` are the STAGE, not the viewport: the origin is already
   * translated down past the navigation and the stage runs off the bottom of
   * the screen, so the top third of a composition is faded out and its bottom
   * is behind the ask bar. Compose for the whole box and let the layer crop
   * it; a composition that keeps itself politely inside the middle is a
   * composition the reader will never see.
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
