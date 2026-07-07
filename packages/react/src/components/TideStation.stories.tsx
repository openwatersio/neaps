import type { Meta, StoryObj } from "@storybook/react";
import { NeapsProvider } from "../provider.js";
import { TideStation } from "./TideStation.js";

const meta: Meta<typeof TideStation> = {
  title: "Components/TideStation",
  component: TideStation,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 600 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TideStation>;

export const Default: Story = {
  args: {
    id: "noaa/8443970",
  },
};

/** Narrow dashboard widget: fixed height forces the tabbed layout */
export const WidgetSize: Story = {
  args: {
    id: "noaa/8443970",
  },
  decorators: [
    (Story) => (
      <div style={{ width: 250, height: 400 }}>
        <Story />
      </div>
    ),
  ],
};

/** KIP-style dashboard thumbnail: both dimensions fixed and small */
export const Thumbnail: Story = {
  args: {
    id: "noaa/8443970",
  },
  decorators: [
    (Story) => (
      <div style={{ width: 250, height: 200 }}>
        <Story />
      </div>
    ),
  ],
};

export const SmallPanel: Story = {
  args: {
    id: "noaa/8443970",
  },
  decorators: [
    (Story) => (
      <div style={{ width: 400, height: 320 }}>
        <Story />
      </div>
    ),
  ],
};

/** Wide but short — height alone should trigger the tabbed layout */
export const WideShort: Story = {
  args: {
    id: "noaa/8443970",
  },
  decorators: [
    (Story) => (
      <div style={{ width: 700, height: 300 }}>
        <Story />
      </div>
    ),
  ],
};

export const MobileWidth: Story = {
  args: {
    id: "noaa/8443970",
    showTable: true,
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
};

export const DesktopSideBySide: Story = {
  args: {
    id: "noaa/8443970",
    showGraph: true,
    showTable: true,
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 900 }}>
        <Story />
      </div>
    ),
  ],
};

export const FrenchLocale: Story = {
  args: {
    id: "noaa/8443970",
    showTable: true,
  },
  decorators: [
    (Story) => (
      <NeapsProvider baseUrl="http://localhost:6007" locale="fr-FR">
        <Story />
      </NeapsProvider>
    ),
  ],
};

export const Loading: Story = {
  args: {
    id: "noaa/8443970",
  },
  decorators: [
    (Story) => (
      <NeapsProvider baseUrl="http://localhost:1">
        <Story />
      </NeapsProvider>
    ),
  ],
};

export const Error: Story = {
  args: {
    id: "nonexistent/station",
  },
};
