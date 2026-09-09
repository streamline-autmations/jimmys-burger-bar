import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { config } from '../../config';
import { GoogleBadge } from '../../components/GoogleBadge';
import { Magnetic } from '../../components/Magnetic';
import { BurgerAssembly } from '../../components/BurgerAssembly';
import { heroItem } from '../../lib/motion';
import type { HeroContent } from './types';

export const HeroSection: React.FC<{ content: HeroContent }> = ({ content }) => {
  const { venue } = config;
  return (
    <section className="relative min-h-[100dvh] w-full overflow-hidden bg-ink text-surface">
      <div className="absolute top-0 right-0 w-[58vw] h-full border-l border-surface/10 hidden lg:block" aria-hidden="true" />
      <div className="relative z-10 max-w-7xl mx-auto min-h-[100dvh] px-4 md:px-8 pt-24 md:pt-28 pb-10 grid grid-cols-1 lg:grid-cols-[minmax(0,0.82fr)_minmax(440px,1.18fr)] gap-4 lg:gap-10 items-center">
        <div className="order-2 lg:order-1 max-w-xl pb-3 lg:pb-0">
          <motion.div {...heroItem(0.1)} className="flex flex-wrap items-center gap-3 mb-7">
            <GoogleBadge rating={venue.rating} reviewCount={venue.reviewCount} href={venue.googleReviews} />
            <span className="text-xs md:text-sm font-bold tracking-[0.08em] uppercase text-accent">{content.locationLabel}</span>
          </motion.div>
          <motion.p {...heroItem(0.18)} className="text-xs font-bold tracking-[0.18em] uppercase text-secondary mb-4">{content.eyebrow}</motion.p>
          <motion.h1 {...heroItem(0.28)} className="font-display text-[2.85rem] sm:text-6xl md:text-7xl lg:text-[5.4rem] leading-[0.92] font-extrabold mb-5 md:mb-6">
            {content.headline}<span className="font-script font-normal text-accent block leading-[1.15] text-[0.8em] pb-2">{content.headlineAccent}</span>
          </motion.h1>
          <motion.p {...heroItem(0.4)} className="text-sm sm:text-base md:text-lg text-paper/80 leading-relaxed mb-7 md:mb-8 max-w-md">{venue.description}</motion.p>
          <motion.div {...heroItem(0.5)} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Magnetic className="w-full sm:w-auto"><Link to={content.primaryCta.to} className="block w-full sm:w-auto text-center bg-accent text-ink px-7 py-3.5 rounded-full font-display font-bold shadow-lg shadow-black/30 transition-transform duration-200 hover:scale-[1.04] active:scale-[0.97]">{content.primaryCta.label}</Link></Magnetic>
            <Link to={content.secondaryCta.to} className="w-full sm:w-auto text-center border border-surface/35 text-surface px-7 py-3.5 rounded-full font-display font-bold hover:bg-surface hover:text-ink hover:border-surface transition-colors duration-200">{content.secondaryCta.label}</Link>
          </motion.div>
        </div>
        <motion.div {...heroItem(0.16)} className="order-1 lg:order-2 w-full max-w-[310px] sm:max-w-[480px] md:max-w-[620px] mx-auto lg:max-w-none -mt-4 lg:mt-0"><BurgerAssembly /></motion.div>
      </div>
    </section>
  );
};
