import { forwardRef } from 'react';
import { Search, X } from 'lucide-react';
import { clsx } from 'clsx';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'default' | 'search';
  label?: string;
  error?: string;
  icon?: ReactNode;
  clearable?: boolean;
  onClear?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ variant = 'default', label, error, icon, clearable, onClear, className, value, ...props }, ref) => {
    const isSearch = variant === 'search';
    const hasValue = value !== undefined && value !== '';

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {(isSearch || icon) && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
              {isSearch ? <Search size={16} /> : icon}
            </span>
          )}
          <input
            ref={ref}
            value={value}
            className={clsx(
              'w-full bg-surface2 text-text-primary placeholder-muted border border-border rounded-2xl transition-all outline-none min-h-[48px] font-body text-sm',
              'focus:border-accent focus:ring-1 focus:ring-accent/40',
              (isSearch || icon) ? 'pl-10' : 'pl-4',
              clearable && hasValue ? 'pr-10' : 'pr-4',
              'py-3',
              error && 'border-red-400 focus:border-red-400 focus:ring-red-400/40',
              className,
            )}
            {...props}
          />
          {clearable && hasValue && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted hover:text-text-primary transition-colors"
              aria-label="Limpiar"
            >
              <X size={16} />
            </button>
          )}
        </div>
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
