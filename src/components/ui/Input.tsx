import { forwardRef } from 'react';
import { Search, X } from 'lucide-react';
import { clsx } from 'clsx';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'default' | 'search';
  /** Living Journal (DESIGN.md): superficie blanca, sombra ambiental, sin borde duro */
  tone?: 'default' | 'journal';
  label?: string;
  error?: string;
  icon?: ReactNode;
  clearable?: boolean;
  onClear?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ variant = 'default', tone = 'default', label, error, icon, clearable, onClear, className, value, ...props }, ref) => {
    const isSearch = variant === 'search';
    const hasValue = value !== undefined && value !== '';
    const journal = tone === 'journal';

    return (
      <div className="w-full">
        {label && (
          <label
            className={clsx(
              'block text-sm font-medium mb-1.5',
              journal ? 'text-[#191c17]' : 'text-text-primary',
            )}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {(isSearch || icon) && (
            <span
              className={clsx(
                'absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none',
                journal ? 'text-[#5a6258]' : 'text-muted',
              )}
            >
              {isSearch ? <Search size={16} /> : icon}
            </span>
          )}
          <input
            ref={ref}
            value={value}
            className={clsx(
              'w-full transition-all outline-none min-h-[48px] font-body text-sm rounded-2xl',
              journal
                ? [
                    'bg-white text-[#191c17] placeholder:text-[#191c17]/45 border-0',
                    'shadow-[0px_8px_24px_rgba(25,28,23,0.06)]',
                    'focus:ring-2 focus:ring-[#226046]/25',
                  ]
                : [
                    'bg-surface2 text-text-primary placeholder-muted border border-border',
                    'focus:border-accent focus:ring-1 focus:ring-accent/40',
                  ],
              (isSearch || icon) ? 'pl-10' : 'pl-4',
              clearable && hasValue ? 'pr-10' : 'pr-4',
              'py-3',
              error && (journal ? 'ring-2 ring-red-400/50' : 'border-red-400 focus:border-red-400 focus:ring-red-400/40'),
              className,
            )}
            {...props}
          />
          {clearable && hasValue && (
            <button
              type="button"
              onClick={onClear}
              className={clsx(
                'absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors',
                journal ? 'text-[#5a6258] hover:text-[#191c17]' : 'text-muted hover:text-text-primary',
              )}
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
