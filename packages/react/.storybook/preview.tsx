import type { Preview } from "@storybook/react";
import { withThemeByDataAttribute } from "@storybook/addon-themes";
import { NeapsProvider } from "../src/provider.js";
import "./storybook.css";

const API_URL = `${window.location.protocol}//${window.location.hostname}:6007`;

const preview: Preview = {
  decorators: [
    (Story) => (
      <NeapsProvider baseUrl={API_URL}>
        <Story />
      </NeapsProvider>
    ),
    withThemeByDataAttribute({
      themes: {
        light: "light",
        dark: "dark",
      },
      defaultTheme: "light",
      attributeName: "data-theme",
    }),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
