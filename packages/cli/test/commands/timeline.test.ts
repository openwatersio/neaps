import { describe, test, expect } from "vitest";
import { run } from "../helpers.js";

describe("neaps timeline", () => {
  test("gets timeline for a station", async () => {
    const { stdout } = await run([
      "timeline",
      "--station",
      "noaa/9414290",
      "--start",
      "2026-01-01",
      "--end",
      "2026-01-02",
    ]);
    expect(stdout).toContain("Time");
    expect(stdout).toContain("Level");
    expect(stdout).toContain("m");
  });

  test("outputs JSON", async () => {
    const { stdout } = await run([
      "timeline",
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
    expect(data).toHaveProperty("timeline");
    expect(Array.isArray(data.timeline)).toBe(true);
    expect(data.timeline[0]).toHaveProperty("time");
    expect(data.timeline[0]).toHaveProperty("level");
  });

  test("respects interval option", async () => {
    const { stdout: json30 } = await run([
      "timeline",
      "--station",
      "noaa/9414290",
      "--start",
      "2026-01-01",
      "--end",
      "2026-01-02",
      "--interval",
      "30",
      "--format",
      "json",
    ]);
    const { stdout: json120 } = await run([
      "timeline",
      "--station",
      "noaa/9414290",
      "--start",
      "2026-01-01",
      "--end",
      "2026-01-02",
      "--interval",
      "120",
      "--format",
      "json",
    ]);
    const data30 = JSON.parse(json30);
    const data120 = JSON.parse(json120);
    // 30-min intervals should have more points than 120-min intervals
    expect(data30.timeline.length).toBeGreaterThan(data120.timeline.length);
  });

  test("renders chart with feet units", async () => {
    const { stdout } = await run([
      "timeline",
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
    expect(stdout).toContain("Time");
  });

  test("resolves station by --near", async () => {
    const { stdout } = await run([
      "timeline",
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
    expect(data.timeline.length).toBeGreaterThan(0);
  });

  test("defaults start/end when omitted", async () => {
    const { stdout } = await run(["timeline", "--station", "noaa/9414290", "--format", "json"]);
    const data = JSON.parse(stdout);
    expect(data.timeline.length).toBeGreaterThan(0);
  });

  test("errors without station", async () => {
    const { error } = await run(["timeline"]);
    expect(error).not.toBeNull();
    expect(error!.message).toContain("No station specified");
  });

  test("errors on invalid date range", async () => {
    const { error } = await run([
      "timeline",
      "--station",
      "noaa/9414290",
      "--start",
      "2026-01-02",
      "--end",
      "2026-01-01",
    ]);
    expect(error).not.toBeNull();
  });
});
