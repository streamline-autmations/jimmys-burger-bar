import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { config } from '../../config';
import { RevealHeading } from '../../components/RevealHeading';
import { fadeInUp } from '../../lib/motion';
import type { StoryContent } from './types';

export const StorySection: React.FC<{ content: StoryContent }> = ({ content }) => {
  const { venue } = config;
  return (
    <section className="py-20 md:py-28 bg-paper overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <motion.div {...fadeInUp} className="relative min-h-[420px] md:min-h-[620px] order-2 lg:order-1 rounded-2xl overflow-hidden jimmy-media-frame">
          <img src={content.image} alt={content.imageAlt} loading="lazy" className="absolute inset-0 w-full h-full object-contain bg-primary p-4 md:p-8" />
        </motion.div>
        <motion.div {...fadeInUp} className="order-1 lg:order-2">
          <span className="text-xs font-bold tracking-[0.16em] uppercase text-primary">{content.eyebrow}</span>
          <RevealHeading text={content.heading} className="font-display text-4xl md:text-5xl font-extrabold text-ink leading-[0.96] mt-4 mb-6" />
          <div className="space-y-4 text-ink/70 leading-relaxed max-w-md">
            {content.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
          <div className="grid grid-cols-3 gap-5 mt-10 pt-7 border-t border-ink/15 max-w-md">
            <a href={venue.googleReviews} target="_blank" rel="noopener noreferrer" className="group rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <p className="font-display text-3xl font-extrabold text-primary inline-flex items-center gap-1 group-hover:text-accent transition-colors">{venue.rating}<Star size={22} fill="currentColor" strokeWidth={0} /></p>
              <p className="text-sm text-ink/55 mt-1">{content.ratingLabel}</p>
            </a>
            <a href={venue.googleReviews} target="_blank" rel="noopener noreferrer" className="group rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <p className="font-display text-3xl font-extrabold text-primary group-hover:text-accent transition-colors">{venue.reviewCount}+</p>
              <p className="text-sm text-ink/55 mt-1">{content.reviewsLabel}</p>
            </a>
            <div>
              <p className="font-display text-3xl font-extrabold text-primary">{content.thirdStat.value}</p>
              <p className="text-sm text-ink/55 mt-1">{content.thirdStat.label}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
