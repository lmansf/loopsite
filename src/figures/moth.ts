import type { Figure } from './types';

/**
 * the moth — on the cold side of a warm pane. The still: the pane, the warm
 * inside it, and the moth against the glass. The four seconds: six
 * wingbeats, and a figure of eight 8 px wide, on the OUTSIDE of the glass.
 */
const moth: Figure = {
  draw(ctx, phase, w, h) {
    const s = Math.min(w * 0.5, h * 0.62, 400);
    const x = w * 0.5 - s * 0.5;
    const y = h * 0.5 - s * 0.39;
    const a = phase * Math.PI * 2;

    ctx.strokeRect(x, y, s, s * 0.78);
    ctx.globalAlpha = 0.4;
    ctx.strokeRect(x + 22, y + 22, s - 44, s * 0.78 - 44);

    // the moth: a figure of eight, 8 px across, against the cold side
    const mx = x + s * 0.74 + Math.sin(a) * 4;
    const my = y + s * 0.3 + Math.sin(a * 2) * 4;
    const beat = 11 + Math.abs(Math.sin(a * 6)) * 5;   // six wingbeats
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(mx, my + 5);
    ctx.lineTo(mx - beat, my - beat * 0.62);
    ctx.lineTo(mx - beat * 0.45, my + 3);
    ctx.moveTo(mx, my + 5);
    ctx.lineTo(mx + beat, my - beat * 0.62);
    ctx.lineTo(mx + beat * 0.45, my + 3);
    ctx.moveTo(mx, my - 7);
    ctx.lineTo(mx, my + 7);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
export default moth;
