'use client';

/**
 * The sound control. Copy: `sound` off / `quiet` on (§I.4).
 *
 * Never a gate, never a modal, never blocks anything. The AudioContext is
 * constructed inside this click handler and nowhere else.
 * WP2 replaces this with the sound petal on the ring's outer edge.
 */

import { useEffect, useState } from 'react';
import { disableAudio, enableAudio, isEnabled, subscribeAudio } from '@/lib/audio';
import { writeState } from '@/lib/storage';
import { Toggle } from '../ui/Toggle';

export function SoundToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => subscribeAudio(setOn), []);

  async function toggle() {
    if (isEnabled()) {
      disableAudio();
      writeState({ sound: false });
      return;
    }
    const ok = await enableAudio();
    writeState({ sound: ok });
  }

  return (
    <Toggle pressed={on} onClick={() => void toggle()} data-control="sound">
      {on ? 'quiet' : 'sound'}
    </Toggle>
  );
}
