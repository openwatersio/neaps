import { describe, test, expect, afterEach } from "vitest";
import nock from "nock";
import { run } from "../helpers.js";
import { resolveCoordinates } from "../../src/lib/station.js";

afterEach(() => {
  nock.cleanAll();
});

describe("station resolution", () => {
  test("resolves by --station ID", async () => {
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
    expect(data.station.id).toBe("noaa/9414290");
  });

  test("resolves by --near coordinates", async () => {
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
    expect(data.station).toHaveProperty("id");
    expect(data.station).toHaveProperty("name");
  });

  test("resolves by --ip geolocation", async () => {
    nock("https://reallyfreegeoip.org")
      .get("/json/")
      .reply(200, { latitude: 37.7749, longitude: -122.4194 });

    const { stdout } = await run([
      "extremes",
      "--ip",
      "--start",
      "2026-01-01",
      "--end",
      "2026-01-02",
    ]);
    // Text output should contain tide data (spinner output from IP lookup also present)
    expect(stdout).toContain("High");
    expect(stdout).toContain("Location");
  });

  test("errors when --ip geolocation fails", async () => {
    nock("https://reallyfreegeoip.org").get("/json/").reply(500, "Internal Server Error");

    const { error } = await run([
      "extremes",
      "--ip",
      "--start",
      "2026-01-01",
      "--end",
      "2026-01-02",
    ]);
    expect(error).not.toBeNull();
    expect(error!.message).toContain("Failed to fetch IP geolocation");
  });

  test("errors on invalid --near coordinates", async () => {
    const { error } = await run(["extremes", "--near", "invalid"]);
    expect(error).not.toBeNull();
    expect(error!.message).toContain("Invalid coordinates");
  });

  test("errors on --near with wrong number of parts", async () => {
    const { error } = await run(["extremes", "--near", "37.8"]);
    expect(error).not.toBeNull();
    expect(error!.message).toContain("Invalid coordinates");
  });

  test("errors on --near with non-numeric values", async () => {
    const { error } = await run(["extremes", "--near", "abc,def"]);
    expect(error).not.toBeNull();
    expect(error!.message).toContain("Invalid coordinates");
  });

  test("resolveCoordinates errors with no options", async () => {
    await expect(resolveCoordinates({})).rejects.toThrow("No location specified");
  });
});
