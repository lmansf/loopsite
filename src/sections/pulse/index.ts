import { asSectionId, type SectionModule } from '@/lib/types';
import { Shell } from './Shell';

const pulse: SectionModule = {
  id: asSectionId('pulse'),
  title: 'pulse',
  hook: 'it has a pulse',
  blurb: 'it has a pulse',
  next: asSectionId('tone'),
  notch: 2,
  kind: 'core',
  Shell,
  load: () => import('./Room'),
  reservedHeight: '100dvh',
  budgetKb: 10,
};

export default pulse;
