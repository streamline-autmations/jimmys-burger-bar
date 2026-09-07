import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { FoodDrinks } from './pages/FoodDrinks';
import { Visit } from './pages/Visit';
import { Order } from './pages/Order';
import { AdminApp } from './pages/admin/AdminApp';
import { useLenis } from './lib/useLenis';
import { EASE, STAMP_EASE } from './lib/motion';
import { TextCursor } from './components/TextCursor';

// Flips true the first time the app shell ever mounts in this tab (a hard
// refresh resets the module, so a hard reload replays the rich intro; SPA
// navigation between pages never does). Read once per AnimatedRoutes
// instance, so later route changes stay on the quick everyday transition.
let hasPlayedIntro = false;

const NotFound: React.FC = () => (
  <div className="pt-28 pb-24 min-h-[70dvh] flex flex-col items-center justify-center text-center px-4">
    <span className="font-script text-2xl text-primary">wrong turn?</span>
    <h1 className="font-display text-5xl md:text-7xl font-extrabold text-ink mt-1 mb-4">Page not found</h1>
    <p className="text-ink/60 text-lg max-w-md mb-8">
      That page isn't on the menu. Head back and try one of these instead.
    </p>
    <Link
      to="/"
      className="inline-flex items-center gap-2 bg-primary text-surface px-8 py-4 rounded-full font-display font-bold transition-transform duration-200 hover:scale-[1.04] active:scale-[0.97] shadow-lg shadow-primary/20"
    >
      Back to Jimmy's
    </Link>
  </div>
);

// Scroll to top on route change. Delayed until the curtain fully covers the
// viewport (exit duration below) so the jump is never visible.
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (pathname === '/visit' && hash) {
        document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo(0, 0);
      }
    }, 560);
    return () => window.clearTimeout(t);
  }, [pathname, hash]);
  return null;
};

// Three-stage route transition: a yellow sticker sheet, a clean white sheet,
// then five staggered navy poster strips. Closing builds the layers in that
// order; opening peels them away in reverse so the new page arrives through a
// controlled navy -> white -> gold reveal rather than a flat two-colour wipe.
//
// Every "enter" transition below branches on `custom.intro`: false plays the
// everyday quick reveal used for in-app navigation (untouched), true plays
// the slower first-load sequence - logo, starburst and rule lines assemble,
// hold, then scatter apart before the curtain lifts. "Exit" (leaving a page)
// is never touched by intro timing.
type SheetCustom = { intro: boolean };
type ShutterCustom = { index: number; intro: boolean };

const accentSheetVariants = {
  initial: { y: '0%' },
  enter: ({ intro }: SheetCustom) => ({
    y: '-102%',
    transition: intro
      ? { duration: 0.55, ease: EASE, delay: 1.85 }
      : { duration: 0.62, ease: EASE, delay: 0.48 },
  }),
  exit: { y: '0%', transition: { duration: 0.46, ease: EASE } },
};

const surfaceSheetVariants = {
  initial: { y: '0%' },
  enter: ({ intro }: SheetCustom) => ({
    y: '-102%',
    transition: intro
      ? { duration: 0.55, ease: EASE, delay: 1.7 }
      : { duration: 0.62, ease: EASE, delay: 0.36 },
  }),
  exit: { y: '0%', transition: { duration: 0.48, ease: EASE, delay: 0.06 } },
};

const SHUTTER_DELAYS = [0.02, 0.09, 0, 0.12, 0.05];
const shutterVariants = {
  initial: { y: '0%' },
  enter: ({ index, intro }: ShutterCustom) => ({
    y: '-102%',
    transition: intro
      ? { duration: 0.55, ease: EASE, delay: 1.55 + SHUTTER_DELAYS[index] * 1.4 }
      : { duration: 0.66, ease: EASE, delay: 0.1 + SHUTTER_DELAYS[index] },
  }),
  exit: ({ index }: ShutterCustom) => ({
    y: '0%',
    transition: {
      duration: 0.54,
      ease: EASE,
      delay: 0.14 + SHUTTER_DELAYS[SHUTTER_DELAYS.length - 1 - index],
    },
  }),
};

// Logo: everyday nav just fades/lifts it away quickly (unchanged). First
// load instead runs one keyframed timeline - stamp in, hold, scatter out -
// entirely inside a single transition so it never fights the curtain peel.
const logoVariants = {
  initial: { scale: 1, opacity: 1 },
  enter: ({ intro }: SheetCustom) =>
    intro
      ? {
          opacity: [0, 1, 1, 0],
          scale: [0.7, 1.06, 1, 1.04],
          y: [16, 0, 0, -16],
          transition: {
            duration: 1.65,
            delay: 0.22,
            times: [0, 0.18, 0.78, 1],
            ease: [STAMP_EASE, EASE, EASE],
          },
        }
      : {
          scale: 1.04,
          y: -22,
          opacity: 0,
          transition: { duration: 0.3, ease: EASE, delay: 0.08 },
        },
  exit: {
    scale: [0.76, 1.03, 1],
    y: [18, 0, 0],
    rotate: [-5, 1, 0],
    opacity: [0, 1, 1],
    transition: { duration: 0.48, ease: STAMP_EASE, delay: 0.32 },
  },
};

