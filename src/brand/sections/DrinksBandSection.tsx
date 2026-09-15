import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { config } from '../../config';
import { fadeInUp } from '../../lib/motion';
import type { DrinksBandContent } from './types';

export const DrinksBandSection: React.FC<{ content: DrinksBandContent }> = ({ content }) => {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  // Drifts a few px against the scroll, echoing the hero parallax so the two
  // video bands read as one system. The wrapper is oversized (-inset-y-12) so
  // the drift never exposes an edge.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], shouldReduceMotion ? [0, 0] : [-40, 40]);
  const { ambience } = config.venue;

  return (
    <section ref={ref} className="relative py-28 md:py-40 overflow-hidden bg-ink">
      <motion.div style={{ y }} className="absolute inset-x-0 -inset-y-12 z-0">
        {ambience.video ? (
          <video src={ambience.video} autoPlay muted loop playsInline className="w-full h-full object-cover opacity-45" />
        ) : (
          <img src={ambience.image} alt="" className="w-full h-full object-cover opacity-45" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/75 to-ink/30" />
      </motion.div>
      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8">
        <motion.div {...fadeInUp} className="max-w-xl">
          <h2 className="font-display text-4xl md:text-5xl font-extrabold text-surface mb-5">
            {content.heading}<span className="font-script font-normal text-secondary block leading-[1.3] pb-2 text-[0.8em]">{content.headingAccent}</span>
          </h2>
          <p className="text-lg text-paper/85 leading-relaxed mb-9 max-w-md">{content.body}</p>
          <Link to={content.cta.to} className="group inline-flex items-center gap-3 bg-surface text-ink pl-7 pr-2 py-2 rounded-full font-display font-bold transition-transform duration-200 hover:scale-[1.04] active:scale-[0.97]">
            <span>{content.cta.label}</span>
            <span className="flex items-center justify-center w-11 h-11 rounded-full bg-ink/[0.06] group-hover:translate-x-0.5 transition-transform"><ArrowRight size={18} /></span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};
