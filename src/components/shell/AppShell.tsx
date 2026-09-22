'use client';

/**
 * src/components/shell/AppShell.tsx — the one client orchestrator. **WP3.**
 *
 * Spec: design/05-build-spec.md §B, §C.4, §C.5, §C.7, §C.10, §C.11, §C.12, §F.6.
 *
 * It starts the single clock, initialises the beacon, resolves motion
 * preference once for the whole tree, owns the URL (push for a deliberate act,
 * replace for a passive one), owns the caption slot, the corridor
 * keyboard/swipe navigation, the visited rule, the Next Arc's idle
 * escalation and the corridor transition, and provides `LoopContext`.
 *
 * Nothing here ever navigates on its own (§J.1). Wheel is bound to nothing
 * (§J.5).
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getFrame, setDirection, setPeriod, startClock, subscribeFrame } from '@/lib/clock';
import { beacon, initBeacon } from '@/lib/beacon';
import { computeGeometry, isOnBand, pointAt } from '@/lib/ring-geometry';
import { decodeLoop } from '@/lib/share';
import { getNodes, restoreNodes, clearNodes, subscribeNodes } from '@/lib/ring-store';
import { markVisited, readState, writeState } from '@/lib/storage';
import { duration, token } from '@/lib/tokens';
import { useMotionPreference } from '@/lib/use-motion-preference';
import { normalizeAnchorUrl, useUrlState } from '@/lib/url-state';
import { disableAudio, enableAudio, isEnabled } from '@/lib/audio';
import type { ExploreEvent, QualityTier, RingNode } from '@/lib/types';
import { ROOMS, bySlug } from '@/sections/registry';
import { HeroCaption } from '../hero/HeroCaption';
import { HeroIsland } from '../hero/HeroIsland';
import { RingStage } from '../ring/RingStage';
import { RoomLayer } from '../ring/RoomLayer';
import { Corridor } from './Corridor';
import { LiveRegion } from './LiveRegion';
import { LoopContext, type LoopContextValue, type LoopRuntime, type NavDir } from './LoopContext';
import { MotionToggle } from './MotionToggle';
import { NextArc } from './NextArc';
import { Ringway } from './Ringway';
import { SoundToggle } from './SoundToggle';
import { KeepButton } from '../ui/KeepButton';
import { ShareButton } from '../ui/ShareButton';
import './shell.css';

/** §C.5: a room counts as visited after 3 s active AND one full revolution. */
const VISIT_MS = 3000;
/** §B: the Ringway fades in at t >= 30 s or the 5th node, whichever is first. */
const RINGWAY_MS = 30_000;
const RINGWAY_NODES = 5;
/** §C.11: the Next Arc escalates after the trick landed plus 4 s of idle. */
const IDLE_MS = 4000;
/** §B: every room reveals its trick within 20–40 s; after that, idle alone escalates. */
const TRICK_FALLBACK_MS = 30_000;
/** §C.5: the notch lock-in runs 360 ms; the attribute outlives it by one frame. */
const LOCK_MS = 420;
/** §C.5: the full-circuit sweep when all twelve are lit. */
const CIRCUIT_MS = 800;
/** §C.11: swipe threshold and velocity. */
const SWIPE_PX = 64;
const SWIPE_V = 0.3;
/** §C.3: a press within this distance of a node is a grab, never a swipe. */
const GRAB_PX = 22;

const DIGIT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];

function roomIndex(slug: string): number {
  return ROOMS.findIndex((r) => r.id === slug);
}

/**
 * Forward or back, for the corridor choreography (§C.11). Moving across the
 * wrap (return → origin) is forward; origin → return is back.
 */
function travelDir(from: string, to: string): NavDir {
  const a = roomIndex(from);
  const b = roomIndex(to);
  if (a < 0 || b < 0 || a === b) return null;
  let delta = b - a;
  if (delta > ROOMS.length / 2) delta -= ROOMS.length;
  if (delta < -ROOMS.length / 2) delta += ROOMS.length;
  return delta > 0 ? 'forward' : 'back';
}

/**
 * The 520 ms corridor transition (§C.11), on the two room-owned canvases only.
 * The outgoing world rotates −8° and fades with --ease-exit, the incoming
 * enters from +8° with --ease-enter, the background field pans 6% in the
 * travel direction. Backwards inverts the signs and runs at 0.85×. The ring
 * layer is never touched. Under reduced motion the CSS cross-fade is all
 * there is.
 */
