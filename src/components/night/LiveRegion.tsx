/**
 * The polite live region (§C.3, §C.11, rubric G3). It is the only way the
 * site announces that something elsewhere changed, and the only strings that
 * ever land here are account titles from the corpus joined to the fixed
 * phrases of §C.13.
 *
 * It renders empty and is written to by the runtime, never by React: writing
 * it through React would make the announcement depend on a re-render, and the
 * whole point is that it lands in the same frame as the press. That is also
 * why it is a SERVER component — it has no state of its own and a `use client`
 * here would buy a client chunk for an empty `<p>`. WP-C may promote it.
 */
export function LiveRegion() {
  return <p id="loop-live" className="u-sr" aria-live="polite" aria-atomic="true" />;
}
