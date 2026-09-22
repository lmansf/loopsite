import type { Figure } from './types';

/**
 * the river — the water under the bridge, which has a before and an after.
 * The still: seven lines of current and the bridge across them. The four
 * seconds: the current slides one wavelength and is where it started.
 */
const river: Figure = {
  draw(ctx, phase, w, h) {
    const n = 7;
    const span = Math.min(h * 0.4, 300);
    const top = h * 0.5 - span * 0.5;
    const x0 = w * 0.04;
    const x1 = w * 0.96;
    const drift = phase * 120;

    for (let i = 0; i < n; i++) {
      const y = top + (i * span) / (n - 1);
      ctx.globalAlpha = 0.35 + 0.5 * Math.sin((i / (n - 1)) * Math.PI);
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 12) {
        const k = Math.sin((x + drift + i * 24) / 60) * 3.5;
        if (x === x0) ctx.moveTo(x, y + k);
        else ctx.lineTo(x, y + k);
      }
      ctx.stroke();
    }

    // the bridge: a before and an after
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(w * 0.5 - 1, top - 26);
    ctx.lineTo(w * 0.5 - 1, top + span + 26);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
export default river;
