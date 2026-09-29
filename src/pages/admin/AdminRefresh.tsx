import { RefreshCw } from 'lucide-react';
import { formatTimeOnly } from './adminUtils';

/**
 * Freshness and a manual refresh. `compact` drops the polling sentence into the
 * tooltip, for page headers that share their row with a title.
 */
export function AdminRefresh({ loading, updatedAt, onRefresh, disabled = false, polling = true, compact = false, className = 'mb-5' }: { loading: boolean; updatedAt: Date | null; onRefresh: () => void; disabled?: boolean; polling?: boolean; compact?: boolean; className?: string }) {
  const note = polling ? 'Checks for new requests every 30 seconds.' : 'Refresh to check for new requests.';
  const time = updatedAt ? `Updated ${formatTimeOnly(updatedAt.toISOString())}.` : 'No records loaded yet.';
  return <div className={`flex flex-wrap items-center gap-3 text-sm ${className}`}>
    <p role="status" className="text-ink/70" title={compact && updatedAt ? note : undefined}>{loading ? 'Refreshing…' : compact || !updatedAt ? time : `${time} ${note}`}</p>
    <button type="button" disabled={loading || disabled} onClick={onRefresh} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-ink/15 bg-surface px-3.5 font-bold text-ink transition-colors duration-150 hover:bg-paper disabled:opacity-50"><RefreshCw size={15} aria-hidden="true" className={loading ? 'animate-spin' : ''} />Refresh</button>
  </div>;
}
