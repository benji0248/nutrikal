import { clsx } from 'clsx';

type BadgeVariant = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const variantStyles: Record<BadgeVariant, string> = {
  accent: 'bg-accent/15 text-accent',
  success: 'bg-green/15 text-green',
  warning: 'bg-amber/15 text-amber',
  danger: 'bg-red-500/15 text-red-400',
  neutral: 'bg-surface2 text-muted',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({ children, variant = 'neutral', size = 'md' }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-lg font-medium font-body whitespace-nowrap',
        variantStyles[variant],
        sizeStyles[size],
      )}
    >
      {children}
    </span>
  );
}
