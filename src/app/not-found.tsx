import { CORPUS } from '@/content/accounts';
import { Premise } from '@/components/read/Premise';

/**
 * The 404. The premise, and one full-salience link to the first account
 * (§D.1). No new copy: the heading is the `<h1>` of the site and the link
 * carries the account's own title and standfirst, exactly like an ask card.
 *
 * It holds no client code at all, which is also what makes it the honest
 * framework floor that `scripts/bundle-budget.mjs` measures Tier B against.
 */
export default function NotFound() {
  const first = CORPUS.accounts[0];
  return (
    <main id="main">
      <Premise />
      {first ? (
        <a className="ask card" href={`/?s=${first.id}`} data-slot={first.id}>
          <span className="ask-title">{first.title}</span>
          <span className="ask-gap">{first.standfirst}</span>
        </a>
      ) : null}
    </main>
  );
}
