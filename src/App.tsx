import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { FoodDrinks } from './pages/FoodDrinks';
import { Visit } from './pages/Visit';
import { Order } from './pages/Order';
import { useLenis } from './lib/useLenis';
import { EASE, STAMP_EASE } from './lib/motion';
import { TextCursor } from './components/TextCursor';

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
const accentSheetVariants = {
  initial: { y: '0%' },
  enter: { y: '-102%', transition: { duration: 0.62, ease: EASE, delay: 0.48 } },
  exit: { y: '0%', transition: { duration: 0.46, ease: EASE } },
};

const surfaceSheetVariants = {
  initial: { y: '0%' },
  enter: { y: '-102%', transition: { duration: 0.62, ease: EASE, delay: 0.36 } },
  exit: { y: '0%', transition: { duration: 0.48, ease: EASE, delay: 0.06 } },
};

const SHUTTER_DELAYS = [0.02, 0.09, 0, 0.12, 0.05];
const shutterVariants = {
  initial: { y: '0%' },
  enter: (index: number) => ({
    y: '-102%',
    transition: {
      duration: 0.66,
      ease: EASE,
      delay: 0.1 + SHUTTER_DELAYS[index],
    },
  }),
  exit: (index: number) => ({
    y: '0%',
    transition: {
      duration: 0.54,
      ease: EASE,
      delay: 0.14 + SHUTTER_DELAYS[SHUTTER_DELAYS.length - 1 - index],
    },
  }),
};

const logoVariants = {
  initial: { scale: 1, opacity: 1 },
  enter: {
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

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();

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
          variants={accentSheetVariants}
          className="fixed inset-0 z-[118] bg-accent pointer-events-none will-change-transform"
          aria-hidden="true"
        />
        <motion.div
          variants={surfaceSheetVariants}
          className="fixed inset-0 z-[119] bg-surface pointer-events-none will-change-transform"
          aria-hidden="true"
        />

        {/* Five poster strips settle at slightly different beats. */}
        <div className="fixed inset-0 z-[120] pointer-events-none flex" aria-hidden="true">
          {SHUTTER_DELAYS.map((_, index) => (
            <motion.div
              key={index}
              custom={index}
              variants={shutterVariants}
              className="h-full flex-1 bg-ink border-r border-surface/[0.07] last:border-r-0 will-change-transform"
            />
          ))}
        </div>

        <motion.div
          variants={logoVariants}
          className="fixed inset-0 z-[121] pointer-events-none flex flex-col items-center justify-center"
          aria-hidden="true"
        >
          <motion.img
            src="/images/logo.png"
            alt=""
            className="w-44 md:w-56 drop-shadow-[0_10px_40px_rgba(0,0,0,0.45)]"
          />
          <div className="mt-5 flex items-center gap-3 text-accent">
            <span className="h-px w-8 bg-accent/80" />
            <span className="font-display text-[10px] md:text-xs font-bold tracking-[0.22em] uppercase">
              Good food. Good people.
            </span>
            <span className="h-px w-8 bg-accent/80" />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const App: React.FC = () => {
  useLenis();

  return (
    <MotionConfig reducedMotion="user">
      <Router>
        <ScrollToTop />
        <div className="flex flex-col min-h-screen grain">
          <TextCursor />
          <Navbar />
          <AnimatedRoutes />
          <Footer />
        </div>
      </Router>
    </MotionConfig>
  );
};

export default App;
