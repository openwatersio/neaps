import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom has no layout engine, so ResizeObserver never reports a non-zero width.
// Mock it to immediately report a width so components that depend on it render.
global.ResizeObserver = class FakeResizeObserver implements ResizeObserver {
  constructor(private cb: ResizeObserverCallback) {}
  observe(target: Element) {
    this.cb(
      [{ target, contentRect: { width: 600, height: 300 } } as unknown as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
  unobserve() {}
  disconnect() {}
};

// jsdom doesn't implement SVG text measurement methods (used by @visx/text)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(SVGElement.prototype as any).getComputedTextLength = function () {
  return 0;
};

// jsdom doesn't provide IntersectionObserver
import "intersection-observer";

// jsdom doesn't provide matchMedia — stub it for useDarkMode / useThemeColors
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

afterEach(() => {
  cleanup();
});
