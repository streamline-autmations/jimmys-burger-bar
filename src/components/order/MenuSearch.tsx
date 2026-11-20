import React from 'react';
import { Search, X } from 'lucide-react';

/** Dishes whose name or description contain every word typed. An empty query keeps everything. */
export const filterCategories = <C extends { items: { name: string; description?: string }[] }>(categories: C[], query: string): C[] => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return categories;
  return categories
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => {
        const text = `${item.name} ${item.description ?? ''}`.toLowerCase();
        return words.every((word) => text.includes(word));
      }),
    }))
    .filter((category) => category.items.length > 0);
};

/** The circular outlined button that sits at the left of the category rail and opens the search field. */
export const SearchButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Search the menu"
    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-ink/80 text-ink transition-transform duration-150 active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
  >
    <Search size={18} strokeWidth={2.4} aria-hidden="true" />
  </button>
);

/** Replaces the category rail while searching. Cancel puts the rail back. */
export const MenuSearch: React.FC<{ value: string; onChange: (value: string) => void; onClose: () => void }> = ({ value, onChange, onClose }) => (
  <form role="search" onSubmit={(event) => event.preventDefault()} className="flex items-center gap-2">
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">Search the menu</span>
      <Search size={18} strokeWidth={2.4} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/60" />
      <input
        type="search"
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}
        placeholder="Search the menu"
        enterKeyHint="search"
        autoComplete="off"
        className="h-11 w-full rounded-full bg-ink/[0.06] pl-10 pr-10 text-base font-medium text-ink placeholder:text-ink/60 [&::-webkit-search-cancel-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Clear search" className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-ink/70">
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </label>
    <button type="button" onClick={onClose} className="min-h-11 shrink-0 px-2 font-display text-sm font-bold text-primary underline underline-offset-2">Cancel</button>
  </form>
);
