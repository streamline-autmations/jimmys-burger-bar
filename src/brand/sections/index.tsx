import React from 'react';
import { MotionConfig } from 'framer-motion';
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
    // The hero's entrance and burger build are the load-in, played for every
    // visitor (see App.tsx). Its parallax and cursor effects check the visitor's
    // own setting inside the component.
    case 'hero': return <MotionConfig reducedMotion="never"><HeroSection content={spec.content} /></MotionConfig>;
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
        ? <CheckerDivider fill={spec.content.fill} behind={spec.content.behind} flip={spec.content.flip} />
        : <WaveDivider fill={spec.content.fill} />;
    default: {
      // Exhaustiveness guard: a new section type without a case fails to compile.
      const unhandled: never = spec;
      return unhandled;
    }
  }
};

export type { SectionSpec } from './types';
