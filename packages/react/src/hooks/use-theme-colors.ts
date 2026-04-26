import { useMemo } from "react";
import { formatHex } from "culori";
import { useDarkMode } from "./use-dark-mode.js";

export interface ThemeColors {
  primary: string;
  secondary: string;
  high: string;
  low: string;
  danger: string;
  bg: string;
  bgSubtle: string;
  text: string;
  textMuted: string;
  border: string;
  mapText: string;
  mapBg: string;
}

const FALLBACKS: ThemeColors = {
  primary: "#0284c7",
  secondary: "#7c3aed",
  high: "#0d9488",
  low: "#d97706",
  danger: "#ef4444",
  bg: "#ffffff",
  bgSubtle: "#f8fafc",
  text: "#0f172a",
  textMuted: "#64748b",
  border: "#e2e8f0",
  mapText: "#0f172a",
  mapBg: "#ffffff",
};

/**
 * Resolve a CSS custom property to a hex color that any consumer
 * (MapLibre GL, canvas, etc.) can understand. Converts any CSS color
 * format (oklch, lab, hsl, etc.) to #rrggbb via culori.
 */
function readCSSVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return fallback;
  return formatHex(raw) ?? fallback;
}

/** Add alpha transparency to a color string (hex or rgb), returning rgba(). */
export function withAlpha(color: string, alpha: number): string {
  // Handle rgb(r, g, b) or rgb(r g b)
  const rgbMatch = color.match(/^rgb\((\d+)[, ]+(\d+)[, ]+(\d+)\)$/);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${alpha})`;
  }
  // Handle hex
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
 * Re-computes when dark mode toggles.
 *
 * `--neaps-map-text` and `--neaps-map-bg` default to `--neaps-text` and `--neaps-bg`
 * respectively, so consumers only need to set them when the map background differs
 * from the app theme (e.g. satellite imagery).
 */
export function useThemeColors(): ThemeColors {
  const isDark = useDarkMode();
  return useMemo(() => {
    const text = readCSSVar("--neaps-text", FALLBACKS.text);
    const bg = readCSSVar("--neaps-bg", FALLBACKS.bg);
    return {
      primary: readCSSVar("--neaps-primary", FALLBACKS.primary),
      secondary: readCSSVar("--neaps-secondary", FALLBACKS.secondary),
      high: readCSSVar("--neaps-high", FALLBACKS.high),
      low: readCSSVar("--neaps-low", FALLBACKS.low),
      danger: readCSSVar("--neaps-danger", FALLBACKS.danger),
      bg,
      bgSubtle: readCSSVar("--neaps-bg-subtle", FALLBACKS.bgSubtle),
      text,
      textMuted: readCSSVar("--neaps-text-muted", FALLBACKS.textMuted),
      border: readCSSVar("--neaps-border", FALLBACKS.border),
      mapText: readCSSVar("--neaps-map-text", text),
      mapBg: readCSSVar("--neaps-map-bg", bg),
    };
  }, [isDark]);
}
