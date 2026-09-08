export const nextStatuses = (status: string): string[] => ({
  new: ['accepted', 'cancelled'], accepted: ['preparing', 'cancelled'], preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'], pending: ['confirmed', 'cancelled'], confirmed: ['cancelled'],
}[status] ?? []);
export const matchesSearch = (query: string, ...values: (string | null)[]): boolean => {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/);
  const text = values.filter(Boolean).join(' ').toLocaleLowerCase();
  return terms.every((term) => text.includes(term));
};
