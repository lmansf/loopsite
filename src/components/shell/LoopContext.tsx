'use client';

/**
 * src/components/shell/LoopContext.tsx — the one React context in the site.
 *
 * Spec: design/05-build-spec.md §F.1 ("no state library"), §F.6.
 *
 * `runtime` is a MUTABLE object updated in place by the ring's frame driver.
 * Reading it inside a draw callback is free; reading it during render is not
 * meaningful. Everything that must trigger a re-render is a normal value.
 */

import { createContext, useContext } from 'react';
import type {
  ClockFrame,
  ExploreEvent,
  FireEvent,
  QualityTier,
  RingGeometry,
  RingNode,
} from '@/lib/types';

export interface LoopRuntime {
  /** live frame; mutated in place by the clock */
  frame: ClockFrame;
  /** nodes that fired on this frame; refilled in place */
  fired: FireEvent[];
  nodes: readonly RingNode[];
  geometry: RingGeometry;
  /** the room canvas 2D context */
  ctx: CanvasRenderingContext2D | null;
  /** the background canvas 2D context */
  bg: CanvasRenderingContext2D | null;
}

export interface LoopContextValue {
  runtime: LoopRuntime;
  /** the ?s= slug */
  section: string;
  setSection: (slug: string, mode: 'push' | 'replace') => void;
  seed: number;
  reducedMotion: boolean;
  tier: QualityTier;
  /** slugs the visitor has genuinely been to (§C.5) */
  visited: readonly string[];
  /** hidden ids found (§C.13) */
  collected: readonly string[];
  /** caption slot; only §I strings are legal */
  say: (text: string, ms?: number) => void;
  onExplore: (event: ExploreEvent) => void;
  /** node count, for re-rendering the few things that care */
  nodeCount: number;
}

export const LoopContext = createContext<LoopContextValue | null>(null);

export function useLoop(): LoopContextValue {
  const value = useContext(LoopContext);
  if (!value) throw new Error('useLoop must be used inside <AppShell>');
  return value;
}
