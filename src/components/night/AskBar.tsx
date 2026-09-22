import { CORPUS } from '@/content/accounts';

/**
 * The fixed ask control, and the hub (§C.7, §F.3). Server component.
 * **OWNED BY WP-C.**
 *
 * The site's one primary CTA (rubric B2, D4). It is present from frame one,
 * it is in the thumb zone with safe-area padding, and it never relocates
 * between accounts.
 *
 * Twelve bars are rendered and CSS shows the one matching `html[data-s]`, so
 * the bar names the right destination in the first painted frame for every
 * `?s=` — no JavaScript, no flash, no rewrite after hydration. Their boxes are
 * identical, so the swap moves nothing.
 *
 * `pointer-events: none` on the bar and `auto` on its children is the standing
 * rule from `08` §6; it is in `night.css` and any new fixed overlay ships the
 * same pair.
 *
 * The hub is always rendered with its box reserved and is empty until the
 * reader holds a contradiction — `n/5` is the only numeral the UI may print
 * (§C.8), so it prints nothing at zero rather than a `0`.
 */
export function AskBar() {
  return (
    <>
      {CORPUS.accounts.map((a) => (
        <a
          key={a.id}
          className="ask-bar"
          data-slug={a.id}
          data-slot={a.next}
          href={`/?s=${a.next}`}
          data-ask
        >
          <span className="ask-text">{a.ask}</span>
          <span className="hub u-num" data-found="0" />
        </a>
      ))}
    </>
  );
}
