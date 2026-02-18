import { describe, test, expect } from "vitest";
import { run } from "../helpers.js";

describe("neaps stations", () => {
  test("lists stations with default limit", async () => {
    const { stdout } = await run(["stations"]);
    expect(stdout).toContain("ID");
    expect(stdout).toContain("Name");
    expect(stdout).toContain("10 stations found");
  });

  test("searches by name", async () => {
    const { stdout } = await run(["stations", "san francisco"]);
    expect(stdout.toLowerCase()).toContain("san francisco");
  });

  test("limits results", async () => {
    const { stdout } = await run(["stations", "--limit", "3"]);
    expect(stdout).toContain("3 stations found");
  });

  test("finds stations near coordinates", async () => {
    const { stdout } = await run(["stations", "--near", "37.8,-122.5", "--limit", "2"]);
    expect(stdout).toContain("Distance");
    expect(stdout).toContain("km");
  });

  test("combines search with --near", async () => {
    const { stdout } = await run([
      "stations",
      "francisco",
      "--near",
      "37.8,-122.5",
      "--limit",
      "3",
    ]);
    expect(stdout.toLowerCase()).toContain("francisco");
    expect(stdout).toContain("km");
  });

  test("outputs JSON", async () => {
    const { stdout } = await run(["stations", "san francisco", "--limit", "2", "--format", "json"]);
    const data = JSON.parse(stdout);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(2);
    expect(data[0]).toHaveProperty("id");
    expect(data[0]).toHaveProperty("name");
  });

  test("--all flag shows all stations", async () => {
    const { stdout } = await run(["stations", "san francisco", "--all"]);
    // Should not be limited to 10
    expect(stdout.toLowerCase()).toContain("san francisco");
    expect(stdout).toContain("stations found");
  });

  test("--all with search returns more than default limit", async () => {
    const { stdout: limited } = await run(["stations", "port", "--format", "json"]);
    const { stdout: all } = await run(["stations", "port", "--all", "--format", "json"]);
    const limitedData = JSON.parse(limited);
    const allData = JSON.parse(all);
    expect(allData.length).toBeGreaterThan(limitedData.length);
  });

  test("shows singular 'station' for single result", async () => {
    const { stdout } = await run(["stations", "--near", "37.8,-122.5", "--limit", "1"]);
    expect(stdout).toContain("1 station found");
    // Should NOT say "stations" (plural)
    expect(stdout).not.toContain("1 stations found");
  });

  test("--near JSON output includes distance", async () => {
    const { stdout } = await run([
      "stations",
      "--near",
      "37.8,-122.5",
      "--limit",
      "2",
      "--format",
      "json",
    ]);
    const data = JSON.parse(stdout);
    expect(data[0]).toHaveProperty("distance");
    expect(typeof data[0].distance).toBe("number");
  });

  test("throws when no stations found", async () => {
    const { error } = await run(["stations", "xyznonexistent123"]);
    expect(error).not.toBeNull();
    expect(error!.message).toContain("No stations found");
  });
});
