import { describe, test, expect, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useThemeColors, withAlpha } from "../../src/hooks/use-theme-colors.js";

const VARS = [
  "--neaps-primary",
  "--neaps-text",
  "--neaps-bg",
  "--neaps-map-text",
  "--neaps-map-bg",
];

afterEach(() => {
  for (const name of VARS) {
    document.documentElement.style.removeProperty(name);
  }
});

describe("useThemeColors", () => {
  test("returns fallback colors when no CSS variables are set", () => {
    const { result } = renderHook(() => useThemeColors());

    expect(result.current.primary).toBe("#0284c7");
    expect(result.current.bg).toBe("#ffffff");
    expect(result.current.text).toBe("#0f172a");
  });

  test("resolves plain hex variable overrides", () => {
    document.documentElement.style.setProperty("--neaps-primary", "#ff0000");

    const { result } = renderHook(() => useThemeColors());

    expect(result.current.primary).toBe("#ff0000");
  });

  test("resolves light-dark() and var() chains to a usable hex color", () => {
    document.documentElement.style.setProperty(
      "--neaps-primary",
      "light-dark(var(--missing, #2563eb), var(--missing, #60a5fa))",
    );

    const { result } = renderHook(() => useThemeColors());

    // Resolves to one of the two depending on the browser color scheme,
    // but never the raw token stream or the fallback.
    expect(["#2563eb", "#60a5fa"]).toContain(result.current.primary);
  });

  test("resolves non-hex color formats to hex", () => {
    document.documentElement.style.setProperty("--neaps-primary", "rgb(1, 2, 3)");

    const { result } = renderHook(() => useThemeColors());

    expect(result.current.primary).toBe("#010203");
  });

  test("map colors default to text and bg", () => {
    document.documentElement.style.setProperty("--neaps-text", "#111111");
    document.documentElement.style.setProperty("--neaps-bg", "#eeeeee");

    const { result } = renderHook(() => useThemeColors());

    expect(result.current.mapText).toBe("#111111");
    expect(result.current.mapBg).toBe("#eeeeee");
  });

  test("map colors can be overridden independently", () => {
    document.documentElement.style.setProperty("--neaps-map-text", "#222222");

    const { result } = renderHook(() => useThemeColors());

    expect(result.current.mapText).toBe("#222222");
  });

  test("does not leave probe elements in the DOM", () => {
    const before = document.body.childElementCount;
    renderHook(() => useThemeColors());
    // The render container is added, but no extra probe spans linger at the end
    expect(document.body.querySelectorAll("span:empty").length).toBe(0);
    expect(document.body.childElementCount).toBeGreaterThanOrEqual(before);
  });
});

describe("withAlpha", () => {
  test("converts 6-digit hex to rgba", () => {
    expect(withAlpha("#ff0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
  });

  test("converts 3-digit hex to rgba", () => {
    expect(withAlpha("#f00", 0.25)).toBe("rgba(255, 0, 0, 0.25)");
  });

  test("converts rgb() to rgba", () => {
    expect(withAlpha("rgb(1, 2, 3)", 0.1)).toBe("rgba(1, 2, 3, 0.1)");
  });

  test("converts space-separated rgb() to rgba", () => {
    expect(withAlpha("rgb(1 2 3)", 0.1)).toBe("rgba(1, 2, 3, 0.1)");
  });

  test("returns unrecognized formats unchanged", () => {
    expect(withAlpha("hotpink", 0.5)).toBe("hotpink");
  });
});
