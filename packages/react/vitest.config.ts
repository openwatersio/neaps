import { defineProject } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

export default defineProject({
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
