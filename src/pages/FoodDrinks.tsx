import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Beer, Download, ShoppingBag, Utensils } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { config } from '../config';
import { fadeInUp } from '../lib/motion';
import { RevealHeading } from '../components/RevealHeading';
import { useStickyHeaderOffset } from '../lib/useStickyHeaderOffset';

type Board = 'food' | 'drinks';
type BoardItem = {
  name: string;
  description: string;
  price: string;
  popular?: boolean;
  tag?: string;
};
type BoardCategory = {
  name: string;
  note?: string;
  items: BoardItem[];
};

const boardMeta = {
  food: {
    eyebrow: 'From the kitchen',
    description: 'Breakfast, 180g burgers, plates for the table and the full kitchen board.',
    caption: 'Fresh off the grill.',
  },
  drinks: {
    eyebrow: 'From the bar',
    description: 'Cold local favourites, buckets, cocktails, wine and proper coffee.',
    caption: 'Straight from the bar.',
  },
} satisfies Record<Board, { eyebrow: string; description: string; caption: string }>;

const boardPanelVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction * 54,
    scale: 1.035,
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.62, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction * -42,
    scale: 0.985,
    transition: { duration: 0.34, ease: [0.4, 0, 1, 1] as const },
  }),
};

const foodCategories: BoardCategory[] = config.menu.categories.map((category) => ({
  name: category.name,
  note: category.note,
  items: category.items.map((item) => ({ ...item })),
}));

const drinksCategories: BoardCategory[] = config.drinks.categories.map((category) => ({
  name: category.name,
  note: 'note' in category ? category.note : undefined,
  items: category.items.map((item) => ({
    name: item.name,
    description: item.detail,
    price: item.price,
    popular: 'popular' in item ? item.popular : undefined,
    tag: 'tag' in item ? item.tag : undefined,
  })),
}));

