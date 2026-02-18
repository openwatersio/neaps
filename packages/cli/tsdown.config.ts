import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  dts: true,
  sourcemap: true,
  platform: "node",
  format: ["esm"],
});
