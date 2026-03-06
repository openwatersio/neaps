import { describe, test, expect } from "vitest";
import { interpolateLevel } from "../src/hooks/use-current-level.js";
import type { TimelineEntry } from "../src/types.js";

function entry(minutesFromEpoch: number, level: number): TimelineEntry {
  return { time: new Date(minutesFromEpoch * 60000), level };
}

describe("interpolateLevel", () => {
  test("returns null for empty timeline", () => {
    expect(interpolateLevel([], 1000)).toBeNull();
  });

  test("returns null when time is before all entries", () => {
    const timeline = [entry(10, 1.0), entry(20, 2.0)];
    expect(interpolateLevel(timeline, 5 * 60000)).toBeNull();
  });

  test("returns null when time is after all entries", () => {
    const timeline = [entry(10, 1.0), entry(20, 2.0)];
    expect(interpolateLevel(timeline, 25 * 60000)).toBeNull();
  });

  test("interpolates midpoint between two entries", () => {
    const timeline = [entry(10, 1.0), entry(20, 3.0)];
    const result = interpolateLevel(timeline, 15 * 60000);

    expect(result).not.toBeNull();
    expect(result!.level).toBeCloseTo(2.0);
    expect(result!.time.getTime()).toBe(15 * 60000);
  });

  test("interpolates at exact first entry time", () => {
    const timeline = [entry(10, 1.0), entry(20, 3.0)];
    const result = interpolateLevel(timeline, 10 * 60000);
    // lo=0 (time <= at), hi=1 (first time > at)
    // ratio = 0, so level = 1.0
    expect(result).not.toBeNull();
    expect(result!.level).toBeCloseTo(1.0);
  });

  test("interpolates quarter way between entries", () => {
    const timeline = [entry(0, 0), entry(100, 4.0)];
    const result = interpolateLevel(timeline, 25 * 60000);

    expect(result).not.toBeNull();
    expect(result!.level).toBeCloseTo(1.0);
  });

  test("works with multiple entries, picks correct pair", () => {
    const timeline = [entry(0, 0), entry(10, 2.0), entry(20, 4.0), entry(30, 1.0)];
    // Between entry(20, 4.0) and entry(30, 1.0), midpoint
    const result = interpolateLevel(timeline, 25 * 60000);

    expect(result).not.toBeNull();
    expect(result!.level).toBeCloseTo(2.5);
  });

  test("handles negative levels", () => {
    const timeline = [entry(0, -2.0), entry(10, -4.0)];
    const result = interpolateLevel(timeline, 5 * 60000);

    expect(result).not.toBeNull();
    expect(result!.level).toBeCloseTo(-3.0);
  });

  test("returns correct time in result", () => {
    const timeline = [entry(10, 1.0), entry(20, 2.0)];
    const queryTime = 17 * 60000;
    const result = interpolateLevel(timeline, queryTime);

    expect(result).not.toBeNull();
    expect(result!.time.getTime()).toBe(queryTime);
  });
});
