import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    projects: ["packages/*"],
    environment: "node",
    setupFiles: [resolve(__dirname, "./test/setup.ts")],
    coverage: {
      thresholds: {
        100: true,
      },
    },
  },
});
