import { defineProject } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { aliases } from "../../aliases.js";

export default defineProject({
  resolve: {
    alias: aliases("@neaps/react"),
  },
  test: {
    browser: {
      enabled: true,
      provider: playwright({ contextOptions: { locale: "en-US" } }),
      instances: [
        {
          browser: "chromium",
          headless: true,
        },
      ],
    },
    setupFiles: ["./test/setup.ts"],
    globalSetup: ["./test/globalSetup.ts"],
  },
});
