import type { ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const inputBase =
  'block w-full rounded-md border-0 py-1.5 px-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ms-0.5 text-red-500">*</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function TextInput({ invalid, className = '', ...rest }: InputProps) {
  return (
    <input
      className={`${inputBase} ${invalid ? 'ring-red-400 focus:ring-red-500' : ''} ${className}`}
      {...rest}
    />
  );
}

export function TextArea({
  invalid,
  className = '',
  rows = 3,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      rows={rows}
      className={`${inputBase} resize-y ${invalid ? 'ring-red-400 focus:ring-red-500' : ''} ${className}`}
      {...rest}
    />
  );
}

export function Select({
  invalid,
  className = '',
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      className={`${inputBase} bg-white ${invalid ? 'ring-red-400 focus:ring-red-500' : ''} ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}
