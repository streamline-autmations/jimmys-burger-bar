/** Raised when a compare-and-set moved no rows: someone else changed it first. */
export class ConflictError extends Error {
  constructor() {
    super('conflict');
    this.name = 'ConflictError';
  }
}
