/** A delivery order goes out with a rider after ready; only the database's own check allows that status. */
export const nextStatuses = (status: string, orderType?: string): string[] => ({
  new: ['accepted', 'cancelled'], accepted: ['preparing', 'cancelled'], preparing: ['ready', 'cancelled'],
  ready: [orderType === 'delivery' ? 'out_for_delivery' : 'completed', 'cancelled'], out_for_delivery: ['completed'],
  pending: ['confirmed', 'cancelled'], confirmed: ['cancelled'],
}[status] ?? []);
export const matchesSearch = (query: string, ...values: (string | null)[]): boolean => {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/);
  const text = values.filter(Boolean).join(' ').toLocaleLowerCase();
  return terms.every((term) => text.includes(term));
};
