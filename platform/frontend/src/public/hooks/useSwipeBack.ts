import { useEffect, useRef } from "react";

interface UseSwipeBackOptions {
  enabled?: boolean;
  edgeOnly?: boolean;
  threshold?: number;
}

export function useSwipeBack(onBack: () => void, options?: UseSwipeBackOptions) {
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const threshold = options?.threshold ?? 84;
  const enabled = options?.enabled ?? true;
  const edgeOnly = options?.edgeOnly ?? true;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function onTouchStart(event: TouchEvent) {
      const touch = event.changedTouches[0];
      if (edgeOnly && touch.clientX > 28) {
        startXRef.current = null;
        startYRef.current = null;
        return;
      }
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
    }

    function onTouchEnd(event: TouchEvent) {
      if (startXRef.current === null || startYRef.current === null) {
        return;
      }

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - startXRef.current;
      const deltaY = Math.abs(touch.clientY - startYRef.current);

      startXRef.current = null;
      startYRef.current = null;

      if (deltaX > threshold && deltaY < 72) {
        onBack();
      }
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [enabled, edgeOnly, onBack, threshold]);
}

