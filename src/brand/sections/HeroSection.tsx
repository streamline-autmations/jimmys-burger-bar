import React, { useRef } from 'react';
import { motion, useReducedMotion, useReducedMotionConfig, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { config } from '../../config';
import { GoogleBadge } from '../../components/GoogleBadge';
import { Magnetic } from '../../components/Magnetic';
import { BurgerAssembly } from '../../components/BurgerAssembly';
import { EASE, heroItem } from '../../lib/motion';
import { useIntroDone } from '../../lib/introGate';
import { useIsDesktop } from '../../lib/useDesktop';
import type { HeroContent } from './types';

// Desktop entrance beats, in seconds after the intro starts to peel. The strips
// take ~0.75s to clear, so the copy starts arriving while they lift and the
// headline is mid-reveal as the page comes into full view.
const BEAT = { badge: 0.34, eyebrow: 0.42, words: 0.48, script: 0.8, body: 1.0, ctas: 1.1 } as const;

// Pacifico's swashes overhang its box on every side, so the write-on clip is
// oversized everywhere except the edge that is doing the revealing.
const SCRIPT_HIDDEN = 'inset(-20% 105% -35% -6%)';
const SCRIPT_SHOWN = 'inset(-20% -6% -35% -6%)';

export const HeroSection: React.FC<{ content: HeroContent }> = ({ content }) => {
  const { venue } = config;
  const sectionRef = useRef<HTMLElement>(null);
  const isDesktop = useIsDesktop();
  // Two different questions. The entrance is the one-time load-in and follows
  // the MotionConfig around the hero, which plays it for every visitor. The
  // scroll parallax and cursor tracking are continuous, so they follow the
  // visitor's own reduced-motion setting.
  const reduceLoadIn = Boolean(useReducedMotionConfig());
  const reduceMotion = useReducedMotion();
  const introDone = useIntroDone();

  // Phones keep their original load-in untouched. Desktop gets its own
  // choreography that waits for the intro: at this width the hero IS the first
  // screen, and its entrance used to play out unseen behind the curtain, so the
  // peel revealed copy that was already sitting still.
  const choreograph = isDesktop && !reduceLoadIn;
  const scrollFx = isDesktop && !reduceMotion;

  // Scroll-out: the copy lifts away faster than the page while the burger lags
  // and sinks back, so leaving the hero has depth instead of a flat slide.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const copyY = useTransform(scrollYProgress, [0, 1], scrollFx ? [0, -140] : [0, 0]);
  const copyOpacity = useTransform(scrollYProgress, [0.2, 0.75], scrollFx ? [1, 0] : [1, 1]);
  const burgerY = useTransform(scrollYProgress, [0, 1], scrollFx ? [0, 110] : [0, 0]);
  const burgerScale = useTransform(scrollYProgress, [0, 1], scrollFx ? [1, 0.9] : [1, 1]);

  const item = (mobileDelay: number, desktopDelay: number) =>
    choreograph
      ? {
          initial: { opacity: 0, y: 26 },
          animate: introDone ? { opacity: 1, y: 0 } : { opacity: 0, y: 26 },
          transition: { duration: 0.85, delay: desktopDelay, ease: EASE },
        }
      : heroItem(mobileDelay);

  const words = content.headline.split(' ');

  return (
    <section ref={sectionRef} className="relative min-h-[100dvh] w-full overflow-hidden bg-ink text-surface">
      <div className="relative z-10 max-w-7xl mx-auto min-h-[100dvh] px-4 md:px-8 pt-24 md:pt-28 pb-10 grid grid-cols-1 lg:grid-cols-[minmax(0,0.82fr)_minmax(440px,1.18fr)] gap-4 lg:gap-10 items-center">
        <motion.div style={{ y: copyY, opacity: copyOpacity }} className="order-2 lg:order-1 max-w-xl pb-3 lg:pb-0">
          <motion.div {...item(0.1, BEAT.badge)} className="flex flex-wrap items-center gap-3 mb-7">
            <GoogleBadge rating={venue.rating} reviewCount={venue.reviewCount} href={venue.googleReviews} />
            <span className="text-xs md:text-sm font-bold tracking-[0.08em] uppercase text-accent">{content.locationLabel}</span>
          </motion.div>
          <motion.p {...item(0.18, BEAT.eyebrow)} className="text-xs font-bold tracking-[0.18em] uppercase text-secondary mb-4">{content.eyebrow}</motion.p>
          <motion.h1
            {...(choreograph ? {} : heroItem(0.28))}
            className="font-display text-[2.85rem] sm:text-6xl md:text-7xl lg:text-[clamp(5.4rem,6.6vw,7rem)] leading-[0.92] font-extrabold mb-5 md:mb-6 lg:mb-8"
          >
            {choreograph ? (
              <>
                {/* Each word rises out of its own mask, the same move as
                    <RevealHeading>, so the hero speaks the site's heading
                    language at poster scale. */}
                {words.map((word, index) => (
                  <React.Fragment key={`${word}-${index}`}>
                    {index > 0 && ' '}
                    <span className="inline-block overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em]">
                      <motion.span
                        className="inline-block"
                        initial={{ y: '110%' }}
                        animate={{ y: introDone ? '0%' : '110%' }}
                        transition={{ duration: 0.9, delay: BEAT.words + index * 0.09, ease: EASE }}
                      >
                        {word}
                      </motion.span>
                    </span>
                  </React.Fragment>
                ))}
                {/* The script line is written on, left to right, like the
                    hand-lettering on Jimmy's own posters. */}
                <motion.span
                  className="font-script font-normal text-accent block leading-[1.15] text-[0.8em] pb-2"
                  initial={{ clipPath: SCRIPT_HIDDEN }}
                  animate={{ clipPath: introDone ? SCRIPT_SHOWN : SCRIPT_HIDDEN }}
                  transition={{ duration: 1.05, delay: BEAT.script, ease: EASE }}
                >
                  {content.headlineAccent}
                </motion.span>
              </>
            ) : (
              <>
                {content.headline}
                <span className="font-script font-normal text-accent block leading-[1.15] text-[0.8em] pb-2">{content.headlineAccent}</span>
              </>
            )}
          </motion.h1>
          <motion.p {...item(0.4, BEAT.body)} className="text-sm sm:text-base md:text-lg text-paper/80 leading-relaxed mb-7 md:mb-8 max-w-md">{venue.description}</motion.p>
          <motion.div {...item(0.5, BEAT.ctas)} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Magnetic className="w-full sm:w-auto"><Link to={content.primaryCta.to} className="block w-full sm:w-auto text-center bg-accent text-ink px-7 py-3.5 rounded-full font-display font-bold shadow-lg shadow-black/30 transition-transform duration-200 hover:scale-[1.04] active:scale-[0.97]">{content.primaryCta.label}</Link></Magnetic>
            <Link to={content.secondaryCta.to} className="w-full sm:w-auto text-center border border-surface/35 text-surface px-7 py-3.5 rounded-full font-display font-bold hover:bg-surface hover:text-ink hover:border-surface transition-colors duration-200">{content.secondaryCta.label}</Link>
          </motion.div>
        </motion.div>
        <motion.div {...heroItem(0.16)} className="order-1 lg:order-2 w-full max-w-[310px] sm:max-w-[480px] md:max-w-[620px] mx-auto lg:max-w-none -mt-4 lg:mt-0">
          <motion.div style={{ y: burgerY, scale: burgerScale }}>
            <BurgerAssembly trackRef={scrollFx ? sectionRef : undefined} />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
