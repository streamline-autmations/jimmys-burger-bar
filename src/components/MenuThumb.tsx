import React from 'react';

/**
 * Square dish photo beside a menu item, on the menu board and the order page.
 * Items without a photo render nothing, so a section can gain photos one at a time.
 */
export const MenuThumb: React.FC<{ src?: string; alt: string }> = ({ src, alt }) => {
  if (!src) return null;
  return (
    <div className="shrink-0 w-[76px] h-[76px] md:w-[88px] md:h-[88px] overflow-hidden rounded-xl bg-ink/5 ring-1 ring-ink/10 shadow-[0_6px_18px_-10px_rgb(var(--color-ink)/0.45)]">
      <img
        src={src}
        alt={alt}
        width={240}
        height={240}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
    </div>
  );
};
