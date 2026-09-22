/**
 * src/lib/audio.ts — opt-in, synthesized, singleton AudioContext.
 *
 * Spec: design/05-build-spec.md §C.9 / §D.2 / §F.4.
 *
 * **OWNED BY WP2.** This is the one file under src/lib that is not frozen after
 * WP0. It ships here as a working minimum: the real public API, a real
 * gesture-constructed context, a real master gain with 40 ms ramps, and five
 * plain voices so nothing downstream breaks before WP2 refines them.
 *
 * Non-negotiables WP2 must preserve:
 *   - The AudioContext is constructed ONLY inside a user gesture handler.
 *   - Nothing autoplays. Sound is never a gate.
 *   - Rooms never touch the AudioContext; they call playCue().
 *   - Master gain is only ever changed through setMasterGain() (ramps, never
 *     an assignment to .value — assignments click).
 *   - Every visual works identically with audio off.
 */

export type CueName = 'kick' | 'snare' | 'hat' | 'tone' | 'chime';

const RAMP_MS = 40;
const DEFAULT_GAIN = 0.8;
const MAX_VOICES = 8;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = false;
let noiseBuffer: AudioBuffer | null = null;
let voices: AudioScheduledSourceNode[] = [];
let listeners: Array<(on: boolean) => void> = [];

function emit(): void {
  for (const l of listeners) l(enabled);
}

/** Subscribe to the on/off state (the sound petal reads this). */
export function subscribeAudio(fn: (on: boolean) => void): () => void {
  listeners = [...listeners, fn];
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export function isEnabled(): boolean {
  return enabled;
}

function getNoise(context: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const len = Math.floor(context.sampleRate * 0.4);
  const buf = context.createBuffer(1, len, context.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

function onVisibility(): void {
  if (!ctx) return;
  if (document.visibilityState === 'hidden') void ctx.suspend();
  else if (enabled) void ctx.resume();
}

/**
 * MUST be called inside a gesture handler (pointerdown / keydown / click).
 * Resolves false if Web Audio is unavailable or the context stays suspended.
 */
export async function enableAudio(): Promise<boolean> {
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return false;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      document.addEventListener('visibilitychange', onVisibility);
    }
    if (ctx.state === 'suspended') await ctx.resume();
    enabled = ctx.state === 'running';
    if (enabled) setMasterGain(DEFAULT_GAIN, RAMP_MS);
    emit();
    return enabled;
  } catch {
    enabled = false;
    emit();
    return false;
  }
}

export function disableAudio(): void {
  if (!ctx || !master) {
    enabled = false;
    emit();
    return;
  }
  setMasterGain(0, RAMP_MS);
  enabled = false;
  emit();
  const context = ctx;
  setTimeout(() => {
    if (!enabled) void context.suspend();
  }, RAMP_MS + 20);
}

/** Never assign to gain.value directly — ramps only. */
export function setMasterGain(g: number, rampMs = RAMP_MS): void {
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  const target = Math.max(0, Math.min(1, g));
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(target, now + rampMs / 1000);
}

function track(node: AudioScheduledSourceNode): void {
  voices.push(node);
  if (voices.length > MAX_VOICES) {
    const oldest = voices.shift();
    try {
      oldest?.stop();
    } catch {
      /* already stopped */
    }
  }
  node.addEventListener('ended', () => {
    voices = voices.filter((v) => v !== node);
  });
}

export function playCue(
  name: CueName,
  opts?: { freq?: number; gain?: number; when?: number },
): void {
  if (!enabled || !ctx || !master) return;
  const t = ctx.currentTime + (opts?.when ?? 0);
  const level = opts?.gain ?? 1;
  const g = ctx.createGain();
  g.connect(master);

  if (name === 'kick') {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(opts?.freq ?? 110, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.04);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9 * level, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + 0.16);
    track(osc);
    return;
  }

  if (name === 'snare' || name === 'hat') {
    const src = ctx.createBufferSource();
    src.buffer = getNoise(ctx);
    const filter = ctx.createBiquadFilter();
    if (name === 'snare') {
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 0.8;
    } else {
      filter.type = 'highpass';
      filter.frequency.value = 8000;
    }
    const dur = name === 'snare' ? 0.2 : 0.04;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime((name === 'snare' ? 0.5 : 0.28) * level, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    src.start(t);
    src.stop(t + dur + 0.02);
    track(src);
    return;
  }

  // 'tone' and 'chime'
  const freq = opts?.freq ?? (name === 'chime' ? 880 : 220);
  const osc = ctx.createOscillator();
  osc.type = name === 'chime' ? 'sine' : 'triangle';
  osc.frequency.setValueAtTime(freq, t);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = Math.min(freq * 6, 16000);
  const dur = name === 'chime' ? 0.6 : 0.26;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.35 * level, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(lp);
  lp.connect(g);
  osc.start(t);
  osc.stop(t + dur + 0.02);
  track(osc);
}
