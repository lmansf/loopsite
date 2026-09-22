import type { Account } from '@/content/schema';

/**
 * The ask card: the full-salience destination at the foot of every account
 * (§C.7, rubric E2/E3). It names the next account and what it has — never
 * `next`, never `read more`.
 *
 * A real `<a href>`, so it works with zero JavaScript, on a middle click and
 * in a screen reader. The runtime intercepts ordinary clicks and turns them
 * into `pushState` (§C.11).
 */
export function AskCard({ next }: { next: Account }) {
  return (
    <a className="ask card" href={`/?s=${next.id}`} data-ask-card data-slot={next.id}>
      <span className="ask-title">{next.title}</span>
      <span className="ask-gap">{next.standfirst}</span>
    </a>
  );
}
