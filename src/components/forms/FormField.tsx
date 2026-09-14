import React, { useId } from 'react';
import { AlertCircle } from 'lucide-react';

/** Props a field hands to its control so label, hint and error are all wired up. */
export interface ControlProps {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby'?: string;
  'aria-required'?: boolean;
}

/**
 * One labelled form control with its hint and its error directly underneath.
 *
 * The brand has no red, so an error is carried by three things at once rather
 * than colour alone: a heavier ink border and gold tint on the control
 * (`.booking-input[aria-invalid=true]` in index.css), an alert icon, and the
 * message text itself, linked to the control with aria-describedby.
 */
export const FormField: React.FC<{
  label: React.ReactNode;
  /** Stable id so the error summary can link to the control. Generated when omitted. */
  id?: string;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: (control: ControlProps) => React.ReactNode;
}> = ({ label, id, hint, error, required, className = '', children }) => {
  const generated = useId();
  const controlId = id ?? generated;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`block font-display font-bold text-ink text-sm ${className}`}>
      <label htmlFor={controlId}>
        {label}
        {required === false && <span className="font-body font-normal text-ink/60"> (optional)</span>}
      </label>
      {hint && <p id={hintId} className="mt-1 font-body text-xs font-medium text-ink/65">{hint}</p>}
      <div className="mt-2">
        {children({
          id: controlId,
          'aria-invalid': Boolean(error),
          'aria-describedby': describedBy,
          ...(required ? { 'aria-required': true } : {}),
        })}
      </div>
      {error && (
        <p id={errorId} className="mt-2 flex items-start gap-1.5 font-body text-sm font-semibold text-ink">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-ink" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};
