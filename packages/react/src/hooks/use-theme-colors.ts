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
 * (MapLibre GL, canvas, etc.) can understand. `getPropertyValue` returns the
 * raw token stream (`light-dark(var(...))` etc.), which is not a usable color,
 * so the variable is applied as the `color` of a probe element and read back
 * as a computed value, then converted to #rrggbb via culori.
 */
function readCSSVar(probe: HTMLElement, name: string, fallback: string): string {
  probe.style.color = `var(${name}, ${fallback})`;
  const resolved = getComputedStyle(probe).color;
  if (!resolved) return fallback;
  return formatHex(resolved) ?? fallback;
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
 * Reads resolved `--slackwater-*` CSS custom property values from the DOM.
 * Re-computes when dark mode toggles.
 *
 * `--slackwater-map-text` and `--slackwater-map-bg` default to `--slackwater-text` and `--slackwater-bg`
 * respectively, so consumers only need to set them when the map background differs
 * from the app theme (e.g. satellite imagery).
 */
export function useThemeColors(): ThemeColors {
  const isDark = useDarkMode();
  return useMemo(() => {
    if (typeof document === "undefined") return FALLBACKS;
    const probe = document.createElement("span");
    probe.style.display = "none";
    document.body.appendChild(probe);
    try {
      const text = readCSSVar(probe, "--slackwater-text", FALLBACKS.text);
      const bg = readCSSVar(probe, "--slackwater-bg", FALLBACKS.bg);
      return {
        primary: readCSSVar(probe, "--slackwater-primary", FALLBACKS.primary),
        secondary: readCSSVar(probe, "--slackwater-secondary", FALLBACKS.secondary),
        high: readCSSVar(probe, "--slackwater-high", FALLBACKS.high),
        low: readCSSVar(probe, "--slackwater-low", FALLBACKS.low),
        danger: readCSSVar(probe, "--slackwater-danger", FALLBACKS.danger),
        bg,
        bgSubtle: readCSSVar(probe, "--slackwater-bg-subtle", FALLBACKS.bgSubtle),
        text,
        textMuted: readCSSVar(probe, "--slackwater-text-muted", FALLBACKS.textMuted),
        border: readCSSVar(probe, "--slackwater-border", FALLBACKS.border),
        mapText: readCSSVar(probe, "--slackwater-map-text", text),
        mapBg: readCSSVar(probe, "--slackwater-map-bg", bg),
      };
    } finally {
      probe.remove();
    }
  }, [isDark]);
}
