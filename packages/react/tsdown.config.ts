import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  dts: true,
  format: ["cjs", "esm"],
  sourcemap: true,
  target: "es2020",
  platform: "browser",
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "maplibre-gl",
    "react-map-gl",
    "react-map-gl/maplibre",
    "maplibre-gl/dist/maplibre-gl.css",
  ],
  copy: ["./src/styles.css"],
});
