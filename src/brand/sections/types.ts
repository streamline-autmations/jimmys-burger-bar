/**
 * Page composition for Restaurant Direct.
 *
 * A home page is an ordered list of sections a tenant chooses, not a fixed
 * sequence baked into a component. Jimmy's has a monthly car meet; the next
 * restaurant will not, and should be able to drop that section rather than
 * delete JSX from a forked page.
 *
 * Deliberately NOT a fixed menu of nine blocks. Each section is a real
 * component with its own design, and a tenant that wants a different look
 * writes a new one and registers it. Reducing every restaurant to the same
 * blocks would flatten exactly the thing being sold.
 */

export interface SectionCta {
  label: string;
  to: string;
}

export interface HeroContent {
  locationLabel: string;
  eyebrow: string;
  headline: string;
  headlineAccent: string;
  primaryCta: SectionCta;
  secondaryCta: SectionCta;
  /** The small ticket beside the assembled burger. */
  ticket: { label: string; value: string };
  /** Alt text for the burger image. */
  imageAlt: string;
}

export interface SpecialsContent {
  script: string;
  heading: string;
  intro: string;
  allLabel: string;
  allTo: string;
  cardEyebrow: string;
}

export interface FoodChoiceContent {
  eyebrow: string;
  heading: string;
  intro: string;
  badges: string[];
  panels: { eyebrow: string; title: string; image: string; alt: string; to: string }[];
}

export interface EventContent {
  script: string;
  images: { src: string; label: string }[];
  imageAlt: string;
  sticker?: { label: string; value: string };
}

export interface DrinksBandContent {
  heading: string;
  headingAccent: string;
  body: string;
  cta: SectionCta;
}

export interface StoryContent {
  eyebrow: string;
  heading: string;
  paragraphs: string[];
  image: string;
  imageAlt: string;
  /** The third stat is free text; the first two link to the review listing. */
  thirdStat: { value: string; label: string };
  ratingLabel: string;
  reviewsLabel: string;
}

export interface ReviewsContent {
  script: string;
  heading: string;
  footnote: string;
  reviewerLabel: string;
  sourceLabel: string;
}

export interface GalleryContent {
  script: string;
  heading: string;
  linkLabel: string;
  linkTo: string;
  ctaLabel: string;
  images: { src: string; tall: boolean }[];
}

export interface ClosingContent {
  script: string;
  heading: string;
  body: string;
  primaryCta: SectionCta;
  secondaryCta: SectionCta;
  directionsLabel: string;
  image: string;
  imageAlt: string;
  card: { hoursLabel: string; address: string; note: string };
}

export interface DividerContent {
  variant: 'wave' | 'checker';
  /** CSS colour of the section BELOW - the shape is that section's top edge. */
  fill: string;
  /** Checker only: CSS colour of the section ABOVE, seen through the empty squares. Defaults to transparent. */
  behind?: string;
  flip?: boolean;
}

export type SectionSpec =
  | { type: 'hero'; content: HeroContent }
  | { type: 'marquee' }
  | { type: 'specials'; content: SpecialsContent }
  | { type: 'foodChoice'; content: FoodChoiceContent }
  | { type: 'event'; content: EventContent }
  | { type: 'drinksBand'; content: DrinksBandContent }
  | { type: 'story'; content: StoryContent }
  | { type: 'reviews'; content: ReviewsContent }
  | { type: 'gallery'; content: GalleryContent }
  | { type: 'closing'; content: ClosingContent }
  | { type: 'divider'; content: DividerContent };
