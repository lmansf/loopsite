/**
 * src/lib/audio.ts — opt-in, synthesized, singleton AudioContext.
 *
 * Spec: design/05-build-spec.md §C.8 / §D.2 / §D.3 / §F.4. **OWNED BY WP2.**
 *
 * Every voice is synthesized: there are no audio files anywhere in the site.
 *
 *   kick   sine, 110 → 55 Hz pitch drop over 40 ms, 120 ms exponential decay
 *   snare  200 ms noise through a bandpass at 1.8 kHz, Q 0.8
 *   hat    40 ms noise through a highpass at 8 kHz
 *   tone   triangle at f, 260 ms, 8 ms attack, exponential release,
 *          lowpass at f·6; polyphony capped at 8 with oldest-stealing
 *   chime  the realignment: two sines a fifth apart, 720 ms, exponential release
 *
 * Non-negotiables:
 *   - The AudioContext is constructed ONLY inside a user gesture handler.
 *     `enableAudio()` builds it synchronously, before its first `await`, so a
 *     call made from a pointerdown / click / keydown handler is inside the
 *     gesture. Nothing in this module constructs one on its own initiative.
 *   - Nothing autoplays. Sound is never a gate. Every visual works muted.
 *   - Rooms never touch the AudioContext; they call `playCue()`.
 *   - The master gain only ever moves through `setMasterGain()` ramps (40 ms),
 *     never through an assignment to `.value` — assignments click.
 *   - The context suspends on `visibilitychange → hidden` and resumes on the
 *     next gesture (and, since it was already unlocked, when the page is
 *     visible again).
 *   - The on/off choice is persisted through `@/lib/storage` — the only
 *     module allowed to touch localStorage.
 */

import { writeState } from './storage';

export type CueName = 'kick' | 'snare' | 'hat' | 'tone' | 'chime';

/** Every master-gain move is a 40 ms ramp. */
const RAMP_MS = 40;
const DEFAULT_GAIN = 0.8;
/** §D.3: eight tone voices, oldest-stealing. Drums keep their own small pool. */
const MAX_TONE_VOICES = 8;
const MAX_DRUM_VOICES = 12;
/** Exponential ramps cannot reach zero; this is the silent floor. */
const FLOOR = 0.0001;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = false;
let noiseBuffer: AudioBuffer | null = null;
const toneVoices: AudioScheduledSourceNode[] = [];
const drumVoices: AudioScheduledSourceNode[] = [];
let listeners: Array<(on: boolean) => void> = [];
let wired = false;

function emit(): void {
  for (const l of listeners) l(enabled);
}

/** Subscribe to the on/off state (the sound petal and the footer toggle read this). */
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
  const len = Math.floor(context.sampleRate * 0.25);
  const buf = context.createBuffer(1, len, context.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

/* ------------------------------------------------------------- lifecycle */

function onVisibility(): void {
  if (!ctx) return;
  if (document.visibilityState === 'hidden') {
    void ctx.suspend().catch(() => undefined);
  } else if (enabled && ctx.state === 'suspended') {
    // The context was unlocked by a real gesture earlier; resuming it on
    // return is permitted. If the engine refuses, the next gesture resumes it.
    void ctx.resume().catch(() => undefined);
  }
}

/** Any real gesture resumes a context the browser paused behind our back. */
function onGesture(): void {
  if (enabled && ctx && ctx.state === 'suspended' && document.visibilityState === 'visible') {
    void ctx.resume().catch(() => undefined);
  }
}

function wire(): void {
  if (wired) return;
  wired = true;
  document.addEventListener('visibilitychange', onVisibility);
  document.addEventListener('pointerdown', onGesture, { passive: true, capture: true });
  document.addEventListener('keydown', onGesture, { passive: true, capture: true });
}

/**
 * MUST be called inside a gesture handler (pointerdown / click / keydown).
 * The context is constructed synchronously — before the first `await` — so the
 * construction is inside the gesture that called this.
 *
 * Resolves false if Web Audio is unavailable or the context stays suspended.
 */
export async function enableAudio(): Promise<boolean> {
  try {
    if (!ctx) {
      const w = window as unknown as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      };
      const Ctor = w.AudioContext ?? w.webkitAudioContext;
      if (!Ctor) return false;
      const created = new Ctor();
      const gain = created.createGain();
      // The only direct assignment: the node is brand new and silent. Every
      // later move is a ramp through setMasterGain().
      gain.gain.value = 0;
      gain.connect(created.destination);
      ctx = created;
      master = gain;
      wire();
    }
    if (ctx.state === 'suspended') await ctx.resume();
    enabled = ctx.state === 'running';
    if (enabled) setMasterGain(DEFAULT_GAIN, RAMP_MS);
    writeState({ sound: enabled });
    emit();
    return enabled;
  } catch {
    enabled = false;
    emit();
    return false;
  }
}

