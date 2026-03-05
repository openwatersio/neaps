import { defineProject } from "vitest/config";
import { resolve } from "node:path";

export default defineProject({
  resolve: {
    alias: {
      neaps: resolve(__dirname, "../neaps/src/index.ts"),
      "@neaps/tide-predictor": resolve(__dirname, "../tide-predictor/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    setupFiles: [resolve(__dirname, "../../test/setup.ts")],
  },
});
