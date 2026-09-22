import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { BOOT } from '@/lib/boot';
import { SkipLink } from '@/components/shell/SkipLink';
import './globals.css';

/**
 * src/app/layout.tsx — the document.
 *
 * Spec: design/11-narrative-build-spec.md §C.13, §D.3. **OWNED BY WP-A.**
 *
 * No webfont: system stacks only, zero font bytes, zero font requests. The
 * prose is set in a system serif (`--font-read`) and the interface in the
 * system sans, so the story and the UI are visibly different registers.
 *
 * The inline bootstrap is a CLASSIC script, not `type="module"` — a module is
 * deferred and would miss first paint, which is the whole point of it. It is
 * the only render-blocking JavaScript on the site and it is under 2 KB raw.
 */

const TITLE = 'Loop — the lights went out for four seconds.';
const DESCRIPTION = 'twelve things were awake. ask any of them.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  applicationName: 'Loop',
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'website' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
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
        <script id="loop-boot" dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body>
        <SkipLink />
        {children}
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