export const FoodDrinks: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedBoard = searchParams.get('tab') === 'drinks' ? 'drinks' : 'food';
  const [board, setBoard] = useState<Board>(requestedBoard);
  const [boardDirection, setBoardDirection] = useState(requestedBoard === 'drinks' ? 1 : -1);
  const [activeCategory, setActiveCategory] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const stickyBelowHeader = useStickyHeaderOffset();
  const categoryRailRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const categories = useMemo(
    () => (board === 'food' ? foodCategories : drinksCategories),
    [board],
  );

  useEffect(() => {
    if (requestedBoard !== board) {
      setBoardDirection(requestedBoard === 'drinks' ? 1 : -1);
      setBoard(requestedBoard);
    }
  }, [board, requestedBoard]);

  useEffect(() => {
    setActiveCategory(categories[0]?.name ?? '');
  }, [categories]);

  useEffect(() => {
    let frame = 0;
    const updateActiveCategory = () => {
      frame = 0;
      const activationLine = window.innerWidth < 768 ? 150 : 170;
      let current = categories[0]?.name ?? '';

      categories.forEach((category) => {
        const section = document.getElementById(`board-${category.name}`);
        if (section && section.getBoundingClientRect().top <= activationLine) {
          current = category.name;
        }
      });

      setActiveCategory((previous) => (previous === current ? previous : current));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateActiveCategory);
    };

    updateActiveCategory();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [categories]);

  useEffect(() => {
    const activeButton = categoryRailRef.current?.querySelector<HTMLElement>(
      `[data-category="${CSS.escape(activeCategory)}"]`,
    );
    activeButton?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [activeCategory]);

  const selectBoard = (next: Board) => {
    if (next === board) return;
    setBoardDirection(next === 'drinks' ? 1 : -1);
    setBoard(next);
    setSearchParams(next === 'drinks' ? { tab: 'drinks' } : {}, { replace: true });
  };

  const scrollToCategory = (name: string) => {
    setActiveCategory(name);
    document
      .getElementById(`board-${name}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const downloadMenu = async () => {
    setIsGeneratingPdf(true);
    try {
      const { generateMenuPdf } = await import('../lib/generateMenuPdf');
      generateMenuPdf();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="pt-24 md:pt-28 min-h-screen bg-paper">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <motion.div
          {...fadeInUp}
          className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-8 lg:gap-14 items-end pb-10 md:pb-14"
        >
          <div className="relative">
            <span className="font-script text-2xl text-primary">the whole Jimmy&apos;s board</span>
            <RevealHeading
              as="h1"
              text="Food & drinks"
              className="font-display text-5xl sm:text-6xl md:text-7xl font-extrabold text-ink leading-[0.9] mt-2"
            />
            <div className="mt-6 min-h-[84px] max-w-lg overflow-hidden">
              <AnimatePresence mode="wait" initial={false} custom={shouldReduceMotion ? 0 : boardDirection}>
                <motion.div
                  key={board}
                  custom={shouldReduceMotion ? 0 : boardDirection}
                  variants={boardPanelVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-accent">
                    {boardMeta[board].eyebrow}
                  </span>
                  <p className="text-ink/60 text-base md:text-lg mt-2">
                    {boardMeta[board].description}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          <div className="relative h-[250px] md:h-[350px] overflow-hidden bg-ink rounded-2xl jimmy-media-frame">
            <AnimatePresence initial={false} custom={shouldReduceMotion ? 0 : boardDirection}>
              <motion.figure
                key={board}
                custom={shouldReduceMotion ? 0 : boardDirection}
                variants={boardPanelVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="absolute inset-0"
              >
                {board === 'food' ? (
                  <img
                    src="/images/campaign/gourmet-burger.webp"
                    alt="Jimmy's gourmet burger"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <video
                    src="/videos/drinks-pour-loop.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/5 to-transparent" />
                <figcaption className="absolute left-5 bottom-5 md:left-7 md:bottom-7 text-surface font-display font-extrabold text-2xl md:text-3xl">
                  {boardMeta[board].caption}
                </figcaption>
              </motion.figure>
            </AnimatePresence>
            <span className="absolute z-10 top-4 right-4 bg-accent text-ink px-3 py-1.5 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase shadow-lg">
              {board === 'food' ? 'Kitchen board' : 'Bar board'}
            </span>
          </div>
        </motion.div>

        <motion.div
          {...fadeInUp}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-8"
        >
          <div
            className="inline-grid grid-cols-2 rounded-full bg-ink/[0.06] p-1 self-start"
            role="tablist"
            aria-label="Choose a menu"
          >
            <button
              onClick={() => selectBoard('food')}
              className={`relative flex items-center gap-2 px-5 py-3 rounded-full font-display font-bold text-sm ${
                board === 'food' ? 'text-surface' : 'text-ink/60'
              }`}
            >
              {board === 'food' && (
                <motion.span
                  layoutId="board-switch"
                  className="absolute inset-0 rounded-full bg-primary -z-10"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <Utensils size={16} /> Food
            </button>
            <button
              onClick={() => selectBoard('drinks')}
              className={`relative flex items-center gap-2 px-5 py-3 rounded-full font-display font-bold text-sm ${
                board === 'drinks' ? 'text-surface' : 'text-ink/60'
              }`}
            >
              {board === 'drinks' && (
                <motion.span
                  layoutId="board-switch"
                  className="absolute inset-0 rounded-full bg-primary -z-10"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <Beer size={16} /> Drinks
            </button>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {board === 'food' && (
              <button
                onClick={downloadMenu}
                disabled={isGeneratingPdf}
                className="inline-flex items-center gap-2 border border-ink/20 text-ink px-5 py-3 rounded-full font-display font-bold text-sm hover:bg-ink hover:text-surface transition-colors disabled:opacity-50"
              >
                <Download size={16} />{' '}
                {isGeneratingPdf ? 'Preparing…' : 'Download PDF'}
              </button>
            )}
            <Link
              to="/order"
              className="inline-flex items-center gap-2 bg-accent text-ink px-5 py-3 rounded-full font-display font-bold text-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <ShoppingBag size={16} /> Order online
            </Link>
          </div>
        </motion.div>
      </div>

      <div
        className={`sticky ${
          stickyBelowHeader ? 'top-[64px]' : 'top-0'
        } z-30 border-y border-ink/10 bg-surface/95 backdrop-blur-md py-3 transition-[top] duration-300`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={board}
            ref={categoryRailRef}
            initial={{ opacity: 0, x: shouldReduceMotion ? 0 : boardDirection * 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: shouldReduceMotion ? 0 : boardDirection * -18 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto px-4 md:px-8 flex flex-nowrap gap-2 overflow-x-auto scrollbar-hide"
            aria-label={`${board === 'food' ? 'Food' : 'Drinks'} categories`}
          >
            {categories.map((category) => (
              <button
                key={category.name}
                data-category={category.name}
                onClick={() => scrollToCategory(category.name)}
                className={`shrink-0 px-4 py-2 rounded-full font-display font-bold text-sm transition-colors ${
                  activeCategory === category.name
                    ? 'bg-ink text-surface'
                    : 'bg-paper text-ink/60 hover:text-ink'
                }`}
              >
                {category.name}
              </button>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-16">
        <p className="text-sm text-ink/55 mb-5">
          Everything is listed below. Tap a category above to jump straight to it.
        </p>

        <div key={board}>
          {categories.map((category, categoryIndex) => (
            <motion.section
              key={category.name}
              id={`board-${category.name}`}
              {...fadeInUp}
              className={`scroll-mt-36 grid grid-cols-1 lg:grid-cols-[0.32fr_0.68fr] gap-7 lg:gap-16 py-10 md:py-14 px-4 md:px-8 -mx-4 md:-mx-8 mb-3 rounded-2xl ${
                categoryIndex % 2 === 0 ? 'bg-surface' : 'bg-accent/10'
              }`}
            >
              <div className="flex items-start justify-between gap-4 lg:block">
                <div>
                  <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary">
                    {String(categoryIndex + 1).padStart(2, '0')}
                  </span>
                  <h2 className="font-display text-3xl md:text-4xl font-extrabold leading-none mt-1 text-primary">
                    {category.name}
                  </h2>
                </div>
                {category.note && (
                  <span className="block font-script text-base text-right lg:text-left text-primary/70 lg:mt-4">
                    {category.note}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                {category.items.map((item) => (
                  <div key={item.name} className="group">
                    <div className="flex items-baseline gap-3">
                      <h3 className="font-display font-bold leading-snug">
                        {item.name}
                      </h3>
                      <div className="flex-1 border-b border-dotted border-ink/20 min-w-5 -translate-y-1" />
                      <span className="font-display font-bold whitespace-nowrap">
                        {item.price}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm leading-relaxed text-ink/55">
                        {item.description}
                      </p>
                      {(item.popular || item.tag) && (
                        <span className="shrink-0 text-[9px] uppercase tracking-wide font-bold bg-accent text-ink px-2 py-0.5 rounded-full">
                          {item.tag || 'Favourite'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          ))}
        </div>

        {board === 'food' && (
          <p className="text-center text-ink/45 text-sm mt-6">
            Kitchen extras: bacon R17, egg R15, cheese R10, extra patty R28.
          </p>
        )}
      </div>
    </div>
  );
};
