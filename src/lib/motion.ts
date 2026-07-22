// ---------------------------------------------------------------------------
// MOTION SIGNATURE: "stamp"
//
// Jimmy's visual language is a poster wall: Instagram specials posters with a
// jagged golden starburst price sticker slapped on top ("only R180"). So
// exactly ONE thing on this site moves, and it moves like a sticker being
// pressed down - a small scale overshoot that settles. No vertical drift.
//
// Everything else holds still and resolves opacity only. This is deliberate:
// the thing that makes a site read as generated is not bad motion, it is
// UNDIFFERENTIATED motion - every element entering the same way, fading up
// 24px over 0.8s. One element moving with intent and the rest calm reads as
// designed. Everything moving reads as generated.
//
// Rule: if you are about to add a new entrance animation, use `fadeInUp`
// (opacity only). The stamp is reserved for posters and price stickers.
// ---------------------------------------------------------------------------

export const EASE = [0.16, 1, 0.3, 1] as const;

// Overshoot-and-settle. Used ONLY by the stamp signature below.
export const STAMP_EASE = [0.34, 1.56, 0.64, 1] as const;

// --- Non-signature reveals -------------------------------------------------
// 2026-07-22, client-directed motion expansion: Christiaan asked for the site
// to feel alive end to end (reference: cravburgers.shop), so `fadeInUp` and
// `riseChild` translate again after a period of being opacity-only. The
// anti-slop rule survives in a different form: entrances still share ONE
// easing curve and stay entry-only, and the stamp remains the only overshoot.
export const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.65, ease: EASE },
};

// Child of `staggerContainer`.
export const riseChild = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: EASE },
};

// --- Word-mask heading reveal ------------------------------------------------
// Headline words rise out of their own overflow-hidden slots, one after the
// other. Used by <RevealHeading>. Container viewport is set by the component.
export const wordContainer = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.05 } },
};

export const wordChild = {
  initial: { y: '110%' },
  whileInView: { y: '0%', transition: { duration: 0.6, ease: EASE } },
};

// --- Image settle --------------------------------------------------------------
// Photos arrive slightly oversized and settle to rest. Apply to an <img>
// inside an overflow-hidden rounded wrapper (never to the wrapper itself:
// wrappers carry rings/tilts that scaling would distort or clip).
export const imageSettle = {
  initial: { scale: 1.16 },
  whileInView: { scale: 1, transition: { duration: 1.1, ease: EASE } },
  viewport: { once: true, amount: 0.25 },
};

export const staggerContainer = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.06 } },
  viewport: { once: true, amount: 0.15 },
};

// --- The signature ---------------------------------------------------------
// Posters and price stickers LAND. The poster wall already tilts each card in
// the markup, so this handles scale only and lets the tilt read as the card
// settling crooked - the way a sticker actually goes on.
// `custom` carries the card's resting tilt in degrees. The tilt is applied by
// the animation rather than a Tailwind `rotate-[]` class on purpose: Framer
// writes an inline `transform`, which would otherwise clobber Tailwind's
// transform chain and flatten every card. Animating from 0 to the tilt also
// means the card visibly settles crooked - the way a sticker actually goes on.
export const stampChild = {
  initial: { opacity: 0, scale: 0.86, rotate: 0 },
  whileInView: (tilt: number = 0) => ({
    opacity: 1,
    scale: 1,
    rotate: tilt,
    transition: { duration: 0.44, ease: STAMP_EASE },
  }),
};

export const stampContainer = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.085 } },
  viewport: { once: true, amount: 0.15 },
};

// The starburst price sticker itself - a harder, faster landing than the
// poster it sits on, so it reads as a second action.
export const stampSticker = {
  initial: { opacity: 0, scale: 0.5, rotate: -18 },
  whileInView: { opacity: 1, scale: 1, rotate: 0 },
  viewport: { once: true, amount: 0.4 },
  transition: { duration: 0.38, ease: STAMP_EASE, delay: 0.12 },
};

// Hero load-in: first paint only. One moment, not a page-wide pattern.
export const heroItem = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay, ease: EASE },
});
