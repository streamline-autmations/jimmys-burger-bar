import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { config } from '../../config';
import { copy } from '../../core/tenant';

/**
 * The app's menu screen opens on one quiet picture: the same real chicken-burger
 * clip the website's Food & Drinks header uses, muted and looping, with the
 * brand line written once on top of it. It is the only place the tagline appears
 * in the app. It scrolls away with the page, so the menu is never pushed far.
 *
 * Poster first (it is the LCP and the reduced-motion still). The video is
 * mounted only after the page has settled, never with reduced motion or Data
 * Saver, and carries no audio track.
 */
export const MenuIntro: React.FC<{ heading: string; caption?: string }> = ({ heading, caption }) => {
  const food = config.pages.menu.food;
  const reduceMotion = useReducedMotion();
  const [mountVideo, setMountVideo] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (reduceMotion || saveData || !food.video) return;
    const id = window.setTimeout(() => setMountVideo(true), 600);
    return () => window.clearTimeout(id);
  }, [reduceMotion, food.video]);

  return (
    <section
      aria-label={heading}
      className="relative -mt-3 h-[clamp(176px,25svh,224px)] overflow-hidden bg-ink md:mx-8 md:mt-4 md:h-60 md:rounded-3xl lg:mx-auto lg:max-w-7xl"
    >
      <img
        src={food.image.src}
        alt=""
        width={1280}
        height={720}
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {mountVideo && food.video && (
        <video
          src={food.video}
          aria-hidden="true"
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          onPlaying={() => setPlaying(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${playing ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      {/* Navy scrim keeps the words readable over any frame of the loop. */}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-ink/85 via-ink/35 to-ink/10" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink/80 to-transparent" />

      <div className="relative flex h-full flex-col justify-between px-4 pb-3.5 pt-4 md:px-8 md:pb-5 md:pt-6">
        <div>
          <h1 className="font-display text-[2rem] font-extrabold leading-none text-paper md:text-5xl">{heading}</h1>
          <p className="mt-1 font-script text-[1.3rem] leading-tight text-accent [text-shadow:0_1px_12px_rgb(var(--color-ink)/0.7)] md:text-3xl">
            {copy.brand.tagline.toLowerCase()}
          </p>
        </div>
        {caption && <p className="max-w-[26ch] text-[13px] font-semibold leading-snug text-paper/90 md:max-w-md md:text-base">{caption}</p>}
      </div>
    </section>
  );
};
