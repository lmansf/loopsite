import { LANDING_ACCOUNT } from '@/lib/boot';

/**
 * Server component. First thing in the tab order (§C.15, rubric G2).
 *
 * `skip to the account` is the one visible string on the site that is not
 * fixed by the concept or by the corpus: G2 requires a skip link and nothing
 * else names one. It is flagged in §C.13 for the writer's sign-off.
 *
 * It targets the landing account rather than a wrapper, because with
 * JavaScript on that is the one account rendered, and with JavaScript off it
 * is where the reading starts.
 */
export function SkipLink() {
  return (
    <a className="skip-link" href={`#section-${LANDING_ACCOUNT}`}>
      skip to the account
    </a>
  );
}
