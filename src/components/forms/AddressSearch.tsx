import React, { useEffect, useId, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import type { ControlProps } from './FormField';
import { searchUrl, splitHouseNumber, toSuggestions, type AddressSuggestion } from '../../lib/addressSearch';

/**
 * A street address input that suggests real addresses as the guest types (ARIA
 * combobox). Tapping one fills the field. If the search is slow or offline the
 * list simply does not appear and the field works as a plain text input.
 */
export const AddressSearch: React.FC<{
  control: ControlProps;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  onPick: (suggestion: AddressSuggestion) => void;
  near: { lat: number; lon: number };
  placeholder?: string;
}> = ({ control, value, onChange, onBlur, onPick, near, placeholder }) => {
  const listId = useId();
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // Only search what the guest typed, not what a pick wrote into the field.
  const typed = useRef(false);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!typed.current) return;
    const { number, street } = splitHouseNumber(value);
    if (street.length < 3) { setSuggestions([]); return; }
    const abort = new AbortController();
    pending.current = abort;
    const timer = setTimeout(() => {
      fetch(searchUrl(street, near), { signal: abort.signal })
        .then((res) => (res.ok ? res.json() : { features: [] }))
        .then((body) => { setSuggestions(toSuggestions(body.features ?? [], number)); setActive(-1); })
        .catch(() => { if (!abort.signal.aborted) setSuggestions([]); });
    }, 300);
    return () => { clearTimeout(timer); abort.abort(); };
  }, [value, near]);

  const pick = (suggestion: AddressSuggestion) => {
    typed.current = false;
    pending.current?.abort();
    setOpen(false);
    setSuggestions([]);
    onPick(suggestion);
  };

  const expanded = open && suggestions.length > 0;
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!expanded) {
      if (e.key === 'ArrowDown' && suggestions.length) { e.preventDefault(); setOpen(true); }
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = suggestions.length;
      setActive((i) => (i < 0 ? (e.key === 'ArrowDown' ? 0 : n - 1) : (i + (e.key === 'ArrowDown' ? 1 : -1) + n) % n));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      pick(suggestions[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <input
        {...control}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="address-line1"
        maxLength={250}
        value={value}
        onChange={(e) => { typed.current = true; setSuggestions([]); setActive(-1); setOpen(true); onChange(e.target.value); }}
        onKeyDown={onKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => { setOpen(false); onBlur(); }}
        placeholder={placeholder}
        className="form-input"
      />
      <ul
        id={listId}
        role="listbox"
        aria-label="Address suggestions"
        hidden={!expanded}
        className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-ink/10 bg-surface py-1 shadow-[0_8px_24px_rgb(var(--color-ink)/0.12)]"
      >
        {suggestions.map((s, i) => (
          <li
            key={s.label}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            // mousedown would blur the input (and close the list) before the click lands.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick(s)}
            className={`flex min-h-11 cursor-pointer items-start gap-2.5 px-3 py-2.5 font-body text-ink ${i === active ? 'bg-accent/20' : 'hover:bg-paper'}`}
          >
            <MapPin size={16} className="mt-0.5 shrink-0 text-ink/50" aria-hidden="true" />
            <span>
              <span className="block text-sm font-semibold">{s.label}</span>
              {s.detail && <span className="block text-xs font-medium text-ink/60">{s.detail}</span>}
            </span>
          </li>
        ))}
        <li role="presentation" className="px-3 pb-1 pt-1.5 text-right font-body text-[11px] font-medium text-ink/50">
          Addresses © OpenStreetMap contributors
        </li>
      </ul>
    </div>
  );
};
