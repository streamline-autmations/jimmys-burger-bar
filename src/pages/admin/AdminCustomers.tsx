import { useAdminResource } from './useAdminResource';
import { AdminRefresh } from './AdminRefresh';
import { matchesSearch } from './operations';
import { controlClass } from './adminUtils';
import React, { useCallback, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { cardClass, formatDateTime, thClass } from './adminUtils';
import { AdminEmpty, AdminError, AdminSkeleton } from './AdminStates';
import { AdminPageHeader } from './AdminPageHeader';
import type { Customer } from './types';

export const AdminCustomers: React.FC = () => {
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(200);


  const load = useCallback(async () => {
    const query = supabase.from('customers').select('*').order('created_at', { ascending: false }).order('id').limit(limit);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }, [limit]);
  const { data: customers, loading, error, updatedAt, refresh: fetchCustomers } = useAdminResource<Customer[]>(load, []);


  const filtered = customers.filter((item) => matchesSearch(search, item.name, item.phone, item.email));

  return (
    <section>
      <AdminPageHeader
        eyebrow="Guest directory"
        title="Customers"
        count={loading ? undefined : `${customers.length} loaded`}
      />

      <AdminRefresh loading={loading} updatedAt={updatedAt} onRefresh={() => void fetchCustomers()} />
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_220px]">
        <label className="text-sm font-semibold">Search loaded records<input type="search" className={controlClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, contact or reference" /></label>
      </div>
      <p className="mb-4 text-sm text-ink/75">{filtered.length} matching / {customers.length} loaded. Search applies to loaded records.</p>

      {error && (
        <div className="mb-6">
          <AdminError message={error} onRetry={() => void fetchCustomers()} />
        </div>
      )}

      {loading && !updatedAt ? (
        <AdminSkeleton rows={3} />
      ) : error && !updatedAt ? null : filtered.length === 0 ? (
        <AdminEmpty title="No customers yet" hint="Guests are added automatically when they book or order." />
      ) : (
        <>
          <ul className="space-y-3 lg:hidden">
            {filtered.map((customer) => (
              <li key={customer.id} className={`${cardClass} p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 truncate font-display text-base font-bold text-primary">{customer.name}</p>
                  <span className="shrink-0 rounded-full bg-accent/25 px-2.5 py-1 text-xs font-bold text-ink">
                    {customer.interaction_count}{' '}
                    {customer.interaction_count === 1 ? 'interaction' : 'interactions'}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  {customer.email && (
                    <a href={`mailto:${customer.email}`} className="block truncate text-ink/65 hover:text-primary">
                      {customer.email}
                    </a>
                  )}
                  {customer.phone && (
                    <a href={`tel:${customer.phone}`} className="block text-ink/65 hover:text-primary">
                      {customer.phone}
                    </a>
                  )}
                </div>
                <p className="mt-2 text-xs text-ink/65">Last interaction {formatDateTime(customer.last_interaction_at)}</p>
              </li>
            ))}
          </ul>

          <div className={`${cardClass} hidden overflow-hidden lg:block`}>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink/10 bg-paper/60">
                <tr>
                  <th className={thClass}>Name</th>
                  <th className={thClass}>Email</th>
                  <th className={thClass}>Phone</th>
                  <th className={thClass}>Last interaction</th>
                  <th className={`${thClass} text-right`}>Interactions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {filtered.map((customer) => (
                  <tr key={customer.id} className="transition-colors hover:bg-paper/50">
                    <td className="px-4 py-4 font-semibold">{customer.name}</td>
                    <td className="px-4 py-4">
                      {customer.email ? (
                        <a href={`mailto:${customer.email}`} className="text-ink/65 hover:text-primary">
                          {customer.email}
                        </a>
                      ) : (
                        'Not provided'
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {customer.phone ? (
                        <a href={`tel:${customer.phone}`} className="text-ink/65 hover:text-primary">
                          {customer.phone}
                        </a>
                      ) : (
                        'Not provided'
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-ink/65">
                      {formatDateTime(customer.last_interaction_at)}
                    </td>
                    <td className="px-4 py-4 text-right font-display text-base font-bold text-primary">
                      {customer.interaction_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {customers.length >= limit && <button className="mt-5 min-h-11 rounded-xl border border-ink/20 px-5 font-bold" disabled={loading} onClick={() => setLimit((value) => value + 200)}>Load more records</button>}
    </section>
  );
};
