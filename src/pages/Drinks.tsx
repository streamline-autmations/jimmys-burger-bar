import React from 'react';
import { motion } from 'framer-motion';
import { config } from '../config';
import { Starburst } from '../components/Starburst';
import { fadeInUp, staggerContainer, riseChild } from '../lib/motion';

export const Drinks: React.FC = () => {
  const { drinks } = config;

  return (
    <div className="pt-28 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <motion.div {...fadeInUp} className="max-w-xl mb-14">
          <span className="font-script text-2xl text-primary">from the fridge and the bar</span>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold text-ink mt-1 mb-4">Cold ones, sorted</h1>
          <p className="text-ink/60 text-lg">{drinks.intro}</p>
        </motion.div>

        {/* Drinks board */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true, amount: 0.05 }}
          className="columns-1 lg:columns-2 gap-6"
        >
          {drinks.categories.map((category) => (
            <motion.div
              key={category.name}
              variants={riseChild}
              className="bg-surface rounded-2xl p-8 md:p-9 shadow-[0_8px_30px_-14px_rgb(var(--color-ink)/0.2)] ring-1 ring-ink/[0.04] break-inside-avoid mb-6"
            >
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
