import { defineProject } from "vitest/config";
import { resolve } from "node:path";

export default defineProject({
  test: {
    environment: "node",
    setupFiles: [resolve(__dirname, "../../test/setup.ts")],
  },
});
