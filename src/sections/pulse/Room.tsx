'use client';

/**
 * src/sections/pulse/Room.tsx — PULSE: the ring as a drum machine.
 *
 * Spec: design/05-build-spec.md §D.2. **OWNED BY WP2.**
 *
 *   - radius level selects a voice; the glyph carries the voice, not colour
 *     alone: filled disc (kick), hollow square rotated 45° (snare), cross (hat)
 *   - on fire a shock ring expands to min(0.9R, 180 px) over 300 ms; kick shocks
 *     also bulge the ring outward with a 1/(1+d²/120²) falloff, springing back
 *     over 420 ms (drawn just outside the ring, on this layer — the ring layer
 *     belongs to RingStage)
 *   - the whole field lifts 6% for 90 ms on the downbeat, gated to at most one
 *     global flash per 400 ms whatever the node arrangement (FlashGate)
 *   - four concentric ambient rings at 8% pulse outward once per revolution
 *   - the sound petal appears at a = 0.5 after the visitor's third node here
 *     (or at once if sound is already on); pressing it builds the AudioContext
 *     inside the click and ramps the master gain 0 → 0.8 over 40 ms
 *
 * Everything works identically muted; no visual depends on audio.
 */

import { useEffect, useRef, useState } from 'react';
import { isEnabled, playCue } from '@/lib/audio';
import { subscribeFrame } from '@/lib/clock';
import { pointAt } from '@/lib/ring-geometry';
import { readState } from '@/lib/storage';
import { rgba, token } from '@/lib/tokens';
import type { SectionProps } from '@/lib/types';
import { SoundPetal, petalRevealed } from '@/components/ui/SoundPetal';
import styles from './room.module.css';
import {
  FLASH_AMPLITUDE,
  FLASH_MS,
  FlashGate,
  SHOCK_MS,
  SPRING_MS,
  depthFor,
  ringDisplacement,
  shockRadius,
  springBack,
  springBackAge,
  voiceIndex,
  voiceOf,
  type Voice,
} from './logic';

interface Shock {
  x: number;
  y: number;
  age: number;
  voice: Voice;
}
interface Spring {
  a: number;
  age: number;
}
interface Glyph {
  mix: number; // 0 kick, 1 snare, 2 hat — crossfades toward the live voice
  bloom: number; // ms since last fire, for the scale-up
}
interface Traveller {
  x: number;
  y: number;
  age: number;
}

const TWO_PI = Math.PI * 2;
const BLOOM_MS = 240;
const MORPH_MS = 180;
const TRAVEL_MS = 1400;
const PETAL_AFTER = 3;

const VOICE_TOKEN: Record<Voice, string> = {
  kick: '--c-accent',
  snare: '--c-accent-3',
  hat: '--c-accent-2',
};

