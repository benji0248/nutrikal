import { useEffect, useCallback, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  snap?: 'half' | 'full';
}

export function BottomSheet({ isOpen, onClose, title, children, snap = 'full' }: BottomSheetProps) {
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

  return createPortal(
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        className={`absolute bottom-0 left-0 right-0 bg-surface border-t border-border rounded-t-3xl animate-slide-up ${maxHeight} overflow-y-auto`}
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
        <div className="sticky top-0 bg-surface z-10 pt-3 pb-2 px-6">
          <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
          <h2 className="text-base font-heading font-bold text-text-primary">{title}</h2>
        </div>
        <div className="px-6 pb-8">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
