import type { Figure } from './types';

/**
 * the kettle — most of the way to boiling, and a column of what is rising
 * out of it. The still: the body, the line of the water, eight risers at
 * eight heights. The four seconds: the boil never stopped, so they rise one
 * spacing and the column is exactly as it was.
 */
const kettle: Figure = {
  draw(ctx, phase, w, h) {
    const bh = Math.min(h * 0.26, 190);
    const bw = bh * 1.15;
    const x = w * 0.5 - bw * 0.5;
    const y = h * 0.66;

    // the body, and the water most of the way up it
    ctx.strokeRect(x, y, bw, bh);
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + bh * 0.3);
    ctx.lineTo(x + bw - 4, y + bh * 0.3);
    ctx.moveTo(x + bw, y + bh * 0.32);
    ctx.lineTo(x + bw + bw * 0.3, y + bh * 0.58);
    ctx.stroke();

    // eight risers, climbing one spacing over the four seconds
    const span = Math.min(h * 0.5, 340);
    const step = span / 8;
    for (let i = 0; i < 8; i++) {
      const t = (i + phase) % 8;
      ctx.globalAlpha = 0.9 - t * 0.09;
      ctx.beginPath();
      ctx.arc(x + bw * 0.5 + Math.sin(t * 1.7) * 11, y - t * step, 2.5 + t * 0.9, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
};
export default kettle;
