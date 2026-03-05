import { resolve } from "node:path";
import { defineConfig } from "vite";

const packages = resolve(__dirname, "..");

export default defineConfig({
  resolve: {
    alias: {
      neaps: resolve(packages, "neaps/src/index.ts"),
      "@neaps/api": resolve(packages, "api/src/index.ts"),
      "@neaps/tide-predictor": resolve(packages, "tide-predictor/src/index.ts"),
    },
  },
});
