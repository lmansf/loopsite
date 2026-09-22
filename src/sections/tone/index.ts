import { asSectionId, type SectionModule } from '@/lib/types';

const tone: SectionModule = {
  id: asSectionId('tone'),
  title: 'tone',
  hook: 'radius is pitch',
  blurb: 'radius is pitch',
  next: asSectionId('trail'),
  notch: 3,
  kind: 'core',
  load: () => import('./Room'),
  reservedHeight: '100dvh',
  budgetKb: 12,
};

export default tone;
