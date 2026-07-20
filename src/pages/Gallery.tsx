import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { fadeInUp, staggerContainer, riseChild, EASE } from '../lib/motion';

type Category = 'Food' | 'Atmosphere' | 'People';

interface GalleryPhoto {
  src: string;
  caption: string;
  category: Category;
  tall?: boolean;
}

const photos: GalleryPhoto[] = [
  { src: '/images/gallery/burger-macro.jpg', caption: 'Smash burger, fresh off the press', category: 'Food', tall: true },
  { src: '/images/gallery/corona-sunset.jpg', caption: 'Sunset at the bar', category: 'Atmosphere' },
  { src: '/images/gallery/greek-meze.jpg', caption: 'The Greek platter, built for sharing', category: 'Food' },
  { src: '/images/gallery/heritage-day-team.jpg', caption: 'Heritage Day at Jimmy\'s', category: 'People', tall: true },
  { src: '/images/gallery/breakfast-plate.jpg', caption: 'Big breakfasts, every day', category: 'Food' },
  { src: '/images/gallery/fireplace-corner.jpg', caption: 'The fireplace corner', category: 'Atmosphere', tall: true },
  { src: '/images/gallery/grilled-chicken.jpg', caption: 'Off the flame, rice and creamed spinach', category: 'Food' },
  { src: '/images/gallery/quesadilla-corona.jpg', caption: 'Quesadillas and an ice-cold Corona', category: 'Food', tall: true },
  { src: '/images/gallery/regulars.jpg', caption: 'Jimmy\'s crew', category: 'People' },
  { src: '/images/gallery/braised-plate.jpg', caption: 'Slow-braised and proper', category: 'Food' },
  { src: '/images/gallery/souvlaki-sandwich.jpg', caption: 'Chicken souvlaki, stacked high', category: 'Food', tall: true },
  { src: '/images/gallery/owner-friend.jpg', caption: 'Regulars at the bar', category: 'People' },
  { src: '/images/gallery/curry-rice.jpg', caption: 'Curry night at Jimmy\'s', category: 'Food' },
  { src: '/images/gallery/braai-plate.jpg', caption: 'Off the braai', category: 'Food', tall: true },
  { src: '/images/gallery/burger-duo.jpg', caption: 'Burgers for the table', category: 'Food' },
];

const categories: Array<'All' | Category> = ['All', 'Food', 'Atmosphere', 'People'];

export const Gallery: React.FC = () => {
  const [active, setActive] = useState<'All' | Category>('All');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filtered = active === 'All' ? photos : photos.filter((p) => p.category === active);

  const openLightbox = (photo: GalleryPhoto) => {
    setLightboxIndex(filtered.findIndex((p) => p.src === photo.src));
  };

  const closeLightbox = () => setLightboxIndex(null);
  const showNext = () => setLightboxIndex((i) => (i === null ? null : (i + 1) % filtered.length));
  const showPrev = () => setLightboxIndex((i) => (i === null ? null : (i - 1 + filtered.length) % filtered.length));

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') showNext();
      if (e.key === 'ArrowLeft') showPrev();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightboxIndex, filtered.length]);

  const current = lightboxIndex !== null ? filtered[lightboxIndex] : null;

  return (
    <div className="pt-28 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <motion.div {...fadeInUp} className="max-w-xl mb-10">
          <span className="font-script text-2xl text-primary">the food, the crowd, the place</span>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold text-ink mt-1 mb-4">Gallery</h1>
          <p className="text-ink/60 text-lg">
            Real plates, real regulars, real Jimmy's. Straight off the pass and the poster wall.
          </p>
        </motion.div>

        <motion.div {...fadeInUp} className="flex flex-wrap gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`relative px-5 py-2 rounded-full font-display font-bold text-sm transition-colors duration-200 active:scale-[0.96] ${
                active === cat ? 'text-surface' : 'bg-surface text-ink/60 hover:text-ink ring-1 ring-ink/[0.06]'
              }`}
            >
              {active === cat && (
                <motion.span
                  layoutId="gallery-filter-pill"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  className="absolute inset-0 bg-primary rounded-full shadow-md shadow-primary/25 -z-10"
                />
              )}
              {cat}
            </button>
          ))}
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 pb-24">
        <motion.div
          key={active}
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true, amount: 0.02 }}
          className="columns-1 sm:columns-2 lg:columns-3 gap-4"
        >
          {filtered.map((photo) => (
            <motion.button
              key={photo.src}
              variants={riseChild}
              onClick={() => openLightbox(photo)}
              className={`group relative block w-full mb-4 rounded-2xl overflow-hidden break-inside-avoid ring-1 ring-ink/[0.06] shadow-[0_8px_30px_-14px_rgb(var(--color-ink)/0.25)] ${
                photo.tall ? 'aspect-[3/4]' : 'aspect-[4/3]'
              }`}
            >
              <img
                src={photo.src}
                alt={photo.caption}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="absolute bottom-0 left-0 right-0 p-4 text-left text-surface text-sm font-medium opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                {photo.caption}
              </span>
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {current && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] bg-ink/95 backdrop-blur-md flex items-center justify-center p-4 md:p-10"
            onClick={closeLightbox}
          >
            <button
              onClick={closeLightbox}
              aria-label="Close"
              className="absolute top-5 right-5 md:top-8 md:right-8 text-paper/70 hover:text-paper transition-colors p-2 rounded-full hover:bg-paper/10"
            >
              <X size={26} />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); showPrev(); }}
              aria-label="Previous photo"
              className="absolute left-3 md:left-8 top-1/2 -translate-y-1/2 text-paper/70 hover:text-paper transition-colors p-2.5 rounded-full hover:bg-paper/10"
            >
              <ChevronLeft size={28} />
            </button>

            <motion.figure
              key={current.src}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="max-w-4xl w-full flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={current.src}
                alt={current.caption}
                className="max-h-[75vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
              />
              <figcaption className="mt-5 text-paper/80 font-medium text-center">{current.caption}</figcaption>
            </motion.figure>

            <button
              onClick={(e) => { e.stopPropagation(); showNext(); }}
              aria-label="Next photo"
              className="absolute right-3 md:right-8 top-1/2 -translate-y-1/2 text-paper/70 hover:text-paper transition-colors p-2.5 rounded-full hover:bg-paper/10"
            >
              <ChevronRight size={28} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
