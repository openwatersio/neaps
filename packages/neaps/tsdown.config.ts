import { defineConfig } from "tsdown";

// ESM-only: the CJS build externalized require("@neaps/tide-database"), which
// breaks once tide-database ships only ESM. require() still works on
// Node >= 20.19 / 22.12 via require(esm).
export default defineConfig({
  entry: ["./src/index.ts"],
  dts: true,
  format: ["esm"],
  sourcemap: true,
  declarationMap: true,
  target: "es2020",
  platform: "neutral",
});
