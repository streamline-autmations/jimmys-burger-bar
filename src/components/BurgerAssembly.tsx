import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { isIntroGateOpen, whenIntroDone } from '../lib/introGate';

type Layer = { id: string; src: string; alt: string; initial: { x: string; y: string; rotate: number; scale: number }; delay: number };

// All layers share one transparent canvas, so their final positions align exactly.
const layers: Layer[] = [
  { id: 'bottom-bun', src: '/images/burger-layers/burger-bottom-bun.webp', alt: 'Bottom bun', initial: { x: '-3%', y: '-112%', rotate: -7, scale: 0.9 }, delay: 0.7 },
  { id: 'salad', src: '/images/burger-layers/burger-salad-layer.webp', alt: 'Salad layer', initial: { x: '4%', y: '-126%', rotate: 6, scale: 0.9 }, delay: 1.28 },
  { id: 'patty-cheese', src: '/images/burger-layers/burger-patty&cheese.webp', alt: 'Patty and cheese layer', initial: { x: '-4%', y: '-140%', rotate: -5, scale: 0.88 }, delay: 1.86 },
  { id: 'top-bun', src: '/images/burger-layers/burger-top-bun.webp', alt: 'Top bun', initial: { x: '3%', y: '-154%', rotate: 5, scale: 0.9 }, delay: 2.44 },
];

const fallbackSrc = '/images/burger-layers/burger-complete.webp';

