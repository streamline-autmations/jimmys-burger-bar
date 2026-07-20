// Shared motion presets. One easing curve across the whole site so every
// entrance feels like part of the same system. Entry-only, no infinite loops.
export const EASE = [0.16, 1, 0.3, 1] as const;

export const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.8, ease: EASE },
};

// Child variant for use inside staggerContainer parents.
export const riseChild = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: EASE },
};

export const staggerContainer = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.09 } },
  viewport: { once: true, amount: 0.15 },
};

// Hero load-in: used with `animate` (not whileInView) for the first paint.
export const heroItem = (delay: number) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay, ease: EASE },
});
