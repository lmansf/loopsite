import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CORPUS } from '@/content/accounts';
import { ACCOUNT_IDS } from '@/content/schema';
import { AccountSection } from '@/components/read/AccountSection';
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
 * reader without it must land on something readable.
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
      <AccountSection account={account} />
    </main>
  );
}
