import { asSectionId, type SectionModule } from '@/lib/types';

const swarm: SectionModule = {
  id: asSectionId('swarm'),
  title: 'swarm',
  hook: 'they follow it',
  blurb: 'they follow it',
  next: asSectionId('mirror'),
  notch: 5,
  kind: 'expansion',
  load: () => import('./Room'),
  reservedHeight: '100dvh',
  budgetKb: 12,
};

export default swarm;
