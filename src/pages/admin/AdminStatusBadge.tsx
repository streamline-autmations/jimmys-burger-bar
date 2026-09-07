import React from 'react';
import { LoaderCircle } from 'lucide-react';
import { controlClass, titleCase } from './adminUtils';

// Colour carries urgency, but never alone: each badge also shows a dot and its
// own label, so the state is legible without relying on colour perception.
const statusClasses: Record<string, string> = {
  pending: 'bg-accent/25 text-[#6b4708] ring-1 ring-accent/50',
  confirmed: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300',
  new: 'bg-primary text-surface ring-1 ring-primary',
  accepted: 'bg-sky-100 text-sky-900 ring-1 ring-sky-300',
  preparing: 'bg-accent/25 text-[#6b4708] ring-1 ring-accent/50',
  ready: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300',
  completed: 'bg-ink/[0.07] text-ink/60 ring-1 ring-ink/10',
  cancelled: 'bg-red-100 text-red-900 ring-1 ring-red-300',
};

const dotClasses: Record<string, string> = {
  pending: 'bg-accent',
  confirmed: 'bg-emerald-600',
  new: 'bg-accent',
  accepted: 'bg-sky-600',
  preparing: 'bg-accent',
  ready: 'bg-emerald-600',
  completed: 'bg-ink/40',
  cancelled: 'bg-red-600',
};

export const AdminStatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
      statusClasses[status] ?? 'bg-ink/[0.07] text-ink/60 ring-1 ring-ink/10'
    }`}
  >
    <span className={`h-1.5 w-1.5 rounded-full ${dotClasses[status] ?? 'bg-ink/40'}`} aria-hidden="true" />
    {titleCase(status)}
  </span>
);

/**
 * The single control for changing a record's state.
 *
 * The badge above it is the current state and the select is the action, which
 * is why the select carries its own visible "Change status" label rather than
 * simply repeating the value the badge already shows.
 */
export const AdminStatusControl = <T extends string>({
  id,
  value,
  options,
  saving,
  error,
  describedAs,
  onChange,
}: {
  id: string;
  value: T;
  options: readonly T[];
  saving: boolean;
  error?: string;
  describedAs: string;
  onChange: (next: T) => void;
}) => (
  <div>
    <label
      htmlFor={id}
      className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink/45"
    >
      Change status
      {saving && (
        <span className="inline-flex items-center gap-1 font-semibold normal-case tracking-normal text-ink/55" role="status">
          <LoaderCircle className="animate-spin" size={12} aria-hidden="true" />
          Saving
        </span>
      )}
    </label>
    <select
      id={id}
      value={value}
      disabled={saving}
      onChange={(event) => onChange(event.target.value as T)}
      aria-label={describedAs}
      className={controlClass}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {titleCase(option)}
        </option>
      ))}
    </select>
    {error && (
      <p className="mt-1.5 text-xs font-medium text-red-700" role="alert">
        {error}
      </p>
    )}
  </div>
);
