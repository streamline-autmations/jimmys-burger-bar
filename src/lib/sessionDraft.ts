// Tab-scoped cart persistence only. No customer contact details are stored here.
export const readSession = (key: string): string | null => {
  try { return sessionStorage.getItem(key); } catch { return null; }
};
export const writeSession = (key: string, value: string | null): void => {
  try { if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, value); } catch { /* Storage may be disabled. In-memory ordering still works. */ }
};
