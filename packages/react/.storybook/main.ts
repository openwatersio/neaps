import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import { createApp } from "@neaps/api";

const API_PORT = 6007;

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  viteFinal(config) {
    config.plugins ??= [];
    config.plugins.push(tailwindcss());
    config.plugins.push({
      name: "neaps-api",
      async configureServer() {
        const app = createApp();
        app.listen(API_PORT, "0.0.0.0", () => {
          console.log(`Neaps API listening on http://0.0.0.0:${API_PORT}`);
        });
      },
    });
    return config;
  },
};

export default config;
