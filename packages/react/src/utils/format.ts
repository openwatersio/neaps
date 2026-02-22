import type { Units } from "../types.js";

/** Format a water level value with unit suffix. */
export function formatLevel(level: number, units: Units): string {
  const precision = units === "feet" ? 1 : 2;
  const suffix = units === "feet" ? "ft" : "m";
  return `${level.toFixed(precision)} ${suffix}`;
}

/** Format a time string in the station's timezone. */
export function formatTime(isoTime: string, timezone: string): string {
  return new Date(isoTime).toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Format a date string in the station's timezone. */
export function formatDate(isoTime: string, timezone: string): string {
  return new Date(isoTime).toLocaleDateString("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Format a distance in meters as a human-readable string. */
export function formatDistance(meters: number, units: Units): string {
  if (units === "feet") {
    const miles = meters / 1609.344;
    return miles < 0.1 ? `${Math.round(meters * 3.2808399)} ft` : `${miles.toFixed(1)} mi`;
  }
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

/** Get a date key (YYYY-MM-DD) in the station's timezone. */
export function getDateKey(isoTime: string, timezone: string): string {
  return new Date(isoTime).toLocaleDateString("en-CA", { timeZone: timezone });
}
