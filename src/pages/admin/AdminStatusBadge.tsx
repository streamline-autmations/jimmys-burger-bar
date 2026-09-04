import React from 'react';
import { titleCase } from './adminUtils';

const statusClasses: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  new: 'bg-blue-100 text-blue-800',
  accepted: 'bg-indigo-100 text-indigo-800',
  preparing: 'bg-amber-100 text-amber-800',
  ready: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-ink/10 text-ink/70',
  cancelled: 'bg-red-100 text-red-800',
};

export const AdminStatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[status] ?? 'bg-ink/10 text-ink/70'}`}
  >
    {titleCase(status)}
  </span>
);
