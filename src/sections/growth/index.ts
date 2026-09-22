import { asSectionId, type SectionModule } from '@/lib/types';
import { Shell } from './Shell';

const growth: SectionModule = {
  id: asSectionId('growth'),
  title: 'growth',
  hook: 'one more generation',
  blurb: 'one more generation',
  next: asSectionId('orbit'),
  notch: 7,
  kind: 'expansion',
  Shell,
  load: () => import('./Room'),
  reservedHeight: '100dvh',
  budgetKb: 11,
};

export default growth;
