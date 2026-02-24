import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import ResizeObserver from "resize-observer-polyfill";

global.ResizeObserver = ResizeObserver;

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
