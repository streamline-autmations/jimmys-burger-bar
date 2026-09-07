import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { EASE, STAMP_EASE } from '../lib/motion';

// ---------------------------------------------------------------------------
// FIRST-LOAD BRAND INTRO — "the poster goes up"
//
// Deliberately NOT part of the route curtain. The curtain's whole job is to
// LEAVE: its layers start covering the viewport and animate away. That is why
// the previous intro had no assembly stage - the mechanism it was bolted onto
// structurally could not have one. Separating them lets the curtain go back to
// being a plain everyday page transition and gives the first load its own
// four-stage timeline that nothing else competes with.
//
// The four stages, and where each one lives:
//
//   1. ASSEMBLY   0 -> 760ms     index.html (pure CSS, runs before app JS)
//   2. BRAND      760 -> 1700ms  this file
//   3. HOLD       1700 -> 2600ms this file
//   4. PEEL       2600 -> 3400ms this file
//
// Stage 1 is CSS because React does not mount until ~800ms on a cold load;
// see the comment block in index.html. This component waits for that CSS
// assembly to finish before showing itself, so a fast (cached) mount never
// cuts the assembly short and a slow mount never leaves a gap. Both layers are
// the same flat navy at hand-off, so the swap cannot be seen.
// ---------------------------------------------------------------------------

// Must match the #boot geometry in index.html.
const STRIPS = [0, 1, 2, 3, 4];

// Fallback only, for the case where the boot layer is already gone and its
// animations can no longer be measured.
const ASSEMBLY_FALLBACK = 800;
const SETTLE_ALLOWANCE = 190;

// Stage 4 lifts the strips in a different order than Stage 1 dropped them in,
// so the poster comes apart rather than rewinding.
const PEEL_STAGGER = [0.06, 0, 0.13, 0.04, 0.1];

// Seconds, measured from the moment the curtain is armed.
const STAGE = { rule: 0, logo: 0.12, burst: 0.42, tagline: 0.5 } as const;
const STAGE_2_LENGTH = 940;
const HOLD = 850;
const PEEL_LENGTH = 800;

// Budget guards. Visitors start losing patience with a splash at around three
// seconds, so a slow start must eat into the hold rather than push the total
// out: the peel begins by PEEL_DEADLINE at the latest, but the composition is
// never on screen for less than MIN_HOLD however late Stage 1 finished.
const PEEL_DEADLINE = 2550;
const MIN_HOLD = 420;

const REDUCED = { hold: 850, done: 1200 } as const;

// How much of Stage 1 is still to run, read from the boot layer's own CSS
// animations rather than from page time.
//
// This distinction matters: a CSS animation's clock starts at FIRST PAINT, not
// at navigation start, and on a warm load first paint can land several hundred
// milliseconds in. Timing the hand-off off performance.now() therefore armed
// React while the strips were still flying and covered the assembly with flat
// navy - the assembly was running correctly and simply never got seen.
const remainingAssembly = (): number => {
  const boot = document.getElementById('boot');
  if (!boot) return 0;

  let remaining = 0;
  boot.querySelectorAll('i').forEach((strip) => {
    strip.getAnimations().forEach((animation) => {
      const timing = animation.effect?.getComputedTiming();
      if (!timing) return;
      const total = Number(timing.delay ?? 0) + Number(timing.activeDuration ?? 0);
      const elapsed = Number(animation.currentTime ?? 0);
      if (Number.isFinite(total) && Number.isFinite(elapsed)) {
        remaining = Math.max(remaining, total - elapsed);
      }
    });
  });
  return remaining;
};

// The site's own jagged price-sticker shape, same construction as <Starburst>.
const BURST_POINTS = Array.from({ length: 32 }, (_, i) => {
  const angle = (i * Math.PI) / 16;
  const r = i % 2 === 0 ? 50 : 40;
  return `${(50 + r * Math.cos(angle)).toFixed(2)},${(50 + r * Math.sin(angle)).toFixed(2)}`;
}).join(' ');

const removeBootLayer = () => {
  document.getElementById('boot')?.remove();
};

