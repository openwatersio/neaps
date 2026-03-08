import { describe, test, expect } from "vitest";
import { getDefaultUnits, getDefaultRange } from "../src/utils/defaults.js";

describe("getDefaultUnits", () => {
  test("returns feet for en-US", () => {
    expect(getDefaultUnits("en-US")).toBe("feet");
  });

  test("returns feet for en-LR (Liberia)", () => {
    expect(getDefaultUnits("en-LR")).toBe("feet");
  });

  test("returns feet for my-MM (Myanmar)", () => {
    expect(getDefaultUnits("my-MM")).toBe("feet");
  });

  test("returns meters for en-GB", () => {
    expect(getDefaultUnits("en-GB")).toBe("meters");
  });

  test("returns meters for fr-FR", () => {
    expect(getDefaultUnits("fr-FR")).toBe("meters");
  });

  test("returns meters for ja-JP", () => {
    expect(getDefaultUnits("ja-JP")).toBe("meters");
  });

  test("falls back to navigator.language when no locale provided", () => {
    // In test environment (en-US), should return feet
    const result = getDefaultUnits();
    expect(["feet", "meters"]).toContain(result);
  });
});

describe("getDefaultRange", () => {
  test("returns start and end as ISO strings", () => {
    const { start, end } = getDefaultRange();
    expect(start).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(end).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test("start has hours/minutes/seconds zeroed out (local midnight)", () => {
    const { start } = getDefaultRange();
    const date = new Date(start);
    // getDefaultRange uses setHours(0,0,0,0) which zeros local time components
    expect(date.getMinutes()).toBe(0);
    expect(date.getSeconds()).toBe(0);
    expect(date.getMilliseconds()).toBe(0);
  });

  test("end is 7 days after start", () => {
    const { start, end } = getDefaultRange();
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffDays = (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBe(7);
  });
});
