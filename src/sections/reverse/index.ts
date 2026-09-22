import { asSectionId, type SectionModule } from '@/lib/types';

const reverse: SectionModule = {
  id: asSectionId('reverse'),
  title: 'reverse',
  hook: '',
  blurb: 'one ring, twelve rooms, no ending.',
  next: asSectionId('origin'),
  notch: null,
  kind: 'hidden',
  load: () => import('./Room'),
  reservedHeight: '100dvh',
  budgetKb: 2,
};

export default reverse;
