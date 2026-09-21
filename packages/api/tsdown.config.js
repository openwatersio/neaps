import { defineConfig } from "tsdown";

export default defineConfig({
  exports: true,
  entry: ["./src/index.ts"],
  dts: true,
  sourcemap: true,
  declarationMap: true,
  platform: "node",
  deps: { onlyBundle: false },
});
