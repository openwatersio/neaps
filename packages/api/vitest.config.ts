import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: [resolve(__dirname, "../../test/setup.ts")],
  },
});
