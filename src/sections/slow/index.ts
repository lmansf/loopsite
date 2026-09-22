import { asSectionId, type SectionModule } from '@/lib/types';
import { Shell } from './Shell';

const slow: SectionModule = {
  id: asSectionId('slow'),
  title: 'slow',
  hook: '',
  blurb: 'one ring, twelve rooms, no ending.',
  next: asSectionId('origin'),
  notch: null,
  kind: 'hidden',
  Shell,
  load: () => import('./Room'),
  reservedHeight: '100dvh',
  budgetKb: 2,
};

export default slow;