export const BurgerAssembly: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [introDone, setIntroDone] = useState(isIntroGateOpen);
  const [assembled, setAssembled] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  // On a first hard load the branded intro is the arrival moment, and this
  // ~3.9s build cannot also fit after it: letting it run late reveals a burger
  // with no bun, and holding it until the curtain lifts reveals an empty
  // outline for longer still. So when an intro is covering this load the burger
  // resolves instantly behind the curtain and the reveal exposes a hero that is
  // finished and steaming. On SPA navigation back to the home page there is no
  // curtain to hide behind, so the build plays in full exactly as designed.
  const skipBuild = useRef(!isIntroGateOpen()).current;
  const layersReady = imagesLoaded;
  const canAnimate = imagesLoaded && (skipBuild || introDone);

  useEffect(() => whenIntroDone(() => setIntroDone(true)), []);

  useEffect(() => {
    let loaded = 0;
    let cancelled = false;
    layers.forEach(({ src }) => {
      const image = new Image();
      image.onload = () => { loaded += 1; if (!cancelled && loaded === layers.length) setImagesLoaded(true); };
      image.src = src;
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!canAnimate) return;
    if (reduceMotion) {
      setAssembled(true);
      return;
    }
    if (skipBuild) {
      setAssembled(true);
      return;
    }
    const timer = window.setTimeout(() => setAssembled(true), 3150);
    return () => window.clearTimeout(timer);
  }, [canAnimate, reduceMotion, skipBuild]);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch' || reduceMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setPointer({ x: (event.clientX - bounds.left) / bounds.width - 0.5, y: (event.clientY - bounds.top) / bounds.height - 0.5 });
  };

  return (
    <div className="burger-stage relative isolate w-full max-w-[660px] mx-auto aspect-square" onPointerMove={handlePointerMove} onPointerLeave={() => setPointer({ x: 0, y: 0 })}>
      <div className="burger-heat-halo absolute inset-[10%]" aria-hidden="true" />
      <motion.div className="burger-outline absolute inset-0" initial={{ opacity: 0.5 }} animate={{ opacity: canAnimate ? 0 : 0.5 }} transition={{ duration: reduceMotion ? 0 : 0.32, delay: reduceMotion || skipBuild ? 0 : canAnimate ? 3.9 : 0 }} aria-hidden="true" />
      <motion.div className="absolute inset-0" animate={reduceMotion ? undefined : { rotateX: pointer.y * -5, rotateY: pointer.x * 6, x: pointer.x * 8, y: pointer.y * 6 }} transition={{ type: 'spring', stiffness: 90, damping: 18, mass: 0.7 }} style={{ transformStyle: 'preserve-3d' }}>
        <motion.div
          className="absolute inset-0"
          animate={
            assembled && !reduceMotion
              ? { scale: [1, 0.94, 1.055, 1], y: [0, 12, -5, 0], rotate: [0, -0.8, 0.4, 0] }
              : undefined
          }
          transition={{ duration: 0.72, times: [0, 0.24, 0.58, 1], ease: [0.22, 1, 0.36, 1] }}
        >
          {!layersReady && !fallbackFailed && <motion.img initial={{ opacity: 0, scale: 0.9, rotate: -3 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} src={fallbackSrc} alt="Jimmy's smash burger" onError={() => setFallbackFailed(true)} className="absolute inset-0 z-10 w-full h-full object-contain drop-shadow-[0_32px_24px_rgba(0,0,0,0.45)]" />}
          {layersReady && layers.map((layer) => <motion.img key={layer.id} src={layer.src} alt={layer.alt} initial={reduceMotion ? { opacity: 1 } : { opacity: 0, ...layer.initial }} animate={canAnimate ? { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 } : (reduceMotion ? { opacity: 1 } : { opacity: 0, ...layer.initial })} transition={reduceMotion || skipBuild ? { duration: 0 } : { type: 'spring', stiffness: 92, damping: 15, mass: 0.82, delay: layer.delay }} className="absolute inset-0 z-10 w-full h-full object-contain drop-shadow-[0_32px_24px_rgba(0,0,0,0.45)]" />)}
          {layersReady && (
            <motion.img
              src={fallbackSrc}
              alt=""
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: assembled ? 1 : 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.35, delay: reduceMotion ? 0 : 0.2 }}
              className="absolute inset-0 z-[11] w-full h-full object-contain drop-shadow-[0_36px_28px_rgba(0,0,0,0.52)]"
            />
          )}
        </motion.div>
        {canAnimate && !reduceMotion && <div className={`burger-steam ${assembled ? 'is-hot' : ''}`} aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>}
        {assembled && !reduceMotion && (
          <svg
            viewBox="0 0 300 240"
            className="absolute z-[9] left-[22%] -top-[3%] w-[56%] h-[46%] overflow-visible pointer-events-none"
            aria-hidden="true"
          >
            {[
              'M66 226 C24 177, 105 149, 58 94 C30 62, 61 36, 48 8',
              'M108 232 C73 189, 134 158, 98 110 C68 70, 117 45, 105 12',
              'M150 228 C116 183, 183 154, 144 101 C114 61, 166 39, 151 4',
              'M190 232 C158 190, 220 155, 184 111 C153 73, 204 46, 193 13',
              'M232 226 C198 181, 268 148, 224 96 C194 60, 243 37, 237 7',
            ].map((path, index) => (
              <motion.path
                key={path}
                d={path}
                fill="none"
                stroke="rgb(var(--color-surface))"
                strokeWidth={index % 2 === 0 ? 9 : 7}
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0, y: 18 }}
                animate={{ pathLength: [0, 0.72, 1, 1], opacity: [0, 0.9, 0.48, 0], y: [18, 0, -34, -68] }}
                transition={{
                  duration: 3.4 + index * 0.14,
                  delay: index * 0.38,
                  repeat: Infinity,
                  repeatDelay: 0.28,
                  ease: 'easeOut',
                  times: [0, 0.28, 0.68, 1],
                }}
                style={{ filter: 'blur(5px) drop-shadow(0 0 10px rgb(var(--color-surface) / 0.35))' }}
              />
            ))}
          </svg>
        )}
      </motion.div>
      {assembled && !reduceMotion && <div className="burger-impact-ring" aria-hidden="true" />}
      {assembled && !reduceMotion && <div className="burger-sizzle" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /></div>}
      <motion.div
        initial={{ opacity: 0, y: 12, rotate: 2 }}
        animate={{ opacity: assembled ? 1 : 0, y: assembled ? 0 : 12, rotate: assembled ? -2 : 2 }}
        transition={{ duration: reduceMotion ? 0 : 0.45, delay: reduceMotion ? 0 : 0.42 }}
        className="burger-fresh-ticket"
      >
        <span>Fresh off the flat-top</span>
        <strong>180g smash · Jimmy&apos;s sauce</strong>
      </motion.div>
      {fallbackFailed && !layersReady && <div className="absolute inset-[18%] z-10 rounded-full border border-surface/20 flex items-center justify-center text-center px-10 text-surface/60 text-sm">Burger layers loading soon</div>}
    </div>
  );
};
