import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { config } from '../config';
import { Starburst } from '../components/Starburst';
import { fadeInUp, staggerContainer, riseChild } from '../lib/motion';
import { Doodle } from '../components/Doodle';
import { RevealHeading } from '../components/RevealHeading';
import { useHorizontalWheel } from '../lib/useHorizontalWheel';

const CATEGORY_DOODLES: Record<string, string> = {
  Beer: 'beer',
  'Ciders & Coolers': 'bottle',
  Cocktails: 'cocktail',
  Shots: 'shot',
  'Wine & Bubbles': 'wine',
  'Coffee & Shakes': 'shake',
};

export const Drinks: React.FC = () => {
  const { drinks } = config;
  const drinksRailRef = useRef<HTMLDivElement>(null);
  useHorizontalWheel(drinksRailRef);

  return (
    <div className="pt-28 min-h-screen relative">
      {/* Faint bar sketches in the page background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <Doodle name="beer" className="absolute top-44 -right-8 w-44 h-44 text-primary/[0.07] rotate-12" />
        <Doodle name="cocktail" className="absolute top-[48%] -left-10 w-40 h-40 text-primary/[0.06] -rotate-12" />
        <Doodle name="bottle" className="absolute bottom-72 right-8 w-32 h-32 text-primary/[0.06] rotate-6" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative">
        <motion.div {...fadeInUp} className="max-w-xl mb-14">
          <span className="font-script text-2xl text-primary">from the fridge and the bar</span>
          <RevealHeading as="h1" text="Cold ones, sorted" className="font-display text-4xl md:text-6xl font-extrabold text-ink mt-1 mb-4" />
          <p className="text-ink/60 text-lg">{drinks.intro}</p>
        </motion.div>

        <motion.div {...fadeInUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-14 md:max-w-4xl">
          <div className="relative min-h-[250px] md:min-h-[360px] overflow-hidden rounded-2xl bg-ink jimmy-media-frame">
            <video src="/videos/drinks-pour-loop.mp4" autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
            <span className="absolute left-5 bottom-5 text-surface font-display font-bold text-xl">Straight from the bar.</span>
          </div>
          <div className="relative min-h-[250px] md:min-h-[360px] overflow-hidden rounded-2xl bg-primary md:mt-10 jimmy-media-frame">
            <img src="/images/ambience-corona.jpg" alt="Ice-cold Corona buckets at Jimmy's" loading="eager" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/65 via-transparent to-transparent" />
            <span className="absolute left-5 bottom-5 text-surface font-display font-bold text-xl">Always cold.</span>
          </div>
        </motion.div>
        <div className="flex items-center justify-between gap-4 mb-5">
          <p className="text-sm text-ink/60">Swipe the drinks board, or scroll sideways on desktop.</p>
          <span className="hidden md:block text-xs font-bold tracking-[0.14em] uppercase text-primary">Scroll →</span>
        </div>
        {/* Drinks board */}
        <motion.div
          ref={drinksRailRef}
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true, amount: 0.05 }}
          className="horizontal-rail flex items-start gap-4 md:gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-5 -mx-4 px-4 md:mx-0 md:px-0"
        >
          {drinks.categories.map((category) => (
            <motion.div
              key={category.name}
              variants={riseChild}
              className="relative self-start shrink-0 w-[min(86vw,380px)] md:w-[430px] overflow-hidden bg-surface rounded-2xl p-7 md:p-9 shadow-[0_8px_30px_-14px_rgb(var(--color-ink)/0.2)] ring-1 ring-ink/[0.04] snap-start"
            >
              {CATEGORY_DOODLES[category.name] && (
                <Doodle
                  name={CATEGORY_DOODLES[category.name]}
                  className="absolute -top-3 -right-3 w-24 h-24 text-primary/[0.13] rotate-12 pointer-events-none"
                />
              )}
              <div className="flex items-baseline justify-between gap-4 mb-7">
                <h2 className="font-display text-2xl font-extrabold text-primary">{category.name}</h2>
                {'note' in category && category.note && (
                  <span className="font-script text-secondary whitespace-nowrap">{category.note}</span>
                )}
              </div>

              <div className="space-y-5">
                {category.items.map((item) => (
                  <div key={item.name} className="flex items-baseline justify-between gap-4 group">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="font-display font-bold text-ink group-hover:text-primary transition-colors">{item.name}</h3>
                        {'tag' in item && item.tag && (
                          <span className="text-[10px] font-bold bg-secondary/25 text-ink px-2 py-0.5 rounded-full">
                            {item.tag}
                          </span>
                        )}
                        {'popular' in item && item.popular && (
                          <span className="text-[10px] font-bold bg-accent/25 text-ink px-2 py-0.5 rounded-full">
                            House pick
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-ink/55 mt-0.5">{item.detail}</p>
                    </div>
                    <div className="flex-1 border-b-2 border-dotted border-ink/20 min-w-[24px] translate-y-[-4px]" />
                    <span className="font-display font-bold text-ink whitespace-nowrap">{item.price}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Mexican Friday callout: real special from Jimmy's posters */}
        <motion.div
          {...fadeInUp}
          className="mt-6 mb-24 rounded-2xl bg-ink p-8 md:p-10 relative overflow-hidden"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10 md:pr-28">
            <div className="shrink-0">
              <span className="font-script text-secondary text-xl block">Mexican Friday</span>
              <h2 className="font-display text-3xl font-extrabold text-surface mt-1">5x Corona, R120</h2>
            </div>
            <p className="text-paper/80 leading-relaxed md:border-l md:border-paper/20 md:pl-10">
              Friday just got a whole lot cooler. Five ice-cold Coronas for the
              table, made for tacos and the Mexican burger. While stocks last.
            </p>
          </div>
          <Starburst value="R120" className="hidden md:block absolute top-1/2 -translate-y-1/2 right-8 w-24 h-24 text-[28px]" />
        </motion.div>
      </div>
    </div>
  );
};
