import { clsx } from 'clsx';

type BadgeVariant = 'default' | 'accent' | 'pink' | 'success' | 'warning';

interface BadgeProps {
  children: string;
  variant?: BadgeVariant;
  onRemove?: () => void;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-surface-elevated text-text-secondary',
  accent: 'bg-accent/15 text-accent',
  pink: 'bg-accent-secondary/15 text-accent-secondary',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
};

export function Badge({ children, variant = 'default', onRemove }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
        variantStyles[variant],
      )}
    >
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 hover:opacity-70 transition-opacity"
          aria-label={`Eliminar etiqueta ${children}`}
        >
          &times;
        </button>
      )}
    </span>
  );
}
