/**
 * src/components/hero/HeroCaption.tsx — the one visible heading.
 *
 * Spec: design/05-build-spec.md §I.1, §J.2. **OWNED BY WP1 from here on.**
 *
 * Present in the initial HTML from byte zero so the value proposition never
 * waits for JS (rubric A1, B1). Only its opacity is animated, so it costs no
 * CLS and assistive tech reads it immediately. The changing state copy lives in
 * the separate aria-live region, never here.
 */
export function HeroCaption() {
  return (
    <h1 id="loop-title">
      tap the ring
      <span className="echo">it comes back</span>
    </h1>
  );
}
