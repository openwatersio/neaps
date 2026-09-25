import { defineConfig } from "vite";
import { aliases } from "../../aliases.js";

export default defineConfig({
  resolve: {
    alias: aliases("@slackwater/react"),
  },
});
