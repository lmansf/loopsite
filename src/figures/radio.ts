import type { Figure } from './types';

/**
 * the radio — talking to a chair.
 *
 * The set was a `strokeRect` and the chair was a pair of right angles, so at
 * low alpha the pair of them read as two more boxes. The set is a dial and a
 * grille now — the two things a radio actually shows — and the chair is drawn
 * as the outline a chair makes from behind, with no closed corners.
 *
 * The still: the set, the chair, and five rings of what it is saying already
 * crossing the room. The four seconds: the rings travel one spacing outward;
 * the chair does not move.
 */
const radio: Figure = {
  draw(ctx, phase, w, h) {
    const x = w * 0.2;
    const y = h * 0.62;
    const step = Math.min(w * 0.12, 84);

    // the grille and the dial: a set, without a box round it
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.moveTo(x - 24, y - 14 + i * 7);
      ctx.lineTo(x - 4, y - 14 + i * 7);
    }
    ctx.stroke();
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(x + 12, y - 2, 8, 0, Math.PI * 2);
    ctx.moveTo(x + 12, y - 2);
    ctx.lineTo(x + 12 + Math.cos(-0.9) * 8, y - 2 + Math.sin(-0.9) * 8);
    ctx.stroke();

    // five rings, going out and not coming back
    for (let i = 0; i < 5; i++) {
      const t = (i + phase) % 5;
      ctx.globalAlpha = 0.5 * (1 - t / 5);
      ctx.beginPath();
      ctx.arc(x, y, 40 + t * step, -0.8, 0.8);
      ctx.stroke();
    }

    // the chair, which is where the listening was supposed to happen
    const cx = x + step * 4.2;
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.moveTo(cx - 24, y + 42);
    ctx.lineTo(cx - 22, y - 30);
    ctx.quadraticCurveTo(cx - 2, y - 40, cx + 20, y - 28);
    ctx.lineTo(cx + 22, y + 40);
    ctx.moveTo(cx - 23, y + 6);
    ctx.quadraticCurveTo(cx, y + 14, cx + 22, y + 4);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
export default radio;
