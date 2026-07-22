import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

type Layer = { id: string; src: string; alt: string; initial: { x: string; y: string; rotate: number; scale: number }; delay: number };

// All layers share one transparent canvas, so their final positions align exactly.
const layers: Layer[] = [
  { id: 'bottom-bun', src: '/images/burger-layers/burger-bottom-bun.webp', alt: 'Bottom bun', initial: { x: '7%', y: '54%', rotate: -9, scale: 0.84 }, delay: 0.85 },
  { id: 'salad', src: '/images/burger-layers/burger-salad-layer.webp', alt: 'Salad layer', initial: { x: '-22%', y: '34%', rotate: 8, scale: 0.88 }, delay: 1.5 },
  { id: 'patty-cheese', src: '/images/burger-layers/burger-patty&cheese.webp', alt: 'Patty and cheese layer', initial: { x: '23%', y: '-24%', rotate: -7, scale: 0.84 }, delay: 2.15 },
  { id: 'top-bun', src: '/images/burger-layers/burger-top-bun.webp', alt: 'Top bun', initial: { x: '-8%', y: '-56%', rotate: -8, scale: 0.78 }, delay: 2.8 },
];

const fallbackSrc = '/images/burger-layers/burger-complete.webp';

export const BurgerAssembly: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const [layersReady, setLayersReady] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let loaded = 0;
    let cancelled = false;
    layers.forEach(({ src }) => {
      const image = new Image();
      image.onload = () => { loaded += 1; if (!cancelled && loaded === layers.length) setLayersReady(true); };
      image.src = src;
    });
    return () => { cancelled = true; };
  }, []);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch' || reduceMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setPointer({ x: (event.clientX - bounds.left) / bounds.width - 0.5, y: (event.clientY - bounds.top) / bounds.height - 0.5 });
  };

  return (
    <div className="burger-stage relative isolate w-full max-w-[660px] mx-auto aspect-square" onPointerMove={handlePointerMove} onPointerLeave={() => setPointer({ x: 0, y: 0 })}>
      <motion.div className="burger-outline absolute inset-0" initial={{ opacity: 0.5 }} animate={{ opacity: layersReady ? 0 : 0.5 }} transition={{ duration: reduceMotion ? 0 : 0.32, delay: reduceMotion ? 0 : layersReady ? 3.9 : 0 }} aria-hidden="true" />
      <motion.div className="absolute inset-0" animate={reduceMotion ? undefined : { rotateX: pointer.y * -5, rotateY: pointer.x * 6, x: pointer.x * 8, y: pointer.y * 6 }} transition={{ type: 'spring', stiffness: 90, damping: 18, mass: 0.7 }} style={{ transformStyle: 'preserve-3d' }}>

        {!layersReady && !fallbackFailed && <motion.img initial={{ opacity: 0, scale: 0.9, rotate: -3 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} src={fallbackSrc} alt="Jimmy's smash burger" onError={() => setFallbackFailed(true)} className="absolute inset-0 z-10 w-full h-full object-contain drop-shadow-[0_32px_24px_rgba(0,0,0,0.45)]" />}
        {layersReady && layers.map((layer) => <motion.img key={layer.id} src={layer.src} alt={layer.alt} initial={reduceMotion ? { opacity: 1 } : { opacity: 0, ...layer.initial }} animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }} transition={{ duration: reduceMotion ? 0 : 1.55, delay: reduceMotion ? 0 : layer.delay, ease: [0.16, 1, 0.3, 1] }} className="absolute inset-0 z-10 w-full h-full object-contain drop-shadow-[0_32px_24px_rgba(0,0,0,0.45)]" />)}
        {layersReady && !reduceMotion && <div className="burger-steam" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>}
      </motion.div>
      {fallbackFailed && !layersReady && <div className="absolute inset-[18%] z-10 rounded-full border border-surface/20 flex items-center justify-center text-center px-10 text-surface/60 text-sm">Burger layers loading soon</div>}
    </div>
  );
};
