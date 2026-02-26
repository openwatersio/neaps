import { describe, test, expect, afterEach } from "vitest";
import { run } from "../helpers.js";
import { stop } from "../../src/commands/serve.js";

describe("neaps serve", () => {
  afterEach(stop);

  test("starts server and responds to requests", async () => {
    const { stdout } = await run(["serve", "--port", "19283"]);

    expect(stdout).toContain("Neaps API listening on http://localhost:19283");

    const response = await fetch("http://localhost:19283/stations/noaa/8722588");
    expect(response.status).toBe(200);

    const body = (await response.json()) as { name: string };
    expect(body).toHaveProperty("name");
  });

  test("accepts -p flag for port", async () => {
    const { stdout } = await run(["serve", "-p", "19284"]);

    expect(stdout).toContain("Neaps API listening on http://localhost:19284");

    const response = await fetch("http://localhost:19284/");
    expect(response.status).toBe(200);
    // Consume response body to avoid hanging connections
    await response.text();
  });
});
