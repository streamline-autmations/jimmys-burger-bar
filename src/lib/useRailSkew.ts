import { useEffect, useRef } from 'react';
import gsap from 'gsap';

// Velocity lean for the horizontal poster rails. This extends the "stamp"
// signature rather than adding a second one: the posters are stickers, and a
// sticker sheet dragged fast across a wall leans away from the drag before it
// settles flat again.
//
// The skew is applied to the rail TRACK, never the cards. Framer owns each
// card's inline transform (the stamp tilt + hover variants); a second writer
// on the same element would clobber it — see the transform gotcha in
// CLAUDE.md. The track element carries no Framer transform values, only
// stagger timing, so GSAP can own its transform safely.
export function useRailSkew<T extends HTMLElement>(maxSkew = 4) {
  const railRef = useRef<T>(null);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const skewTo = gsap.quickTo(rail, 'skewX', { duration: 0.5, ease: 'power3.out' });
    let lastX = rail.scrollLeft;
    let settle: number | undefined;

    const onScroll = () => {
      const x = rail.scrollLeft;
      const velocity = x - lastX;
      lastX = x;
      skewTo(gsap.utils.clamp(-maxSkew, maxSkew, -velocity * 0.22));
      // Ease back upright as soon as the fling stops feeding new velocity.
      if (settle !== undefined) window.clearTimeout(settle);
      settle = window.setTimeout(() => skewTo(0), 90);
    };

    rail.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      rail.removeEventListener('scroll', onScroll);
      if (settle !== undefined) window.clearTimeout(settle);
      gsap.killTweensOf(rail);
    };
  }, [maxSkew]);

  return railRef;
}
