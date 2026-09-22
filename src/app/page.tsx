import { CORPUS } from '@/content/accounts';
import { AccountSection } from '@/components/read/AccountSection';
import { AskBar } from '@/components/night/AskBar';
import { LiveRegion } from '@/components/night/LiveRegion';
import { Runtime } from '@/components/night/Runtime';
import { Footer } from '@/components/shell/Footer';

/**
 * src/app/page.tsx — the one route. **OWNED BY WP-A.**
 *
 * Spec: design/11-narrative-build-spec.md §C.1, §D.3, §E.
 *
 * The initial HTML contains ALL TWELVE ACCOUNTS, every block and every aside,
 * in nav order. With JavaScript disabled that document is the site: a
 * complete, readable, scrollable twelve-section essay whose every link works.
 * With JavaScript (`html[data-loop-js]`, set synchronously by the bootstrap
 * before first paint) CSS collapses it to the one selected account with zero
 * reflow, which is how CLS stays at 0.
 *
 * The accounts are one route and are NOT code-split. A lazily fetched account
 * cannot be in the initial HTML, which forfeits rubric A1 outright, and twelve
 * round trips cost far more than the text does compressed (§E item 1).
 */

export const dynamic = 'force-static';

export default function Page() {
  return (
    <>
      <main id="main">
        <h1 id="loop-title">
          <span className="line">the lights went out for four seconds.</span>{' '}
          <span className="line">twelve things were awake.</span>
        </h1>
        {CORPUS.accounts.map((account) => (
          <AccountSection key={account.id} account={account} />
        ))}
        <LiveRegion />
        <AskBar />
      </main>
      <Footer />
      <Runtime />
    </>
  );
}
