import { asSectionId, type SectionModule } from '@/lib/types';

const room144: SectionModule = {
  id: asSectionId('144'),
  title: '144',
  hook: '',
  blurb: 'one ring, twelve rooms, no ending.',
  next: asSectionId('origin'),
  notch: null,
  kind: 'hidden',
  load: () => import('./Room'),
  reservedHeight: '100dvh',
  budgetKb: 4,
};

export default room144;
