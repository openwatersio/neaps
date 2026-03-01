import type { Preview } from "@storybook/react";
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
