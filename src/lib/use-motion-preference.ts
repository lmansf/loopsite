'use client';

/**
 * src/lib/use-motion-preference.ts — the ONLY caller of
 * matchMedia('(prefers-reduced-motion: reduce)') in the codebase.
 *
 * Spec: design/05-build-spec.md §C.4, §F.4, §E. FROZEN after WP0.
 *
 * There is exactly one signal: `document.documentElement.dataset.motion`. The
 * CSS layer reads it via `:root[data-motion="reduce"]`, the clock reads it via
 * a MutationObserver, and this hook writes it. They can never disagree.
 */

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { readState, writeState } from './storage';

export type MotionPreference = 'auto' | 'reduce';

const QUERY = '(prefers-reduced-motion: reduce)';

let override: MotionPreference | null = null;
let resolved: MotionPreference = 'auto';
let listeners: Array<() => void> = [];
let mql: MediaQueryList | null = null;

function systemPrefersReduce(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  if (!mql) mql = window.matchMedia(QUERY);
  return mql.matches;
}

function recompute(): void {
  const next: MotionPreference =
    override === 'reduce' ? 'reduce' : override === 'auto' ? 'auto' : systemPrefersReduce() ? 'reduce' : 'auto';
  if (next === resolved && document.documentElement.dataset.motion === next) return;
  resolved = next;
  document.documentElement.dataset.motion = next;
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners = [...listeners, listener];
  if (listeners.length === 1 && typeof window !== 'undefined') {
    if (!mql) mql = window.matchMedia(QUERY);
    mql.addEventListener('change', recompute);
  }
  return () => {
    listeners = listeners.filter((l) => l !== listener);
    if (listeners.length === 0) mql?.removeEventListener('change', recompute);
  };
}

const getSnapshot = (): MotionPreference => resolved;
const getServerSnapshot = (): MotionPreference => 'auto';

/** Resolved motion preference: the visitor's explicit override, else the OS. */
export function useMotionPreference(): MotionPreference {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    if (override === null) {
      const stored = readState().motion;
      if (stored === 'reduce') override = 'reduce';
    }
    recompute();
  }, []);
  return value;
}

/** The in-page `gentle mode` toggle. Takes effect without a reload. */
export function setMotionOverride(v: MotionPreference): void {
  override = v;
  writeState({ motion: v });
  recompute();
}

/** Read the current resolved value outside React (canvas code, the clock). */
export function getMotionPreference(): MotionPreference {
  if (typeof document === 'undefined') return 'auto';
  return document.documentElement.dataset.motion === 'reduce' ? 'reduce' : 'auto';
}

/** A convenience for the toggle button. */
export function useMotionToggle(): [MotionPreference, () => void] {
  const value = useMotionPreference();
  const toggle = useCallback(() => {
    setMotionOverride(getMotionPreference() === 'reduce' ? 'auto' : 'reduce');
  }, []);
  return [value, toggle];
}
