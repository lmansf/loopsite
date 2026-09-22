import type { Figure } from './types';

/**
 * the kettle — most of the way to boiling, and a column of what is rising out
 * of it.
 *
 * The body used to be a `strokeRect` with a spout drawn off it, which at 11 %
 * alpha behind a paragraph is a small empty box. It is a silhouette now: a
 * belly, a shoulder, a spout, drawn as one open curve that never closes at the
 * top, because the top of it is what is leaving.
 *
 * The still: the belly, the line of the water, eight risers at eight heights.
 * The four seconds: the boil never stopped, so they climb one spacing and the
 * column is exactly as it was.
 */
const kettle: Figure = {
  draw(ctx, phase, w, h) {
    const bh = Math.min(h * 0.3, 210);
    const bw = bh * 1.2;
    const x = w * 0.54 - bw * 0.5;
    const y = h * 0.96 - bh;

    // the silhouette: up the left side, across the shoulder, out of the spout
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y + bh);
    ctx.bezierCurveTo(x - bw * 0.1, y + bh * 0.4, x + bw * 0.04, y + bh * 0.16, x + bw * 0.3, y + bh * 0.1);
    ctx.moveTo(x + bw, y + bh);
    ctx.bezierCurveTo(x + bw * 1.1, y + bh * 0.42, x + bw * 0.98, y + bh * 0.2, x + bw * 0.74, y + bh * 0.12);
    ctx.stroke();

    // the spout, going away from the body
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(x + bw * 0.96, y + bh * 0.46);
    ctx.quadraticCurveTo(x + bw * 1.28, y + bh * 0.4, x + bw * 1.34, y + bh * 0.1);
    ctx.stroke();

    // the water, most of the way up it
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(x + bw * 0.06, y + bh * 0.42);
    ctx.quadraticCurveTo(x + bw * 0.5, y + bh * 0.46, x + bw * 0.94, y + bh * 0.42);
    ctx.stroke();

    // eight risers, climbing one spacing over the four seconds
    const span = h * 0.78;
    const step = span / 8;
    for (let i = 0; i < 8; i++) {
      const t = (i + phase) % 8;
      ctx.globalAlpha = 0.85 - t * 0.095;
      ctx.beginPath();
      ctx.arc(x + bw * 0.5 + Math.sin(t * 1.7) * 13, y + bh * 0.06 - t * step, 2 + t * 1.2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
};
export default kettle;
