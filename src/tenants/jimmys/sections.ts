import type { SectionSpec } from '../../brand/sections/types';

/**
 * Jimmy's home page, in order.
 *
 * Everything here is Jimmy's own voice and Jimmy's own photographs. Another
 * restaurant supplies its own list: drop the `event` section if there is no
 * monthly car meet, reorder freely, or register a new section type for a
 * different look.
 */
export const jimmysSections: SectionSpec[] = [
  {
    type: 'hero',
    content: {
      locationLabel: 'Meyerton, SA',
      eyebrow: "The Jimmy's smash",
      headline: 'Proper food.',
      headlineAccent: 'Done right.',
      primaryCta: { label: 'Order Online', to: '/order' },
      secondaryCta: { label: 'View the Menu', to: '/menu' },
    },
  },
  { type: 'marquee' },
  {
    type: 'specials',
    content: {
      script: 'every week, one big one',
      heading: 'Friday specials',
      intro: "Straight from Jimmy's own poster wall. One rotates in every Friday, while stocks last.",
      allLabel: 'All specials',
      allTo: '/specials',
      cardEyebrow: 'Friday special',
    },
  },
  // The paper poster wall gives way to the dark food feature.
  { type: 'divider', content: { variant: 'wave', fill: 'rgb(var(--color-ink))' } },
  {
    type: 'foodChoice',
    content: {
      eyebrow: 'Pick your hunger',
      heading: 'Pick your kind of proper',
      intro: "Beef or chicken, stacked high and finished Jimmy's way. One choice, no wrong answer.",
      badges: ['180g smash patties', 'Crisp off the grill', "Jimmy's sauce"],
      panels: [
        { eyebrow: 'The classic', title: 'Beef Burgers', image: '/images/campaign/beef-burger-hand.webp', alt: "Beef burger held up at Jimmy's", to: '/menu' },
        { eyebrow: 'The other favourite', title: 'Chicken Burgers', image: '/images/campaign/chicken-burger-hand.webp', alt: "Chicken burger held up at Jimmy's", to: '/menu' },
      ],
    },
  },
  {
    type: 'event',
    content: {
      script: 'start your engines',
      imageAlt: "Coffee and Cars morning at Jimmy's",
      sticker: { label: 'breakfast', value: 'R95' },
      images: [
        { src: '/images/campaign/coffee-cars.webp', label: 'Coffee and Cars morning' },
        { src: '/images/campaign/cars-1.webp', label: 'Coffee and Cars line-up' },
        { src: '/images/campaign/coffee-cars-alt.webp', label: 'Breakfast at Coffee and Cars' },
        { src: '/images/campaign/coffee-1.webp', label: 'Coffee, cars and a Sunday morning' },
      ],
    },
  },
  {
    type: 'drinksBand',
    content: {
      heading: 'Cold ones,',
      headingAccent: 'sorted.',
      body: "Local lagers at R28, Savannas by the bucket, and a house cocktail called the Frikkie van Zyl. Ask the bar, they'll explain.",
      cta: { label: 'The bar list', to: '/menu?tab=drinks' },
    },
  },
  // Checkered-flag edge into Story: the existing Coffee & Cars racing motif
  // bent into a section break rather than the flat .checker strip.
  { type: 'divider', content: { variant: 'checker', fill: 'rgb(var(--color-paper))', behind: 'rgb(var(--color-ink))' } },
  {
    type: 'story',
    content: {
      eyebrow: 'More than a quick stop',
      heading: 'The food brings you in. The place keeps you here.',
      paragraphs: [
        "Jimmy's is where the table turns into another round, the bar gets louder and the regulars already know your order.",
        'Come through for proper food, live music, Coffee & Cars and a night that does not need a reason.',
      ],
      image: '/images/jimmys-logo-2.png',
      imageAlt: "Jimmy's Burger Bar burgers and logo",
      ratingLabel: 'Google rating',
      reviewsLabel: 'local reviews',
      thirdStat: { value: '180g', label: 'smash patties' },
    },
  },
  { type: 'divider', content: { variant: 'wave', fill: 'rgb(var(--color-surface))' } },
  {
    type: 'reviews',
    content: {
      script: 'pinned by the people who know us',
      heading: 'Take it from the regulars',
      footnote: "Real words from Jimmy's Google listing. Tap any Google label to read more.",
      reviewerLabel: 'Local regular',
      sourceLabel: 'Posted on Google',
    },
  },
  { type: 'divider', content: { variant: 'wave', fill: 'rgb(var(--color-ink))' } },
  {
    type: 'gallery',
    content: {
      script: 'the food, the crowd, the place',
      heading: 'See it for yourself',
      linkLabel: 'Full gallery',
      linkTo: '/visit#gallery',
      ctaLabel: 'See the full gallery',
      images: [
        { src: '/images/gallery/burger-macro.jpg', tall: true },
        { src: '/images/gallery/heritage-day-team.jpg', tall: false },
        { src: '/images/gallery/quesadilla-corona.jpg', tall: true },
        { src: '/images/gallery/fireplace-corner.jpg', tall: false },
        { src: '/images/gallery/greek-meze.jpg', tall: true },
        { src: '/images/gallery/corona-sunset.jpg', tall: false },
      ],
    },
  },
  { type: 'divider', content: { variant: 'checker', fill: 'rgb(var(--color-accent))', behind: 'rgb(var(--color-ink))', flip: true } },
  {
    type: 'closing',
    content: {
      script: 'the table, the sunset, one more round',
      heading: 'Your table’s waiting.',
      body: "Come for the food, stay for the people. Jimmy's is right here on Loch Street when you're ready.",
      primaryCta: { label: 'Order online', to: '/order' },
      secondaryCta: { label: 'View the menu', to: '/menu' },
      directionsLabel: 'Get directions to 57 Loch Street',
      image: '/images/gallery/corona-sunset.jpg',
      imageAlt: "Cold drinks and a Friday sunset at Jimmy's Burger Bar",
      card: {
        hoursLabel: 'Open Monday to Saturday',
        address: '57 Loch Street, Meyerton',
        note: 'Kitchen, bar and a table with your name on it.',
      },
    },
  },
];
