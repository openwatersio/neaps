import { describe, test, expect } from "vitest";
import { run } from "../helpers.js";

describe("neaps extremes", () => {
  test("gets extremes for a station", async () => {
    const { stdout } = await run([
      "extremes",
      "--station",
      "noaa/9414290",
      "--start",
      "2026-01-01",
      "--end",
      "2026-01-02",
    ]);
    expect(stdout).toContain("High");
    expect(stdout).toContain("Low");
  });

  test("outputs JSON", async () => {
    const { stdout } = await run([
      "extremes",
      "--station",
      "noaa/9414290",
      "--start",
      "2026-01-01",
      "--end",
      "2026-01-02",
      "--format",
      "json",
    ]);
    const data = JSON.parse(stdout);
    expect(data).toHaveProperty("datum");
    expect(data).toHaveProperty("units");
    expect(data).toHaveProperty("extremes");
    expect(Array.isArray(data.extremes)).toBe(true);
    expect(data.extremes[0]).toHaveProperty("time");
    expect(data.extremes[0]).toHaveProperty("level");
    expect(data.extremes[0]).toHaveProperty("high");
  });

  test("supports feet", async () => {
    const { stdout } = await run([
      "extremes",
      "--station",
      "noaa/9414290",
      "--start",
      "2026-01-01",
      "--end",
      "2026-01-02",
      "--units",
      "feet",
      "--format",
      "json",
    ]);
    const data = JSON.parse(stdout);
    expect(data.units).toBe("feet");
  });

  test("errors without station", async () => {
    const { error } = await run(["extremes"]);
    expect(error).not.toBeNull();
    expect(error!.message).toContain("No station specified");
  });
});
