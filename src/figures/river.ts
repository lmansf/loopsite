import type { Figure } from './types';

/**
 * the river — the water under the bridge, which has a before and an after.
 *
 * Seven lines of current were never the problem; the bridge was, because it
 * was a dead-straight vertical rule down the middle of the screen. It is an
 * arch now, and it is above the water rather than across it.
 *
 * The still: the current, and the arch over it. The four seconds: the current
 * slides one wavelength and is exactly where it started, which is the river's
 * whole account.
 */
const river: Figure = {
  draw(ctx, phase, w, h) {
    const n = 7;
    const span = h * 0.46;
    const top = h * 0.5;
    const x0 = -w * 0.06;
    const x1 = w * 1.06;
    const drift = phase * 120;

    for (let i = 0; i < n; i++) {
      const y = top + (i * span) / (n - 1);
      ctx.globalAlpha = 0.25 + 0.55 * Math.sin((i / (n - 1)) * Math.PI);
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 10) {
        const k = Math.sin((x + drift + i * 24) / 58) * (3 + i * 0.7);
        if (x === x0) ctx.moveTo(x, y + k);
        else ctx.lineTo(x, y + k);
      }
      ctx.stroke();
    }

    // the arch: a before and an after, and a span between them
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(-w * 0.04, top - 18);
    ctx.bezierCurveTo(w * 0.3, top - h * 0.3, w * 0.7, top - h * 0.3, w * 1.04, top - 18);
    ctx.stroke();
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.moveTo(w * 0.2, top - h * 0.14);
    ctx.lineTo(w * 0.2, top + 8);
    ctx.moveTo(w * 0.8, top - h * 0.14);
    ctx.lineTo(w * 0.8, top + 8);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
export default river;
