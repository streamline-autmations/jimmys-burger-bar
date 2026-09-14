import React, { lazy, Suspense, useEffect, useLayoutEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
const FoodDrinks = lazy(() => import('./pages/FoodDrinks').then((module) => ({ default: module.FoodDrinks })));
const Visit = lazy(() => import('./pages/Visit').then((module) => ({ default: module.Visit })));
const Order = lazy(() => import('./pages/Order').then((module) => ({ default: module.Order })));
const Track = lazy(() => import('./pages/Track').then((module) => ({ default: module.Track })));
const AdminApp = lazy(() => import('./pages/admin/AdminApp').then((module) => ({ default: module.AdminApp })));
import { useLenis } from './lib/useLenis';
import { EASE, STAMP_EASE } from './lib/motion';
import { TextCursor } from './components/TextCursor';
import { BrandIntro } from './components/BrandIntro';
import { ErrorBoundary } from './components/ErrorBoundary';
import { closeIntroGate, openIntroGate } from './lib/introGate';
import { BuildOverlay } from './components/BuildOverlay';
import { config } from './config';
import { copy } from './core/tenant';

// Set only when the first-load intro has actually finished. Reading it is
// idempotent, so React 18's StrictMode double-invoked state initialiser cannot
// swallow the intro the way the previous mount-time flag did - that bug meant
// the sequence never played at all in development, which is how it came to be
// shipped without ever having been watched.
//
// A hard refresh re-evaluates the module and replays the intro; SPA navigation
// never remounts this component, so everyday route changes never see it.
let introCompleted = false;

const NotFound: React.FC = () => (
  <div className="pt-28 pb-24 min-h-[70dvh] flex flex-col items-center justify-center text-center px-4">
    <span className="font-script text-2xl text-primary">{copy.notFound.script}</span>
    <h1 className="font-display text-5xl md:text-7xl font-extrabold text-ink mt-1 mb-4">{copy.notFound.heading}</h1>
    <p className="text-ink/60 text-lg max-w-md mb-8">{copy.notFound.body}</p>
    <Link
      to="/"
      className="inline-flex items-center gap-2 bg-primary text-surface px-8 py-4 rounded-full font-display font-bold transition-transform duration-200 hover:scale-[1.04] active:scale-[0.97] shadow-lg shadow-primary/20"
    >
      {copy.notFound.cta}
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
// This is the everyday in-app transition and nothing else. The first-load
// sequence used to be branched into these same variants via `custom.intro`,
// which is why it could never have an assembly stage: a curtain's layers begin
// covering the viewport and only ever animate away. First load now lives in
// <BrandIntro>, so this is back to doing one job.
//
// HOLD is added to every "enter" delay, which keeps the curtain covering the
// viewport for that much longer before it peels. Client-directed 2026-09-07:
// the wipe was reading as too brief to register between pages. It is added to
// the delays rather than the durations so the peel itself keeps its pace - a
// slower peel would read as sluggish, a longer hold reads as deliberate.
//
// Cut from 0.5 to 0.2 on 2026-09-14 (client-directed): with 0.5 the logo sat
// at full opacity for about a second after it had landed, which read as the
// logo overstaying rather than as a deliberate beat.
const HOLD = config.motion.routeHold;
// The logo starts leaving just before the strips lift, so it is gone as the
// page is revealed instead of lingering over the first frames of it.
const LOGO_LEAVE_DELAY = HOLD - 0.05;
const accentSheetVariants = {
  initial: { y: '0%' },
  enter: { y: '-102%', transition: { duration: 0.62, ease: EASE, delay: 0.48 + HOLD } },
  exit: { y: '0%', transition: { duration: 0.46, ease: EASE } },
};

const surfaceSheetVariants = {
  initial: { y: '0%' },
  enter: { y: '-102%', transition: { duration: 0.62, ease: EASE, delay: 0.36 + HOLD } },
  exit: { y: '0%', transition: { duration: 0.48, ease: EASE, delay: 0.06 } },
};

const SHUTTER_DELAYS = [0.02, 0.09, 0, 0.12, 0.05];
const shutterVariants = {
  initial: { y: '0%' },
  enter: (index: number) => ({
    y: '-102%',
    transition: { duration: 0.66, ease: EASE, delay: 0.1 + HOLD + SHUTTER_DELAYS[index] },
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
  enter: { scale: 1.04, y: -22, opacity: 0, transition: { duration: 0.3, ease: EASE, delay: LOGO_LEAVE_DELAY } },
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
          {/* Reset on navigation, so a crash on one page does not follow the
              visitor to the next. */}
          <ErrorBoundary resetKey={location.pathname}>
          <Suspense fallback={<div role="status" className="min-h-screen px-6 pt-32 text-ink">Loading page…</div>}>
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/menu" element={<FoodDrinks />} />
            <Route path="/drinks" element={<Navigate to="/menu?tab=drinks" replace />} />
            <Route path="/specials" element={<Navigate to="/" replace />} />
            <Route path="/gallery" element={<Navigate to="/visit#gallery" replace />} />
            <Route path="/visit" element={<Visit />} />
            <Route path="/order" element={<Order />} />
            <Route path="/track" element={<Track />} />
            <Route path="/book" element={<Navigate to="/visit#book" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
        </main>

        {/* The curtain plays for every visitor, like the first-load intro. Under
            the global "user" setting a reduced-motion visitor's sheets snapped
            away instantly while the logo kept its fade timing, so the logo hung
            over the new page for ~600ms after the curtain had already gone. */}
        <MotionConfig reducedMotion="never">
        {/* Under-sheets create a quick white and gold flash between pages. */}
        <motion.div
          variants={accentSheetVariants}
          className="fixed inset-0 z-[118] bg-accent pointer-events-none"
          aria-hidden="true"
        />
        <motion.div
          variants={surfaceSheetVariants}
          className="fixed inset-0 z-[119] bg-surface pointer-events-none"
          aria-hidden="true"
        />

        {/* Five poster strips settle at slightly different beats. Each is
            20% + 1px wide so neighbours overlap: butting them edge to edge is
            what used to leave sub-pixel cracks, and the hairline white border
            they carried read as visible seams across the navy. */}
        <div className="fixed inset-0 z-[120] pointer-events-none overflow-hidden" aria-hidden="true">
          {SHUTTER_DELAYS.map((_, index) => (
            <motion.div
              key={index}
              custom={index}
              variants={shutterVariants}
              className="absolute bg-ink"
              style={{ left: `${index * 20}%`, width: 'calc(20% + 1px)', top: -1, bottom: -1 }}
            />
          ))}
        </div>

        <motion.div
          variants={logoVariants}
          className="fixed inset-0 z-[121] pointer-events-none flex flex-col items-center justify-center"
          aria-hidden="true"
        >
          <img src={config.assets.logo} alt="" className="w-44 md:w-56 lg:w-[clamp(260px,22vw,360px)] h-auto" />
          <div className="mt-5 lg:mt-8 flex items-center gap-3 lg:gap-4 text-accent">
            <span className="h-px w-8 lg:w-12 bg-accent/80" />
            <span className="font-display text-[10px] md:text-xs lg:text-sm font-bold tracking-[0.22em] uppercase">
              {copy.brand.tagline}
            </span>
            <span className="h-px w-8 lg:w-12 bg-accent/80" />
          </div>
        </motion.div>
        </MotionConfig>
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
  // Idempotent read, so StrictMode's double-invoked initialiser is harmless.
  // Closing the gate here rather than in an effect matters: this initialiser
  // runs before the page's own components render, so hero motion is held back
  // from its very first frame instead of a beat later.
  const [introActive, setIntroActive] = useState(() => {
    const playing = !introCompleted && config.motion.intro !== 'off';
    if (playing) closeIntroGate();
    return playing;
  });

  // With the intro switched off nothing else would clear the pre-paint boot
  // poster, so take it down before first paint.
  useLayoutEffect(() => {
    if (config.motion.intro === 'off') document.getElementById('boot')?.remove();
  }, []);

  const handleIntroDone = React.useCallback(() => {
    introCompleted = true;
    openIntroGate();
    setIntroActive(false);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <ScrollToTop />
      {/* `inert` while the intro owns the viewport: the page underneath is
          fully rendered and would otherwise be reachable by keyboard behind an
          opaque overlay. */}
      <div
        className="flex flex-col min-h-screen grain"
        {...(introActive ? ({ inert: '' } as React.HTMLAttributes<HTMLDivElement>) : {})}
      >
        <TextCursor />
        <Navbar />
        <AnimatedRoutes />
        <Footer />
      </div>
      {/* The first-load intro is a one-time, few-second brand moment, so it plays
          for every visitor. Windows ships with animation effects switched off on
          many machines, and under the global "user" setting those visitors got
          a static fade with no load-in at all. Scroll-linked and continuous
          motion elsewhere still respects the setting. */}
      {introActive && (
        <MotionConfig reducedMotion="never">
          <BrandIntro onDone={handleIntroDone} />
        </MotionConfig>
      )}
    </MotionConfig>
  );
};

const App: React.FC = () => {
  // The admin tool renders no BrandIntro, so nothing else would ever clear the
  // pre-paint boot layer on those routes. A layout effect runs after children
  // are in the DOM but before paint, so this never exposes a bare frame.
  useLayoutEffect(() => {
    if (window.location.pathname.startsWith('/admin')) {
      document.getElementById('boot')?.remove();
    }
  }, []);

  return (
    <Router>
      <BuildOverlay />
      <Routes>
        <Route path="/admin/*" element={<ErrorBoundary variant="console"><Suspense fallback={<div role="status" className="p-8 text-ink">Loading staff console…</div>}><AdminApp /></Suspense></ErrorBoundary>} />
        <Route path="/*" element={<ErrorBoundary><PublicApp /></ErrorBoundary>} />
      </Routes>
    </Router>
  );
};

export default App;
