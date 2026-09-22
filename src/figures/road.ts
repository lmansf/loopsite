import type { Figure } from './types';

/**
 * the road — up the hill, which only goes one place.
 *
 * Two converging lines read as perspective and never as a box, so the geometry
 * survived; what changed is that the vanishing point is now above the top of
 * the stage rather than in the middle of the screen, so the reader sees the
 * road they are standing on and not a diagram of one.
 *
 * The still: the two edges, and eight marks laid down the middle. The four
 * seconds: the marks travel one spacing UP the hill, which is the only
 * direction anything on this road has ever gone.
 */
const road: Figure = {
  draw(ctx, phase, w, h) {
    const vy = -h * 0.04;
    const by = h * 1.06;
    const vx = w * 0.5;
    const spread = Math.min(w * 0.72, 620);

    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(vx - spread, by);
    ctx.quadraticCurveTo(vx - spread * 0.22, (by + vy) * 0.5, vx - 6, vy);
    ctx.moveTo(vx + spread, by);
    ctx.quadraticCurveTo(vx + spread * 0.22, (by + vy) * 0.5, vx + 6, vy);
    ctx.stroke();

    for (let i = 0; i < 8; i++) {
      // near = 1 at the reader's feet, 0 at the vanishing point; squared, so
      // the marks crowd as they go, which is what makes it a hill and not a
      // ladder. Over one revolution each mark walks one spacing away.
      const near = 1 - ((i + phase) % 8) / 8;
      const k = near * near;
      const y = vy + (by - vy) * k;
      const half = (5 + (spread - 5) * k) * 0.1;
      ctx.globalAlpha = 0.15 + 0.7 * k;
      ctx.beginPath();
      ctx.moveTo(vx - half, y);
      ctx.lineTo(vx + half, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
};
export default road;
