import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/25',
  secondary: 'bg-surface-elevated text-text-primary hover:bg-surface-elevated/80 border border-border',
  ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-elevated/50',
  danger: 'bg-red-500/10 text-red-400 hover:bg-red-500/20',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3 text-base rounded-2xl gap-2.5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  fullWidth = false,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={twMerge(
        clsx(
          'inline-flex items-center justify-center font-medium transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none min-h-[48px]',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className,
        ),
      )}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
