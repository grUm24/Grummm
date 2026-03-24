import { useEffect, useState, type RefObject } from "react";

interface UseDeferredMediaOptions {
  rootMargin?: string;
  enabled?: boolean;
}

export function useDeferredMedia<T extends Element>(
  ref: RefObject<T>,
  { rootMargin = "320px 0px", enabled = true }: UseDeferredMediaOptions = {}
) {
  const [shouldLoad, setShouldLoad] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setShouldLoad(true);
      return;
    }

    const target = ref.current;
    if (!target) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [enabled, ref, rootMargin]);

  return shouldLoad;
}
