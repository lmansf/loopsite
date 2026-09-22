/**
 * src/lib/beacon.ts — the first-party engagement beacon.
 *
 * Spec: design/11-narrative-build-spec.md §C.14. Retained wholesale from WP0;
 * only the event names changed. Owned by WP-D.
 *
 * No cookies. No localStorage. No fingerprinting. No PII. One sessionStorage
 * key that dies with the tab. Refuses to send at all under DNT / GPC.
 */

import type { BeaconEventName } from './types.ts';

const ENDPOINT = '/api/beacon';
const SID_KEY = 'loop:sid';
const IDLE_FLUSH_MS = 10_000;
const MAX_DETAIL_KEYS = 8;
const MAX_QUEUE = 32;

interface WireEvent {
  n: BeaconEventName;
  t: number;
  d?: Record<string, string | number | boolean>;
}

let enabled = false;
let started = false;
let sid = '';
let queue: WireEvent[] = [];
const sent = new Set<string>();
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let thirtySecondMs = 0;
let visibleSince = 0;
let dwellTimer: ReturnType<typeof setInterval> | null = null;

function privacyRefuses(): boolean {
  if (typeof navigator === 'undefined') return true;
  const nav = navigator as Navigator & {
    msDoNotTrack?: string;
    globalPrivacyControl?: boolean;
  };
  const win = window as Window & { doNotTrack?: string };
  return (
    nav.doNotTrack === '1' ||
    win.doNotTrack === '1' ||
    nav.msDoNotTrack === '1' ||
    nav.globalPrivacyControl === true
  );
}

function ensureSid(): string {
  try {
    const existing = sessionStorage.getItem(SID_KEY);
    if (existing) return existing;
    const next = crypto.randomUUID();
    sessionStorage.setItem(SID_KEY, next);
    return next;
  } catch {
    return '';
  }
}

function send(): void {
  if (!enabled || queue.length === 0) return;
  const payload = JSON.stringify({ sid, events: queue.slice(0, MAX_QUEUE) });
  queue = [];
  try {
    const blob = new Blob([payload], { type: 'application/json' });
    if (navigator.sendBeacon?.(ENDPOINT, blob)) return;
  } catch {
    /* fall through */
  }
  try {
    void fetch(ENDPOINT, {
      method: 'POST',
      body: payload,
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => undefined);
  } catch {
    /* a beacon must never break the site */
  }
}

function scheduleIdleFlush(): void {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(send, IDLE_FLUSH_MS);
}

function onHidden(): void {
  if (document.visibilityState === 'hidden') send();
}

/**
 * Fire a wire event. Each of the five is deduped to once per session.
 * `detail` is truncated to 8 non-PII keys.
 */
export function beacon(
  name: BeaconEventName,
  detail?: Record<string, string | number | boolean>,
): void {
  if (!enabled) return;
  // account_viewed carries an account and dedupes per account; the other
  // four dedupe per name. Either way: once per session (§C.14).
  const dedupeKey =
    name === 'account_viewed' ? `${name}:${String(detail?.account ?? '')}` : name;
  if (sent.has(dedupeKey)) return;
  sent.add(dedupeKey);

  let d: Record<string, string | number | boolean> | undefined;
  if (detail) {
    d = {};
    let i = 0;
    for (const [k, v] of Object.entries(detail)) {
      if (i++ >= MAX_DETAIL_KEYS) break;
      d[k] = v;
    }
  }
  queue.push({ n: name, t: Math.round(performance.now()), ...(d ? { d } : {}) });
  scheduleIdleFlush();
}

/** session_start. The first thing the runtime does. */
export function initBeacon(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  if (privacyRefuses()) {
    enabled = false;
    return;
  }
  enabled = true;
  sid = ensureSid();

  beacon('session_start');

  // time_on_site_30s accrues only while the document is visible.
  visibleSince = document.visibilityState === 'visible' ? performance.now() : 0;
  dwellTimer = setInterval(() => {
    if (document.visibilityState === 'visible') {
      if (visibleSince === 0) visibleSince = performance.now();
      thirtySecondMs += performance.now() - visibleSince;
      visibleSince = performance.now();
      if (thirtySecondMs >= 30_000) {
        beacon('time_on_site_30s');
        if (dwellTimer) clearInterval(dwellTimer);
        dwellTimer = null;
      }
    } else {
      visibleSince = 0;
    }
  }, 1000);

  document.addEventListener('visibilitychange', onHidden);
  window.addEventListener('pagehide', send);
  scheduleIdleFlush();
}

/** Test-only teardown. Not used by the site. */
export function __stopBeaconForTest(): void {
  if (idleTimer) clearTimeout(idleTimer);
  if (dwellTimer) clearInterval(dwellTimer);
  idleTimer = null;
  dwellTimer = null;
  started = false;
  enabled = false;
  sent.clear();
  queue = [];
}
