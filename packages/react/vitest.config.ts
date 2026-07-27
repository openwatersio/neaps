import { defineProject } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import tailwindcss from "@tailwindcss/vite";
import { aliases } from "../../aliases.js";

export default defineProject({
  plugins: [tailwindcss()],
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
          // Desktop-sized so components render in their full (non-tabbed)
          // layout by default; compact tests use fixed-size wrappers instead.
          viewport: { width: 1280, height: 800 },
        },
      ],
    },
    setupFiles: ["./test/setup.ts"],
    globalSetup: ["./test/globalSetup.ts"],
  },
});
