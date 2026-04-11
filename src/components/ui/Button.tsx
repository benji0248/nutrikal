import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Living Journal (DESIGN.md): píldoras verdes / secondary_container */
  tone?: 'default' | 'journal';
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

/** DESIGN.md: soft-touch CTA, radio alto, escala al pulsar */
const journalPrimary =
  'bg-[#226046] text-[#f8faf6] hover:bg-[#226046]/90 border-0 shadow-[0px_16px_36px_rgba(25,28,23,0.08)] active:scale-[0.98]';
const journalSecondary =
  'bg-[#f3f5eb] text-[#191c17] hover:bg-[#e8ebe3] border-0 active:scale-[0.98]';

export function Button({
  variant = 'primary',
  tone = 'default',
  size = 'md',
  icon,
  loading = false,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const variantCls =
    tone === 'journal' && variant === 'primary'
      ? journalPrimary
      : tone === 'journal' && variant === 'secondary'
        ? journalSecondary
        : variants[variant];

  const sizeCls =
    tone === 'journal' && (variant === 'primary' || variant === 'secondary')
      ? 'px-6 py-3.5 text-base rounded-[1.75rem] gap-2.5 min-h-[52px]'
      : sizes[size];

  return (
    <button
      className={twMerge(
        clsx(
          'inline-flex items-center justify-center font-body font-medium transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none select-none',
          tone === 'journal' && (variant === 'primary' || variant === 'secondary')
            ? 'active:scale-[0.98]'
            : 'active:animate-scale-tap',
          variantCls,
          sizeCls,
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
