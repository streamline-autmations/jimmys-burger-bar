import { useEffect, type RefObject } from 'react';

// Makes a horizontal rail behave naturally with a mouse wheel or trackpad.
// Touch users still use the browser's native horizontal swipe.
export function useHorizontalWheel<T extends HTMLElement>(ref: RefObject<T | null>) {
  useEffect(() => {
    const rail = ref.current;
    if (!rail) return;

    const onWheel = (event: WheelEvent) => {
      if (rail.scrollWidth <= rail.clientWidth) return;
      const distance = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!distance) return;
      event.preventDefault();
      event.stopPropagation();
      rail.scrollBy({ left: distance, behavior: 'smooth' });
    };

    rail.addEventListener('wheel', onWheel, { passive: false });
    return () => rail.removeEventListener('wheel', onWheel);
  }, [ref]);
}
