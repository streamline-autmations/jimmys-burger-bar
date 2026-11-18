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
    fulfilment: ['collection', 'delivery'],
    // A showcase of how paid delivery would work, for the owner meeting. The zone,
    // fees, hours and rider are EXAMPLES: no rider or courier has been agreed and
    // the fees are the plan's targets, not quotes. Never copy this to jimmys.
    deliveryPreview: {
      feeNote: 'Example delivery fee for this preview, to be agreed',
      bands: [
        { label: 'Nearby', fee: 39, suburbs: ['Meyerton central', 'Meyerton Park', 'Riversdale', 'Kookrus'] },
        { label: 'Further out', fee: 49, suburbs: ['Rothdene', 'Henley on Klip', 'Daleside'] },
      ],
      hours: { from: '11:00', until: '19:30' },
      dispatcher: { name: 'Example rider (test number)', whatsapp: '+27 00 000 0042' },
    },
    // leadMinutes is deliberately unset: Jimmy's has not said how long the kitchen
    // needs (PHASE0 decision 7), so the earliest slot is simply the next quarter hour.
  },
  sections,
});
