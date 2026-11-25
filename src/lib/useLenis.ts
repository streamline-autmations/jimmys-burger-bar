import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let active: Lenis | null = null;

// A plain window.scrollTo loses to Lenis while it is still gliding: on the next
// frame it carries on to its old target, which lands the new page mid-way down.
export function jumpToTop() {
  if (active) active.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo(0, 0);
}

// Inertia smooth scroll for the whole site. Skipped entirely under
// prefers-reduced-motion so those users get native, instant scrolling.
//
// Driven by gsap.ticker rather than its own requestAnimationFrame loop so
// ScrollTrigger (used by the rail skew effect in scrollFx.ts) reads accurate
// positions during Lenis's inertia glide instead of lagging a frame behind.
export function useLenis() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      // Let the menu/drinks rails keep native touch swiping. Lenis still owns
      // every other scroll interaction on the page.
      prevent: (node) => node.classList?.contains('horizontal-rail') ?? false,
    });

    active = lenis;
    lenis.on('scroll', ScrollTrigger.update);

    const tickerCallback = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tickerCallback);
      if (active === lenis) active = null;
      lenis.destroy();
    };
  }, []);
}
