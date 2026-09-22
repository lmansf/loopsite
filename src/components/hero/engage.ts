/**
 * src/components/hero/engage.ts — "dies on first touch" (§B, §I.1).
 *
 * The `<h1>` is present from byte zero and fades in at 1.8 s by CSS. Its exit
 * is also CSS (`ring.css`: `[data-stage-state="engaged"] #loop-title`), which
 * starts from `--cap-o`, the caption's opacity at the moment of dismissal —
 * so a tap at 400 ms, before the caption ever showed, never flashes it.
 *
 * The attribute lives on <html> (see design/06-wp0-notes.md, E.4). Idempotent:
 * the inline bootstrap may already have engaged before React arrived.
 */
export function engageHero(): void {
  if (typeof document === 'undefined') return;
  const h = document.documentElement;
  if (h.dataset.stageState === 'engaged') return;
  const title = document.getElementById('loop-title');
  try {
    h.style.setProperty('--cap-o', title ? getComputedStyle(title).opacity : '1');
  } catch {
    /* style unavailable — the exit simply starts from 1 */
  }
  h.dataset.stageState = 'engaged';
}
