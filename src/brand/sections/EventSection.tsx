import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { config } from '../../config';
import { Starburst } from '../../components/Starburst';
import { Doodle } from '../../components/Doodle';
import { RevealHeading } from '../../components/RevealHeading';
import { EASE, fadeInUp } from '../../lib/motion';
import type { EventContent } from './types';

/** A recurring venue event. Omit this section entirely for a venue without one. */
export const EventSection: React.FC<{ content: EventContent }> = ({ content }) => {
  const shouldReduceMotion = useReducedMotion();
  const [active, setActive] = useState(content.images[0]?.src ?? '');
  const { specials } = config;

  useEffect(() => {
    if (shouldReduceMotion || content.images.length < 2) return;
    const rotation = window.setInterval(() => {
      setActive((current) => {
        const index = content.images.findIndex((image) => image.src === current);
        return content.images[(index + 1) % content.images.length].src;
      });
    }, 2500);
    return () => window.clearInterval(rotation);
  }, [shouldReduceMotion, content.images]);

  return (
    <section className="relative py-20 md:py-28 overflow-hidden bg-accent">
      <div className="checker checker-ink absolute top-0 left-0 right-0 opacity-25" aria-hidden="true" />
      <Doodle name="car" className="absolute bottom-6 right-[4%] w-40 h-40 text-primary/[0.08] -rotate-3 pointer-events-none" />
      <Doodle name="coffee" className="absolute top-16 left-[3%] w-24 h-24 text-primary/[0.07] rotate-6 pointer-events-none hidden md:block" />
      <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center pt-6">
        <motion.div {...fadeInUp} className="relative">
          <div className="h-[320px] md:h-[420px] rounded-2xl overflow-hidden rotate-[-1.5deg] ring-8 ring-surface shadow-xl shadow-ink/15 relative bg-ink">
            <AnimatePresence initial={false}>
              <motion.img
                key={active}
                src={active}
                alt={content.imageAlt}
                loading="lazy"
                initial={{ opacity: 0, scale: 1.025 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: EASE }}
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
            </AnimatePresence>
            <div className="absolute left-3 top-3 flex gap-2" aria-label={content.imageAlt}>
              {content.images.map((image) => (
                <button
                  key={image.src}
                  type="button"
                  onMouseEnter={() => setActive(image.src)}
                  onFocus={() => setActive(image.src)}
                  onClick={() => setActive(image.src)}
                  aria-label={image.label}
                  className={`w-11 h-11 overflow-hidden border-2 transition-all ${active === image.src ? 'border-accent scale-105' : 'border-surface/70 hover:border-accent'}`}
                >
                  <img src={image.src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
          {content.sticker && (
            <Starburst label={content.sticker.label} value={content.sticker.value} className="absolute -bottom-6 -right-2 md:-right-6 w-24 h-24 md:w-28 md:h-28 text-[28px] md:text-[32px]" />
          )}
        </motion.div>

        <motion.div {...fadeInUp}>
          <span className="font-script text-2xl text-primary">{content.script}</span>
          <RevealHeading text={specials.event.title} className="font-display text-4xl md:text-5xl font-extrabold text-ink mt-1 mb-5" />
          <p className="text-ink/65 text-lg leading-relaxed max-w-md mb-7">{specials.event.description}</p>
          <div className="inline-flex items-center gap-2.5 bg-ink text-paper px-5 py-2.5 rounded-full text-sm font-bold">
            <Clock size={16} className="text-secondary" />
            <span>{specials.event.schedule}</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
