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

/**
 * @vercel/analytics and @vercel/speed-insights fetch /_vercel/insights/script.js,
 * which only exists on Vercel. Rendering them off-platform produces a 404 and two
 * console errors, and "zero console errors" is a gate we keep honestly rather than
 * by filtering it in the test fixture. They are therefore mounted only when the
 * Vercel environment variables are present — which is every preview and production
 * deploy, and no local run.
 */
const ON_VERCEL = process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script id="loop-boot" dangerouslySetInnerHTML={{ __html: HERO_BOOTSTRAP }} />
      </head>
      <body>
        <SkipLink />
        <main id="main">{children}</main>
        {ON_VERCEL ? (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        ) : null}
      </body>
    </html>
  );
}
