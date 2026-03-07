import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  platform: "node",
  deps: {
    skipNodeModulesBundle: false,
  },
  exe: {
    fileName: "neaps",
    seaConfig: {
      disableExperimentalSEAWarning: true,
    },
  },
  onSuccess: (config) => {
    // Re-sign with the stable identifier for reproducible builds.
    // tsdown performs an initial ad-hoc sign (defaulting to the binary
    // name as the identifier); this overwrites it with the canonical one.
    if (process.platform === "darwin") {
      const outputPath = resolve(config.outDir, "neaps");
      execFileSync("codesign", [
        "--sign",
        "-",
        "--identifier",
        "io.openwaters.neaps",
        "--force",
        outputPath,
      ]);
    }
  },
});
