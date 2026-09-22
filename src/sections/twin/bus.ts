/**
 * src/sections/twin/bus.ts — the one shared signal between GARDEN and THE TWIN.
 *
 * GARDEN publishes its field (the seed loops, in order) while it is mounted;
 * the twin detector compares your ring against it. When a twin is found the
 * lock is published here and GARDEN lights both rings for its duration.
 *
 * Module state, on purpose: both chunks import this one module, so there is
 * exactly one field and one lock however the bundler splits them.
 */

import type { RingNode } from '@/lib/types';

export interface TwinCandidate {
  nodes: readonly RingNode[];
}

export interface TwinLock {
  /** index into the published field */
  index: number;
  /** clock.t at which the lock releases */
  until: number;
}

let field: readonly TwinCandidate[] = [];
/** the field index whose loop was taken onto the main ring — never a twin of itself */
let adopted = -1;
let lock: TwinLock | null = null;
let listeners: Array<() => void> = [];

function emit(): void {
  for (const fn of listeners) fn();
}

export function publishField(loops: readonly TwinCandidate[], adoptedIndex = -1): void {
  field = loops;
  adopted = adoptedIndex;
  emit();
}

export function clearField(): void {
  field = [];
  adopted = -1;
  lock = null;
}

export function getField(): readonly TwinCandidate[] {
  return field;
}

export function getAdopted(): number {
  return adopted;
}

export function setLock(next: TwinLock | null): void {
  lock = next;
}

export function getLock(): TwinLock | null {
  return lock;
}

/** Called whenever the field is republished. */
export function subscribeField(fn: () => void): () => void {
  listeners = [...listeners, fn];
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}
