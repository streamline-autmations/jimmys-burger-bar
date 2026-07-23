import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { config } from '../config';
import { fadeInUp, staggerContainer, riseChild } from '../lib/motion';
import { RevealHeading } from '../components/RevealHeading';
import { Doodle } from '../components/Doodle';
import { useHorizontalWheel } from '../lib/useHorizontalWheel';
import { useStickyHeaderOffset } from '../lib/useStickyHeaderOffset';

// Chalk-sketch watermark per category, drawn in Jimmy's royal blue.
const CATEGORY_DOODLES: Record<string, string> = {
  Breakfast: 'egg',
  Burgers: 'burger',
  'Small Plates': 'fries',
  Platters: 'platter',
  Steaks: 'steak',
  'Chicken Meals': 'drumstick',
  'Toasted Sandwiches': 'toastie',
  Salads: 'salad',
  Desserts: 'sundae',
};

// Styled after Jimmy's real printed menu: powder-blue board, ice-white
// category panels, chunky royal-blue headers and dotted price leaders.
export const Menu: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState(config.menu.categories[0].name);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const menuRailRef = useRef<HTMLDivElement>(null);
  const stickyBelowHeader = useStickyHeaderOffset();
  useHorizontalWheel(menuRailRef);

  // jsPDF (and its transitive html2canvas/purify deps) is a heavy library
  // that only a fraction of visitors will ever trigger, so it's dynamically
  // imported on click rather than bundled into the main chunk.
  const downloadMenu = async () => {
    setIsGeneratingPdf(true);
    try {
      const { generateMenuPdf } = await import('../lib/generateMenuPdf');
      generateMenuPdf();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const scrollToCategory = (name: string) => {
    setActiveCategory(name);
    const element = document.getElementById(name);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
  };

  return (
    <div className="pt-28 min-h-screen relative">
      {/* Faint sketches drifting in the page background, chalkboard-style */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <Doodle name="burger" className="absolute top-40 -right-8 w-44 h-44 text-primary/[0.07] rotate-12" />
        <Doodle name="fries" className="absolute top-[42%] -left-10 w-40 h-40 text-primary/[0.06] -rotate-12" />
        <Doodle name="steak" className="absolute bottom-64 right-6 w-36 h-36 text-primary/[0.06] rotate-6" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative">
        <motion.div {...fadeInUp} className="max-w-lg mb-8">
          <span className="font-script text-2xl text-primary">the whole board</span>
          <RevealHeading as="h1" text="Jimmy's food" className="font-display text-4xl md:text-6xl font-extrabold text-ink mt-1 mb-4" />
          <p className="text-ink/60 text-lg">Big breakfasts, 180g smash burgers and steaks off the grill. Real menu, real prices.</p>
        </motion.div>

        <motion.div {...fadeInUp} className="relative overflow-hidden bg-ink min-h-[260px] md:min-h-[330px] mb-12 grid grid-cols-1 md:grid-cols-[1fr_0.9fr] items-center">
          <div className="relative z-10 px-7 py-8 md:px-12 md:py-12 max-w-lg">
            <span className="text-xs font-bold tracking-[0.16em] uppercase text-accent">Fresh off the grill</span>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold text-surface leading-[0.95] mt-3">The menu starts with a proper burger.</h2>
          </div>
          <img src="/images/campaign/gourmet-burger.webp" alt="Gourmet burger from Jimmy's" loading="eager" className="absolute md:relative inset-0 md:inset-auto w-full h-full md:h-[330px] object-cover opacity-45 md:opacity-100 md:order-2" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-transparent md:hidden" />
        </motion.div>
        <motion.div {...fadeInUp} className="mb-12 flex flex-wrap items-center gap-3">
          <button
            onClick={downloadMenu}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-2.5 bg-ink text-paper pl-5 pr-2 py-2 rounded-full font-display font-bold text-sm transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-60 disabled:pointer-events-none shadow-lg shadow-ink/25"
          >
            <span>{isGeneratingPdf ? 'Preparing PDF…' : 'Download the menu'}</span>
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-paper/15">
              <Download size={15} />
            </span>
          </button>

          {config.features.ordering && (
            <Link
              to="/order"
              className="inline-flex items-center gap-2.5 bg-accent text-ink pl-5 pr-2 py-2 rounded-full font-display font-bold text-sm transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97] shadow-lg shadow-accent/25"
            >
              <span>Order Online</span>
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-ink/10">
                <ShoppingBag size={15} />
              </span>
            </Link>
          )}
        </motion.div>
      </div>

      {/* Category tabs */}
      <div className={`sticky ${stickyBelowHeader ? 'top-[64px]' : 'top-0'} z-40 bg-paper/95 backdrop-blur-md border-y border-ink/10 py-3 px-4 overflow-x-auto scrollbar-hide transition-[top] duration-300`}>
        <div className="max-w-7xl mx-auto flex items-center gap-2 md:justify-center min-w-max">
          {config.menu.categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => scrollToCategory(cat.name)}
              className={`relative px-5 py-2 rounded-full font-display font-bold text-sm transition-colors duration-200 active:scale-[0.96] ${
                activeCategory === cat.name ? 'text-surface' : 'bg-surface text-ink/60 hover:text-ink'
              }`}
            >
              {activeCategory === cat.name && (
                <motion.span
                  layoutId="menu-tab-pill"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  className="absolute inset-0 bg-primary rounded-full -z-10"
                />
              )}
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 overflow-hidden">
        <div className="flex items-center justify-between gap-4 mb-5">
          <p className="text-sm text-ink/60">Swipe on phone. Scroll, trackpad or drag on desktop.</p>
          <span className="hidden md:block text-xs font-bold tracking-[0.14em] uppercase text-primary">Scroll →</span>
        </div>
        <motion.div
          ref={menuRailRef}
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true, amount: 0.02 }}
          className="horizontal-rail flex items-start gap-4 md:gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-5 -mx-4 px-4 md:mx-0 md:px-0"
        >
          {config.menu.categories.map((category) => (
            <motion.section
              key={category.name}
              id={category.name}
              variants={riseChild}
              className="relative self-start shrink-0 w-[min(86vw,380px)] md:w-[430px] min-h-[420px] overflow-hidden bg-surface rounded-2xl p-7 md:p-9 scroll-mt-40 shadow-[0_8px_30px_-14px_rgb(var(--color-ink)/0.2)] ring-1 ring-ink/[0.04] snap-start"
            >
              {CATEGORY_DOODLES[category.name] && (
                <Doodle
                  name={CATEGORY_DOODLES[category.name]}
                  className="absolute -top-3 -right-3 w-24 h-24 text-primary/[0.13] rotate-12 pointer-events-none"
                />
              )}
              <div className="flex items-baseline justify-between gap-4 mb-1">
                <h2 className="font-display text-2xl md:text-[28px] font-extrabold text-primary">{category.name}</h2>
              </div>
              {category.note && (
                <p className="font-script text-secondary text-lg mb-6">{category.note}</p>
              )}

              <div className="space-y-5 mt-5">
                {category.items.map((item) => (
                  <div key={item.name} className="group">
                    <div className="flex items-baseline gap-3">
                      <h3 className="font-display font-bold text-ink leading-snug group-hover:text-primary transition-colors">
                        {item.name}
                      </h3>
                      <div className="flex-1 border-b-2 border-dotted border-ink/20 min-w-[24px] translate-y-[-4px]" />
                      <span className="font-display font-bold text-ink whitespace-nowrap">{item.price}</span>
                    </div>
                    <div className="flex items-center gap-2.5 mt-0.5 pr-14">
                      <p className="text-sm text-ink/55 leading-relaxed">{item.description}</p>
                      {item.popular && (
                        <span className="shrink-0 text-[10px] font-bold bg-accent/25 text-ink px-2 py-0.5 rounded-full">
                          Fan favourite
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          ))}
        </motion.div>

        <motion.p {...fadeInUp} className="text-center text-ink/50 text-sm mt-12">
          Kitchen extras: bacon R17, egg R15, cheese R10, extra patty R28.
        </motion.p>
      </div>
    </div>
  );
};
