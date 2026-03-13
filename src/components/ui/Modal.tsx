import { useEffect, useCallback, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={clsx(
          'relative w-full bg-surface border border-border rounded-t-2xl md:rounded-2xl p-6 z-10 max-h-[85vh] overflow-y-auto transition-all duration-300 animate-slide-up md:animate-fade-in',
          sizeClasses[size],
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface-elevated transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
            aria-label="Cerrar"
          >
            <X size={20} className="text-text-secondary" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