export default function Room(props: SectionProps) {
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });

  const depthRef = useRef(0);
  const viewedRef = useRef(false);
  const petalPressedRef = useRef(false);
  const [petal, setPetal] = useState(false);

  useEffect(() => {
    const first = propsRef.current;
    if (!viewedRef.current) {
      viewedRef.current = true;
      first.onExplore({ name: 'section_viewed', section: first.id });
    }

    // The petal is already earned if sound is on, was on last visit, or has
    // been revealed elsewhere this session.
    let placedHere = 0;
    let prevCount = first.nodes.length;
    let petalShown = isEnabled() || readState().sound || petalRevealed();
    // Deferred by a microtask: a setState in an effect body cascades a render.
    if (petalShown) queueMicrotask(() => setPetal(true));

    const shocks: Shock[] = [];
    const springs: Spring[] = [];
    const travellers: Traveller[] = [];
    const glyphs = new Map<string, Glyph>();
    const firedIds = new Set<string>();
    const gate = new FlashGate();
    let flashAge = Infinity;
    let prevPhase = first.clock.phase;
    let ringPulse = 0; // reduced motion: the downbeat as a soft alpha lift

    const amp = parseFloat(token('--amp-flash')) || FLASH_AMPLITUDE;

    const unsubscribe = subscribeFrame(() => {
      const p = propsRef.current;
      if (!p.visible) return;
      const { ctx, bg, geometry: g, clock, nodes, fired, reducedMotion, tier } = p;
      if (!ctx || !bg || g.R <= 0) return;
      const { cx, cy, R } = g;
      const dt = clock.dt;
      const phase = clock.phase;

      /* ---------------------------------------------------------- events */

      // nodes placed while this room is active
      if (nodes.length > prevCount) placedHere += nodes.length - prevCount;
      prevCount = nodes.length;
      if (!petalShown && placedHere >= PETAL_AFTER) {
        petalShown = true;
        setPetal(true);
      }

      // the downbeat: the sweep crossed a = 0 this frame
      const wrapped = clock.dir > 0 ? phase < prevPhase : phase > prevPhase;
      prevPhase = phase;
      let wantFlash = wrapped;

      for (const ev of fired) {
        const n = ev.node;
        const voice = voiceOf(n.r);
        const pt = pointAt(n.a, n.r, g);
        shocks.push({ x: pt.x, y: pt.y, age: 0, voice });
        if (voice === 'kick') springs.push({ a: n.a, age: 0 });
        const gl = glyphs.get(n.id);
        if (gl) gl.bloom = 0;
        firedIds.add(n.id);
        wantFlash = true;
        playCue(voice, { gain: voice === 'hat' ? 0.8 : 1 });
      }

      // The hard cap: one global flash per 400 ms, never summed (§D.2).
      if (wantFlash && gate.request(clock.t)) {
        flashAge = 0;
        ringPulse = 1;
        if (depthRef.current >= 0.75 && !reducedMotion) {
          // the next affordance: one node's ripple escapes toward the arc
          let best: { x: number; y: number } | null = null;
          let bestD = Infinity;
          for (const n of nodes) {
            const d = Math.abs(((n.a - 0.5 + 1.5) % 1) - 0.5);
            if (d < bestD) {
              bestD = d;
              best = pointAt(n.a, n.r, g);
            }
          }
          if (best && travellers.length < 2) travellers.push({ x: best.x, y: best.y, age: 0 });
        }
      }
      flashAge += dt;
      ringPulse = Math.max(0, ringPulse - dt / 1200);

      /* ---------------------------------------------------------- background */

      clear(bg);
      const density = 0.04 + 0.02 * (Math.min(nodes.length, 8) / 8);
      const breathe = reducedMotion ? 1 : 1 + 0.06 * Math.cos(phase * TWO_PI);
      const grad = bg.createRadialGradient(cx, cy, R * 0.15, cx, cy, R * 2.1);
      grad.addColorStop(0, rgba('--c-accent', density * breathe));
      grad.addColorStop(0.55, rgba('--c-accent-2', density * 0.35 * breathe));
      grad.addColorStop(1, rgba('--c-canvas', 0));
      bg.fillStyle = grad;
      bg.fillRect(0, 0, g.w, g.h);

      // the flash: a 6% luminance lift of the whole field for 90 ms
      if (!reducedMotion && flashAge < FLASH_MS && amp > 0) {
        const env = flashAge < FLASH_MS - 30 ? 1 : (FLASH_MS - flashAge) / 30;
        bg.fillStyle = rgba('--c-accent-hi', amp * env);
        bg.fillRect(0, 0, g.w, g.h);
      }

      /* ---------------------------------------------------------- room layer */

      clear(ctx);
      ctx.lineCap = 'round';

      // ambient: four concentric rings, 8% alpha, pulsing outward once per
      // revolution with phase offsets i/4. Under reduced motion they step.
      for (let i = 0; i < 4; i++) {
        const k = (phase + i / 4) % 1;
        const rr = R * (0.22 + 0.72 * k);
        ctx.strokeStyle = rgba('--c-accent', 0.08 * (1 - k * k) + 0.06 * ringPulse * (i === 0 ? 1 : 0));
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, TWO_PI);
        ctx.stroke();
      }

      // the hub: a still centre so the composition never reads as empty
      ctx.strokeStyle = rgba('--c-border-strong', 0.9);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, TWO_PI);
      ctx.stroke();
      ctx.fillStyle = rgba('--c-accent', reducedMotion ? 0.35 + 0.4 * ringPulse : 0.35 + 0.5 * (flashAge < FLASH_MS ? 1 : 0));
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, TWO_PI);
      ctx.fill();

      // kick bulges: the ring stroke pushed outward, springing back over 420 ms
      const samples = tier === 'low' ? 28 : 56;
      for (let i = springs.length - 1; i >= 0; i--) {
        const s = springs[i] as Spring;
        s.age += dt;
        if (s.age >= SPRING_MS || reducedMotion) {
          springs.splice(i, 1);
          continue;
        }
        const spring = springBack(s.age);
        const arcLen = 240 / (TWO_PI * R); // ±120 px of arc, in turns
        ctx.strokeStyle = rgba('--c-accent-dim', 0.55 * springBackAge(s.age));
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let j = 0; j <= samples; j++) {
          const a = s.a - arcLen + (2 * arcLen * j) / samples;
          const d = Math.abs(a - s.a) * TWO_PI * R;
          const rr = R + 1 + ringDisplacement(d, spring);
          const t = a * TWO_PI;
          const x = cx + rr * Math.sin(t);
          const y = cy - rr * Math.cos(t);
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // shock rings
      const maxR = shockRadius(R);
      for (let i = shocks.length - 1; i >= 0; i--) {
        const s = shocks[i] as Shock;
        s.age += dt;
        if (reducedMotion) {
          // drawn once at the final radius, 0.18 alpha, fading over 150 ms
          const k = Math.min(1, s.age / 150);
          if (k >= 1) {
            shocks.splice(i, 1);
            continue;
          }
          ctx.strokeStyle = rgba(VOICE_TOKEN[s.voice], 0.18 * (1 - k));
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(s.x, s.y, maxR, 0, TWO_PI);
          ctx.stroke();
          continue;
        }
        const k = Math.min(1, s.age / SHOCK_MS);
        if (k >= 1) {
          shocks.splice(i, 1);
          continue;
        }
        const eased = 1 - (1 - k) * (1 - k);
        ctx.strokeStyle = rgba(VOICE_TOKEN[s.voice], 0.5 * (1 - k));
        ctx.lineWidth = 3 - 2.5 * k;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 4 + (maxR - 4) * eased, 0, TWO_PI);
        ctx.stroke();
      }

      // the escaping ripple, travelling toward the Next Arc at the bottom edge
      for (let i = travellers.length - 1; i >= 0; i--) {
        const tr = travellers[i] as Traveller;
        tr.age += dt;
        const k = Math.min(1, tr.age / TRAVEL_MS);
        if (k >= 1) {
          travellers.splice(i, 1);
          continue;
        }
        const ease = 1 - Math.pow(1 - k, 3);
        const y = tr.y + (g.h - 48 - tr.y) * ease;
        const x = tr.x + (cx - tr.x) * ease;
        ctx.strokeStyle = rgba('--c-accent', 0.35 * (1 - k));
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 6 + 26 * ease, 0, TWO_PI);
        ctx.stroke();
      }

      // the voices: shape carries the voice. Dragging across a boundary morphs
      // the glyph live (a short crossfade between the two shapes).
      const seen = new Set<string>();
      for (const n of nodes) {
        seen.add(n.id);
        const target = voiceIndex(voiceOf(n.r));
        let gl = glyphs.get(n.id);
        if (!gl) {
          gl = { mix: target, bloom: Infinity };
          glyphs.set(n.id, gl);
        }
        if (reducedMotion) gl.mix = target;
        else {
          const step = dt / MORPH_MS;
          gl.mix += Math.max(-step, Math.min(step, target - gl.mix));
        }
        gl.bloom += dt;
        const bloomK = reducedMotion ? 1 : gl.bloom < BLOOM_MS ? 1 + 0.6 * Math.sin(Math.PI * (gl.bloom / BLOOM_MS)) : 1;
        const pt = pointAt(n.a, n.r, g);

        // glow on fire
        if (!reducedMotion && gl.bloom < BLOOM_MS) {
          const glow = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, 26 * bloomK);
          glow.addColorStop(0, rgba(VOICE_TOKEN[voiceOf(n.r)], 0.45 * (1 - gl.bloom / BLOOM_MS)));
          glow.addColorStop(1, rgba(VOICE_TOKEN[voiceOf(n.r)], 0));
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 26 * bloomK, 0, TWO_PI);
          ctx.fill();
        }

        const lo = Math.floor(gl.mix);
        const hi = Math.min(2, lo + 1);
        const f = gl.mix - lo;
        if (f < 0.999) drawGlyph(ctx, lo, pt.x, pt.y, bloomK, 1 - f);
        if (f > 0.001) drawGlyph(ctx, hi, pt.x, pt.y, bloomK, f);
      }
      for (const id of glyphs.keys()) if (!seen.has(id)) glyphs.delete(id);

      /* ---------------------------------------------------------- depth */

      const depth = depthFor(nodes, firedIds.size, petalPressedRef.current);
      if (depth > depthRef.current) {
        depthRef.current = depth;
        p.onExplore({ name: 'depth_reached', section: p.id, depth });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [props.seed, props.reducedMotion]);

  const g = props.geometry;
  return (
    <SoundPetal
      x={g.cx}
      y={g.cy + g.R + 26}
      show={petal && g.R > 0}
      className={styles.petal}
      onPress={() => {
        petalPressedRef.current = true;
      }}
    />
  );
}

/** One voice glyph. 0 kick: filled disc. 1 snare: hollow diamond. 2 hat: cross. */
function drawGlyph(
  ctx: CanvasRenderingContext2D,
  voice: number,
  x: number,
  y: number,
  scale: number,
  alpha: number,
): void {
  if (voice === 0) {
    ctx.fillStyle = rgba('--c-accent', 0.9 * alpha);
    ctx.beginPath();
    ctx.arc(x, y, 9 * scale, 0, TWO_PI);
    ctx.fill();
    return;
  }
  if (voice === 1) {
    const s = 11 * scale;
    ctx.strokeStyle = rgba('--c-accent-3', 0.95 * alpha);
    ctx.lineWidth = 2;
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s, y);
    ctx.lineTo(x, y + s);
    ctx.lineTo(x - s, y);
    ctx.closePath();
    ctx.stroke();
    return;
  }
  const arm = 10 * scale;
  ctx.strokeStyle = rgba('--c-accent-2', 0.95 * alpha);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - arm, y);
  ctx.lineTo(x + arm, y);
  ctx.moveTo(x, y - arm);
  ctx.lineTo(x, y + arm);
  ctx.stroke();
}

/** Clear a layer in device pixels, leaving the CSS-pixel transform intact. */
function clear(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}
