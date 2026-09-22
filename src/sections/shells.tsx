/**
 * src/sections/shells.tsx — server-only map from slug to the room's <Shell />.
 *
 * Kept apart from registry.ts on purpose: the registry is imported by client
 * modules (AppShell, Ringway, RingStage), so anything it references ships to the
 * browser. Shells are rendered on the server and never hydrated.
 */
import { createElement, type ComponentType, type ReactNode } from 'react';

import { Shell as shell0 } from './144/Shell';
import { Shell as shell1 } from './_example/Shell';
import { Shell as shell2 } from './garden/Shell';
import { Shell as shell3 } from './growth/Shell';
import { Shell as shell4 } from './loom/Shell';
import { Shell as shell5 } from './mirror/Shell';
import { Shell as shell6 } from './orbit/Shell';
import { Shell as shell7 } from './origin/Shell';
import { Shell as shell8 } from './pulse/Shell';
import { Shell as shell9 } from './return/Shell';
import { Shell as shell10 } from './reverse/Shell';
import { Shell as shell11 } from './silence/Shell';
import { Shell as shell12 } from './slow/Shell';
import { Shell as shell13 } from './swarm/Shell';
import { Shell as shell14 } from './tone/Shell';
import { Shell as shell15 } from './trail/Shell';
import { Shell as shell16 } from './twin/Shell';
import { Shell as shell17 } from './wear/Shell';

type ShellComponent = ComponentType<{ children?: ReactNode }>;

const SHELLS: Record<string, ShellComponent> = {
  '144': shell0,
  '_example': shell1,
  'garden': shell2,
  'growth': shell3,
  'loom': shell4,
  'mirror': shell5,
  'orbit': shell6,
  'origin': shell7,
  'pulse': shell8,
  'return': shell9,
  'reverse': shell10,
  'silence': shell11,
  'slow': shell12,
  'swarm': shell13,
  'tone': shell14,
  'trail': shell15,
  'twin': shell16,
  'wear': shell17,
};

const Missing: ShellComponent = () => null;

/** Renders the room's server shell; an unknown slug renders nothing (the route 404s first). */
export function ShellFor({ slug }: { slug: string }) {
  return createElement(SHELLS[slug] ?? Missing);
}
