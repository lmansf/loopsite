import { asSectionId, type SectionModule } from '@/lib/types';

const trail: SectionModule = {
  id: asSectionId('trail'),
  title: 'trail',
  hook: 'it draws',
  blurb: 'it draws',
  next: asSectionId('swarm'),
  notch: 4,
  kind: 'core',
  load: () => import('./Room'),
  reservedHeight: '100dvh',
  budgetKb: 12,
  heavy: true,
};

export default trail;
