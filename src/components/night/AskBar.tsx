import { CORPUS } from '@/content/accounts';
import { escapeHtml } from '@/content/compile';

/**
 * The fixed ask control, and the hub (§C.7, §C.8, §F.3). Server component.
 * **OWNED BY WP-C.**
 *
 * The site's one primary CTA (rubric B2, D4), and the only fixed element on
 * the page. It is present from frame one, it is in the thumb zone with
 * safe-area padding, and it never relocates between accounts.
 *
 * Twelve bars are rendered and CSS shows the one matching `html[data-s]`, so
 * the bar names the right destination in the first painted frame for every
 * `?s=` — no JavaScript, no flash, no rewrite after hydration. Their boxes are
 * identical by construction, so the swap moves nothing.
 *
 * `pointer-events: none` on the bar and `auto` on its children is the standing
 * rule from `08` §6; it is in `night.css` and any new fixed overlay ships the
 * same pair.
 *
 * ## The hub is a sibling of the link, not a child of it
 *
 * §C.7 sketches the bar as one `<a>` with the hub inside it. It cannot be:
 * the hub's text would join the link's accessible name, so the one primary
 * control on the site would announce itself as `ask the streetlight 1/5`. The
 * bar is therefore a plain box holding the link and the hub side by side. The
 * link still fills the bar, so the tap target is unchanged.
 *
 * §C.7 also wants the hub to be a second focusable link to `four seconds` on
 * desktop. It is not, and deliberately: at `n = 0` the hub prints nothing
 * (§C.8), and a link whose only content is an empty box is an axe-serious
 * `link-name` violation on every cold load. `four seconds` is a slot in the
 * night at every viewport, which is the alternative §C.7 itself offers for
 * phones. The hub is a numeral, and a numeral is not a destination.
 *
 * The hub is always rendered with its box reserved, and prints nothing until
 * the reader holds a contradiction — `n/5` is the only numeral the UI may
 * print (§C.8), so it prints nothing at zero rather than a `0`.
 *
 * ## Why this is a string and not JSX
 *
 * The standing instruction of §E and `design/12-wpn-notes.md` §B: static
 * markup repeated twelve times is a string, not JSX. Twelve bars of three
 * elements is 48 element descriptors in the flight payload, against a budget
 * that was 88 % spent before any builder touched it.
 */

const BARS = CORPUS.accounts
  .map(
    (a) =>
      `<div class="ask-bar" data-slug="${a.id}" data-slot="${a.next}">` +
      `<a class="ask-text" href="/?s=${a.next}" data-ask>${escapeHtml(a.ask)}</a>` +
      `<span class="hub u-num" data-found="0"></span>` +
      `</div>`,
  )
  .join('');

export function AskBar() {
  return <div className="ask-bars" dangerouslySetInnerHTML={{ __html: BARS }} />;
}
