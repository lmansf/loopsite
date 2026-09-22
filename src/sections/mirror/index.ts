import { asSectionId, type SectionModule } from '@/lib/types';
import { Shell } from './Shell';

const mirror: SectionModule = {
  id: asSectionId('mirror'),
  title: 'mirror',
  hook: 'it sees itself',
  blurb: 'it sees itself',
  next: asSectionId('growth'),
  notch: 6,
  kind: 'expansion',
  Shell,
  load: () => import('./Room'),
  reservedHeight: '100dvh',
  budgetKb: 9,
  heavy: true,
};

export default mirror;
