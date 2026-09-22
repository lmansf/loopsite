import { asSectionId, type SectionModule } from '@/lib/types';
import { Shell } from './Shell';
import Room from './Room';

/**
 * ORIGIN is the landing room and the only room whose code is in the landing
 * bundle (§D.1): the room component is imported statically, and `load`
 * resolves to it without a fetch, so the first paint of the room layer never
 * waits on the network.
 */
const origin: SectionModule = {
  id: asSectionId('origin'),
  title: 'origin',
  hook: 'tap the ring',
  blurb: 'tap the ring',
  next: asSectionId('pulse'),
  notch: 1,
  kind: 'core',
  Shell,
  load: () => Promise.resolve({ default: Room }),
  reservedHeight: '100dvh',
  budgetKb: 7,
};

export default origin;
