import React from 'react';
import { AlertCircle, LoaderCircle } from 'lucide-react';

export const AdminLoading: React.FC<{ label?: string; fullPage?: boolean }> = ({
  label = 'Loading…',
  fullPage = false,
}) => (
  <div
    className={`flex items-center justify-center gap-2 text-ink/60 ${fullPage ? 'min-h-screen bg-paper' : 'py-16'}`}
    role="status"
  >
    <LoaderCircle className="animate-spin" size={20} aria-hidden="true" />
    <span>{label}</span>
  </div>
);

export const AdminError: React.FC<{ message: string }> = ({ message }) => (
  <div
    className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    role="alert"
  >
    <AlertCircle className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
    <span>{message}</span>
  </div>
);

export const EmptyTableRow: React.FC<{ colSpan: number; message: string }> = ({
  colSpan,
  message,
}) => (
  <tr>
    <td colSpan={colSpan} className="px-4 py-12 text-center text-ink/50">
      {message}
    </td>
  </tr>
);
