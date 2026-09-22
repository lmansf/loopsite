import type { Figure } from './types';

/**
 * the streetlight — a post, a head, and the pool of light on a road it has
 * never seen the end of.
 *
 * The cone used to close on a dead-straight ground line, which is two
 * rules meeting a third. The ground is a shallow curve now and the light is an
 * open ellipse arc lying on it, so what the reader sees is a pool and a post
 * rather than a triangle on a horizon.
 *
 * The still: the pool at full reach. The four seconds: it dimmed first, so the
 * pool draws in by 8 px and comes back.
 */
const lamp: Figure = {
  draw(ctx, phase, w, h) {
    const ground = h * 0.82;
    const x = w * 0.3;
    const top = ground - h * 0.66;
    const dip = Math.sin(phase * Math.PI * 2) * 4;
    const reach = Math.min(w * 0.3, 260) - dip;

    // the road, which is a road and not a horizon
    ctx.globalAlpha = 0.34;
    ctx.beginPath();
    ctx.moveTo(-w * 0.06, ground + 14);
    ctx.quadraticCurveTo(w * 0.5, ground - 10, w * 1.06, ground + 6);
    ctx.stroke();

    // post and head
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(x, ground + 4);
    ctx.lineTo(x, top + 14);
    ctx.quadraticCurveTo(x, top, x + 20, top + 1);
    ctx.stroke();
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(x + 11, top + 6);
    ctx.lineTo(x + 28, top + 6);
    ctx.stroke();

    // the pool: an open arc, lying on the road, drawn in perspective
    ctx.globalAlpha = 0.42;
    ctx.beginPath();
    ctx.ellipse(x + 20, ground + 6, reach, reach * 0.26, 0, Math.PI * 0.08, Math.PI * 0.92);
    ctx.stroke();
    ctx.globalAlpha = 0.24;
    ctx.beginPath();
    ctx.ellipse(x + 20, ground + 6, reach * 0.62, reach * 0.17, 0, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
export default lamp;
