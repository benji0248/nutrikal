import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent/85 shadow-lg shadow-accent/20',
  secondary: 'bg-surface2 text-text-primary hover:bg-surface2/80 border border-border',
  ghost: 'bg-transparent text-muted hover:text-text-primary hover:bg-surface2/50',
  danger: 'bg-red-500/10 text-red-400 hover:bg-red-500/20',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5 min-h-[40px]',
  md: 'px-4 py-2.5 text-sm rounded-2xl gap-2 min-h-[48px]',
  lg: 'px-6 py-3 text-base rounded-2xl gap-2.5 min-h-[52px]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={twMerge(
        clsx(
          'inline-flex items-center justify-center font-body font-medium transition-all duration-150 active:animate-scale-tap disabled:opacity-40 disabled:pointer-events-none select-none',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          loading && 'pointer-events-none',
          className,
        ),
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
