import { useEffect, useCallback, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  tone?: 'default' | 'journal';
}

export function Modal({ isOpen, onClose, title, children, tone = 'default' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

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

  const journal = tone === 'journal';

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 hidden md:flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`absolute inset-0 animate-fade-in ${journal ? 'bg-[#191c17]/35 backdrop-blur-md' : 'bg-black/50 backdrop-blur-sm'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto z-10 animate-fade-in rounded-[2rem] ${
          journal
            ? 'bg-[#f8faf1] shadow-[0px_20px_40px_rgba(25,28,23,0.06)]'
            : 'bg-surface border border-border rounded-3xl shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-heading font-bold ${journal ? 'text-[#226046]' : 'text-text-primary'}`}>{title}</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center ${
              journal ? 'hover:bg-[#f3f5eb]' : 'hover:bg-surface2'
            }`}
            aria-label="Cerrar"
          >
            <X size={20} className={journal ? 'text-[#5a6258]' : 'text-muted'} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
