import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    typecheck: {
      enabled: true,
    },
    projects: ["packages/*", "scripts"],
    environment: "node",
    setupFiles: [resolve(__dirname, "./test/setup.ts")],
  },
});