export const BrandIntro: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const reduceMotion = useReducedMotion();

  // Measured once at mount, so the hand-off lands on a fully assembled canvas
  // whether React arrived early on a warm cache or late on a cold one.
  const waitForAssembly = useMemo(() => {
    if (reduceMotion) return 0;
    if (!document.getElementById('boot')) return 0;
    const measured = remainingAssembly();
    if (measured <= 0) return ASSEMBLY_FALLBACK;
    // Clamped to the sequence's real length: an animation whose start time is
    // still in the future reports a negative currentTime, which would otherwise
    // read as more work remaining than the whole assembly actually contains.
    // The shared easing curve is also heavily front-loaded, so the strips are
    // visually at rest well before the animation formally ends. Arming at that
    // point removes a beat of dead navy without ever cutting the travel short.
    return Math.max(0, Math.min(measured, ASSEMBLY_FALLBACK) - SETTLE_ALLOWANCE);
  }, [reduceMotion]);

  const [armed, setArmed] = useState(waitForAssembly === 0);
  const [peeling, setPeeling] = useState(false);

  useEffect(() => {
    if (armed) return;
    const t = window.setTimeout(() => setArmed(true), waitForAssembly);
    return () => window.clearTimeout(t);
  }, [armed, waitForAssembly]);

  // Hand-off: the boot layer only goes once this component is on screen showing
  // the identical navy, so there is never a frame where neither layer covers.
  useLayoutEffect(() => {
    if (armed) removeBootLayer();
  }, [armed]);

  // Nothing beneath the intro may scroll while it owns the viewport.
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-intro-active', '');
    return () => document.documentElement.removeAttribute('data-intro-active');
  }, []);

  useEffect(() => {
    if (!armed) return;

    if (reduceMotion) {
      const timers = [
        window.setTimeout(() => setPeeling(true), REDUCED.hold),
        window.setTimeout(onDone, REDUCED.done),
      ];
      return () => timers.forEach(window.clearTimeout);
    }

    // Anchored to arming (i.e. to assembly completion) so what the visitor
    // watches is the same shape on every load: brand reveal, a hold long enough
    // to read, then the peel - trimmed against the deadline if Stage 1 was slow.
    const untilPeel = Math.max(
      STAGE_2_LENGTH + MIN_HOLD,
      Math.min(STAGE_2_LENGTH + HOLD, PEEL_DEADLINE - performance.now()),
    );

    const timers = [
      window.setTimeout(() => setPeeling(true), untilPeel),
      window.setTimeout(onDone, untilPeel + PEEL_LENGTH),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [armed, reduceMotion, onDone]);

  // Reduced motion gets a composed, static brand presentation: no strip
  // choreography, no stamp overshoot, and no three-second wait.
  if (reduceMotion) {
    return (
      <motion.div
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-ink"
        aria-hidden="true"
        initial={{ opacity: 1 }}
        animate={{ opacity: peeling ? 0 : 1 }}
        transition={{ duration: 0.3, ease: EASE }}
      >
        <motion.img
          src="/images/logo.png"
          alt=""
          width={224}
          height={224}
          className="w-[52vw] max-w-[236px] sm:w-56 sm:max-w-none md:w-64 h-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.32, ease: EASE }}
        />
        <motion.p
          className="mt-5 font-display text-[11px] md:text-xs font-bold uppercase tracking-[0.22em] text-accent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.32, delay: 0.1, ease: EASE }}
        >
          Good food. Good people.
        </motion.p>
      </motion.div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[200] overflow-hidden"
      aria-hidden="true"
      style={{ visibility: armed ? 'visible' : 'hidden' }}
    >
      {/* Gold underlayer. Only ever seen as a brief branded edge during the
          peel, between the navy lifting and the page arriving. */}
      <motion.div
        className="absolute inset-0 bg-accent"
        initial={{ y: '0%' }}
        animate={peeling ? { y: '-101%' } : { y: '0%' }}
        transition={{ duration: 0.6, ease: EASE, delay: peeling ? 0.18 : 0 }}
      />

      {/* The assembled navy canvas. Strips are 20% + 1px wide so neighbours
          overlap: abutting them is what produces sub-pixel cracks. */}
      {STRIPS.map((i) => (
        <motion.div
          key={i}
          className="absolute bg-ink"
          style={{ left: `${i * 20}%`, width: 'calc(20% + 1px)', top: -1, bottom: -1 }}
          initial={{ y: '0%' }}
          animate={peeling ? { y: '-101%' } : { y: '0%' }}
          transition={{ duration: 0.62, ease: EASE, delay: peeling ? PEEL_STAGGER[i] : 0 }}
        />
      ))}

      {/* One composed lockup: rule, logo, sticker and tagline are staged beats
          of a single reveal, and they leave together with the poster they are
          printed on rather than running their own exits. */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center px-6"
        initial={{ opacity: 1, y: 0 }}
        animate={peeling ? { opacity: 0, y: -26 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: EASE }}
      >
        <div className="relative">
          <motion.img
            src="/images/logo.png"
            alt=""
            width={224}
            height={224}
            className="w-[52vw] max-w-[236px] sm:w-56 sm:max-w-none md:w-64 h-auto"
            initial={{ opacity: 0, scale: 0.72, y: 10 }}
            animate={armed ? { opacity: 1, scale: 1, y: 0 } : undefined}
            transition={{ duration: 0.54, delay: STAGE.logo, ease: STAMP_EASE }}
          />
          {/* Supporting detail, not a second focal point: it lands after the
              logo has settled and stays small enough to read as a sticker. */}
          <motion.div
            className="absolute -top-1 -right-4 w-11 h-11 md:-top-2 md:-right-7 md:w-14 md:h-14"
            initial={{ opacity: 0, scale: 0.3, rotate: -28 }}
            animate={armed ? { opacity: 1, scale: 1, rotate: 0 } : undefined}
            transition={{ duration: 0.34, delay: STAGE.burst, ease: STAMP_EASE }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <polygon points={BURST_POINTS} className="fill-accent" />
            </svg>
          </motion.div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <motion.span
            className="h-px w-8 bg-accent origin-right"
            initial={{ scaleX: 0 }}
            animate={armed ? { scaleX: 1 } : undefined}
            transition={{ duration: 0.42, delay: STAGE.rule, ease: EASE }}
          />
          <span className="overflow-hidden py-0.5">
            <motion.span
              className="block font-display text-[11px] md:text-sm font-bold tracking-[0.22em] uppercase text-accent"
              initial={{ y: '115%' }}
              animate={armed ? { y: '0%' } : undefined}
              transition={{ duration: 0.44, delay: STAGE.tagline, ease: EASE }}
            >
              Good food. Good people.
            </motion.span>
          </span>
          <motion.span
            className="h-px w-8 bg-accent origin-left"
            initial={{ scaleX: 0 }}
            animate={armed ? { scaleX: 1 } : undefined}
            transition={{ duration: 0.42, delay: STAGE.rule, ease: EASE }}
          />
        </div>
      </motion.div>
    </div>
  );
};
