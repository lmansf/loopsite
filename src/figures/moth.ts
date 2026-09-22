import type { Figure } from './types';

/**
 * the moth — on the cold side of a warm pane.
 *
 * This one drew two nested `strokeRect`s, which is a picture frame, and behind
 * a navigation grid it read as one more box in the grid. The pane is down to
 * two corners now — the amount of a window you actually see in the dark — and
 * the figure of eight the moth has been flying all evening is drawn as a path,
 * because the path is the thing the moth's account is about.
 *
 * The still: the two corners, the traced eight, and the moth on it. The four
 * seconds: six wingbeats, and one circuit of the eight, on the OUTSIDE.
 */
const moth: Figure = {
  draw(ctx, phase, w, h) {
    const cx = w * 0.56;
    const cy = h * 0.66;
    const s = Math.min(w * 0.36, h * 0.3, 260);
    const a = phase * Math.PI * 2;

    // two corners of the pane, and nothing between them
    ctx.globalAlpha = 0.4;
    const gx = w * 0.14;
    const gy = h * 0.3;
    const gw = w * 0.78;
    const gh = h * 0.68;
    ctx.beginPath();
    ctx.moveTo(gx, gy + gh * 0.3);
    ctx.lineTo(gx, gy);
    ctx.lineTo(gx + gw * 0.26, gy);
    ctx.moveTo(gx + gw, gy + gh * 0.72);
    ctx.lineTo(gx + gw, gy + gh);
    ctx.lineTo(gx + gw * 0.7, gy + gh);
    ctx.stroke();

    // the eight, traced: what it has been doing since the light came on
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    for (let i = 0; i <= 96; i++) {
      const t = (i / 96) * Math.PI * 2;
      const px = cx + Math.sin(t) * s * 0.5;
      const py = cy + Math.sin(t * 2) * s * 0.28;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // the moth, on it
    const mx = cx + Math.sin(a) * s * 0.5;
    const my = cy + Math.sin(a * 2) * s * 0.28;
    const beat = 12 + Math.abs(Math.sin(a * 6)) * 6;
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(mx, my + 5);
    ctx.quadraticCurveTo(mx - beat, my - beat, mx - beat * 0.45, my + 3);
    ctx.moveTo(mx, my + 5);
    ctx.quadraticCurveTo(mx + beat, my - beat, mx + beat * 0.45, my + 3);
    ctx.moveTo(mx, my - 7);
    ctx.lineTo(mx, my + 7);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
export default moth;
