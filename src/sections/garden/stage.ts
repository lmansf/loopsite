/**
 * src/sections/garden/stage.ts — helpers common to the hidden destinations.
 *
 * The hidden destinations (§C.13, §D.13) listen on the same surface as the
 * ring: the stage, plus the heading of the room that is showing (the key
 * scope AppShell uses — see design/06-wp0-notes.md note 2). Every listener
 * they add is in the capture phase on `window`, so a gesture that IS a hidden
 * trigger can be claimed before the ring or the shell reads it, and every
 * other gesture passes through untouched.
 */

import type { LoopRuntime } from '@/components/shell/LoopContext';
import type { RingGeometry, SectionProps } from '@/lib/types';

/**
 * What a hidden destination's Room receives. `runtime` is the object the
 * ring's frame driver mutates in place (geometry, room-layer context); it is
 * present when the host mounts the Room, absent when RoomLayer does.
 */
export type HiddenProps = SectionProps & { runtime?: LoopRuntime };

/** the same scope AppShell's keyboard handler uses */
export function inStage(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest('#stage')) return true;
  return /^H[1-6]$/.test(target.tagName) && !!target.closest('.room-shell[data-active="true"]');
}

export function stageEl(): HTMLElement | null {
  return document.getElementById('stage');
}

/** pointer position in stage-local CSS pixels */
export function localPoint(e: PointerEvent, stage: HTMLElement): { x: number; y: number } {
  const rect = stage.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

/** current geometry: the runtime's when hosted, the props' otherwise */
export function geometryOf(props: HiddenProps): RingGeometry {
  return props.runtime ? props.runtime.geometry : props.geometry;
}

/** the room layer's current 2D context */
export function roomLayerOf(props: HiddenProps): CanvasRenderingContext2D | null {
  return props.runtime ? props.runtime.ctx : props.ctx;
}

/** Only one instance of each hidden destination may run at a time. */
const running = new Set<string>();
export function claim(id: string): boolean {
  if (running.has(id)) return false;
  running.add(id);
  return true;
}
export function release(id: string): void {
  running.delete(id);
}
