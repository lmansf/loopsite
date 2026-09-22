import type { Figure } from './types';

/**
 * the road — up the hill, which only goes one place. The still: two edges
 * converging, and nine marks between them. The four seconds: the marks move
 * one spacing up the hill, which is the only direction anything on this
 * road has ever gone.
 */
const road: Figure = {
  draw(ctx, phase, w, h) {
    const vy = h * 0.26;
    const by = h * 0.86;
    const vx = w * 0.5;
    const spread = Math.min(w * 0.4, 420);

    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.moveTo(vx - spread, by);
    ctx.lineTo(vx - 6, vy);
    ctx.moveTo(vx + spread, by);
    ctx.lineTo(vx + 6, vy);
    ctx.stroke();

    for (let i = 0; i < 9; i++) {
      const t = ((i + phase) % 9) / 9;
      const k = t * t;                              // perspective
      const y = by - (by - vy) * (1 - k);
      const half = spread * (1 - k) * 0.06 + 1;
      ctx.globalAlpha = 0.25 + 0.6 * (1 - k);
      ctx.beginPath();
      ctx.moveTo(vx - half, y);
      ctx.lineTo(vx + half, y);
      ctx.stroke();
    }

    // the one place it goes
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(vx, vy - 10, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
export default road;
