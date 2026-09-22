import type { Figure } from './types';

/**
 * the radio — talking to a chair. The still: the set, the chair, and five
 * rings of what it is saying, already crossing the room. The four seconds:
 * the rings travel one spacing outward; the chair does not move.
 */
const radio: Figure = {
  draw(ctx, phase, w, h) {
    const x = w * 0.34;
    const y = h * 0.52;
    const step = Math.min(w * 0.085, 66);

    // the set
    ctx.strokeRect(x - 26, y - 17, 52, 34);
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(x + 10, y, 6, 0, Math.PI * 2);
    ctx.stroke();

    // five rings, going out and not coming back
    for (let i = 0; i < 5; i++) {
      const t = (i + phase) % 5;
      ctx.globalAlpha = 0.55 * (1 - t / 5);
      ctx.beginPath();
      ctx.arc(x, y, 34 + t * step, -0.85, 0.85);
      ctx.stroke();
    }

    // the chair, which is where the listening was supposed to happen
    const cx = x + step * 4.6;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx - 20, y + 28);
    ctx.lineTo(cx - 20, y - 26);
    ctx.lineTo(cx + 16, y - 26);
    ctx.moveTo(cx - 22, y + 2);
    ctx.lineTo(cx + 18, y + 2);
    ctx.lineTo(cx + 18, y + 28);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
export default radio;
