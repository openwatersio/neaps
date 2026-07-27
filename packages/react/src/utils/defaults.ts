import type { Units } from "../types.js";

const IMPERIAL_LOCALES = ["en-US", "en-LR", "my-MM"];

/**
 * Determine the default unit system from a locale string.
 * Falls back to detecting from `navigator.language` when no locale is provided.
 */
export function getDefaultUnits(locale?: string): Units {
  const lang = locale ?? (typeof navigator !== "undefined" ? navigator.language : "en-US");
  return IMPERIAL_LOCALES.includes(lang) ? "feet" : "meters";
}

/** Compute the default date range used by TideStation: start of today (UTC) through +7 days. */
export function getDefaultRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime());
  end.setUTCDate(end.getUTCDate() + 7);
  return { start: start.toISOString(), end: end.toISOString() };
}
