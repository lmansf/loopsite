'use client';

/**
 * src/components/shell/AppShell.tsx — the one client orchestrator.
 *
 * Spec: design/05-build-spec.md §C.4, §C.5, §C.10, §C.11, §C.12, §F.6.
 *
 * It starts the single clock, initialises the beacon, resolves motion
 * preference once for the whole tree, owns the URL, owns the caption slot and
 * the corridor keyboard/swipe navigation, and provides `LoopContext`.
 *
 * WP3 owns the Ringway / Corridor / NextArc components this renders; this file
 * belongs to WP0 and should only change if the contract in §F.6 changes.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getFrame, setDirection, setPeriod, startClock } from '@/lib/clock';
import { beacon, initBeacon } from '@/lib/beacon';
import { computeGeometry } from '@/lib/ring-geometry';
import { decodeLoop } from '@/lib/share';
import { getNodes, restoreNodes, clearNodes, subscribeNodes } from '@/lib/ring-store';
import { markVisited, readState, writeState } from '@/lib/storage';
import { useMotionPreference } from '@/lib/use-motion-preference';
import { normalizeAnchorUrl, useUrlState } from '@/lib/url-state';
import { subscribeFrame } from '@/lib/clock';
import { disableAudio, enableAudio, isEnabled } from '@/lib/audio';
import type { ExploreEvent, QualityTier, RingNode } from '@/lib/types';
import { ROOMS, bySlug } from '@/sections/registry';
import { HeroCaption } from '../hero/HeroCaption';
import { HeroIsland } from '../hero/HeroIsland';
import { RingStage } from '../ring/RingStage';
import { RoomLayer } from '../ring/RoomLayer';
import { Corridor } from './Corridor';
import { LiveRegion } from './LiveRegion';
import { LoopContext, type LoopContextValue, type LoopRuntime } from './LoopContext';
import { MotionToggle } from './MotionToggle';
import { NextArc } from './NextArc';
import { Ringway } from './Ringway';
import { SoundToggle } from './SoundToggle';
import { KeepButton } from '../ui/KeepButton';
import { ShareButton } from '../ui/ShareButton';

/** §C.5: a room counts as visited after 3 s active AND one full revolution. */
const VISIT_MS = 3000;
/** §B: the Ringway fades in at t >= 30 s or the 5th node, whichever is first. */
const RINGWAY_MS = 30_000;

const DIGIT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];

