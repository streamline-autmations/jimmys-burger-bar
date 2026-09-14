import React, { forwardRef, useId } from 'react';
import { AlertCircle } from 'lucide-react';

export interface SummaryItem {
  /** The id of the control to jump to. */
  fieldId: string;
  message: string;
}

/**
 * The list of problems shown after a failed submit.
 *
 * It receives focus on submit, so a screen reader hears how many things need
 * fixing and a sighted phone user is scrolled to it; each item jumps to its
 * field. The inline errors stay in place as well, because on a long mobile
 * form the summary is off screen by the time you reach the third field.
 */
export const ErrorSummary = forwardRef<HTMLDivElement, { items: SummaryItem[]; heading?: string }>(
  ({ items, heading }, ref) => {
    const titleId = useId();
    if (!items.length) return null;
    const title = heading ?? (items.length === 1 ? 'There is 1 thing to fix' : `There are ${items.length} things to fix`);

    const jump = (event: React.MouseEvent<HTMLAnchorElement>, fieldId: string) => {
      const field = document.getElementById(fieldId);
      if (!field) return;
      event.preventDefault();
      field.scrollIntoView({ block: 'center', behavior: 'smooth' });
      field.focus({ preventScroll: true });
    };

    return (
      <div
        ref={ref}
        tabIndex={-1}
        role="alert"
        aria-labelledby={titleId}
        className="scroll-mt-32 rounded-2xl border-2 border-ink bg-accent/15 p-4 text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <p id={titleId} className="flex items-center gap-2 font-display text-base font-bold">
          <AlertCircle size={18} aria-hidden="true" />
          {title}
        </p>
        <ul className="mt-2 space-y-1.5 pl-7 text-sm">
          {items.map((item) => (
            <li key={item.fieldId} className="list-disc">
              <a href={`#${item.fieldId}`} onClick={(event) => jump(event, item.fieldId)} className="font-semibold underline underline-offset-2">
                {item.message}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  },
);
ErrorSummary.displayName = 'ErrorSummary';
