import { asSectionId, type SectionModule } from '@/lib/types';

const slow: SectionModule = {
  id: asSectionId('slow'),
  title: 'slow',
  hook: '',
  blurb: 'one ring, twelve rooms, no ending.',
  next: asSectionId('origin'),
  notch: null,
  kind: 'hidden',
  load: () => import('./Room'),
  reservedHeight: '100dvh',
  budgetKb: 2,
};

export default slow;
