import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { config } from '../../config';
import { formatMoney, menuPrice } from '../../core/tenant';
import { Starburst } from '../../components/Starburst';
import { Doodle } from '../../components/Doodle';
import { RevealHeading } from '../../components/RevealHeading';
import { useRailSkew } from '../../lib/useRailSkew';
import { fadeInUp, riseChild, stampContainer, stampChild } from '../../lib/motion';
import type { SpecialsContent } from './types';

export const SpecialsSection: React.FC<{ content: SpecialsContent }> = ({ content }) => {
  const shouldReduceMotion = useReducedMotion();
  const specialsRail = useRailSkew<HTMLDivElement>();
  const { specials } = config;

  return (
    <section className="relative py-20 md:py-24 overflow-hidden bg-paper">
      <Doodle name="platter" className="absolute -top-6 right-[8%] w-36 h-36 text-primary/[0.08] rotate-12 pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <motion.div {...fadeInUp} className="flex items-end justify-between gap-6 mb-4">
          <div>
            <span className="font-script text-2xl text-primary">{content.script}</span>
            <RevealHeading text={content.heading} className="font-display text-3xl md:text-5xl font-extrabold text-ink mt-1" />
          </div>
          <Link to={content.allTo} className="hidden sm:inline-flex items-center gap-2 text-primary font-bold group whitespace-nowrap pb-1.5">
            <span>{content.allLabel}</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
        <motion.p {...fadeInUp} className="text-ink/60 max-w-md mb-12">{content.intro}</motion.p>
      </div>

      {/* The signature moment: posters stamp down like stickers on the wall.
          This is the ONLY place on the page that moves with intent. */}
      <motion.div
        ref={specialsRail}
        variants={stampContainer}
        initial="initial"
        whileInView="whileInView"
        viewport={{ once: true, amount: 0.15 }}
        className="flex gap-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-4 md:px-8 pt-6 pb-4 lg:max-w-7xl lg:mx-auto"
      >
        {specials.fridays.map((s, i) => (
          <motion.div
            key={s.title}
            variants={shouldReduceMotion ? riseChild : stampChild}
            custom={i % 2 === 0 ? -1.4 : 1.2}
            whileHover={shouldReduceMotion ? undefined : { rotate: 0, y: -6, scale: 1.015 }}
            className={`snap-start shrink-0 w-[272px] md:w-[300px] rounded-2xl relative overflow-hidden ${
              s.poster ? 'shadow-xl shadow-ink/20' : 'bg-ink p-7 pt-9'
            }`}
          >
            {s.poster ? (
              <img src={s.poster} alt={`${s.title} special poster`} loading="lazy" className="w-full h-full aspect-[4/5] object-cover" />
            ) : (
              <>
                {s.price !== undefined && (
                  <Starburst value={formatMoney(menuPrice(s.price))} className="absolute -top-5 -right-3 w-[86px] h-[86px] text-[26px]" />
                )}
                <span className="font-script text-secondary text-xl block">{content.cardEyebrow}</span>
                <h3 className="font-display text-[28px] font-extrabold text-surface leading-tight mt-1.5 pr-10">{s.title}</h3>
                <p className="text-paper/75 text-sm leading-relaxed mt-3.5 min-h-[84px]">{s.description}</p>
                <p className="text-xs font-bold text-accent mt-4">{s.note}</p>
              </>
            )}
          </motion.div>
        ))}
      </motion.div>

      <div className="sm:hidden text-center mt-6">
        <Link to={content.allTo} className="inline-flex items-center gap-2 text-primary font-bold">
          <span>{content.allLabel}</span>
          <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
};
