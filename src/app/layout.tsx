import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { HERO_BOOTSTRAP } from '@/lib/hero-bootstrap';
import { SkipLink } from '@/components/shell/SkipLink';
import './globals.css';

/**
 * src/app/layout.tsx — the document.
 *
 * Spec: design/05-build-spec.md §F.6, §I.5. **OWNED BY WP1 from here on.**
 *
 * No webfont: system stack only, zero font bytes, zero font requests.
 * The inline bootstrap is a CLASSIC script, not type="module" — a module is
 * deferred and would miss first paint, which is the whole point of it.
 */

export const metadata: Metadata = {
  title: 'Loop — tap. it comes back.',
  description: 'one ring, twelve rooms, no ending.',
  applicationName: 'Loop',
  openGraph: {
    title: 'Loop — tap. it comes back.',
    description: 'one ring, twelve rooms, no ending.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Loop — tap. it comes back.',
    description: 'one ring, twelve rooms, no ending.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#06070A',
  colorScheme: 'dark light',
  width: 'device-width',
  initialScale: 1,
  // Pinch-zoom is never disabled (rubric F1).
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script id="loop-boot" dangerouslySetInnerHTML={{ __html: HERO_BOOTSTRAP }} />
      </head>
      <body>
        <SkipLink />
        <main id="main">{children}</main>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
