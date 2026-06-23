import { useEffect, useCallback, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  snap?: 'half' | 'full';
  /** Living Journal (DESIGN.md): superficie #f8faf1, cabecera glass */
  tone?: 'default' | 'journal';
}

export function BottomSheet({ isOpen, onClose, title, children, snap = 'full', tone = 'default' }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<number | null>(null);

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

  const maxHeight = snap === 'half' ? 'max-h-[55dvh]' : 'max-h-[90dvh]';
  const journal = tone === 'journal';

  return createPortal(
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className={`absolute inset-0 animate-fade-in ${journal ? 'bg-[#191c17]/35 backdrop-blur-md' : 'bg-black/50 backdrop-blur-sm'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        className={`absolute bottom-0 left-0 right-0 animate-slide-up ${maxHeight} overflow-y-auto rounded-t-[2rem] shadow-[0px_-20px_60px_rgba(25,28,23,0.12)] ${
          journal
            ? 'bg-gradient-to-b from-[#eef3ea] to-[#f8faf1] border-t border-white/40'
            : 'bg-surface border-t border-border'
        }`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          dragStart.current = e.touches[0].clientY;
        }}
        onTouchEnd={(e) => {
          if (dragStart.current !== null) {
            const delta = e.changedTouches[0].clientY - dragStart.current;
            if (delta > 100) onClose();
            dragStart.current = null;
          }
        }}
      >
        <div
          className={`sticky top-0 z-10 pt-3 pb-2 px-6 backdrop-blur-xl ${
            journal ? 'bg-[rgba(248,250,241,0.88)]' : 'bg-surface'
          }`}
        >
          <div className={`w-10 h-1 rounded-full mx-auto mb-4 ${journal ? 'bg-[#226046]/25' : 'bg-border'}`} />
          <h2
            className={`text-base font-heading font-bold ${journal ? 'text-[#226046]' : 'text-text-primary'}`}
          >
            {title}
          </h2>
        </div>
        <div className="px-6 pb-8">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
