import type { Figure } from './types';

/**
 * the last bus — the whole route, run for nobody. The still: the route, its
 * twelve stops, and the bus at one of them. The four seconds: the bus holds
 * at its stop and the route goes on being the route.
 */
const bus: Figure = {
  draw(ctx, phase, w, h) {
    const n = 12;
    const x0 = w * 0.06;
    const x1 = w * 0.94;
    const y = h * 0.5;
    const amp = Math.min(h * 0.14, 110);

    const at = (i: number) => ({
      x: x0 + ((x1 - x0) * i) / (n - 1),
      y: y + Math.sin((i / (n - 1)) * Math.PI * 1.5) * amp,
    });

    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const p = at(i);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    // twelve stops; the one it is standing at is a square, and nobody is on
    for (let i = 0; i < n; i++) {
      const p = at(i);
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 5);
      ctx.lineTo(p.x, p.y + 5);
      ctx.stroke();
    }
    const here = at(7);
    ctx.globalAlpha = 0.6 + Math.sin(phase * Math.PI * 2) * 0.25;
    ctx.strokeRect(here.x - 7, here.y - 7, 14, 14);
    ctx.globalAlpha = 1;
  },
};
export default bus;
