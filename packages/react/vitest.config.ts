import { defineProject } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

export default defineProject({
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
    },
    setupFiles: ["./test/setup.ts"],
    globalSetup: ["./test/globalSetup.ts"],
  },
});
