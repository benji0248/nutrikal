import { useRef, useCallback } from 'react';

interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

interface SwipeBindings {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
}: SwipeConfig): SwipeBindings {
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const current = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    start.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
    current.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    current.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!start.current || !current.current) return;
    const dx = current.current.x - start.current.x;
    const dy = current.current.y - start.current.y;
    const elapsed = Date.now() - start.current.t;
    const velocity = Math.abs(dx) / Math.max(elapsed, 1);

    if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) && velocity > 0.25) {
      if (dx < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    }
    start.current = null;
    current.current = null;
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
