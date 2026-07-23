import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
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
  const [activeCategory, setActiveCategory] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const stickyBelowHeader = useStickyHeaderOffset();

  const categories = useMemo(
    () => (board === 'food' ? foodCategories : drinksCategories),
    [board],
  );

  useEffect(() => {
    setBoard(requestedBoard);
  }, [requestedBoard]);

  useEffect(() => {
    setActiveCategory(categories[0]?.name ?? '');
  }, [categories]);

  const selectBoard = (next: Board) => {
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
    <div className="pt-24 md:pt-28 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <motion.div
          {...fadeInUp}
          className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-8 lg:gap-14 items-end pb-10 md:pb-14"
        >
          <div>
            <span className="font-script text-2xl text-primary">
              the whole Jimmy&apos;s board
            </span>
            <RevealHeading
              as="h1"
              text="Food & drinks"
              className="font-display text-5xl sm:text-6xl md:text-7xl font-extrabold text-ink leading-[0.9] mt-2"
            />
            <p className="text-ink/60 text-base md:text-lg max-w-lg mt-5">
              From breakfast and 180g burgers to the full bar list. Pick food or
              drinks, then scroll through the full board.
            </p>
          </div>
          <div className="relative h-[230px] md:h-[330px] overflow-hidden bg-ink">
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
            <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
            <span className="absolute left-5 bottom-5 md:left-7 md:bottom-7 text-surface font-display font-extrabold text-2xl md:text-3xl">
              {board === 'food'
                ? 'Fresh off the grill.'
                : 'Straight from the bar.'}
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
        className={`md:sticky ${
          stickyBelowHeader ? 'md:top-[64px]' : 'md:top-0'
        } z-30 border-y border-ink/10 bg-paper/95 backdrop-blur-md py-3 transition-[top] duration-300`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.name}
              onClick={() => scrollToCategory(category.name)}
              className={`px-4 py-2 rounded-full font-display font-bold text-sm transition-colors ${
                activeCategory === category.name
                  ? 'bg-ink text-surface'
                  : 'bg-surface text-ink/60 hover:text-primary'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-16">
        <p className="text-sm text-ink/55 mb-5">
          Everything is listed below. Tap a category above to jump straight to it.
        </p>

        <div key={board} className="border-t border-ink/10">
          {categories.map((category, categoryIndex) => (
            <motion.section
              key={category.name}
              id={`board-${category.name}`}
              {...fadeInUp}
              className="scroll-mt-24 md:scroll-mt-36 grid grid-cols-1 lg:grid-cols-[0.32fr_0.68fr] gap-7 lg:gap-16 py-10 md:py-14 border-b border-ink/10"
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
