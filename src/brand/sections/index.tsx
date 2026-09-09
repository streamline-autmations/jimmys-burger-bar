import React from 'react';
import { Marquee } from '../../components/Marquee';
import { WaveDivider, CheckerDivider } from '../../components/SectionDivider';
import { HeroSection } from './HeroSection';
import { SpecialsSection } from './SpecialsSection';
import { FoodChoiceSection } from './FoodChoiceSection';
import { EventSection } from './EventSection';
import { DrinksBandSection } from './DrinksBandSection';
import { StorySection } from './StorySection';
import { ReviewsSection } from './ReviewsSection';
import { GallerySection } from './GallerySection';
import { ClosingSection } from './ClosingSection';
import type { SectionSpec } from './types';

/**
 * Renders one section from its spec.
 *
 * Adding a section type means writing a component and adding a case; a tenant
 * that wants a different look writes its own rather than bending a shared one
 * until it fits every restaurant.
 */
export const Section: React.FC<{ spec: SectionSpec }> = ({ spec }) => {
  switch (spec.type) {
    case 'hero': return <HeroSection content={spec.content} />;
    case 'marquee': return <Marquee />;
    case 'specials': return <SpecialsSection content={spec.content} />;
    case 'foodChoice': return <FoodChoiceSection content={spec.content} />;
    case 'event': return <EventSection content={spec.content} />;
    case 'drinksBand': return <DrinksBandSection content={spec.content} />;
    case 'story': return <StorySection content={spec.content} />;
    case 'reviews': return <ReviewsSection content={spec.content} />;
    case 'gallery': return <GallerySection content={spec.content} />;
    case 'closing': return <ClosingSection content={spec.content} />;
    case 'divider':
      return spec.content.variant === 'checker'
        ? <CheckerDivider fill={spec.content.fill} flip={spec.content.flip} />
        : <WaveDivider fill={spec.content.fill} />;
    default: {
      // Exhaustiveness guard: a new section type without a case fails to compile.
      const unhandled: never = spec;
      return unhandled;
    }
  }
};

export type { SectionSpec } from './types';
