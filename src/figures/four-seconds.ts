import type { Figure } from './types';

/**
 * four seconds — the part of the night that nobody was in. The still: four
 * bars on a baseline, and the eleven marks under it for the eleven who were
 * in it. The four seconds: one bar at a time takes the light, once, in
 * order, and then it is over and the four are just four again.
 */
const four: Figure = {
  draw(ctx, phase, w, h) {
    const span = Math.min(w * 0.62, 540);
    const bw = span / 7.4;
    const x0 = w * 0.5 - span * 0.5;
    const base = h * 0.58;
    const tall = Math.min(h * 0.32, 260);

    for (let i = 0; i < 4; i++) {
      const x = x0 + i * bw * 1.9;
      const d = Math.abs(((i / 4 - phase + 1.5) % 1) - 0.5) * 2;
      ctx.globalAlpha = 0.35 + 0.65 * d * d * d;
      ctx.strokeRect(x, base - tall, bw, tall);
    }

    // the rule under all four: what is missing still has a width
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(x0 - bw * 0.6, base);
    ctx.lineTo(x0 + span + bw * 0.5, base);
    ctx.stroke();

    // eleven marks below it, for the eleven who were in it
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    for (let i = 0; i < 11; i++) {
      const x = x0 + (span * i) / 10;
      ctx.moveTo(x, base + 14);
      ctx.lineTo(x, base + 26);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
export default four;
