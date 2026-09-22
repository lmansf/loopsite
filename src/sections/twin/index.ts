import { asSectionId, type SectionModule } from '@/lib/types';

const twin: SectionModule = {
  id: asSectionId('twin'),
  title: 'twin',
  hook: '',
  blurb: 'one ring, twelve rooms, no ending.',
  next: asSectionId('origin'),
  notch: null,
  kind: 'hidden',
  load: () => import('./Room'),
  reservedHeight: '100dvh',
  budgetKb: 3,
};

export default twin;
