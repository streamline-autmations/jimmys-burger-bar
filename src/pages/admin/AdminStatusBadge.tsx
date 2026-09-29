import React from 'react';
import { titleCase } from './adminUtils';

// Gold means "someone has to decide": a new order or a table request. Navy
// fill means the record is settled for the guest (ready, confirmed). Work in
// progress is a navy outline, and closed records stand down. Colour is never
// the only signal: every badge carries its own label.
const statusClasses: Record<string, string> = {
  new: 'bg-accent text-ink',
  pending: 'bg-accent text-ink',
  accepted: 'bg-primary/[0.08] text-primary ring-1 ring-inset ring-primary/30',
  preparing: 'bg-primary/[0.08] text-primary ring-1 ring-inset ring-primary/30',
  ready: 'bg-primary text-surface',
  confirmed: 'bg-primary text-surface',
  completed: 'bg-ink/[0.06] text-ink/70',
  cancelled: 'bg-surface text-ink/70 ring-1 ring-inset ring-ink/25',
};

const dotClasses: Record<string, string> = {
  new: 'bg-ink',
  pending: 'bg-ink',
  accepted: 'bg-primary',
  preparing: 'bg-primary',
  ready: 'bg-accent',
  confirmed: 'bg-accent',
  completed: 'bg-ink/40',
  cancelled: 'bg-ink/40',
};

export const AdminStatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ status, size = 'sm' }) => (
  <span
    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-bold transition-colors duration-200 ${
      size === 'md' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'
    } ${statusClasses[status] ?? 'bg-ink/[0.06] text-ink/70'}`}
  >
    <span className={`h-1.5 w-1.5 rounded-full ${dotClasses[status] ?? 'bg-ink/40'}`} aria-hidden="true" />
    {titleCase(status)}
  </span>
);
