import { useEffect, useRef, useState } from 'react';

// Keeps a sticky category bar against the viewport while scrolling down, then
// drops it below the returning navbar as soon as the visitor scrolls up.
export function useStickyHeaderOffset() {
  const [belowHeader, setBelowHeader] = useState(true);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      if (currentY < 100 || currentY < lastY.current) setBelowHeader(true);
      else if (currentY > lastY.current) setBelowHeader(false);
      lastY.current = currentY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return belowHeader;
}
