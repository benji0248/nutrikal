import type { ReactNode } from 'react';
import { BottomSheet } from '../ui/BottomSheet';
import { Modal } from '../ui/Modal';

interface ScheduleMealSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Bottom sheet on mobile, modal on desktop — same pattern as CalorieCalculator. */
export function ScheduleMealSheet({ isOpen, onClose, title, children }: ScheduleMealSheetProps) {
  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose} title={title} snap="half">
        {children}
      </BottomSheet>
      <Modal isOpen={isOpen} onClose={onClose} title={title}>
        {children}
      </Modal>
    </>
  );
}