export function disableAudio(): void {
  const wasOn = enabled;
  enabled = false;
  if (wasOn) writeState({ sound: false });
  if (!ctx || !master) {
    emit();
    return;
  }
  setMasterGain(0, RAMP_MS);
  emit();
  const context = ctx;
  // Let the ramp land before the context sleeps, so there is no click.
  setTimeout(() => {
    if (!enabled) void context.suspend().catch(() => undefined);
  }, RAMP_MS + 20);
}

/** Never assign to gain.value directly — ramps only, 40 ms by default. */
export function setMasterGain(g: number, rampMs = RAMP_MS): void {
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  const target = Math.max(0, Math.min(1, g));
  const p = master.gain;
  p.cancelScheduledValues(now);
  p.setValueAtTime(p.value, now);
  p.linearRampToValueAtTime(target, now + Math.max(1, rampMs) / 1000);
}

/* ------------------------------------------------------------- voices */

function track(pool: AudioScheduledSourceNode[], node: AudioScheduledSourceNode, max: number): void {
  pool.push(node);
  while (pool.length > max) {
    const oldest = pool.shift();
    try {
      oldest?.stop();
    } catch {
      /* already stopped */
    }
  }
  node.addEventListener('ended', () => {
    const i = pool.indexOf(node);
    if (i >= 0) pool.splice(i, 1);
  });
}

function envelope(
  context: AudioContext,
  t: number,
  peak: number,
  attackS: number,
  releaseS: number,
): GainNode {
  const g = context.createGain();
  g.gain.setValueAtTime(FLOOR, t);
  if (attackS > 0) g.gain.linearRampToValueAtTime(peak, t + attackS);
  else g.gain.exponentialRampToValueAtTime(peak, t + 0.003);
  g.gain.exponentialRampToValueAtTime(FLOOR, t + attackS + releaseS);
  g.connect(master as GainNode);
  return g;
}

export function playCue(
  name: CueName,
  opts?: { freq?: number; gain?: number; when?: number },
): void {
  if (!enabled || !ctx || !master || ctx.state !== 'running') return;
  const context = ctx;
  const t = context.currentTime + Math.max(0, opts?.when ?? 0);
  const level = Math.max(0, Math.min(1.5, opts?.gain ?? 1));

  if (name === 'kick') {
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(opts?.freq ?? 110, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.04);
    const g = envelope(context, t, 0.9 * level, 0, 0.12);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + 0.18);
    track(drumVoices, osc, MAX_DRUM_VOICES);
    return;
  }

  if (name === 'snare' || name === 'hat') {
    const src = context.createBufferSource();
    src.buffer = getNoise(context);
    const filter = context.createBiquadFilter();
    const dur = name === 'snare' ? 0.2 : 0.04;
    if (name === 'snare') {
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 0.8;
    } else {
      filter.type = 'highpass';
      filter.frequency.value = 8000;
    }
    const g = envelope(context, t, (name === 'snare' ? 0.55 : 0.3) * level, 0, dur);
    src.connect(filter);
    filter.connect(g);
    src.start(t);
    src.stop(t + dur + 0.03);
    track(drumVoices, src, MAX_DRUM_VOICES);
    return;
  }

  if (name === 'tone') {
    const freq = Math.max(20, opts?.freq ?? 220);
    const osc = context.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    const lp = context.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(freq * 6, 18000);
    const g = envelope(context, t, 0.32 * level, 0.008, 0.252);
    osc.connect(lp);
    lp.connect(g);
    osc.start(t);
    osc.stop(t + 0.3);
    track(toneVoices, osc, MAX_TONE_VOICES);
    return;
  }

  // chime — the realignment. Two sines a fifth apart, one long release.
  const base = Math.max(20, opts?.freq ?? 880);
  for (const [ratio, amp, dur] of [
    [1, 0.22, 0.72],
    [1.5, 0.12, 0.56],
  ] as const) {
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(base * ratio, t);
    const g = envelope(context, t, amp * level, 0.006, dur);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    track(drumVoices, osc, MAX_DRUM_VOICES);
  }
}
