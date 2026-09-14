import { nextStatuses } from './operations';
import React from 'react';
import { titleCase } from './adminUtils';

// Colour carries urgency, but never alone: each badge also shows a dot and its
// own label, so the state is legible without relying on colour perception.
const statusClasses: Record<string, string> = {
  pending: 'bg-accent/25 text-ink ring-1 ring-accent/50',
  confirmed: 'bg-primary text-surface ring-1 ring-primary',
  new: 'bg-primary text-surface ring-1 ring-primary',
  accepted: 'bg-ink/10 text-ink ring-1 ring-ink/20',
  preparing: 'bg-accent/25 text-ink ring-1 ring-accent/50',
  ready: 'bg-primary text-surface ring-1 ring-primary',
  completed: 'bg-ink/[0.07] text-ink/65 ring-1 ring-ink/10',
  cancelled: 'bg-surface text-ink ring-1 ring-ink/30',
};

const dotClasses: Record<string, string> = {
  pending: 'bg-accent',
  confirmed: 'bg-accent',
  new: 'bg-accent',
  accepted: 'bg-primary',
  preparing: 'bg-accent',
  ready: 'bg-accent',
  completed: 'bg-ink/40',
  cancelled: 'bg-ink',
};

export const AdminStatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
      statusClasses[status] ?? 'bg-ink/[0.07] text-ink/65 ring-1 ring-ink/10'
    }`}
  >
    <span className={`h-1.5 w-1.5 rounded-full ${dotClasses[status] ?? 'bg-ink/40'}`} aria-hidden="true" />
    {titleCase(status)}
  </span>
);

/** Show only permitted next steps; closing a record requires confirmation. */
export const AdminStatusControl = <T extends string>({
  value,
  options,
  disabled,
  saving,
  error,
  describedAs,
  onChange,
}: {
  value: T;
  options: readonly T[];
  disabled: boolean;
  saving: boolean;
  error?: string;
  describedAs: string;
  onChange: (next: T) => void;
}) => {
  const actions = nextStatuses(value).filter((next) => options.includes(next as T));
  const labels: Record<string, string> = { accepted: 'Accept order', preparing: 'Start preparing', ready: 'Mark ready', completed: 'Complete order', confirmed: 'Confirm booking', cancelled: 'Cancel request' };
  return <div role="group" aria-label={describedAs}>
    <div className="flex flex-wrap gap-2">
      {actions.map((next) => <button key={next} type="button" disabled={disabled} className={`min-h-11 rounded-xl px-3 text-sm font-bold disabled:opacity-50 ${next === 'cancelled' ? 'border border-ink/25 bg-surface text-ink' : 'bg-primary text-surface'}`} onClick={() => {
        if ((next === 'cancelled' || next === 'completed') && !window.confirm(`${labels[next]}? ${describedAs}. This closes the record and cannot be undone here.`)) return;
        onChange(next as T);
      }}>{labels[next]}</button>)}
    </div>
    {!actions.length && <p className="text-sm text-ink/70">Closed record</p>}
    {saving && <p role="status" className="mt-2 text-sm">Saving…</p>}
    {error && <p className="mt-2 text-sm text-ink" role="alert">{error}</p>}
  </div>;
};
