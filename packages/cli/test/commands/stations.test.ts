import { describe, expect, test } from "vitest";
import { runCommand } from "@oclif/test";

function run(args: string[]) {
  return runCommand(["stations", ...args]);
}

describe("stations", () => {
  test("lists default limited set", async () => {
    const { stdout } = await run(["--format", "json"]);
    const list = JSON.parse(stdout);

    expect(list).toHaveLength(10);
  });

  test("supports --all while filtering by query", async () => {
    const { stdout } = await run(["--all", "Nonopapa", "--format", "json"]);
    const list = JSON.parse(stdout);

    expect(list.length).toBeGreaterThan(0);
    list.forEach((station: { id: string; name: string }) => {
      const search = "nonopapa";
      expect(
        station.id.toLowerCase().includes(search) || station.name.toLowerCase().includes(search),
      ).toBe(true);
    });
  });

  test("finds nearest stations", async () => {
    const { stdout } = await run(["--near", "37.8,-122.5", "--limit", "1", "--format", "json"]);
    const list = JSON.parse(stdout);

    expect(list).toHaveLength(1);
    expect(list[0].source.id).toBe("9414275");
  });

  test("throws when no stations match", async () => {
    const { error } = await run(["--format", "json", "this-will-not-match"]);

    expect(error?.message).toMatch(/No stations found/);
  });
});
