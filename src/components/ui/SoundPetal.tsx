'use client';

/**
 * src/components/ui/SoundPetal.tsx — the sound petal. **OWNED BY WP2.**
 *
 * Spec: design/05-build-spec.md §B (10–30 s), §D.2 "Sound (the reveal)", §I.4.
 *
 * A 44 px target on the ring's outer edge at `a = 0.5`, with a wordless speaker
 * glyph and the visible label `sound`; once on, the label becomes `quiet`. It
 * carries `aria-pressed`, so the state is never colour alone: the label text
 * changes, the glyph changes, and the accessibility tree changes.
 *
 * It is never a gate, never a modal, and never blocks anything. Pressing it
 * calls `enableAudio()` synchronously inside the click handler, which is where
 * — and the only place where — the AudioContext gets constructed.
 *
 * The rooms decide when to show it (PULSE: after the visitor's third node in
 * the room, or immediately if sound was already on). Once revealed anywhere it
 * stays revealed for the session, which is what `revealedOnce` remembers.
 */

import { useEffect, useSyncExternalStore, type CSSProperties } from 'react';
import { disableAudio, enableAudio, isEnabled, subscribeAudio } from '@/lib/audio';

let revealedOnce = false;

/** Has the petal been shown at any point this session? */
export function petalRevealed(): boolean {
  return revealedOnce;
}

/**
 * The petal's centre: on the ring's outer edge at a = 0.5, straddling the
 * stroke with most of its 44 px outside the ring. The caption slot
 * (`#loop-status`) begins 28 px below the ring and carries the persistent hero
 * lines, so the petal never drops into it.
 */
export const PETAL_EDGE_OFFSET = 6;

export function petalPosition(g: { cx: number; cy: number; R: number }): { x: number; y: number } {
  return { x: g.cx, y: g.cy + g.R + PETAL_EDGE_OFFSET };
}

export interface SoundPetalProps {
  /** Centre of the petal in stage CSS pixels. */
  x: number;
  y: number;
  show: boolean;
  /** Fires on every press (PULSE's depth 0.75 reads it). */
  onPress?: () => void;
  className?: string;
}

const base: CSSProperties = {
  position: 'absolute',
  zIndex: 'var(--z-caption)',
  transform: 'translate(-50%, -50%)',
  minWidth: 44,
  minHeight: 44,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  padding: '2px 6px',
  borderRadius: 'var(--radius-lg)',
  color: 'var(--c-text-secondary)',
  background: 'var(--c-surface-overlay)',
  fontSize: 'var(--text-xs)',
  letterSpacing: 'var(--ls-label)',
  lineHeight: 1,
  transition: 'color var(--dur-3) var(--ease-snap)',
  animation: 'loop-fade-in var(--dur-6) var(--ease-enter) both',
};

export function SoundPetal({ x, y, show, onPress, className }: SoundPetalProps) {
  // The audio engine is an external store; this never re-renders at 60 fps.
  const on = useSyncExternalStore(subscribeAudio, isEnabled, () => false);

  useEffect(() => {
    if (show) revealedOnce = true;
  }, [show]);

  function press(): void {
    onPress?.();
    if (isEnabled()) {
      disableAudio();
      return;
    }
    // Synchronous, inside the click: the AudioContext is built here.
    void enableAudio();
  }

  if (!show) return null;

  const style: CSSProperties = {
    ...base,
    left: x,
    top: y,
    color: on ? 'var(--c-accent)' : 'var(--c-text-secondary)',
  };

  return (
    <button
      type="button"
      className={className}
      style={style}
      aria-pressed={on}
      data-control="sound-petal"
      onClick={press}
    >
      <svg width="20" height="16" viewBox="0 0 20 16" aria-hidden="true" focusable="false">
        <path
          d="M2 5.5h3.2L9.5 2v12L5.2 10.5H2z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path
          d="M12.5 5.2a3.6 3.6 0 0 1 0 5.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity={on ? 1 : 0.35}
        />
        <path
          d="M14.8 2.8a7 7 0 0 1 0 10.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity={on ? 1 : 0}
        />
      </svg>
      <span>{on ? 'quiet' : 'sound'}</span>
    </button>
  );
}
