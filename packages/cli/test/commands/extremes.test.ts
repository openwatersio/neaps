import { describe, test, expect } from "vitest";
import { runCommand } from "@oclif/test";
import nock from "nock";

nock.disableNetConnect();

describe("extremes", async () => {
  function run(args: string[]) {
    return runCommand(["extremes", ...args]);
  }

  test("--help", async () => {
    const { stdout } = await run(["--help"]);
    expect(stdout).toMatch(/extremes/);
    expect(stdout).toMatch(/--station/);
    expect(stdout).toMatch(/--start/);
    expect(stdout).toMatch(/--end/);
    expect(stdout).toMatch(/--format/);
  });

  test("--station <id>", async () => {
    const { stdout } = await run(["--station", "9414290", "--start", "2026-01-01"]);
    expect(stdout).toMatch(/SAN FRANCISCO/);
  });

  test("--near 22.24,-75.75", async () => {
    const { stdout } = await run(["--near", "22.24,-75.75"]);
    expect(stdout).toMatch(/Nurse Channel/);
  });

  test("--ip", async () => {
    nock("https://reallyfreegeoip.org").get("/json/").reply(200, {
      latitude: 25.0565,
      longitude: -77.3524,
    });

    const { stdout } = await run(["--ip"]);
    expect(stdout).toMatch(/Nassau, New Providence Island/);
  });

  describe("--start", () => {
    test("defaults to today", async () => {
      const today = new Date().toISOString().split("T")[0];

      const { stdout } = await run(["--station", "9414290"]);
      expect(stdout).toMatch(new RegExp(today));
    });

    test("accepts partial date", async () => {
      const { stdout } = await run(["--station", "9414290", "--start", "2025-12-25"]);
      expect(stdout).toMatch(/2025-12-25/);
    });

    test("accepts full date", async () => {
      const { stdout } = await run(["--station", "9414290", "--start", "2025-12-25T00:00:00Z"]);
      expect(stdout).toMatch(/2025-12-25/);
    });

    test("with invalid input", async () => {
      const { error } = await run(["--station", "9414290", "--start", "invalid-date"]);
      expect(error?.message).toMatch(/Invalid time value/);
    });
  });

  describe("--end", () => {
    test("defaults to 72 hours from start", async () => {
      const { stdout } = await run(["--station", "9414290", "--start", "2025-12-25"]);
      expect(stdout).toMatch(/2025-12-27/);
    });

    test("accepts partial date", async () => {
      const { stdout } = await run([
        "--station",
        "9414290",
        "--start",
        "2025-12-25",
        "--end",
        "2025-12-26",
      ]);
      expect(stdout).toMatch(/2025-12-25/);
      expect(stdout).not.toMatch(/2025-12-26/);
    });
  });

  describe("--format", () => {
    test("json", async () => {
      const { stdout } = await run(["--station", "9414290", "--format", "json"]);
      const result = JSON.parse(stdout);
      expect(result.station.name).toMatch(/SAN FRANCISCO/i);
      expect(result.datum).toEqual("MLLW");
      expect(result.extremes.length).toBeGreaterThan(0);
    });
  });

  test("no station specified throws error", async () => {
    const { error } = await run([]);
    expect(error?.message).toMatch(/No station specified/);
  });

  test("invalid station ID throws error", async () => {
    const { error } = await run(["--station", "invalid-station-id-xyz"]);
    expect(error?.message).toMatch(/Station not found/);
  });

  test("--ip with failed geolocation", async () => {
    nock("https://reallyfreegeoip.org").get("/json/").reply(500);
    const { error } = await run(["--ip"]);
    expect(error?.message).toMatch(/Failed to fetch IP geolocation/);
  });
});
