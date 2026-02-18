/**
 * Build a Node.js Single Executable Application (SEA).
 *
 * 1. Bundle ESM sources into a single CJS file with esbuild
 * 2. Build SEA binary with `node --build-sea` (Node 25.5+)
 */
import { build } from "esbuild";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const distDir = resolve(root, "dist");
const bundlePath = resolve(distDir, "sea-bundle.cjs");

const isWindows = process.platform === "win32";
const ext = isWindows ? ".exe" : "";
const outputPath = resolve(distDir, `neaps${ext}`);

if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// Step 1: Bundle ESM → single CJS file
console.log("Bundling with esbuild...");
await build({
  entryPoints: [resolve(root, "src/index.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: bundlePath,
  minify: true,
  sourcemap: false,
  external: [],
  target: "node25",
  banner: {
    js: "// Single executable application bundle",
  },
});
console.log(`Bundled to ${bundlePath}`);

// Step 2: Build SEA binary
const configPath = resolve(distDir, "sea-config.json");
writeFileSync(
  configPath,
  JSON.stringify({
    main: "./dist/sea-bundle.cjs",
    output: `./dist/neaps${ext}`,
    disableExperimentalSEAWarning: true,
    useCodeCache: true,
    executable: process.execPath,
  }),
);

console.log("Building SEA binary...");
execFileSync("node", ["--build-sea", configPath], { stdio: "inherit", cwd: root });

// macOS requires ad-hoc signing after injection
if (process.platform === "darwin") {
  console.log("Signing binary (macOS)...");
  execFileSync("codesign", ["--sign", "-", outputPath], { stdio: "inherit" });
}

console.log(`\nSingle executable built: ${outputPath}`);

const stats = statSync(outputPath);
const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
console.log(`Size: ${sizeMB} MB`);
