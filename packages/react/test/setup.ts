import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import ResizeObserver from "resize-observer-polyfill";

global.ResizeObserver = ResizeObserver;

afterEach(() => {
  cleanup();
});
