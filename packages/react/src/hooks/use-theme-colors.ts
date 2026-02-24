import { useMemo } from "react";
import { useDarkMode } from "./use-dark-mode.js";

export interface ThemeColors {
  primary: string;
  high: string;
  low: string;
  bg: string;
  bgSubtle: string;
  text: string;
  textMuted: string;
  border: string;
}

const FALLBACKS: ThemeColors = {
  primary: "#2563eb",
  high: "#3b82f6",
  low: "#f59e0b",
  bg: "#ffffff",
  bgSubtle: "#f8fafc",
  text: "#0f172a",
  textMuted: "#64748b",
  border: "#e2e8f0",
};

function readCSSVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** Add alpha transparency to a hex color string, returning rgba(). */
export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("#")) {
    const hex =
      color.length === 4
        ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
        : color.slice(0, 7);
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

/**
 * Reads resolved `--neaps-*` CSS custom property values from the DOM.
 * Re-computes when dark mode toggles so Chart.js (canvas) gets correct colors.
 */
export function useThemeColors(): ThemeColors {
  const isDark = useDarkMode();
  return useMemo(
    () => ({
      primary: readCSSVar("--neaps-primary", FALLBACKS.primary),
      high: readCSSVar("--neaps-high", FALLBACKS.high),
      low: readCSSVar("--neaps-low", FALLBACKS.low),
      bg: readCSSVar("--neaps-bg", FALLBACKS.bg),
      bgSubtle: readCSSVar("--neaps-bg-subtle", FALLBACKS.bgSubtle),
      text: readCSSVar("--neaps-text", FALLBACKS.text),
      textMuted: readCSSVar("--neaps-text-muted", FALLBACKS.textMuted),
      border: readCSSVar("--neaps-border", FALLBACKS.border),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDark],
  );
}
