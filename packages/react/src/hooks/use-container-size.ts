import { useCallback, useEffect, useState } from "react";

export interface ContainerSize {
  width: number;
  height: number;
}

/**
 * Observes the rendered size of an element via ResizeObserver.
 *
 * Uses a callback ref so measurement starts even when the element
 * mounts after the first render (e.g. once loading completes).
 * Reports `{ width: 0, height: 0 }` until the first observation.
 */
export function useContainerSize() {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState<ContainerSize>({ width: 0, height: 0 });

  const ref = useCallback((el: HTMLDivElement | null) => {
    setElement(el);
  }, []);

  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize((prev) =>
          prev.width === width && prev.height === height ? prev : { width, height },
        );
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return { ref, width: size.width, height: size.height };
}
