import { describe, test, expect, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDarkMode } from "../../src/hooks/use-dark-mode.js";

afterEach(() => {
  document.documentElement.classList.remove("dark");
});

describe("useDarkMode", () => {
  test("reflects the .dark class on <html>", async () => {
    const { result } = renderHook(() => useDarkMode());
    const initial = result.current;
    expect(typeof initial).toBe("boolean");

    document.documentElement.classList.add("dark");

    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    document.documentElement.classList.remove("dark");

    // Falls back to the system preference once the class is removed
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    await waitFor(() => {
      expect(result.current).toBe(prefersDark);
    });
  });

  test("is true immediately when .dark is set before mount", () => {
    document.documentElement.classList.add("dark");

    const { result } = renderHook(() => useDarkMode());

    expect(result.current).toBe(true);
  });
});
