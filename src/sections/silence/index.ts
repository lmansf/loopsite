import { asSectionId, type SectionModule } from '@/lib/types';
import { Shell } from './Shell';

const silence: SectionModule = {
  id: asSectionId('silence'),
  title: 'silence',
  hook: '',
  blurb: 'one ring, twelve rooms, no ending.',
  next: asSectionId('origin'),
  notch: null,
  kind: 'hidden',
  Shell,
  load: () => import('./Room'),
  reservedHeight: '100dvh',
  budgetKb: 3,
};

export default silence;
