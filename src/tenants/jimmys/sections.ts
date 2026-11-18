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
      headline: 'Proper food.',
      headlineAccent: 'Done right.',
      primaryCta: { label: 'Order online', to: '/order' },
      secondaryCta: { label: 'View the menu', to: '/menu' },
      ticket: { label: 'Fresh off the flat-top', value: "180g smash · Jimmy's sauce" },
      imageAlt: "Jimmy's smash burger",
    },
  },
  { type: 'marquee' },
  {
    type: 'specials',
    content: {
      script: 'every week, one big one',
      heading: 'Friday specials',
      intro: "Straight from Jimmy's own poster wall. One rotates in every Friday, while stocks last.",
      cardEyebrow: 'Friday special',
    },
  },
  // The paper poster wall gives way to the dark food feature.
  { type: 'divider', content: { variant: 'wave', fill: 'rgb(var(--color-ink))' } },
  {
    type: 'foodChoice',
    content: {
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
      heading: 'The food brings you in. The place keeps you here.',
      paragraphs: [
        "Jimmy's is where the table turns into another round, the bar gets louder and the regulars already know your order.",
        'Come through for proper food, live music, Coffee & Cars and a night that does not need a reason.',
      ],
      image: '/images/gallery/fireplace-corner.jpg',
      imageAlt: 'The fireplace corner inside Jimmy\'s, the corner regulars know',
      ratingLabel: 'Google rating',
      reviewsLabel: 'local reviews',
      thirdStat: { value: '180g', label: 'smash patties' },
    },
  },
  // No divider into Reviews: paper to white is too close to show a wave, and
  // the invisible shape only added a band of empty space.
  {
    type: 'reviews',
    content: {
      heading: 'Take it from the regulars',
      footnote: "Real words from Jimmy's Google listing. Tap any Google label to read more.",
      sourceLabel: 'Posted on Google',
    },
  },
  { type: 'divider', content: { variant: 'wave', fill: 'rgb(var(--color-ink))' } },
  {
    type: 'gallery',
    content: {
      heading: 'See it for yourself',
      linkLabel: 'Full gallery',
      linkTo: '/visit#gallery',
      ctaLabel: 'See the full gallery',
      images: [
        // The fireplace corner is the Story photo and the sunset closes the
        // page, so neither repeats here.
        { src: '/images/gallery/burger-macro.jpg', alt: "Close-up of Jimmy's beef burger with a cup of chips", tall: true },
        { src: '/images/gallery/heritage-day-team.jpg', alt: "The Jimmy's crew in traditional dress outside the restaurant", tall: false },
        { src: '/images/gallery/quesadilla-corona.jpg', alt: 'A quesadilla with chips and a Corona', tall: true },
        { src: '/images/gallery/burger-duo.jpg', alt: 'Two burgers with chips and a salad for the table', tall: false },
        { src: '/images/gallery/greek-meze.jpg', alt: 'A meze platter with pita, olives and dips for sharing', tall: true },
        { src: '/images/gallery/breakfast-plate.jpg', alt: "Jimmy's Breakfast: eggs, bacon, toast, grilled tomato and chips", tall: false },
      ],
    },
  },
  { type: 'divider', content: { variant: 'checker', fill: 'rgb(var(--color-accent))', behind: 'rgb(var(--color-ink))', flip: true } },
  {
    type: 'closing',
    content: {
      script: 'the table, the sunset, one more round',
      heading: 'Your burger’s waiting.',
      body: "Come for the food, stay for the people. Jimmy's is right here on Loch Street when you're ready.",
      primaryCta: { label: 'Order online', to: '/order' },
      secondaryCta: { label: 'View the menu', to: '/menu' },
      directionsLabel: 'Get directions to 57 Loch Street',
      image: '/images/gallery/corona-sunset.jpg',
      imageAlt: "Cold drinks and a Friday sunset at Jimmy's Burger Bar",
      card: {
        address: '57 Loch Street, Meyerton',
        note: 'Order ahead, or pull up a chair and eat in.',
      },
    },
  },
];