function corridorTransition(dir: NavDir): void {
  if (!dir || typeof document === 'undefined') return;
  if (document.documentElement.dataset.motion === 'reduce') return;
  const room = document.getElementById('loop-room');
  const bg = document.getElementById('loop-bg');
  if (!room || !bg || typeof room.animate !== 'function') return;
  const back = dir === 'back';
  const ms = Math.round((duration('--dur-6') || 520) * (back ? 0.85 : 1));
  const s = back ? -1 : 1;
  const exit = token('--ease-exit') || 'ease-in';
  const enter = token('--ease-enter') || 'ease-out';
  room.animate(
    [
      { transform: 'rotate(0deg)', opacity: 1, easing: exit },
      { transform: `rotate(${-8 * s}deg)`, opacity: 0, offset: 0.5, easing: enter },
      { transform: `rotate(${8 * s}deg)`, opacity: 0, offset: 0.5 },
      { transform: 'rotate(0deg)', opacity: 1 },
    ],
    { duration: ms },
  );
  bg.animate(
    [
      { transform: 'translateY(0)', opacity: 1, easing: exit },
      { transform: `translateY(${-6 * s}%)`, opacity: 0.4, offset: 0.5, easing: enter },
      { transform: `translateY(${6 * s}%)`, opacity: 0.4, offset: 0.5 },
      { transform: 'translateY(0)', opacity: 1 },
    ],
    { duration: ms },
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { section, seed, loopCode, setSection } = useUrlState();
  const motion = useMotionPreference();
  const reducedMotion = motion === 'reduce';

  const [nodes, setNodes] = useState<readonly RingNode[]>(() => getNodes());
  const [tier, setTier] = useState<QualityTier>('high');
  const [visited, setVisited] = useState<readonly string[]>([]);
  const [collected, setCollected] = useState<readonly string[]>([]);
  const [caption, setCaption] = useState('');
  const [ringwayShown, setRingwayShown] = useState(false);
  /** the slug whose Next Arc has escalated; compared against `section` so a room change resets it */
  const [escalatedFor, setEscalatedFor] = useState<string | null>(null);
  const [navDir, setNavDir] = useState<NavDir>(null);
  const [lockIn, setLockIn] = useState<string | null>(null);
  const [, setStageVersion] = useState(0);

  // The one mutable runtime object. Held in state (not a ref) so it can be read
  // during render; it is created once and then only ever mutated in place by
  // the ring's frame driver.
  const [runtime] = useState<LoopRuntime>(() => ({
    frame: getFrame(),
    fired: [],
    nodes: getNodes(),
    geometry: computeGeometry(0, 0, false),
    ctx: null,
    bg: null,
  }));

  const captionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const say = useCallback((text: string, ms?: number) => {
    setCaption(text);
    if (captionTimer.current) clearTimeout(captionTimer.current);
    if (ms && ms > 0) {
      captionTimer.current = setTimeout(() => setCaption(''), ms);
    }
  }, []);

  /* ----------------------------------------------------------- refs */

  const sectionRef = useRef(section);
  const prevSectionRef = useRef(section);
  const heldRef = useRef<RingNode[] | null>(null);
  const deliberateRef = useRef(false);
  /** node-set changes the visitor did not make (a shared link, the Esc lift) */
  const suppressNodeVisit = useRef(false);
  /** rooms whose trick has landed this session (depth >= 0.5) */
  const landedRef = useRef(new Set<string>());
  const escalatedRef = useRef(false);
  const lastInputRef = useRef(0);
  const enteredAtRef = useRef(0);
  const ringwayShownRef = useRef(false);
  const heroStage = useRef(0);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const circuitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [circuit, setCircuit] = useState(false);

  useEffect(() => {
    sectionRef.current = section;
  });

  const showRingway = useCallback(() => {
    if (ringwayShownRef.current) return;
    ringwayShownRef.current = true;
    setRingwayShown(true);
  }, []);

  const onExplore = useCallback((event: ExploreEvent) => {
    if (event.name === 'section_viewed') {
      beacon('section_viewed', { section: String(event.section) });
      return;
    }
    if (event.name === 'depth_reached') {
      const depth = event.depth ?? 0;
      const stored = readState();
      if (depth > stored.maxDepth) writeState({ maxDepth: depth });
      if (depth >= 0.5) landedRef.current.add(String(event.section));
      if (depth >= 0.75) beacon('depth_reached', { section: String(event.section), depth });
    }
    // section_interacted / collectible_found / section_completed are aggregated
    // locally (progress, Ringway, hidden counter) and never hit the wire (§C.9).
  }, []);

  /* ----------------------------------------------------------- the visited rule (§C.5) */

  const countedVisit = useRef('');

  /** Mark the active room visited once per activation, with the lock-in. */
  const countVisit = useCallback(
    (slug: string) => {
      if (countedVisit.current === slug) return;
      if (!bySlug(slug)) return;
      countedVisit.current = slug;
      const before = readState().visited;
      markVisited(slug);
      const after = readState().visited;
      setVisited(after);
      onExplore({ name: 'section_viewed', section: slug as never });
      // The lock-in runs only for a notch that was genuinely dark until now.
      // ORIGIN is endowed (lit from the first frame), so it never locks in.
      if (!before.includes(slug) && slug !== 'origin') {
        if (lockTimer.current) clearTimeout(lockTimer.current);
        setLockIn(slug);
        lockTimer.current = setTimeout(() => setLockIn(null), LOCK_MS);
      }
      const lit = new Set(after);
      lit.add('origin');
      if (lit.size >= ROOMS.length && !before.includes(slug)) {
        if (circuitTimer.current) clearTimeout(circuitTimer.current);
        setCircuit(true);
        circuitTimer.current = setTimeout(() => setCircuit(false), CIRCUIT_MS);
      }
    },
    [onExplore],
  );

  /* ----------------------------------------------------------- boot */

  useEffect(() => {
    startClock();
    initBeacon();
    normalizeAnchorUrl();

    // Storage is never read during render (hydration mismatch). It is read here
    // and applied on a microtask, so the first paint is identical to the server's.
    const stored = readState();
    if (stored.reverse) setDirection(-1);
    if (stored.slow) setPeriod(16_000, 0);
    const startedElsewhere = sectionRef.current !== 'origin';
    queueMicrotask(() => {
      setVisited(stored.visited);
      setCollected(stored.collected);
      // A visitor who has been somewhere already, or who arrived at another
      // room by link, is not in the first thirty seconds of §B.
      if (startedElsewhere || stored.visited.length > 1) showRingway();
    });

    // §C.11: idle is measured from the last real input of any kind.
    lastInputRef.current = performance.now();
    const touch = () => {
      lastInputRef.current = performance.now();
    };
    const opts: AddEventListenerOptions = { passive: true, capture: true };
    document.addEventListener('pointerdown', touch, opts);
    document.addEventListener('pointermove', touch, opts);
    document.addEventListener('keydown', touch, opts);

    return () => {
      document.removeEventListener('pointerdown', touch, opts);
      document.removeEventListener('pointermove', touch, opts);
      document.removeEventListener('keydown', touch, opts);
      if (captionTimer.current) clearTimeout(captionTimer.current);
      if (lockTimer.current) clearTimeout(lockTimer.current);
      if (navTimer.current) clearTimeout(navTimer.current);
      if (circuitTimer.current) clearTimeout(circuitTimer.current);
    };
  }, [showRingway]);

  /** A shared link populates the ring before the room layer's first paint. */
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || !loopCode) return;
    restoredRef.current = true;
    const decoded = decodeLoop(loopCode);
    if (!decoded) return; // a bad link never shows an error (§C.7)
    suppressNodeVisit.current = true;
    restoreNodes(decoded.nodes);
    suppressNodeVisit.current = false;
    // The hero copy sequence narrates the VISITOR's own first taps. A loop that
    // arrived from a shared link is not theirs, so the sequence is skipped and
    // `someone left this here` is the caption that stands (§B, §C.7).
    heroStage.current = 2;
    if (decoded.reverse) setDirection(-1);
    if (decoded.slow) setPeriod(16_000, 0);
    // Deferred by a microtask: a setState in an effect body cascades a render.
    queueMicrotask(() => {
      showRingway();
      say('someone left this here', 3500);
    });
  }, [loopCode, say, showRingway]);

  useEffect(
    () =>
      subscribeNodes((n) => {
        setNodes(n);
        // §C.5 (b): placing, moving or removing a node counts as a visit.
        if (!suppressNodeVisit.current) countVisit(sectionRef.current);
      }),
    [countVisit],
  );

  /* ----------------------------------------------------------- the frame hooks */

  const activeSince = useRef(0);
  const activeRev = useRef(0);

  useEffect(() => {
    activeSince.current = getFrame().t;
    activeRev.current = getFrame().revolution;
    enteredAtRef.current = getFrame().t;
    countedVisit.current = '';
    escalatedRef.current = false;
  }, [section]);

  useEffect(() => {
    const unsub = subscribeFrame((f) => {
      if (f.tier !== tier) setTier(f.tier);

      // --- hero copy sequence (§B, §I.1)
      if (heroStage.current < 1 && runtime.fired.length > 0) {
        heroStage.current = 1;
        say('again');
      }
      const count = runtime.nodes.length;
      if (heroStage.current < 2 && count >= 3) {
        heroStage.current = 2;
        say("now it's yours");
      }
      if (!ringwayShownRef.current && (f.t >= RINGWAY_MS || count >= RINGWAY_NODES)) {
        showRingway();
        if (heroStage.current >= 1) say('there are twelve of these');
      }

      // --- the visited rule (§C.5 a)
      const slug = sectionRef.current;
      if (
        countedVisit.current !== slug &&
        f.t - activeSince.current >= VISIT_MS &&
        f.revolution > activeRev.current
      ) {
        countVisit(slug);
      }

      // --- the Next Arc escalation (§C.11): trick landed + 4 s idle. Never navigates.
      if (!escalatedRef.current) {
        const landed = landedRef.current.has(slug) || f.t - enteredAtRef.current >= TRICK_FALLBACK_MS;
        if (landed && performance.now() - lastInputRef.current >= IDLE_MS) {
          escalatedRef.current = true;
          setEscalatedFor(slug);
        }
      }
    });
    return unsub;
  }, [countVisit, runtime, say, showRingway, tier]);

  /* ----------------------------------------------------------- navigation */

  const go = useCallback(
    (slug: string, mode: 'push' | 'replace') => {
      if (!bySlug(slug)) return;
      if (slug === sectionRef.current) return;
      deliberateRef.current = mode === 'push';
      if (mode === 'push') showRingway();
      setSection(slug, mode);
    },
    [setSection, showRingway],
  );

  const step = useCallback(
    (delta: number) => {
      const i = roomIndex(sectionRef.current);
      const next = ROOMS[(((i < 0 ? 0 : i) + delta) % ROOMS.length + ROOMS.length) % ROOMS.length];
      if (next) go(next.id, 'push');
    },
    [go],
  );

  /**
   * On every room change: the corridor choreography and the Ion tint. On a
   * DELIBERATE change only: focus the new room's heading and announce it.
   * A passive change (replaceState) never moves focus (§C.11).
   */
  useEffect(() => {
    const mod = bySlug(section);
    if (!mod) return;
    const from = prevSectionRef.current;
    prevSectionRef.current = section;
    if (from !== section) {
      const dir = travelDir(from, section);
      corridorTransition(dir);
      if (navTimer.current) clearTimeout(navTimer.current);
      setNavDir(dir);
      navTimer.current = setTimeout(
        () => setNavDir(null),
        Math.round((duration('--dur-6') || 520) * (dir === 'back' ? 0.85 : 1)),
      );
    }
    if (deliberateRef.current) {
      deliberateRef.current = false;
      const heading = document.querySelector<HTMLElement>(
        `#section-${section} h2, [data-slug="${section}"] h2`,
      );
      heading?.focus({ preventScroll: true });
      say(mod.title, 2500);
    }
  }, [section, say]);

  /* ----------------------------------------------------------- keyboard (§C.12) */

  useEffect(() => {
    /**
     * §C.12 handles corridor keys only while focus is inside the stage, and
     * §C.11 moves focus to the new room's <h2> on a deliberate change. Taken
     * literally together, arrow-key walking would stop after one press. The
     * focus scope is therefore the stage PLUS the active room's heading — see
     * design/06-wp0-notes.md note 2. Nothing else on the page is affected, so
     * we still never steal a browser or screen-reader key elsewhere.
     */
    function inStage(target: EventTarget | null): boolean {
      if (!(target instanceof Element)) return false;
      if (target.closest('#stage')) return true;
      return /^H[1-6]$/.test(target.tagName) && !!target.closest('.room-shell[data-active="true"]');
    }

    function restoreHeld(): boolean {
      if (!heldRef.current) return false;
      suppressNodeVisit.current = true;
      restoreNodes(heldRef.current);
      suppressNodeVisit.current = false;
      heldRef.current = null;
      return true;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (!inStage(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        // Shift+← held is REVERSE's keyboard equivalent (§C.13) — not ours.
        if (e.shiftKey) return;
        e.preventDefault();
        if (e.repeat) return;
        step(e.key === 'ArrowRight' ? 1 : -1);
        return;
      }
      const digit = DIGIT_KEYS.indexOf(e.key);
      if (digit >= 0) {
        const room = ROOMS[digit];
        if (room) {
          e.preventDefault();
          go(room.id, 'push');
        }
        return;
      }
      if ((e.key === 's' || e.key === 'S') && !e.shiftKey) {
        // Shift+S is SLOW (§C.13) — not ours.
        e.preventDefault();
        if (isEnabled()) disableAudio();
        else void enableAudio();
        return;
      }
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        document.querySelector<HTMLButtonElement>('[data-control="keep"]')?.click();
        return;
      }
      if (e.key === 'Escape') {
        // Esc lifts every node into a held state — fully reversible (§J.9).
        if (restoreHeld()) {
          e.preventDefault();
          return;
        }
        suppressNodeVisit.current = true;
        const lifted = clearNodes();
        suppressNodeVisit.current = false;
        if (lifted.length > 0) {
          heldRef.current = lifted;
          e.preventDefault();
        }
        return;
      }
      if (e.key === ' ' || e.code === 'Space') {
        // Space places a node; if the ring is held, the first Space restores it.
        if (restoreHeld()) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }

    function onPointerDownCapture(e: PointerEvent) {
      if (!inStage(e.target)) return;
      if (heldRef.current) {
        restoreHeld();
        e.stopPropagation();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDownCapture, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDownCapture, true);
    };
  }, [go, step]);

  /* ----------------------------------------------------------- swipe (§C.11) */

  useEffect(() => {
    const stage = document.getElementById('stage');
    if (!stage) return;
    let startY = 0;
    let startT = 0;
    let id = -1;

    function nearNode(x: number, y: number): boolean {
      const g = runtime.geometry;
      for (const n of runtime.nodes) {
        const p = pointAt(n.a, n.r, g);
        if (Math.hypot(p.x - x, p.y - y) <= GRAB_PX) return true;
      }
      return false;
    }

    function down(e: PointerEvent) {
      if (e.pointerType !== 'touch') return;
      const rect = stage!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // A press on the band places a node and a press on a node grabs it (§C.3);
      // neither is the start of a swipe.
      if (isOnBand(x, y, runtime.geometry) || nearNode(x, y)) {
        id = -1;
        return;
      }
      id = e.pointerId;
      startY = e.clientY;
      startT = performance.now();
    }
    function up(e: PointerEvent) {
      if (id < 0 || e.pointerId !== id) return;
      id = -1;
      const dy = e.clientY - startY;
      const dt = Math.max(1, performance.now() - startT);
      if (Math.abs(dy) < SWIPE_PX || Math.abs(dy) / dt <= SWIPE_V) return;
      step(dy < 0 ? 1 : -1); // swipe up = forward
    }
    function cancel() {
      id = -1;
    }

    stage.addEventListener('pointerdown', down);
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', cancel);
    return () => {
      stage.removeEventListener('pointerdown', down);
      stage.removeEventListener('pointerup', up);
      stage.removeEventListener('pointercancel', cancel);
    };
  }, [runtime, step]);

  /* ----------------------------------------------------------- context */

  const onGeometry = useCallback(() => setStageVersion((v) => v + 1), []);
  const escalated = escalatedFor === section;

  const value = useMemo<LoopContextValue>(
    () => ({
      runtime,
      section,
      setSection: go,
      seed,
      reducedMotion,
      tier,
      visited,
      collected,
      say,
      onExplore,
      nodeCount: nodes.length,
      ringwayShown,
      escalated,
      navDir,
      lockIn,
    }),
    [
      runtime,
      section,
      go,
      seed,
      reducedMotion,
      tier,
      visited,
      collected,
      say,
      onExplore,
      nodes.length,
      ringwayShown,
      escalated,
      navDir,
      lockIn,
    ],
  );

  const active = bySlug(section) ?? ROOMS[0];

  // Tab order (§C.12): skip link → stage → sound → motion → keep → share →
  // Ringway → Next Arc. Everything after the stage is position:fixed, so DOM
  // order is free to be the tab order.
  return (
    <LoopContext.Provider value={value}>
      <HeroCaption />
      <HeroIsland />

      <RingStage heavy={active?.heavy === true} onGeometry={onGeometry} />
      <LiveRegion text={caption} />

      <p className="u-sr" id="loop-keys">
        space places a node · left and right change rooms · up and down change its radius ·
        escape empties the ring
      </p>

      {active ? <RoomLayer module={active} /> : null}

      <footer className="loop-footer">
        <SoundToggle />
        <MotionToggle />
        <KeepButton />
        <ShareButton />
      </footer>

      <Ringway complete={circuit} />
      <NextArc />
      <Corridor section={section}>{children}</Corridor>
    </LoopContext.Provider>
  );
}
