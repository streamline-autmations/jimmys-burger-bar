import React from 'react';
import { eyebrowClass } from './adminUtils';

export const AdminPageHeader: React.FC<{
  eyebrow: string;
  title: string;
  count?: string;
  children?: React.ReactNode;
}> = ({ eyebrow, title, count, children }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
    <div>
      <p className={eyebrowClass}>{eyebrow}</p>
      <h1 className="mt-1 font-display text-[1.75rem] font-bold leading-tight text-primary sm:text-4xl">
        {title}
      </h1>
      {count && <p className="mt-1 text-sm font-medium text-ink/55">{count}</p>}
    </div>
    {children}
  </div>
);
