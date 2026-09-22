import { asSectionId, type SectionModule } from '@/lib/types';
import { Shell } from './Shell';

const garden: SectionModule = {
  id: asSectionId('garden'),
  title: 'garden',
  hook: 'loops left here',
  blurb: 'loops left here',
  next: asSectionId('return'),
  notch: 11,
  kind: 'expansion',
  Shell,
  load: () => import('./Room'),
  reservedHeight: '100dvh',
  budgetKb: 13,
};

export default garden;
