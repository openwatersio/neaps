import { describe, test, expect } from "vitest";
import { run } from "./helpers.js";
import pkg from "../package.json" with { type: "json" };

describe("slackwater --version", () => {
  test("reports the package version", async () => {
    const { stdout, exitCode } = await run(["--version"]);
    expect(stdout.trim()).toBe(pkg.version);
    expect(exitCode).toBe(0);
  });
});
