import { describe, test, expect, afterAll } from "vitest";
import { createApp } from "@neaps/api";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

describe("neaps serve", () => {
  let server: Server;

  afterAll(() => {
    server?.close();
  });

  test("starts the server and responds to requests", async () => {
    const app = createApp();
    server = app.listen(0);
    const { port } = server.address() as AddressInfo;

    const response = await fetch(
      `http://localhost:${port}/stations/noaa/8722588`,
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as { name: string };
    expect(body).toHaveProperty("name");
  });
});
