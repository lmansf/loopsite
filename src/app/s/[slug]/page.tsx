import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CORPUS } from '@/content/accounts';
import { ACCOUNT_IDS } from '@/content/schema';
import { AccountSection } from '@/components/read/AccountSection';
import { Premise } from '@/components/read/Premise';
import { AliasRedirect } from './AliasRedirect';

/**
 * src/app/s/[slug]/page.tsx — the prerendered alias route. **OWNED BY WP-A.**
 *
 * Spec: §C.11. Its only job is `generateMetadata`: a link to one account
 * shared anywhere gets that account's own title and standfirst in the
 * preview. On arrival it `replaceState`s to `/?s=<slug>`, so the canonical URL
 * is always the single route and the back button is never polluted.
 *
 * It still renders the account, because the redirect needs JavaScript and a
 * reader without it must land on something readable: the premise, the
 * account, and the night, whose twelve slots are real anchors to the one
 * route. It carries the `<h1>` for the same reason every other route does —
 * a document whose first heading is an `<h2>` is a document with a hole in
 * it, and this one is prerendered and shareable.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return ACCOUNT_IDS.map((slug) => ({ slug: String(slug) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const account = CORPUS.accounts.find((a) => a.id === slug);
  if (!account) return { title: 'Loop — the lights went out for four seconds.' };
  return {
    title: `${account.title} — Loop`,
    description: account.standfirst,
    alternates: { canonical: `/?s=${account.id}` },
    openGraph: { title: `${account.title} — Loop`, description: account.standfirst },
  };
}

export default async function AliasPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const account = CORPUS.accounts.find((a) => a.id === slug);
  if (!account) notFound();

  return (
    <main id="main">
      <AliasRedirect slug={account.id} />
      <Premise />
      <AccountSection account={account} />
    </main>
  );
}
