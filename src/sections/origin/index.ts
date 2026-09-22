import { asSectionId, type SectionModule } from '@/lib/types';

const origin: SectionModule = {
  id: asSectionId('origin'),
  title: 'origin',
  hook: 'tap the ring',
  blurb: 'tap the ring',
  next: asSectionId('pulse'),
  notch: 1,
  kind: 'core',
  load: () => import('./Room'),
  reservedHeight: '100dvh',
  budgetKb: 7,
};

export default origin;
