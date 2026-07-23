import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Beer, Download, ShoppingBag, Utensils } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { config } from '../config';
import { fadeInUp, riseChild, staggerContainer } from '../lib/motion';
import { RevealHeading } from '../components/RevealHeading';
import { useHorizontalWheel } from '../lib/useHorizontalWheel';
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
  const railRef = useRef<HTMLDivElement>(null);
  const stickyBelowHeader = useStickyHeaderOffset();
  useHorizontalWheel(railRef);

  const categories = useMemo(
    () => (board === 'food' ? foodCategories : drinksCategories),
    [board],
  );

  useEffect(() => {
    setBoard(requestedBoard);
  }, [requestedBoard]);

  useEffect(() => {
    setActiveCategory(categories[0]?.name ?? '');
    railRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
  }, [categories]);

  const selectBoard = (next: Board) => {
    setBoard(next);
    setSearchParams(next === 'drinks' ? { tab: 'drinks' } : {}, { replace: true });
  };

  const scrollToCategory = (name: string) => {
    setActiveCategory(name);
    document.getElementById(`board-${name}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
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
        <motion.div {...fadeInUp} className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-8 lg:gap-14 items-end pb-10 md:pb-14">
          <div>
            <span className="font-script text-2xl text-primary">the whole Jimmy&apos;s board</span>
            <RevealHeading as="h1" text="Food & drinks" className="font-display text-5xl sm:text-6xl md:text-7xl font-extrabold text-ink leading-[0.9] mt-2" />
            <p className="text-ink/60 text-base md:text-lg max-w-lg mt-5">
              From breakfast and 180g burgers to the full bar list. Pick a board, then swipe it your way.
            </p>
          </div>
          <div className="relative h-[230px] md:h-[330px] overflow-hidden bg-ink">
            {board === 'food' ? (
              <img src="/images/campaign/gourmet-burger.webp" alt="Jimmy's gourmet burger" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <video src="/videos/drinks-pour-loop.mp4" autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
            <span className="absolute left-5 bottom-5 md:left-7 md:bottom-7 text-surface font-display font-extrabold text-2xl md:text-3xl">
              {board === 'food' ? 'Fresh off the grill.' : 'Straight from the bar.'}
            </span>
          </div>
        </motion.div>

        <motion.div {...fadeInUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-8">
          <div className="inline-grid grid-cols-2 rounded-full bg-ink/[0.06] p-1 self-start" role="tablist" aria-label="Choose a menu">
            <button onClick={() => selectBoard('food')} className={`relative flex items-center gap-2 px-5 py-3 rounded-full font-display font-bold text-sm ${board === 'food' ? 'text-surface' : 'text-ink/60'}`}>
              {board === 'food' && <motion.span layoutId="board-switch" className="absolute inset-0 rounded-full bg-primary -z-10" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
              <Utensils size={16} /> Food
            </button>
            <button onClick={() => selectBoard('drinks')} className={`relative flex items-center gap-2 px-5 py-3 rounded-full font-display font-bold text-sm ${board === 'drinks' ? 'text-surface' : 'text-ink/60'}`}>
              {board === 'drinks' && <motion.span layoutId="board-switch" className="absolute inset-0 rounded-full bg-primary -z-10" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
              <Beer size={16} /> Drinks
            </button>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {board === 'food' && (
              <button onClick={downloadMenu} disabled={isGeneratingPdf} className="inline-flex items-center gap-2 border border-ink/20 text-ink px-5 py-3 rounded-full font-display font-bold text-sm hover:bg-ink hover:text-surface transition-colors disabled:opacity-50">
                <Download size={16} /> {isGeneratingPdf ? 'Preparing…' : 'Download PDF'}
              </button>
            )}
            <Link to="/order" className="inline-flex items-center gap-2 bg-accent text-ink px-5 py-3 rounded-full font-display font-bold text-sm transition-transform hover:scale-[1.02] active:scale-[0.98]">
              <ShoppingBag size={16} /> Order online
            </Link>
          </div>
        </motion.div>
      </div>

      <div className={`sticky ${stickyBelowHeader ? 'top-[64px]' : 'top-0'} z-30 border-y border-ink/10 bg-paper/95 backdrop-blur-md py-3 overflow-x-auto scrollbar-hide transition-[top] duration-300`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex gap-2 min-w-max">
          {categories.map((category) => (
            <button key={category.name} onClick={() => scrollToCategory(category.name)} className={`px-4 py-2 rounded-full font-display font-bold text-sm transition-colors ${activeCategory === category.name ? 'bg-ink text-surface' : 'bg-surface text-ink/60 hover:text-primary'}`}>
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-16 overflow-hidden">
        <div className="flex items-center justify-between gap-4 mb-5">
          <p className="text-sm text-ink/55">Swipe on phone. On desktop, scroll over the board to move sideways.</p>
          <span className="hidden md:block text-xs font-bold tracking-[0.16em] uppercase text-primary">Explore →</span>
        </div>
        <motion.div
          key={board}
          ref={railRef}
          variants={staggerContainer}
          initial="initial"
          animate="whileInView"
          className="horizontal-rail flex items-start gap-4 md:gap-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-6 -mx-4 px-4 md:mx-0 md:px-0"
        >
          {categories.map((category, categoryIndex) => (
            <motion.section
              key={category.name}
              id={`board-${category.name}`}
              variants={riseChild}
              className={`relative self-start shrink-0 w-[min(88vw,390px)] md:w-[430px] min-h-[430px] overflow-hidden p-7 md:p-9 snap-start border ${categoryIndex % 3 === 0 ? 'bg-ink text-surface border-ink' : 'bg-surface text-ink border-ink/10'}`}
            >
              <div className="flex items-start justify-between gap-4 mb-7">
                <div>
                  <span className={`text-[10px] font-bold tracking-[0.18em] uppercase ${categoryIndex % 3 === 0 ? 'text-accent' : 'text-primary'}`}>0{categoryIndex + 1}</span>
                  <h2 className={`font-display text-3xl font-extrabold leading-none mt-1 ${categoryIndex % 3 === 0 ? 'text-surface' : 'text-primary'}`}>{category.name}</h2>
                </div>
                {category.note && <span className={`font-script text-base text-right ${categoryIndex % 3 === 0 ? 'text-secondary' : 'text-primary/70'}`}>{category.note}</span>}
              </div>

              <div className="space-y-5">
                {category.items.map((item) => (
                  <div key={item.name} className="group">
                    <div className="flex items-baseline gap-3">
                      <h3 className="font-display font-bold leading-snug">{item.name}</h3>
                      <div className={`flex-1 border-b border-dotted min-w-5 -translate-y-1 ${categoryIndex % 3 === 0 ? 'border-surface/25' : 'border-ink/20'}`} />
                      <span className="font-display font-bold whitespace-nowrap">{item.price}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className={`text-sm leading-relaxed ${categoryIndex % 3 === 0 ? 'text-paper/65' : 'text-ink/55'}`}>{item.description}</p>
                      {(item.popular || item.tag) && <span className="shrink-0 text-[9px] uppercase tracking-wide font-bold bg-accent text-ink px-2 py-0.5 rounded-full">{item.tag || 'Favourite'}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          ))}
        </motion.div>
        {board === 'food' && <p className="text-center text-ink/45 text-sm mt-6">Kitchen extras: bacon R17, egg R15, cheese R10, extra patty R28.</p>}
      </div>
    </div>
  );
};
