/**
 * src/sections/_example/index.ts — THE REFERENCE ROOM.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  COPY THIS FOLDER. `cp -r src/sections/_example src/sections/<your-slug>` │
 * │  Then replace the four files. Nothing else in the site needs to change:   │
 * │  your slot in src/sections/registry.ts already imports your folder.       │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * A SectionModule is metadata plus two components:
 *   Shell — a SERVER component. It is in the raw response body, so the room is
 *           readable and linkable with zero JavaScript. Keep it tiny: an <h2>,
 *           the hook line, and the link to the next room.
 *   load  — a dynamic import of the CLIENT component that draws. This is the
 *           lazy chunk CI weighs against `budgetKb`.
 *
 * `budgetKb` is your gzipped chunk ceiling, asserted by `pnpm budget`. Going
 * over it fails the build — pick a simpler algorithm, not a bigger number.
 */

import { asSectionId, type SectionModule } from '@/lib/types';
import { Shell } from './Shell';

const example: SectionModule = {
  id: asSectionId('_example'),
  title: 'example',
  hook: 'tap the ring',
  blurb: 'one ring, twelve rooms, no ending.',
  next: asSectionId('origin'),
  // A real room has a notch 1..12. The reference room is not in the corridor,
  // so it has none and never appears in the Ringway.
  notch: null,
  kind: 'expansion',
  Shell,
  load: () => import('./Room'),
  reservedHeight: '100dvh',
  budgetKb: 6,
  // heavy: true caps the room/background DPR at 1.5. Only for rooms that
  // genuinely cannot hold 45 fps at DPR 2 (MIRROR, TRAIL).
};

export default example;
