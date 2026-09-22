import { asSectionId, type SectionModule } from '@/lib/types';

const wear: SectionModule = {
  id: asSectionId('wear'),
  title: 'wear',
  hook: 'it\'s getting tired',
  blurb: 'it\'s getting tired',
  next: asSectionId('garden'),
  notch: 10,
  kind: 'expansion',
  load: () => import('./Room'),
  reservedHeight: '100dvh',
  budgetKb: 9,
};

export default wear;
