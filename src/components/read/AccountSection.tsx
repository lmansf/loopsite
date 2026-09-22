import type { Account } from '@/content/schema';
import { CORPUS } from '@/content/accounts';
import { TheNight } from '@/components/night/TheNight';
import { Blocks } from './Blocks';
import { AskCard } from './AskCard';
import { BeliefChoice } from './BeliefChoice';

/**
 * One account: one witness, one page, one voice (§C.1). Server component,
 * never hydrated. **OWNED BY WP-A.**
 *
 * ```html
 * <section id="section-dog" class="account" aria-labelledby="h-dog" data-slug="dog">
 *   <h2 id="h-dog" tabindex="-1">the dog</h2>
 *   <p class="standfirst">…</p>
 *   <nav class="night" aria-label="the night"> … twelve slots … </nav>
 *   <div class="blocks"> … .blk … </div>
 *   <a class="ask card" href="/?s=lamp"> … </a>
 * </section>
 * ```
 *
 * All twelve of these are in the initial HTML, every block and every aside.
 * With JavaScript off that is the site. With JavaScript, CSS collapses it to
 * the one selected account with zero reflow (§C.1, §E).
 *
 * `<h2>` carries `tabindex="-1"` so the runtime can move focus to it on a
 * deliberate move without adding it to the tab order.
 */
export function AccountSection({ account }: { account: Account }) {
  const next = CORPUS.accounts.find((a) => a.id === account.next) ?? account;
  return (
    <section
      id={`section-${account.id}`}
      className="account"
      aria-labelledby={`h-${account.id}`}
      data-slug={account.id}
      data-blank={account.blankWhenLocked ? 'true' : undefined}
    >
      <h2 id={`h-${account.id}`} tabIndex={-1}>
        {account.title}
      </h2>
      <p className="standfirst">{account.standfirst}</p>
      <TheNight account={account} />
      <Blocks account={account} />
      {account.blankWhenLocked ? <BeliefChoice choice={CORPUS.choice} /> : null}
      <AskCard next={next} />
    </section>
  );
}
