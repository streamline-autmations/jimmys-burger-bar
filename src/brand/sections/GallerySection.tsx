import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { RevealHeading } from '../../components/RevealHeading';
import { useRailSkew } from '../../lib/useRailSkew';
import { staggerContainer, riseChild } from '../../lib/motion';
import { fadeInUp } from '../../lib/motion';
import type { GalleryContent } from './types';

export const GallerySection: React.FC<{ content: GalleryContent }> = ({ content }) => {
  const galleryRail = useRailSkew<HTMLDivElement>();

  return (
    <section className="py-20 md:py-24 overflow-hidden bg-ink">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <motion.div {...fadeInUp} className="flex items-end justify-between gap-6 mb-10">
          <div>
            <span className="font-script text-2xl text-accent">{content.script}</span>
            <RevealHeading text={content.heading} className="font-display text-3xl md:text-5xl font-extrabold text-surface mt-1" />
          </div>
          <Link to={content.linkTo} className="hidden sm:inline-flex items-center gap-2 text-accent font-bold group whitespace-nowrap pb-1.5">
            <span>{content.linkLabel}</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>

      <motion.div
        ref={galleryRail}
        variants={staggerContainer}
        initial="initial"
        whileInView="whileInView"
        viewport={{ once: true, amount: 0.15 }}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-4 md:px-8"
      >
        {content.images.map((img, i) => (
          <motion.div
            key={img.src}
            variants={riseChild}
            className={`snap-start shrink-0 rounded-2xl overflow-hidden ring-1 ring-surface/15 shadow-[0_8px_30px_-14px_rgb(0_0_0/0.45)] ${
              img.tall ? 'w-[220px] md:w-[260px] aspect-[3/4]' : 'w-[280px] md:w-[340px] aspect-[4/3]'
            } ${i % 3 === 1 ? 'md:mt-8' : ''}`}
          >
            <img src={img.src} alt="" loading="lazy" className="w-full h-full object-cover" />
          </motion.div>
        ))}
        <Link to={content.linkTo} className="snap-start shrink-0 w-[220px] md:w-[260px] rounded-2xl bg-accent flex flex-col items-center justify-center gap-3 text-ink font-display font-bold text-center px-6">
          <span>{content.ctaLabel}</span>
          <ArrowRight size={20} />
        </Link>
      </motion.div>
    </section>
  );
};
