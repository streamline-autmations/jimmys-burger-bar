import { RefreshCw } from 'lucide-react';
import { formatTimeOnly } from './adminUtils';

export function AdminRefresh({ loading, updatedAt, onRefresh, disabled = false, polling = true }: { loading: boolean; updatedAt: Date | null; onRefresh: () => void; disabled?: boolean; polling?: boolean }) {
  return <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm">
    <p role="status" className="text-ink/75">{loading ? 'Refreshing…' : updatedAt ? polling ? `Updated ${formatTimeOnly(updatedAt.toISOString())} SAST. Checks for new requests every 30 seconds.` : `Updated ${formatTimeOnly(updatedAt.toISOString())} SAST. Refresh to check for new requests.` : 'No records loaded yet.'}</p>
    <button type="button" disabled={loading || disabled} onClick={onRefresh} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-ink/20 bg-surface px-4 font-bold disabled:opacity-50"><RefreshCw size={16} aria-hidden="true" />Refresh</button>
  </div>;
}
