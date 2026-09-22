import { asSectionId, type SectionModule } from '@/lib/types';
import { Shell } from './Shell';

const loom: SectionModule = {
  id: asSectionId('loom'),
  title: 'loom',
  hook: 'four thousand years',
  blurb: 'four thousand years',
  next: asSectionId('wear'),
  notch: 9,
  kind: 'expansion',
  Shell,
  load: () => import('./Room'),
  reservedHeight: '100dvh',
  budgetKb: 10,
};

export default loom;
