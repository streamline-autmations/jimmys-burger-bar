import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { config } from '../../config';
import { copy } from '../../core/tenant';
import { STAMP_EASE } from '../../lib/motion';

const TILTS = [-1.4, 1.2, -0.8, 1.4];

export const MenuIntro: React.FC<{ heading: string; caption?: string }> = ({ heading, caption }) => {
  const promos = config.pages.menu.promos ?? [];
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (open !== null && el && !el.open) el.showModal();
  }, [open]);

  const shown = open !== null ? promos[open] : null;

  return (
    <div className="-mt-3 md:mt-0">
      <section
        aria-label={heading}
        className={`bg-ink px-4 pt-5 md:mx-8 md:mt-4 md:rounded-3xl md:px-8 md:pt-7 lg:mx-auto lg:max-w-7xl ${promos.length ? 'pb-9 md:pb-11' : 'pb-5 md:pb-7'}`}
      >
        <h1 className="font-display text-[2rem] font-extrabold leading-none text-paper md:text-5xl">{heading}</h1>
        <p className="mt-1 font-script text-[1.3rem] leading-tight text-accent md:text-3xl">
          {copy.brand.tagline.toLowerCase()}
        </p>
        {caption && <p className="mt-1.5 max-w-[34ch] text-[13px] font-semibold leading-snug text-paper/90 md:max-w-md md:text-base">{caption}</p>}
      </section>

      {promos.length > 0 && (
        <ul
          aria-label="Specials"
          className="relative -mt-7 flex snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto px-4 pb-3 pt-3 scrollbar-hide md:mx-auto md:-mt-8 md:max-w-7xl md:scroll-pl-8 md:px-8"
        >
          {promos.map((promo, index) => (
            <li key={promo.src} className="shrink-0 snap-start">
              <motion.button
                type="button"
                aria-haspopup="dialog"
                onClick={() => setOpen(index)}
                initial={{ opacity: 0, scale: 0.86, rotate: 0 }}
                animate={{ opacity: 1, scale: 1, rotate: TILTS[index % TILTS.length], transition: { duration: 0.44, ease: STAMP_EASE, delay: 0.1 + index * 0.085 } }}
                whileTap={{ scale: 0.96 }}
                className="block w-[212px] overflow-hidden rounded-xl bg-surface shadow-[0_10px_24px_-10px_rgb(var(--color-ink)/0.55)] ring-2 ring-surface md:w-[260px]"
              >
                <img src={promo.src} alt={promo.alt} width={720} height={540} loading="lazy" decoding="async" className="block aspect-[4/3] w-full object-cover" />
              </motion.button>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={dialog}
        onClose={() => setOpen(null)}
        onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}
        aria-label={shown?.alt ?? 'Special'}
        className="m-auto w-[min(94vw,720px)] max-w-none overflow-visible rounded-2xl bg-transparent p-0 backdrop:bg-ink/75"
      >
        {shown && (
          <div className="relative">
            <img src={shown.full} alt={shown.alt} className="block w-full rounded-2xl shadow-2xl" />
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Close"
              className="absolute -top-3 -right-2 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-ink shadow-lg active:scale-90"
            >
              <X size={20} strokeWidth={2.6} aria-hidden="true" />
            </button>
          </div>
        )}
      </dialog>
    </div>
  );
};
