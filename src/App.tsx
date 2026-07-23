import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { WhatsAppButton } from './components/WhatsAppButton';
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
      if (hash) {
        document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo(0, 0);
      }
    }, 560);
    return () => window.clearTimeout(t);
  }, [pathname, hash]);
  return null;
};

// Route transition, two layers deep. A gold sticker-coloured edge leads, the
// navy curtain follows on top of it, and Jimmy's real logo stamps onto the
// curtain (the site's signature move) while the page changes underneath.
// Reveal order is the reverse: navy lifts first, gold trails a beat behind,
// so every wipe flashes the accent between ink and page.
//
// The exiting page's layers finished `enter` above the viewport, so `exit`
// slides them back down over the old page. The entering page's layers start
// covering and lift away.
const goldVariants = {
  initial: { y: '0%' },
  enter: { y: '-100%', transition: { duration: 0.5, ease: EASE, delay: 0.28 } },
  exit: { y: '0%', transition: { duration: 0.38, ease: EASE } },
};

const inkVariants = {
  initial: { y: '0%' },
  enter: { y: '-100%', transition: { duration: 0.55, ease: EASE, delay: 0.14 } },
  exit: { y: '0%', transition: { duration: 0.45, ease: EASE, delay: 0.08 } },
};

const logoVariants = {
  initial: { scale: 1, opacity: 1 },
  enter: { scale: 1, opacity: 1 },
  // The stamp: the logo slaps onto the curtain as it covers the old page.
  exit: {
    scale: [0.55, 1],
    rotate: [-8, 0],
    opacity: [0, 1],
    transition: { duration: 0.38, ease: STAMP_EASE, delay: 0.16 },
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
            <Route path="/specials" element={<Navigate to="/#specials" replace />} />
            <Route path="/gallery" element={<Navigate to="/visit#gallery" replace />} />
            <Route path="/visit" element={<Visit />} />
            <Route path="/order" element={<Order />} />
            <Route path="/book" element={<Navigate to="/visit#book" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        {/* Gold leading edge (under the ink layer) */}
        <motion.div
          variants={goldVariants}
          className="fixed inset-0 z-[119] bg-accent pointer-events-none"
          aria-hidden="true"
        />

        {/* Navy curtain with the real logo stamping in */}
        <motion.div
          variants={inkVariants}
          className="fixed inset-0 z-[120] bg-ink pointer-events-none flex items-center justify-center"
          aria-hidden="true"
        >
          <motion.img
            variants={logoVariants}
            src="/images/logo.png"
            alt=""
            className="w-44 md:w-56 drop-shadow-[0_10px_40px_rgba(0,0,0,0.45)]"
          />
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
          <WhatsAppButton />
        </div>
      </Router>
    </MotionConfig>
  );
};

export default App;
