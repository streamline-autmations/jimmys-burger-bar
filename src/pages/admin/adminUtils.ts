// ---------------------------------------------------------------------------
// Shared surface language for the staff tool.
//
// Calmer and more utilitarian than the customer site - no overshoot, no
// curtain, no doodles - but built from the same navy, gold, paper and Baloo 2
// so it reads as Jimmy's rather than as a generic dashboard.
// ---------------------------------------------------------------------------

/** Standard panel. Everything that groups information sits on one of these. */
export const cardClass =
  'bg-surface rounded-2xl ring-1 ring-ink/10 shadow-[0_8px_30px_-18px_rgb(var(--color-ink)/0.28)]';

/** Panel with the default padding already applied. */
export const panelClass = `${cardClass} p-5 sm:p-6`;

/** A record that still needs a decision from staff. Gold edge, raised. */
export const actionableCardClass =
  'bg-surface rounded-2xl ring-1 ring-accent/45 border-l-4 border-accent shadow-[0_10px_30px_-16px_rgb(var(--color-ink)/0.34)]';

/** A record that is finished or cancelled: present, but visually stood down. */
export const historicalCardClass =
  'bg-surface/70 rounded-2xl ring-1 ring-ink/[0.07]';

/** Section heading inside a panel. */
export const panelHeadingClass = 'font-display text-lg font-bold text-primary';

/** Small uppercase label above a heading. */
export const eyebrowClass =
  'text-[11px] font-bold uppercase tracking-[0.16em] text-ink/45';

/** Table header cell. */
export const thClass =
  'px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink/50';

/** Minimum comfortable touch target for controls staff use mid-service. */
export const controlClass =
  'min-h-11 w-full rounded-xl border border-ink/15 bg-paper/70 px-3 text-sm font-medium text-ink ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:border-primary/60 ' +
  'disabled:opacity-50 disabled:pointer-events-none';

const dateTimeFormatter = new Intl.DateTimeFormat('en-ZA', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const dateFormatter = new Intl.DateTimeFormat('en-ZA', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const timeOnlyFormatter = new Intl.DateTimeFormat('en-ZA', {
  hour: '2-digit',
  minute: '2-digit',
});

export const formatDateTime = (value: string | null): string =>
  value ? dateTimeFormatter.format(new Date(value)) : 'Not specified';

export const formatBookingDate = (value: string): string =>
  dateFormatter.format(new Date(`${value}T00:00:00`));

export const formatBookingTime = (value: string): string => value.slice(0, 5);

export const formatTimeOnly = (value: string | null): string =>
  value ? timeOnlyFormatter.format(new Date(value)) : '--:--';

export const titleCase = (value: string): string =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export const getLocalToday = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getLocalDayBounds = (): { start: string; end: string } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
};

export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';

/** Statuses that still need a decision, as opposed to a finished record. */
export const ACTIONABLE_STATUSES = new Set(['pending', 'new', 'accepted', 'preparing', 'ready']);
export const CLOSED_STATUSES = new Set(['completed', 'cancelled']);

export const isActionable = (status: string): boolean => ACTIONABLE_STATUSES.has(status);
export const isClosed = (status: string): boolean => CLOSED_STATUSES.has(status);
