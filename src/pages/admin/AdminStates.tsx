import React from 'react';
import { AlertCircle, Inbox, LoaderCircle, RefreshCw } from 'lucide-react';
import { cardClass, panelHeadingClass } from './adminUtils';

export const AdminLoading: React.FC<{ label?: string; fullPage?: boolean }> = ({
  label = 'Loading…',
  fullPage = false,
}) => (
  <div
    className={`flex items-center justify-center gap-2 text-ink/60 ${fullPage ? 'min-h-[100dvh] bg-paper' : 'py-16'}`}
    role="status"
  >
    <LoaderCircle className="animate-spin" size={20} aria-hidden="true" />
    <span className="font-medium">{label}</span>
  </div>
);

/**
 * Skeleton rows. Shape matches the content that replaces them, so the layout
 * does not jump when data lands mid-service.
 */
export const AdminSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="space-y-3" role="status" aria-label="Loading">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className={`${cardClass} flex items-center gap-4 p-5`}>
        <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-ink/[0.07]" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-1/3 animate-pulse rounded bg-ink/[0.09]" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-ink/[0.06]" />
        </div>
        <div className="h-7 w-20 shrink-0 animate-pulse rounded-full bg-ink/[0.07]" />
      </div>
    ))}
  </div>
);

export const AdminError: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => (
  <div
    className="flex flex-wrap items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-900"
    role="alert"
  >
    <AlertCircle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
    <span className="min-w-0 flex-1 font-medium">{message}</span>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-red-900 px-3.5 text-xs font-bold text-white transition-colors hover:bg-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-900/40"
      >
        <RefreshCw size={13} aria-hidden="true" />
        Try again
      </button>
    )}
  </div>
);

/** Shared empty state, so every list reads the same when there is nothing in it. */
export const AdminEmpty: React.FC<{ title: string; hint?: string }> = ({ title, hint }) => (
  <div className={`${cardClass} flex flex-col items-center gap-2 px-6 py-14 text-center`}>
    <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/20 text-primary">
      <Inbox size={20} aria-hidden="true" />
    </span>
    <p className={panelHeadingClass}>{title}</p>
    {hint && <p className="max-w-xs text-sm text-ink/55">{hint}</p>}
  </div>
);
