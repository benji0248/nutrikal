import { useRef, useCallback } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

interface SwipeBindings {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY_THRESHOLD = 0.3;

export function useSwipe({ onSwipeLeft, onSwipeRight }: SwipeHandlers): SwipeBindings {
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchCurrent = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    touchCurrent.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchCurrent.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart.current || !touchCurrent.current) return;

    const deltaX = touchCurrent.current.x - touchStart.current.x;
    const deltaY = touchCurrent.current.y - touchStart.current.y;
    const elapsed = Date.now() - touchStart.current.time;
    const velocity = Math.abs(deltaX) / elapsed;

    if (
      Math.abs(deltaX) > SWIPE_THRESHOLD &&
      Math.abs(deltaX) > Math.abs(deltaY) &&
      velocity > SWIPE_VELOCITY_THRESHOLD
    ) {
      if (deltaX < 0) {
        onSwipeLeft?.();
      } else {
        onSwipeRight?.();
      }
    }

    touchStart.current = null;
    touchCurrent.current = null;
  }, [onSwipeLeft, onSwipeRight]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
