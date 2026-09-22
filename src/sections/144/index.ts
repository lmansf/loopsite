import { asSectionId, type SectionModule } from '@/lib/types';
import { Shell } from './Shell';

const room144: SectionModule = {
  id: asSectionId('144'),
  title: '144',
  hook: '',
  blurb: 'one ring, twelve rooms, no ending.',
  next: asSectionId('origin'),
  notch: null,
  kind: 'hidden',
  Shell,
  load: () => import('./Room'),
  reservedHeight: '100dvh',
  budgetKb: 4,
};

export default room144;
