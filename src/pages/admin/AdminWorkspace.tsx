import React from 'react';
import { Check, CircleCheck, LoaderCircle, Search } from 'lucide-react';
import { nextStatuses } from './operations';
import { controlClass, formatTimeOnly, titleCase } from './adminUtils';

// ---------------------------------------------------------------------------
// The queue + ticket workspace shared by Orders and Bookings.
//
// A queue on the left says what is waiting; the ticket on the right says
// everything about ONE record and offers exactly one next step. Below lg the
// ticket opens inline under the row that was tapped, so a phone on the floor
// never loses its place in the list.
// ---------------------------------------------------------------------------

/** Two panes on desktop. The ticket sticks while the queue scrolls. Pass `ticket={null}` below lg. */
export const WorkspaceSplit: React.FC<{ queue: React.ReactNode; ticket: React.ReactNode }> = ({ queue, ticket }) => (
  <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(420px,min(42%,560px))] xl:gap-6">
    <div className="min-w-0">{queue}</div>
    {ticket && (
      <aside aria-label="Selected record" className="sticky top-7">
        {ticket}
      </aside>
    )}
  </div>
);

/** Status segments with live counts. Counts are of LOADED records, like the search. */
export function QueueFilter<T extends string>({
  label,
  options,
  value,
  counts,
  onChange,
  names = {},
}: {
  label: string;
  options: readonly T[];
  value: T;
  counts: Record<string, number>;
  onChange: (value: T) => void;
  names?: Partial<Record<string, string>>;
}) {
  return (
    <div role="group" aria-label={label} className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-ink/[0.05] p-1">
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option)}
            className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm font-bold transition-colors duration-150 ${
              active ? 'bg-surface text-primary shadow-sm ring-1 ring-ink/10' : 'text-ink/70 hover:bg-surface/60 hover:text-ink'
            }`}
          >
            {names[option] ?? titleCase(option)}
            {/* No count until records have loaded: a "0" would claim the queue is empty. */}
            {'all' in counts && (
              <span
                className={`min-w-6 rounded-md px-1.5 text-center text-xs tabular-nums ${
                  active ? 'bg-primary text-surface' : 'bg-ink/[0.07] text-ink/70'
                }`}
              >
                {counts[option] ?? 0}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Search and date view, on one line with the status filter above them on narrow screens. */
export const QueueToolbar: React.FC<{
  filter: React.ReactNode;
  search: string;
  onSearch: (value: string) => void;
  view: string;
  views: { value: string; label: string }[];
  onView: (value: string) => void;
  viewDisabled: boolean;
}> = ({ filter, search, onSearch, view, views, onView, viewDisabled }) => (
  <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2.5">
    <div className="min-w-0 max-w-full">{filter}</div>
    {/* Search and view travel together: they wrap under the filter as a pair rather than squeezing. */}
    <div className="flex min-w-[min(100%,21rem)] flex-1 items-center gap-2">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Search loaded records by name, contact or reference</span>
        <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50" />
        <input
          type="search"
          className={`${controlClass} bg-surface pl-9`}
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Name, phone or reference"
        />
      </label>
      <label className="shrink-0">
        <span className="sr-only">Which records to show</span>
        <select
          disabled={viewDisabled}
          className={`${controlClass} w-auto bg-surface pr-8 font-bold`}
          value={view}
          onChange={(event) => onView(event.target.value)}
        >
          {views.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
    </div>
  </div>
);

/**
 * The real status sequence, drawn as a rail. It is what makes "Accepted"
 * unambiguous: the guest can see it is one step of several, not "ready".
 */
export const ProgressRail: React.FC<{ steps: readonly string[]; current: string; labels?: Partial<Record<string, string>> }> = ({
  steps,
  current,
  labels = {},
}) => {
  const at = steps.indexOf(current);
  return (
    <ol className="flex items-start" aria-label="Progress">
      {steps.map((step, index) => {
        const done = index < at;
        const now = index === at;
        return (
          <li key={step} className="relative flex flex-1 flex-col items-center text-center" aria-current={now ? 'step' : undefined}>
            {index > 0 && (
              <span
                aria-hidden="true"
                className={`absolute left-[calc(-50%+16px)] right-[calc(50%+16px)] top-[11px] h-0.5 rounded-full transition-colors duration-200 ${
                  index <= at ? 'bg-primary' : 'bg-ink/15'
                }`}
              />
            )}
            <span
              className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-colors duration-200 ${
                done
                  ? 'bg-primary text-surface'
                  : now
                    ? 'bg-accent text-ink ring-4 ring-accent/25'
                    : 'bg-surface text-ink/50 ring-1 ring-ink/20'
              }`}
            >
              {done ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : index + 1}
            </span>
            <span className={`mt-1.5 text-xs leading-tight ${now ? 'font-bold text-ink' : done ? 'font-semibold text-ink/75' : 'text-ink/55'}`}>
              {labels[step] ?? titleCase(step)}
              {done && <span className="sr-only"> (done)</span>}
              {now && <span className="sr-only"> (current)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

/** The ticket column when there is no record to show, with a reason that matches the queue. */
export const TicketPlaceholder: React.FC<{ title: string; hint?: string }> = ({ title, hint }) => (
  <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink/15 px-8 text-center">
    <p className="font-display text-lg font-bold text-primary">{title}</p>
    {hint && <p className="mt-1 max-w-xs text-sm text-ink/65">{hint}</p>}
  </div>
);

/** A labelled value on the ticket. The value gets the room; the label stays small. */
export const Fact: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => (
  <div className={`min-w-0 ${className}`}>
    <dt className="text-xs font-semibold text-ink/60">{label}</dt>
    <dd className="mt-0.5 font-display text-lg font-bold leading-snug text-ink">{children}</dd>
  </div>
);

const ACTION_LABELS: Record<string, string> = {
  accepted: 'Accept order',
  preparing: 'Start preparing',
  ready: 'Mark ready',
  completed: 'Complete order',
  confirmed: 'Confirm booking',
};
const SAVING_LABELS: Record<string, string> = {
  accepted: 'Accepting…',
  preparing: 'Starting…',
  ready: 'Marking ready…',
  completed: 'Completing…',
  confirmed: 'Confirming…',
  cancelled: 'Cancelling…',
};
const DONE_LABELS: Record<string, string> = {
  accepted: 'Order accepted',
  preparing: 'Marked as preparing',
  ready: 'Marked ready',
  completed: 'Order completed',
  confirmed: 'Booking confirmed',
  cancelled: 'Cancelled',
};

export interface SavedChange {
  id: string;
  status: string;
  at: Date;
}

/**
 * The ticket's foot: one primary next step, cancelling kept quiet beside it.
 * Only transitions the database also permits are offered, and closing a record
 * still asks first.
 */
export function TicketActions({
  status,
  cancelLabel,
  describedAs,
  disabled,
  saving,
  savingTo,
  error,
  saved,
  hint,
  onChange,
}: {
  status: string;
  cancelLabel: string;
  describedAs: string;
  disabled: boolean;
  saving: boolean;
  savingTo: string | null;
  error?: string;
  saved: SavedChange | null;
  /** What the primary action means, in one sentence. */
  hint?: string;
  onChange: (next: string) => void;
}) {
  const actions = nextStatuses(status);
  const primary = actions.find((next) => next !== 'cancelled');
  const canCancel = actions.includes('cancelled');

  const run = (next: string) => {
    const label = next === 'cancelled' ? cancelLabel : ACTION_LABELS[next];
    if ((next === 'cancelled' || next === 'completed') && !window.confirm(`${label}? ${describedAs}. This closes the record and cannot be undone here.`)) return;
    onChange(next);
  };

  return (
    <div role="group" aria-label={describedAs} className="border-t border-ink/10 bg-surface px-5 py-4 sm:px-6">
      {saved && (
        <p role="status" className="admin-note-in mb-3 flex items-start gap-2 rounded-xl bg-primary/[0.06] px-3 py-2.5 text-sm font-semibold text-primary">
          <CircleCheck size={18} aria-hidden="true" className="mt-px shrink-0" />
          <span>
            {DONE_LABELS[saved.status] ?? 'Saved'} at {formatTimeOnly(saved.at.toISOString())}.
            {primary && <span className="font-medium text-ink/75"> Next step: {ACTION_LABELS[primary].toLowerCase()}.</span>}
          </span>
        </p>
      )}
      {error && (
        <p role="alert" className="admin-note-in mb-3 rounded-xl border border-accent bg-accent/15 px-3 py-2.5 text-sm font-medium text-ink">
          {error}
        </p>
      )}

      {primary || canCancel ? (
        <div className="flex flex-wrap items-center gap-3">
          {primary && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => run(primary)}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-display text-base font-bold text-surface shadow-[0_8px_20px_-10px_rgb(var(--color-ink)/0.6)] transition-colors duration-150 hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && savingTo === primary && <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />}
              {saving && savingTo === primary ? SAVING_LABELS[primary] : ACTION_LABELS[primary]}
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => run('cancelled')}
              className="inline-flex min-h-12 items-center justify-center rounded-xl px-4 text-sm font-bold text-ink/75 underline-offset-4 transition-colors duration-150 hover:bg-ink/[0.05] hover:text-ink hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && savingTo === 'cancelled' ? SAVING_LABELS.cancelled : cancelLabel}
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm font-semibold text-ink/65">Closed record. No further steps.</p>
      )}
      {hint && primary && !error && <p className="mt-2.5 text-[0.8125rem] leading-relaxed text-ink/70">{hint}</p>}
    </div>
  );
}

/** Keyboard-and-pointer selectable queue row. Selection is shown by shape and weight, not colour alone. */
export const QueueRow: React.FC<{
  selected: boolean;
  needsAction: boolean;
  closed: boolean;
  onSelect: () => void;
  label: string;
  expanded?: boolean;
  children: React.ReactNode;
}> = ({ selected, needsAction, closed, onSelect, label, expanded, children }) => (
  <button
    type="button"
    onClick={onSelect}
    aria-label={label}
    aria-current={selected ? 'true' : undefined}
    aria-expanded={expanded}
    className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-xl px-4 py-3.5 text-left transition-[background-color,box-shadow] duration-150 ${
      selected
        ? 'bg-surface shadow-[0_10px_28px_-16px_rgb(var(--color-ink)/0.45)] ring-2 ring-primary'
        : closed
          ? 'bg-surface/60 ring-1 ring-ink/[0.07] hover:bg-surface'
          : 'bg-surface ring-1 ring-ink/10 hover:ring-ink/25'
    }`}
  >
    {needsAction && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-accent" />}
    {children}
  </button>
);
