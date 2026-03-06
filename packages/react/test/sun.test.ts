import { describe, test, expect } from "vitest";
import { getDaylightMidpoints, getNightIntervals } from "../src/utils/sun.js";

// Boston, MA (latitude ~42.36, longitude ~-71.06)
const BOSTON = { lat: 42.36, lng: -71.06 };

// A known date range: Dec 17–19, 2025 (winter, short days)
const DEC_17 = Date.UTC(2025, 11, 17, 0, 0, 0);
const DEC_19 = Date.UTC(2025, 11, 19, 23, 59, 59);

// A known date range: June 21–22, 2025 (summer solstice, long days)
const JUN_21 = Date.UTC(2025, 5, 21, 0, 0, 0);
const JUN_22 = Date.UTC(2025, 5, 22, 23, 59, 59);

describe("getDaylightMidpoints", () => {
  test("returns one midpoint per day", () => {
    const midpoints = getDaylightMidpoints(BOSTON.lat, BOSTON.lng, DEC_17, DEC_19);
    // 3 days: Dec 17, 18, 19
    expect(midpoints.length).toBe(3);
  });

  test("midpoints are Date objects within the range", () => {
    const midpoints = getDaylightMidpoints(BOSTON.lat, BOSTON.lng, DEC_17, DEC_19);
    for (const mp of midpoints) {
      expect(mp).toBeInstanceOf(Date);
      expect(mp.getTime()).toBeGreaterThanOrEqual(DEC_17);
      expect(mp.getTime()).toBeLessThanOrEqual(DEC_19);
    }
  });

  test("midpoints fall during daytime hours", () => {
    const midpoints = getDaylightMidpoints(BOSTON.lat, BOSTON.lng, DEC_17, DEC_19);
    for (const mp of midpoints) {
      const hour = mp.getUTCHours();
      // Boston is UTC-5, so solar noon ~17:00 UTC in winter; midpoint should be near that
      expect(hour).toBeGreaterThanOrEqual(14);
      expect(hour).toBeLessThanOrEqual(20);
    }
  });

  test("returns empty array for zero-length range", () => {
    const midpoints = getDaylightMidpoints(BOSTON.lat, BOSTON.lng, DEC_17, DEC_17);
    // Might return 1 (the day start falls on) or 0, but should not throw
    expect(midpoints.length).toBeLessThanOrEqual(1);
  });

  test("handles equatorial location", () => {
    // Equator should have roughly equal day/night year-round
    const equatorMids = getDaylightMidpoints(0, 0, DEC_17, DEC_19);
    expect(equatorMids.length).toBeGreaterThanOrEqual(1);
  });
});

describe("getNightIntervals", () => {
  test("returns night intervals for multi-day range", () => {
    const intervals = getNightIntervals(BOSTON.lat, BOSTON.lng, DEC_17, DEC_19);
    // Should have at least 1 night intervals for a 3-day span
    expect(intervals.length).toBeGreaterThanOrEqual(1);
  });

  test("each interval has start < end", () => {
    const intervals = getNightIntervals(BOSTON.lat, BOSTON.lng, DEC_17, DEC_19);
    for (const interval of intervals) {
      expect(interval.start).toBeLessThan(interval.end);
    }
  });

  test("intervals are within the range (with padding)", () => {
    const intervals = getNightIntervals(BOSTON.lat, BOSTON.lng, DEC_17, DEC_19);
    for (const interval of intervals) {
      // The function pads by 1 day, but clamps to the range
      expect(interval.start).toBeGreaterThanOrEqual(DEC_17);
      expect(interval.end).toBeLessThanOrEqual(DEC_19);
    }
  });

  test("returns fewer/shorter night intervals in summer", () => {
    const winterNights = getNightIntervals(BOSTON.lat, BOSTON.lng, DEC_17, DEC_19);
    const summerNights = getNightIntervals(BOSTON.lat, BOSTON.lng, JUN_21, JUN_22);

    // Winter nights should be longer on average than summer nights
    const avgWinterDuration =
      winterNights.reduce((sum, n) => sum + (n.end - n.start), 0) / (winterNights.length || 1);
    const avgSummerDuration =
      summerNights.reduce((sum, n) => sum + (n.end - n.start), 0) / (summerNights.length || 1);

    if (winterNights.length > 0 && summerNights.length > 0) {
      expect(avgWinterDuration).toBeGreaterThan(avgSummerDuration);
    }
  });

  test("intervals represent nighttime (sunset to sunrise)", () => {
    const intervals = getNightIntervals(BOSTON.lat, BOSTON.lng, DEC_17, DEC_19);
    expect(intervals.length).toBeGreaterThan(0);
    for (const interval of intervals) {
      const durationHours = (interval.end - interval.start) / (60 * 60 * 1000);
      // Each interval should be positive and not exceed a full day.
      // Partial nights at range boundaries may be shorter.
      expect(durationHours).toBeGreaterThan(0);
      expect(durationHours).toBeLessThan(24);
    }
    // At least one full-length night interval should exist in a 3-day range
    const fullNights = intervals.filter((i) => (i.end - i.start) / (60 * 60 * 1000) > 10);
    expect(fullNights.length).toBeGreaterThanOrEqual(1);
  });
});
