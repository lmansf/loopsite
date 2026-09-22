import { asSectionId, type SectionModule } from '@/lib/types';
import { Shell } from './Shell';

const reverse: SectionModule = {
  id: asSectionId('reverse'),
  title: 'reverse',
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

export default reverse;
