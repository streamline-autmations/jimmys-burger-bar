import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

type TrailPoint = { id: number; x: number; y: number; angle: number };

// A deliberately small, desktop-only adaptation of the React Bits cursor trail.
// It is decorative, never captures clicks, and disappears for reduced motion.
export const TextCursor: React.FC = () => {
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const prefersReducedMotion = useReducedMotion();
  const lastPoint = useRef<TrailPoint | null>(null);
  const nextId = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion || window.matchMedia('(max-width: 767px)').matches) return;

    const onMove = (event: MouseEvent) => {
      const previous = lastPoint.current;
      const distance = previous ? Math.hypot(event.clientX - previous.x, event.clientY - previous.y) : 100;
      if (distance < 92) return;

      const point = {
        id: nextId.current++,
        x: event.clientX,
        y: event.clientY,
        angle: previous ? Math.atan2(event.clientY - previous.y, event.clientX - previous.x) * (180 / Math.PI) : 0,
      };
      lastPoint.current = point;
      setTrail((current) => [...current, point].slice(-4));
    };
    const clear = window.setInterval(() => setTrail((current) => current.slice(1)), 240);
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.clearInterval(clear);
    };
  }, [prefersReducedMotion]);

  return (
    <div className="burger-cursor" aria-hidden="true">
      <AnimatePresence>
        {trail.map((point) => (
          <motion.span
            key={point.id}
            initial={{ opacity: 0, scale: 0.5, x: point.x, y: point.y, rotate: point.angle }}
            animate={{ opacity: 0.95, scale: 1, x: point.x, y: point.y, rotate: point.angle }}
            exit={{ opacity: 0, scale: 0.25 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
          >
            🍔
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
};
