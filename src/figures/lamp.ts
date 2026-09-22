import type { Figure } from './types';

/**
 * the streetlight — a post, a head, and a cone of light on a road it has
 * never seen the end of. The still: the cone at full reach. The four
 * seconds: it dimmed first, so the cone's far edge draws back 8 px.
 */
const lamp: Figure = {
  draw(ctx, phase, w, h) {
    const ground = h * 0.74;
    const x = w * 0.5;
    const top = ground - Math.min(h * 0.46, 360);
    const dip = Math.sin(phase * Math.PI * 2) * 4;
    const reach = Math.min(w * 0.22, 190) - dip;

    // post and head
    ctx.beginPath();
    ctx.moveTo(x, ground);
    ctx.lineTo(x, top + 12);
    ctx.quadraticCurveTo(x, top, x + 18, top);
    ctx.stroke();
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(x + 10, top + 4);
    ctx.lineTo(x + 26, top + 4);
    ctx.stroke();

    // the cone
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(x + 18, top + 6);
    ctx.lineTo(x + 18 - reach, ground);
    ctx.lineTo(x + 18 + reach, ground);
    ctx.closePath();
    ctx.stroke();

    // the road, and the bridge it has never seen
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(w * 0.06, ground);
    ctx.lineTo(w * 0.94, ground);
    ctx.moveTo(w * 0.06, ground + 16);
    ctx.lineTo(w * 0.3, ground + 16);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
export default lamp;
