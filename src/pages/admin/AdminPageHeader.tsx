import React from 'react';
import { eyebrowClass } from './adminUtils';

export const AdminPageHeader: React.FC<{
  eyebrow?: string;
  title: string;
  count?: string;
  children?: React.ReactNode;
}> = ({ eyebrow, title, count, children }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
    <div className="min-w-0">
      {eyebrow && <p className={`${eyebrowClass} mb-1`}>{eyebrow}</p>}
      <h1 className="font-display text-[1.75rem] font-bold leading-tight text-primary sm:text-4xl">{title}</h1>
      {/* Reserved height, so the summary landing after the first load does not push the page down. */}
      <p className="mt-1 min-h-6 text-base font-medium text-ink/70">{count}</p>
    </div>
    {children}
  </div>
);
