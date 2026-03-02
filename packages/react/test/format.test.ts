import { describe, test, expect } from "vitest";
import {
  formatLevel,
  formatTime,
  formatDate,
  formatDistance,
  getDateKey,
} from "../src/utils/format.js";

describe("formatLevel", () => {
  test("meters with 2 decimal places", () => {
    expect(formatLevel(1.4567, "meters")).toBe("1.46 m");
  });

  test("feet with 1 decimal place", () => {
    expect(formatLevel(4.78, "feet")).toBe("4.8 ft");
  });

  test("zero", () => {
    expect(formatLevel(0, "meters")).toBe("0.00 m");
  });

  test("negative values", () => {
    expect(formatLevel(-0.25, "meters")).toBe("-0.25 m");
  });
});

describe("formatTime", () => {
  test("formats time in given timezone", () => {
    const result = formatTime("2025-12-17T10:23:00Z", "America/New_York");
    expect(result).toBe("5:23 AM");
  });

  test("UTC timezone", () => {
    const result = formatTime("2025-12-17T10:23:00Z", "UTC");
    expect(result).toBe("10:23 AM");
  });
});

describe("formatDate", () => {
  test("formats date with weekday, month, day", () => {
    const result = formatDate("2025-12-17T10:00:00Z", "UTC");
    expect(result).toBe("Wed, Dec 17");
  });
});

describe("formatDistance", () => {
  test("short distance in meters", () => {
    expect(formatDistance(450, "meters")).toBe("450 m");
  });

  test("long distance in kilometers", () => {
    expect(formatDistance(2500, "meters")).toBe("2.5 km");
  });

  test("short distance in feet", () => {
    expect(formatDistance(25, "feet")).toBe("82 ft");
  });

  test("long distance in miles", () => {
    expect(formatDistance(5000, "feet")).toBe("3.1 mi");
  });
});

describe("getDateKey", () => {
  test("returns YYYY-MM-DD in timezone", () => {
    // 2025-12-17T02:00:00Z is still Dec 16 in New York (UTC-5)
    expect(getDateKey("2025-12-17T02:00:00Z", "America/New_York")).toBe("2025-12-16");
    expect(getDateKey("2025-12-17T02:00:00Z", "UTC")).toBe("2025-12-17");
  });
});
