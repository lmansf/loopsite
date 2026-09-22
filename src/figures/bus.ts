import type { Figure } from './types';

/**
 * the last bus — the whole route, run for nobody.
 *
 * The route was already a curve and a curve is not chrome; the only thing that
 * had to go was the 22 x 14 `strokeRect` standing in for the bus, which at
 * this alpha is an empty box. The bus is a short heavy dash now — the shape a
 * vehicle makes on a map — and the route sits low so the twelve stops hang
 * under it rather than through the reading.
 *
 * The still: the route, its twelve stops, and the bus standing at one of them.
 * The four seconds: the bus holds, and the route goes on being the route.
 */
const bus: Figure = {
  draw(ctx, phase, w, h) {
    const n = 12;
    const x0 = -w * 0.04;
    const x1 = w * 1.04;
    const y = h * 0.74;
    const amp = h * 0.2;

    const at = (i: number) => ({
      x: x0 + ((x1 - x0) * i) / (n - 1),
      y: y + Math.sin((i / (n - 1)) * Math.PI * 1.5) * amp,
    });

    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const p = at(i);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else {
        const q = at(i - 1);
        ctx.quadraticCurveTo((p.x + q.x) / 2, q.y, p.x, p.y);
      }
    }
    ctx.stroke();

    // twelve stops, hung under the route so the route does not hide them
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const p = at(i);
      ctx.moveTo(p.x, p.y + 4);
      ctx.lineTo(p.x, p.y + 17);
    }
    ctx.stroke();

    // the one it is standing at, and nobody is on it
    const here = at(7);
    ctx.save();
    ctx.globalAlpha = 0.5 + Math.sin(phase * Math.PI * 2) * 0.3;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(here.x - 13, here.y - 11);
    ctx.lineTo(here.x + 13, here.y - 11);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  },
};
export default bus;