// First-load-only flourish: the tagline's two rule lines converge in from
// either side instead of sitting static, and a starburst (the site's own
// price-sticker motif) spins in beside the logo. Both hold, then reverse.
// On everyday nav these render nothing extra - they're simply not mounted.
const introLineVariants = {
  initial: { opacity: 1, x: 0 },
  enter: ({ side }: { side: 1 | -1 }) => ({
    opacity: [0, 1, 1, 0],
    x: [side * 22, 0, 0, side * 22],
    transition: { duration: 1.55, delay: 0.34, times: [0, 0.3, 0.82, 1], ease: EASE },
  }),
  exit: { opacity: 0, transition: { duration: 0.01 } },
};

const introStarburstVariants = {
  initial: { opacity: 0, scale: 0.4, rotate: -35 },
  enter: {
    opacity: [0, 1, 1, 0],
    scale: [0.4, 1.08, 1, 0.7],
    rotate: [-35, 6, 0, 26],
    transition: { duration: 1.7, delay: 0.12, times: [0, 0.22, 0.8, 1], ease: [STAMP_EASE, EASE, EASE] },
  },
  exit: { opacity: 0, transition: { duration: 0.01 } },
};

const INTRO_STAR_POINTS = Array.from({ length: 32 }, (_, i) => {
  const angle = (i * Math.PI) / 16;
  const r = i % 2 === 0 ? 50 : 40;
  return `${(50 + r * Math.cos(angle)).toFixed(2)},${(50 + r * Math.sin(angle)).toFixed(2)}`;
}).join(' ');

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  // Captured once per mounted route instance - stable for that page's whole
  // lifetime even if a later navigation flips the module flag underneath it.
  const isIntro = useRef(!hasPlayedIntro).current;
  useEffect(() => {
    hasPlayedIntro = true;
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        className="flex-grow flex flex-col"
      >
        <main className="flex-grow">
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/menu" element={<FoodDrinks />} />
            <Route path="/drinks" element={<Navigate to="/menu?tab=drinks" replace />} />
            <Route path="/specials" element={<Navigate to="/" replace />} />
            <Route path="/gallery" element={<Navigate to="/visit#gallery" replace />} />
            <Route path="/visit" element={<Visit />} />
            <Route path="/order" element={<Order />} />
            <Route path="/book" element={<Navigate to="/visit#book" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        {/* Under-sheets create a quick white and gold flash between pages. */}
        <motion.div
          custom={{ intro: isIntro }}
          variants={accentSheetVariants}
          className="fixed inset-0 z-[118] bg-accent pointer-events-none will-change-transform"
          aria-hidden="true"
        />
        <motion.div
          custom={{ intro: isIntro }}
          variants={surfaceSheetVariants}
          className="fixed inset-0 z-[119] bg-surface pointer-events-none will-change-transform"
          aria-hidden="true"
        />

        {/* Five poster strips settle at slightly different beats. */}
        <div className="fixed inset-0 z-[120] pointer-events-none flex" aria-hidden="true">
          {SHUTTER_DELAYS.map((_, index) => (
            <motion.div
              key={index}
              custom={{ index, intro: isIntro }}
              variants={shutterVariants}
              className="h-full flex-1 bg-ink border-r border-surface/[0.07] last:border-r-0 will-change-transform"
            />
          ))}
        </div>

        <motion.div
          custom={{ intro: isIntro }}
          variants={logoVariants}
          className="fixed inset-0 z-[121] pointer-events-none flex flex-col items-center justify-center"
          aria-hidden="true"
        >
          <div className="relative">
            <motion.img
              src="/images/logo.png"
              alt=""
              className="w-44 md:w-56 drop-shadow-[0_10px_40px_rgba(0,0,0,0.45)]"
            />
            {isIntro && (
              <motion.div
                variants={introStarburstVariants}
                initial="initial"
                animate="enter"
                exit="exit"
                className="absolute -top-2 -right-3 w-14 h-14 md:-top-3 md:-right-6 md:w-20 md:h-20"
              >
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
                  <polygon points={INTRO_STAR_POINTS} className="fill-accent" />
                </svg>
              </motion.div>
            )}
          </div>
          <div className="mt-5 flex items-center gap-3 text-accent">
            {isIntro ? (
              <motion.span
                custom={{ side: -1 }}
                variants={introLineVariants}
                initial="initial"
                animate="enter"
                exit="exit"
                className="h-px w-8 bg-accent/80"
              />
            ) : (
              <span className="h-px w-8 bg-accent/80" />
            )}
            <span className="font-display text-[10px] md:text-xs font-bold tracking-[0.22em] uppercase">
              Good food. Good people.
            </span>
            {isIntro ? (
              <motion.span
                custom={{ side: 1 }}
                variants={introLineVariants}
                initial="initial"
                animate="enter"
                exit="exit"
                className="h-px w-8 bg-accent/80"
              />
            ) : (
              <span className="h-px w-8 bg-accent/80" />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// The customer-facing brand shell — Navbar overlay, Footer, the stamp/curtain
// route transition, the custom cursor. Everything under "/" gets this.
// "/admin/*" deliberately does not: it's an internal staff tool, not a brand
// surface, and none of this chrome belongs on it.
const PublicApp: React.FC = () => {
  useLenis();

  return (
    <MotionConfig reducedMotion="user">
      <ScrollToTop />
      <div className="flex flex-col min-h-screen grain">
        <TextCursor />
        <Navbar />
        <AnimatedRoutes />
        <Footer />
      </div>
    </MotionConfig>
  );
};

const App: React.FC = () => (
  <Router>
    <Routes>
      <Route path="/admin/*" element={<AdminApp />} />
      <Route path="/*" element={<PublicApp />} />
    </Routes>
  </Router>
);

export default App;
