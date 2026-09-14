import { useCallback, useMemo, useRef, useState } from 'react';

/**
 * Shows validation errors at the right moment.
 *
 * Errors are always computed, but a field's message only appears once the
 * customer has left that field or tried to submit. Validating on every
 * keystroke tells someone their email is invalid while they are still typing
 * the first letter of it.
 */
export function useFormErrors<K extends string>(errors: Partial<Record<K, string>>) {
  const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => {
    const shown: Partial<Record<K, string>> = {};
    for (const key of Object.keys(errors) as K[]) {
      if (errors[key] && (submitted || touched[key])) shown[key] = errors[key];
    }
    return shown;
  }, [errors, submitted, touched]);

  const blur = useCallback((field: K) => {
    setTouched((current) => (current[field] ? current : { ...current, [field]: true }));
  }, []);

  /**
   * Marks the form submitted. Returns true when it is valid; otherwise focuses the summary.
   *
   * Pass `fresh` errors computed at the moment of submit when any rule depends
   * on the clock: the render-time errors can be minutes old, and "19:30" that
   * was valid at 19:20 is in the past by the time a slow customer taps Place order.
   */
  const attempt = useCallback((fresh?: Partial<Record<K, string>>): boolean => {
    setSubmitted(true);
    const valid = !Object.values(fresh ?? errors).some(Boolean);
    if (!valid) {
      // After React commits the summary.
      requestAnimationFrame(() => {
        summaryRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        summaryRef.current?.focus({ preventScroll: true });
      });
    }
    return valid;
  }, [errors]);

  const reset = useCallback(() => {
    setTouched({});
    setSubmitted(false);
  }, []);

  return { visible, blur, attempt, reset, submitted, summaryRef };
}
