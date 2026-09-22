import { asSectionId, type SectionModule } from '@/lib/types';

const mirror: SectionModule = {
  id: asSectionId('mirror'),
  title: 'mirror',
  hook: 'it sees itself',
  blurb: 'it sees itself',
  next: asSectionId('growth'),
  notch: 6,
  kind: 'expansion',
  load: () => import('./Room'),
  reservedHeight: '100dvh',
  budgetKb: 9,
  heavy: true,
};

export default mirror;
