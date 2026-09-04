export const cardClass =
  'bg-surface rounded-2xl p-6 shadow-[0_8px_30px_-14px_rgb(var(--color-ink)/0.2)] ring-1 ring-ink/[0.04]';

const dateTimeFormatter = new Intl.DateTimeFormat('en-ZA', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const dateFormatter = new Intl.DateTimeFormat('en-ZA', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export const formatDateTime = (value: string | null): string =>
  value ? dateTimeFormatter.format(new Date(value)) : 'Not specified';

export const formatBookingDate = (value: string): string =>
  dateFormatter.format(new Date(`${value}T00:00:00`));

export const formatBookingTime = (value: string): string => value.slice(0, 5);

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
