/**
 * src/sections/registry.ts — THE manifest.
 *
 * Spec: design/05-build-spec.md §F.5.
 *
 * This is one of exactly TWO files more than one agent touches (the other is
 * the `tests/rooms/` directory). It is **append-only** and every slot already
 * exists, one import per line, so two agents can never touch the same line.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * BUILDERS: you almost certainly do not need to edit this file at all.
 * Your slot's import already points at `src/sections/<your-slug>/index.ts`.
 * Write your real `SectionModule` there as the default export and you are
 * registered. Only touch a line below if your slot's metadata (notch, kind,
 * budgetKb, heavy) is wrong — and then only YOUR line.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Room order in ROOMS is fixed and is the notch order.
 */

import type { SectionModule } from '@/lib/types';

// SLOT WP1-1  origin
import origin from './origin';
// SLOT WP2-1  pulse
import pulse from './pulse';
// SLOT WP2-2  tone
import tone from './tone';
// SLOT WP3-1  trail
import trail from './trail';
// SLOT WP4-1  swarm
import swarm from './swarm';
// SLOT WP4-2  mirror
import mirror from './mirror';
// SLOT WP5-1  growth
import growth from './growth';
// SLOT WP5-2  orbit
import orbit from './orbit';
// SLOT WP6-1  loom
import loom from './loom';
// SLOT WP6-2  wear
import wear from './wear';
// SLOT WP7-1  garden
import garden from './garden';
// SLOT WP1-2  return
import returnRoom from './return';

// SLOT WP7-H1 silence
import silence from './silence';
// SLOT WP7-H2 reverse
import reverse from './reverse';
// SLOT WP7-H3 slow
import slow from './slow';
// SLOT WP7-H4 144
import room144 from './144';
// SLOT WP7-H5 twin
import twin from './twin';

/** The reference implementation. Not a corridor room; reachable at /?s=_example. */
import example from './_example';

/** The twelve, in notch order. */
export const ROOMS: SectionModule[] = [
  origin,
  pulse,
  tone,
  trail,
  swarm,
  mirror,
  growth,
  orbit,
  loom,
  wear,
  garden,
  returnRoom,
];

/** The five hidden destinations. notch: null. Never listed in the Ringway. */
export const HIDDEN: SectionModule[] = [silence, reverse, slow, room144, twin];

export const EXAMPLE: SectionModule = example;

export const bySlug = (s: string): SectionModule | undefined =>
  ROOMS.find((r) => r.id === s) ??
  HIDDEN.find((r) => r.id === s) ??
  (s === EXAMPLE.id ? EXAMPLE : undefined);
