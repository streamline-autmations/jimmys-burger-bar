import { jimmys } from '../jimmys/config';
import { defineRestaurant } from '../../core/config/define';
import type { SectionSpec } from '../../brand/sections/types';

// Collection is the only thing this site sells, so every order button says so.
const sections = jimmys.sections.map((section) => {
  const content = (section as { content?: { primaryCta?: { label: string; to: string } } }).content;
  return content?.primaryCta?.to === '/order'
    ? ({ ...section, content: { ...content, primaryCta: { ...content.primaryCta, label: 'Order for collection' } } } as SectionSpec)
    : section;
});

export const config = defineRestaurant({
  ...jimmys,
  slug: 'jimmys-staging',
  ordering: {
    ...jimmys.ordering,
    payment: 'payfast',
    fulfilment: ['collection'],
    // leadMinutes is deliberately unset: Jimmy's has not said how long the kitchen
    // needs (PHASE0 decision 7), so the earliest slot is simply the next quarter hour.
  },
  sections,
});
