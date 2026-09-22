import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ROOMS, bySlug } from '@/sections/registry';
import { ShellFor } from '@/sections/shells';
import { AliasRedirect } from './AliasRedirect';

/**
 * src/app/s/[slug]/page.tsx — the prerendered alias route.
 *
 * Spec: design/05-build-spec.md §C.10. Its only job is `generateMetadata`.
 * On arrival it replaceStates to /?s=<slug>, so the canonical URL is always the
 * single route and the back button is never polluted.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return ROOMS.map((room) => ({ slug: String(room.id) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const room = bySlug(slug);
  if (!room) return { title: 'Loop — tap. it comes back.' };
  return {
    title: `${room.title} — Loop`,
    description: room.blurb,
    alternates: { canonical: `/?s=${room.id}` },
    openGraph: { title: `${room.title} — Loop`, description: room.blurb },
  };
}

export default async function AliasPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const room = bySlug(slug);
  if (!room) notFound();

  return (
    <div className="room-shell" data-slug={room.id} data-active="true">
      <AliasRedirect slug={String(room.id)} />
      <ShellFor slug={room.id} />
    </div>
  );
}
