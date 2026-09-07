// Entry point, deliberately kept free of heavy imports.
//
// Measured on a cold production load: domInteractive at 11ms but first paint at
// 744ms. The gap is this bundle's own parse and execute cost - React, Framer,
// GSAP, Lenis and Supabase all evaluate before the browser gets a chance to
// paint - which left the branded boot layer in index.html invisible for the
// entire window it exists to cover, and the visitor on a blank screen.
//
// Yielding two frames before importing the app lets the browser paint Stage 1
// of the intro first, then evaluate everything else behind it. Vite splits the
// dynamic import into its own chunk, so this file stays tiny.
//
// The timeout is a fallback for the background-tab case, where rAF never fires
// and the app would otherwise never start at all.
let started = false;

const start = () => {
  if (started) return;
  started = true;
  void import('./bootstrap');
};

requestAnimationFrame(() => requestAnimationFrame(start));
window.setTimeout(start, 250);
