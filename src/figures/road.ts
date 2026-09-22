import type { Figure } from './types';

/**
 * the road — up the hill, which only goes one place. The still: two edges
 * converging on the one place, and eight marks laid down the middle in
 * perspective. The four seconds: the marks travel one spacing UP the hill,
 * which is the only direction anything on this road has ever gone.
 */
const road: Figure = {
  draw(ctx, phase, w, h) {
    const vy = h * 0.24;
    const by = h * 0.92;
    const vx = w * 0.5;
    const spread = Math.min(w * 0.42, 460);

    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.moveTo(vx - spread, by);
    ctx.lineTo(vx - 5, vy);
    ctx.moveTo(vx + spread, by);
    ctx.lineTo(vx + 5, vy);
    ctx.stroke();

    for (let i = 0; i < 8; i++) {
      // near = 1 at the reader's feet, 0 at the vanishing point; squared, so
      // the marks crowd as they go, which is what makes it a hill and not a
      // ladder. Over one revolution each mark walks one spacing away.
      const near = 1 - ((i + phase) % 8) / 8;
      const k = near * near;
      const y = vy + (by - vy) * k;
      const half = (5 + (spread - 5) * k) * 0.13;
      ctx.globalAlpha = 0.2 + 0.7 * k;
      ctx.beginPath();
      ctx.moveTo(vx - half, y);
      ctx.lineTo(vx + half, y);
      ctx.stroke();
    }

    // the one place it goes
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.arc(vx, vy - 12, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
export default road;
