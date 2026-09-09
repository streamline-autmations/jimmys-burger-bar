import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Doodle } from '../../components/Doodle';
import { RevealHeading } from '../../components/RevealHeading';
import { fadeInUp } from '../../lib/motion';
import type { FoodChoiceContent } from './types';

export const FoodChoiceSection: React.FC<{ content: FoodChoiceContent }> = ({ content }) => (
  <section className="relative py-20 md:py-28 bg-ink overflow-hidden text-surface">
    <Doodle name="burger" className="absolute -right-12 top-4 w-64 h-64 text-accent/[0.07] rotate-6 pointer-events-none" />
    <div className="absolute inset-0 poster-wall-grid opacity-[0.08] pointer-events-none" aria-hidden="true" />
    <div className="max-w-7xl mx-auto px-4 md:px-8 relative">
      <motion.div {...fadeInUp} className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-10 md:mb-14">
        <div className="max-w-xl">
          <span className="text-xs font-bold tracking-[0.16em] uppercase text-accent">{content.eyebrow}</span>
          <RevealHeading text={content.heading} className="font-display text-4xl md:text-6xl font-extrabold text-surface leading-[0.96] mt-3" />
        </div>
        <p className="text-paper/70 max-w-sm leading-relaxed">{content.intro}</p>
      </motion.div>

      <motion.div {...fadeInUp} className="flex flex-wrap gap-x-8 gap-y-2 border-y border-surface/15 py-4 mb-7 text-xs md:text-sm font-bold tracking-[0.12em] uppercase text-accent">
        {content.badges.map((badge) => <span key={badge}>{badge}</span>)}
      </motion.div>

      <div className="flex md:grid md:grid-cols-[1.08fr_0.92fr] gap-3 md:gap-0 overflow-x-auto md:overflow-visible snap-x snap-mandatory scrollbar-hide -mx-4 md:mx-0 px-4 md:px-0">
        {content.panels.map((panel, index) => (
          <Link
            key={panel.title}
            to={panel.to}
            className={`burger-wall-panel group relative shrink-0 w-[86vw] md:w-auto min-h-[400px] md:min-h-[600px] overflow-hidden bg-primary block snap-center ring-1 ring-surface/10 ${
              index === 0 ? 'rounded-2xl md:rounded-r-none' : 'md:translate-y-10 rounded-2xl md:rounded-l-none'
            }`}
          >
            <img src={panel.image} alt={panel.alt} loading="lazy" className="burger-hand-photo absolute inset-0 w-full h-full object-contain transition-transform duration-700" />
            <div className="absolute z-10 left-6 right-6 bottom-6 md:left-9 md:right-9 md:bottom-9 flex items-end justify-between gap-4 text-surface">
              <div>
                <span className="text-xs font-bold tracking-[0.14em] uppercase text-accent">{panel.eyebrow}</span>
                <h3 className="font-display text-3xl md:text-4xl font-extrabold mt-1">{panel.title}</h3>
              </div>
              <ArrowRight size={24} className="shrink-0 transition-transform duration-300 group-hover:translate-x-2" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  </section>
);
