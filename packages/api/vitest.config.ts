import { defineProject } from "vitest/config";
import { resolve } from "node:path";
import { aliases } from "../../aliases.js";

export default defineProject({
  resolve: {
    alias: aliases("@neaps/api"),
  },
  test: {
    environment: "node",
    setupFiles: [resolve(__dirname, "../../test/setup.ts")],
  },
});
