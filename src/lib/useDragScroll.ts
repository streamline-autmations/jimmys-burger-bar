import { useEffect, type RefObject } from 'react';
import { DESKTOP_QUERY } from './useDesktop';

// Mouse drag for horizontal rails on desktop.
//
// The rails are native overflow-x scrollers with the scrollbar hidden. That is
// right on a phone, where a swipe scrolls them, and a dead end on desktop: a
// mouse wheel scrolls the page, not the rail, so anything past the right edge
// was simply unreachable. Dragging restores access and, because it moves the
// rail's real scrollLeft, the existing velocity lean (useRailSkew) reacts to
// it the same way it reacts to a swipe.
//
// Mouse only, desktop only. Touch keeps native scrolling untouched.
export function useDragScroll<T extends HTMLElement>(ref: RefObject<T>) {
  useEffect(() => {
    const rail = ref.current;
    if (!rail) return;
    const desktop = window.matchMedia(DESKTOP_QUERY);

    let pointerId: number | null = null;
    let startX = 0;
    let startLeft = 0;
    let lastX = 0;
    let velocity = 0;
    let dragged = false;

    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0 || !desktop.matches) return;
      pointerId = event.pointerId;
      startX = lastX = event.clientX;
      startLeft = rail.scrollLeft;
      velocity = 0;
      dragged = false;
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      if (!dragged) {
        // A few pixels of slack so an ordinary click never turns into a drag.
        if (Math.abs(event.clientX - startX) < 5) return;
        dragged = true;
        rail.setPointerCapture(event.pointerId);
        rail.setAttribute('data-dragging', '');
      }
      velocity = event.clientX - lastX;
      lastX = event.clientX;
      rail.scrollLeft = startLeft - (event.clientX - startX);
    };

    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      if (!dragged) return;
      rail.removeAttribute('data-dragging');
      if (rail.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
      // Carry the last bit of hand speed so a flick glides instead of stopping dead.
      rail.scrollBy({ left: -velocity * 12, behavior: 'smooth' });
    };

    // A drag that ends over a link must not also follow it.
    const onClick = (event: MouseEvent) => {
      if (!dragged) return;
      event.preventDefault();
      event.stopPropagation();
      dragged = false;
    };

    // Stops the browser's image ghost-drag from hijacking the gesture.
    const onDragStart = (event: DragEvent) => {
      if (desktop.matches) event.preventDefault();
    };

    rail.addEventListener('pointerdown', onDown);
    rail.addEventListener('pointermove', onMove);
    rail.addEventListener('pointerup', onUp);
    rail.addEventListener('pointercancel', onUp);
    rail.addEventListener('click', onClick, true);
    rail.addEventListener('dragstart', onDragStart);
    return () => {
      rail.removeEventListener('pointerdown', onDown);
      rail.removeEventListener('pointermove', onMove);
      rail.removeEventListener('pointerup', onUp);
      rail.removeEventListener('pointercancel', onUp);
      rail.removeEventListener('click', onClick, true);
      rail.removeEventListener('dragstart', onDragStart);
    };
  }, [ref]);
}
