import type { Figure } from './types';

/**
 * the last bus — the whole route, run for nobody. The still: the route, its
 * twelve stops hanging under it, and the bus standing at one of them. The
 * four seconds: the bus holds, and the route goes on being the route.
 */
const bus: Figure = {
  draw(ctx, phase, w, h) {
    const n = 12;
    const x0 = w * 0.06;
    const x1 = w * 0.94;
    const y = h * 0.46;
    const amp = Math.min(h * 0.16, 120);

    const at = (i: number) => ({
      x: x0 + ((x1 - x0) * i) / (n - 1),
      y: y + Math.sin((i / (n - 1)) * Math.PI * 1.5) * amp,
    });

    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const p = at(i);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    // twelve stops, hung under the route so the route does not hide them
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const p = at(i);
      ctx.moveTo(p.x, p.y + 3);
      ctx.lineTo(p.x, p.y + 16);
    }
    ctx.stroke();

    // the one it is standing at, and nobody is on it
    const here = at(7);
    ctx.globalAlpha = 0.55 + Math.sin(phase * Math.PI * 2) * 0.3;
    ctx.strokeRect(here.x - 11, here.y - 20, 22, 14);
    ctx.globalAlpha = 1;
  },
};
export default bus;
