import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { cardClass, formatDateTime } from './adminUtils';
import { AdminError, AdminLoading, EmptyTableRow } from './AdminStates';
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
      <div className="mb-7">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-ink/45">Guest directory</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-primary sm:text-4xl">Customers</h1>
      </div>

      {error && <div className="mb-6"><AdminError message={error} /></div>}
      {loading ? (
        <AdminLoading label="Loading customers…" />
      ) : (
        <div className={`${cardClass} overflow-hidden p-0`}>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="border-b border-ink/10 bg-paper/60 text-xs uppercase tracking-wider text-ink/50">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Last interaction</th>
                  <th className="px-4 py-3 text-right font-semibold">Interactions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {customers.length === 0 ? (
                  <EmptyTableRow colSpan={5} message="No customers yet." />
                ) : (
                  customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-paper/35">
                      <td className="px-4 py-4 font-medium">{customer.name}</td>
                      <td className="px-4 py-4">
                        {customer.email ? (
                          <a href={`mailto:${customer.email}`} className="text-ink/65 hover:text-primary">{customer.email}</a>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-4">
                        {customer.phone ? (
                          <a href={`tel:${customer.phone}`} className="text-ink/65 hover:text-primary">{customer.phone}</a>
                        ) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-ink/65">
                        {formatDateTime(customer.last_interaction_at)}
                      </td>
                      <td className="px-4 py-4 text-right font-display font-bold text-primary">
                        {customer.interaction_count}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
