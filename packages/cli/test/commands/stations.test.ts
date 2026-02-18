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

  test("throws when no stations found", async () => {
    const { error } = await run(["stations", "xyznonexistent123"]);
    expect(error).not.toBeNull();
    expect(error!.message).toContain("No stations found");
  });
});
