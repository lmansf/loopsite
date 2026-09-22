'use client';

/**
 * The polite live region. Announces the room label on each deliberate change
 * and carries the caption slot (§C.11, §I.7). Only §I strings ever land here.
 */
export function LiveRegion({ text }: { text: string }) {
  return (
    <p id="loop-status" aria-live="polite" aria-atomic="true">
      {text}
    </p>
  );
}
