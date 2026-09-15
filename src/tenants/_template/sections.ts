import type { SectionSpec } from '../../brand/sections/types';

/**
 * The new restaurant's home page, top to bottom.
 *
 * These are Jimmy's section designs with placeholder words. They are a starting
 * point, not the finished look: each client gets its own art direction, which
 * usually means adapting or writing section components in src/brand/sections.
 *
 * The 'hero' section is Jimmy's burger build. It needs five burger layer images
 * in public/images/burger-layers (check-tenant lists them). A restaurant without
 * that artwork needs a different hero section.
 */
export const templateSections: SectionSpec[] = [
  {
    type: 'hero',
    content: {
      locationLabel: 'PLACEHOLDER town',
      eyebrow: 'PLACEHOLDER eyebrow',
      headline: 'PLACEHOLDER headline.',
      headlineAccent: 'PLACEHOLDER accent.',
      primaryCta: { label: 'Order Online', to: '/order' },
      secondaryCta: { label: 'View the Menu', to: '/menu' },
      ticket: { label: 'PLACEHOLDER label', value: 'PLACEHOLDER fact' },
      imageAlt: 'PLACEHOLDER: describe the hero image',
    },
  },
  { type: 'marquee' },
  { type: 'divider', content: { variant: 'wave', fill: 'rgb(var(--color-paper))' } },
  {
    type: 'story',
    content: {
      eyebrow: 'PLACEHOLDER eyebrow',
      heading: 'PLACEHOLDER: the restaurant in one line.',
      paragraphs: ['PLACEHOLDER: a paragraph in the owner\'s own words.'],
      image: '/images/story.jpg',
      imageAlt: 'PLACEHOLDER: describe the real photo',
      ratingLabel: 'Google rating',
      reviewsLabel: 'reviews',
      thirdStat: { value: 'PLACEHOLDER', label: 'PLACEHOLDER real fact' },
    },
  },
  { type: 'divider', content: { variant: 'wave', fill: 'rgb(var(--color-surface))' } },
  {
    type: 'reviews',
    content: {
      script: 'from the people who know us',
      heading: 'Take it from the regulars',
      footnote: 'Real words from the Google listing.',
      reviewerLabel: 'Local regular',
      sourceLabel: 'Posted on Google',
    },
  },
  {
    type: 'closing',
    content: {
      script: 'PLACEHOLDER script line',
      heading: 'Your table’s waiting.',
      body: 'PLACEHOLDER: an invitation in the restaurant\'s voice.',
      primaryCta: { label: 'Order online', to: '/order' },
      secondaryCta: { label: 'View the menu', to: '/menu' },
      directionsLabel: 'Get directions',
      image: '/images/closing.jpg',
      imageAlt: 'PLACEHOLDER: describe the real photo',
      card: {
        hoursLabel: 'PLACEHOLDER: open days',
        address: 'PLACEHOLDER street, town',
        note: 'PLACEHOLDER short note',
      },
    },
  },
];
