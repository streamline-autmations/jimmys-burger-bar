import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { cardClass, formatDateTime, thClass } from './adminUtils';
import { AdminEmpty, AdminError, AdminSkeleton } from './AdminStates';
import { AdminPageHeader } from './AdminPageHeader';
import type { Customer } from './types';

export const AdminCustomers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (fetchError) setError(fetchError.message);
    else setCustomers(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchCustomers();
  }, [fetchCustomers]);

  return (
    <section>
      <AdminPageHeader
        eyebrow="Guest directory"
        title="Customers"
        count={loading ? undefined : `${customers.length} on file`}
      />

      {error && (
        <div className="mb-6">
          <AdminError message={error} onRetry={() => void fetchCustomers()} />
        </div>
      )}

      {loading ? (
        <AdminSkeleton rows={3} />
      ) : customers.length === 0 ? (
        <AdminEmpty title="No customers yet" hint="Guests are added automatically when they book or order." />
      ) : (
        <>
          <ul className="space-y-3 lg:hidden">
            {customers.map((customer) => (
              <li key={customer.id} className={`${cardClass} p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 truncate font-display text-base font-bold text-primary">{customer.name}</p>
                  <span className="shrink-0 rounded-full bg-accent/25 px-2.5 py-1 text-xs font-bold text-[#6b4708]">
                    {customer.interaction_count}{' '}
                    {customer.interaction_count === 1 ? 'visit' : 'visits'}
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
                <p className="mt-2 text-xs text-ink/45">Last seen {formatDateTime(customer.last_interaction_at)}</p>
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
                {customers.map((customer) => (
                  <tr key={customer.id} className="transition-colors hover:bg-paper/50">
                    <td className="px-4 py-4 font-semibold">{customer.name}</td>
                    <td className="px-4 py-4">
                      {customer.email ? (
                        <a href={`mailto:${customer.email}`} className="text-ink/65 hover:text-primary">
                          {customer.email}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {customer.phone ? (
                        <a href={`tel:${customer.phone}`} className="text-ink/65 hover:text-primary">
                          {customer.phone}
                        </a>
                      ) : (
                        '—'
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
    </section>
  );
};
