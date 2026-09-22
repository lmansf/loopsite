import { asSectionId, type SectionModule } from '@/lib/types';
import { Shell } from './Shell';

const orbit: SectionModule = {
  id: asSectionId('orbit'),
  title: 'orbit',
  hook: 'circles on circles',
  blurb: 'circles on circles',
  next: asSectionId('loom'),
  notch: 8,
  kind: 'expansion',
  Shell,
  load: () => import('./Room'),
  reservedHeight: '100dvh',
  budgetKb: 11,
};

export default orbit;
