import { defineProject } from "vitest/config";
import { aliases } from "../../aliases.js";

export default defineProject({
  resolve: { alias: aliases("@neaps/harmonics") },
  test: { environment: "node" },
});