export function AppShell({ children }: { children: ReactNode }) {
  const { section, seed, loopCode, setSection } = useUrlState();
  const motion = useMotionPreference();
  const reducedMotion = motion === 'reduce';

  const [nodes, setNodes] = useState<readonly RingNode[]>(() => getNodes());
  const [tier, setTier] = useState<QualityTier>('high');
  const [visited, setVisited] = useState<readonly string[]>([]);
  const [collected, setCollected] = useState<readonly string[]>([]);
  const [caption, setCaption] = useState('');
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

  const onExplore = useCallback((event: ExploreEvent) => {
    if (event.name === 'section_viewed') {
      beacon('section_viewed', { section: String(event.section) });
      return;
    }
    if (event.name === 'depth_reached') {
      const depth = event.depth ?? 0;
      const stored = readState();
      if (depth > stored.maxDepth) writeState({ maxDepth: depth });
      if (depth >= 0.75) beacon('depth_reached', { section: String(event.section), depth });
    }
    // section_interacted / collectible_found / section_completed are aggregated
    // locally (progress, Ringway, hidden counter) and never hit the wire (§C.9).
  }, []);

  /* ----------------------------------------------------------- boot */

  const sectionRef = useRef(section);
  const heldRef = useRef<RingNode[] | null>(null);
  const deliberateRef = useRef(false);
  useEffect(() => {
    sectionRef.current = section;
  });

  useEffect(() => {
    startClock();
    initBeacon();
    normalizeAnchorUrl();

    // Storage is never read during render (hydration mismatch). It is read here
    // and applied on a microtask, so the first paint is identical to the server's.
    const stored = readState();
    if (stored.reverse) setDirection(-1);
    if (stored.slow) setPeriod(16_000, 0);
    queueMicrotask(() => {
      setVisited(stored.visited);
      setCollected(stored.collected);
    });

    return () => {
      if (captionTimer.current) clearTimeout(captionTimer.current);
    };
  }, []);

  const heroStage = useRef(0);
  const ringwayShown = useRef(false);

  /** A shared link populates the ring before the room layer's first paint. */
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || !loopCode) return;
    restoredRef.current = true;
    const decoded = decodeLoop(loopCode);
    if (!decoded) return; // a bad link never shows an error (§C.7)
    restoreNodes(decoded.nodes);
    // The hero copy sequence narrates the VISITOR's own first taps. A loop that
    // arrived from a shared link is not theirs, so the sequence is skipped and
    // `someone left this here` is the caption that stands (§B, §C.7).
    heroStage.current = 2;
    ringwayShown.current = true;
    if (decoded.reverse) setDirection(-1);
    if (decoded.slow) setPeriod(16_000, 0);
    // Deferred by a microtask: a setState in an effect body cascades a render.
    queueMicrotask(() => say('someone left this here', 3500));
  }, [loopCode, say]);

  useEffect(() => subscribeNodes((n) => setNodes(n)), []);

  /* ----------------------------------------------------------- the frame hooks */

  const activeSince = useRef(0);
  const activeRev = useRef(0);
  const countedVisit = useRef('');

  useEffect(() => {
    activeSince.current = getFrame().t;
    activeRev.current = getFrame().revolution;
    countedVisit.current = '';
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
      if (!ringwayShown.current && (f.t >= RINGWAY_MS || count >= 5)) {
        ringwayShown.current = true;
        if (heroStage.current >= 1) say('there are twelve of these');
      }

      // --- the visited rule (§C.5)
      const slug = sectionRef.current;
      if (
        countedVisit.current !== slug &&
        f.t - activeSince.current >= VISIT_MS &&
        f.revolution > activeRev.current
      ) {
        countedVisit.current = slug;
        markVisited(slug);
        setVisited(readState().visited);
        onExplore({ name: 'section_viewed', section: slug as never });
      }
    });
    return unsub;
  }, [onExplore, runtime, say, tier]);

  /* ----------------------------------------------------------- navigation */

  const go = useCallback(
    (slug: string, mode: 'push' | 'replace') => {
      if (!bySlug(slug)) return;
      deliberateRef.current = mode === 'push';
      setSection(slug, mode);
    },
    [setSection],
  );

  const step = useCallback(
    (delta: number) => {
      const i = ROOMS.findIndex((r) => r.id === sectionRef.current);
      const next = ROOMS[(((i < 0 ? 0 : i) + delta) % ROOMS.length + ROOMS.length) % ROOMS.length];
      if (next) go(next.id, 'push');
    },
    [go],
  );

  /** Focus the new room's heading on a deliberate change, and announce it. */
  useEffect(() => {
    const mod = bySlug(section);
    if (!mod) return;
    if (deliberateRef.current) {
      deliberateRef.current = false;
      const heading = document.querySelector<HTMLElement>(
        `#section-${section} h2, [data-slug="${section}"] h2`,
      );
      heading?.focus();
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
      restoreNodes(heldRef.current);
      heldRef.current = null;
      return true;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (!inStage(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
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
      if (e.key === 's' || e.key === 'S') {
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
        const lifted = clearNodes();
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
        restoreNodes(heldRef.current);
        heldRef.current = null;
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

    function down(e: PointerEvent) {
      if (e.pointerType !== 'touch') return;
      id = e.pointerId;
      startY = e.clientY;
      startT = performance.now();
    }
    function up(e: PointerEvent) {
      if (e.pointerId !== id) return;
      id = -1;
      const dy = e.clientY - startY;
      const dt = Math.max(1, performance.now() - startT);
      if (Math.abs(dy) < 64 || Math.abs(dy) / dt <= 0.3) return;
      step(dy < 0 ? 1 : -1); // swipe up = forward
    }

    stage.addEventListener('pointerdown', down);
    stage.addEventListener('pointerup', up);
    return () => {
      stage.removeEventListener('pointerdown', down);
      stage.removeEventListener('pointerup', up);
    };
  }, [step]);

  /* ----------------------------------------------------------- context */

  const onGeometry = useCallback(() => setStageVersion((v) => v + 1), []);

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
    }),
    [runtime, section, go, seed, reducedMotion, tier, visited, collected, say, onExplore, nodes.length],
  );

  const active = bySlug(section) ?? ROOMS[0];

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

      <Ringway />
      <NextArc />
      <Corridor section={section}>{children}</Corridor>

      <footer className="loop-footer">
        <SoundToggle />
        <MotionToggle />
        <KeepButton />
        <ShareButton />
      </footer>
    </LoopContext.Provider>
  );
}
