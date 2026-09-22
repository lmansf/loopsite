'use client';

/**
 * The polite live region. Announces the room label on each deliberate change
 * and carries the caption slot (§C.11, §I.7).
 */
export function LiveRegion({ text }: { text: string }) {
  return (
    <p id="loop-status" aria-live="polite">
      {text}
    </p>
  );
}
