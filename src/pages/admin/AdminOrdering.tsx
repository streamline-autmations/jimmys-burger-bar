import React, { useCallback, useState } from 'react';
import { data as db, type OrderingState } from '../../core/data';
import { config } from '../../config';
import { orderCategories } from '../../core/tenant';
import { useAdminResource } from './useAdminResource';
import { AdminPageHeader } from './AdminPageHeader';
import { AdminRefresh } from './AdminRefresh';
import { AdminError, AdminSkeleton } from './AdminStates';
import { cardClass, getErrorMessage, panelClass, panelHeadingClass } from './adminUtils';

const initial: OrderingState = { paused: false, unavailable: [] };

const switchClass = (on: boolean) =>
  `inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl px-4 text-sm font-bold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${
    on ? 'bg-ink/[0.06] text-ink hover:bg-ink/[0.1]' : 'bg-accent text-ink hover:bg-accent/80'
  }`;

/**
 * The two switches a busy shift needs: stop taking online orders, and take a
 * dish off sale. Both are checked by the server when a guest orders or pays,
 * so this screen only changes what the server already enforces.
 */
export const AdminOrdering: React.FC = () => {
  const load = useCallback(() => db.orderingState!(), []);
  const [busy, setBusy] = useState<string | null>(null);
  // Background re-reads wait while a change is being saved, so they cannot undo it on screen.
  const { data: state, setData, loading, error, updatedAt, refresh } = useAdminResource(load, initial, { paused: busy !== null });
  const [failed, setFailed] = useState<string | null>(null);
  const soldOut = new Set(state.unavailable);

  // Writes show at once and are confirmed by a re-read; a refused write puts the old value back.
  const change = async (key: string, next: OrderingState, write: () => Promise<void>) => {
    const before = state;
    setBusy(key);
    setFailed(null);
    setData(next);
    try {
      await write();
    } catch (problem) {
      setData(before);
      setFailed(`That change was not saved. ${getErrorMessage(problem)}`);
    } finally {
      setBusy(null);
    }
  };

  const setPaused = (paused: boolean) => change('pause', { ...state, paused }, () => db.setOrderingPaused!(paused));
  const setAvailable = (name: string, available: boolean) =>
    change(name, { ...state, unavailable: available ? state.unavailable.filter((item) => item !== name) : [...state.unavailable, name] }, () => db.setItemAvailable!(name, available));

  return (
    <>
      <AdminPageHeader
        eyebrow="Online ordering"
        title={state.paused ? 'Paused' : 'Taking orders'}
        count={soldOut.size ? `${soldOut.size} ${soldOut.size === 1 ? 'dish' : 'dishes'} marked sold out` : 'Everything on the menu is on sale'}
      >
        <AdminRefresh compact className="" loading={loading} updatedAt={updatedAt} onRefresh={refresh} />
      </AdminPageHeader>

      {error && <AdminError message={error} onRetry={refresh} />}
      {failed && <p role="alert" className="mb-4 rounded-xl bg-accent/20 px-4 py-3 text-sm font-semibold text-ink ring-1 ring-accent/60">{failed}</p>}

      {loading && !updatedAt ? <AdminSkeleton rows={6} /> : (
        <>
          <section className={`${panelClass} mb-5 flex flex-wrap items-center justify-between gap-4 ${state.paused ? 'ring-2 ring-accent' : ''}`} aria-labelledby="pause-heading">
            <div className="min-w-0 max-w-2xl">
              <h2 id="pause-heading" className={panelHeadingClass}>{state.paused ? 'Online orders are paused' : 'Online orders are open'}</h2>
              <p className="mt-1 text-sm text-ink/70">
                {state.paused
                  ? `Guests can see the menu but cannot place or pay for a new order. Orders already paid still arrive. Resume when ${config.venue.name} is ready.`
                  : 'Pause when the kitchen cannot take more. Guests keep their cart and are told ordering is paused. Orders already paid still arrive.'}
              </p>
            </div>
            <button type="button" role="switch" aria-checked={!state.paused} disabled={busy !== null} onClick={() => void setPaused(!state.paused)} className={switchClass(!state.paused)}>
              {state.paused ? 'Resume online orders' : 'Pause online orders'}
            </button>
          </section>

          <p className="mb-3 text-sm text-ink/65">A sold out mark stays until you switch it back, or until the menu is next updated.</p>
          <div className="grid gap-5 xl:grid-cols-2">
            {orderCategories.map((category) => (
              <section key={category.name} className={cardClass} aria-label={category.name}>
                <h2 className={`${panelHeadingClass} px-5 pb-2 pt-5`}>{category.name}</h2>
                <ul>
                  {category.items.map((item) => {
                    const available = !soldOut.has(item.name);
                    return (
                      <li key={item.name} className="flex items-center justify-between gap-4 border-t border-ink/10 px-5 py-2.5">
                        <span className={`min-w-0 font-bold ${available ? 'text-ink' : 'text-ink/50 line-through'}`}>{item.name}</span>
                        <button type="button" role="switch" aria-checked={available} aria-label={`${item.name}: ${available ? 'on sale' : 'sold out'}`} disabled={busy !== null} onClick={() => void setAvailable(item.name, !available)} className={switchClass(available)}>
                          {available ? 'On sale' : 'Sold out'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </>
  );
};
