import { createApp } from "@neaps/api";
import type { TestProject } from "vitest/node";

export default function setup({ provide }: TestProject) {
  const app = createApp();
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const baseUrl = `http://localhost:${port}`;
  provide("apiBaseUrl", baseUrl);

  return function teardown() {
    server.close();
  };
}

declare module "vitest" {
  export interface ProvidedContext {
    apiBaseUrl: string;
  }
}
