import type { Preview } from "@storybook/react";
import { withThemeByDataAttribute } from "@storybook/addon-themes";
import { NeapsProvider } from "../src/provider.js";
import "./storybook.css";

// STORYBOOK_API_URL points static builds (e.g. GitHub Pages) at a public API;
// the default targets the local API started by the Storybook dev server.
const API_URL =
  import.meta.env.STORYBOOK_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:6007`;

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
