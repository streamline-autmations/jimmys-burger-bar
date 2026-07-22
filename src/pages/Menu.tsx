import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { config } from '../config';
import { fadeInUp, staggerContainer, riseChild } from '../lib/motion';

// Styled after Jimmy's real printed menu: powder-blue board, ice-white
// category panels, chunky royal-blue headers and dotted price leaders.
export const Menu: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState(config.menu.categories[0].name);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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
      const offset = 130;
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <div className="pt-28 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <motion.div {...fadeInUp} className="max-w-lg mb-8">
          <span className="font-script text-2xl text-primary">the whole board</span>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold text-ink mt-1 mb-4">Jimmy's food</h1>
          <p className="text-ink/60 text-lg">Big breakfasts, 180g smash burgers and steaks off the grill. Real menu, real prices.</p>
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
      <div className="sticky top-[64px] z-40 bg-paper/95 backdrop-blur-md border-y border-ink/10 py-3 px-4 overflow-x-auto scrollbar-hide">
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

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true, amount: 0.02 }}
          className="columns-1 lg:columns-2 gap-6"
        >
          {config.menu.categories.map((category) => (
            <motion.section
              key={category.name}
              id={category.name}
              variants={riseChild}
              className="bg-surface rounded-2xl p-8 md:p-9 scroll-mt-40 shadow-[0_8px_30px_-14px_rgb(var(--color-ink)/0.2)] ring-1 ring-ink/[0.04] break-inside-avoid mb-6"
            >
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
