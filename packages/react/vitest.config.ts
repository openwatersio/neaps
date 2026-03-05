import { defineProject } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { resolve } from "node:path";

export default defineProject({
  resolve: {
    alias: {
      neaps: resolve(__dirname, "../neaps/src/index.ts"),
      "@neaps/api": resolve(__dirname, "../api/src/index.ts"),
      "@neaps/tide-predictor": resolve(__dirname, "../tide-predictor/src/index.ts"),
    },
  },
  test: {
    browser: {
      enabled: true,
      provider: playwright({ contextOptions: { locale: "en-US" } }),
      instances: [
        {
          browser: "chromium",
          headless: true,
          screenshotFailures: true,
        },
      ],
    },
    setupFiles: ["./test/setup.ts"],
    globalSetup: ["./test/globalSetup.ts"],
  },
});
