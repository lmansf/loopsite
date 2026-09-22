import { asSectionId, type SectionModule } from '@/lib/types';

const returnRoom: SectionModule = {
  id: asSectionId('return'),
  title: 'return',
  hook: '',
  blurb: 'one ring, twelve rooms, no ending.',
  next: asSectionId('origin'),
  notch: 12,
  kind: 'core',
  load: () => import('./Room'),
  reservedHeight: '100dvh',
  budgetKb: 8,
};

export default returnRoom;
