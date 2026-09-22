/**
 * The premise. Two lines, one `<h1>`, the LCP element. **OWNED BY WP-A.**
 *
 * Spec: §C.13 (the fixed string table), §F.1 (type), §E (CLS).
 *
 * It is here rather than inlined three times because these are two of the
 * thirteen strings on the site the writer did not write: one copy of them, in
 * one file, is how they stay the strings §C.13 fixed. `tests/copy.spec.ts`
 * checks the rendered result; this is what keeps the source honest.
 *
 * It paints at 35 % and settles to 100 % at 300 ms (`06` §G, kept verbatim in
 * globals.css) — it is never faded in from zero, and under reduced motion it
 * is simply at 100 % in frame one.
 */
export function Premise() {
  return (
    <h1 id="loop-title">
      <span className="line">the lights went out for four seconds.</span>{' '}
      <span className="line">twelve things were awake.</span>
    </h1>
  );
}
