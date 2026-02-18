import { describe, test, expect } from "vitest";
import { run } from "../helpers.js";

describe("neaps", () => {
  test("--help outputs usage and exits", async () => {
    const { stdout, exitCode } = await run(["--help"]);
    expect(stdout).toContain("Usage:");
    expect(exitCode).toBe(0);
  });
});

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

  test("text output shows feet unit label", async () => {
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
    ]);
    expect(stdout).toContain("ft");
    expect(stdout).toContain("High");
  });

  test("resolves station by --near", async () => {
    const { stdout } = await run([
      "extremes",
      "--near",
      "37.8,-122.5",
      "--start",
      "2026-01-01",
      "--end",
      "2026-01-02",
      "--format",
      "json",
    ]);
    const data = JSON.parse(stdout);
    expect(data.extremes.length).toBeGreaterThan(0);
  });

  test("defaults start/end when omitted", async () => {
    const { stdout } = await run(["extremes", "--station", "noaa/9414290", "--format", "json"]);
    const data = JSON.parse(stdout);
    expect(data.extremes.length).toBeGreaterThan(0);
  });

  test("errors on invalid date range", async () => {
    const { error } = await run([
      "extremes",
      "--station",
      "noaa/9414290",
      "--start",
      "2026-01-02",
      "--end",
      "2026-01-01",
    ]);
    expect(error).not.toBeNull();
  });

  test("errors without station", async () => {
    const { error } = await run(["extremes"]);
    expect(error).not.toBeNull();
    expect(error!.message).toContain("No station specified");
  });
});
