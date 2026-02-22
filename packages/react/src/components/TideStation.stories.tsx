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

export const WithTable: Story = {
  args: {
    id: "noaa/8443970",
    showTable: true,
  },
};

export const TableOnly: Story = {
  args: {
    id: "noaa/8443970",
    showGraph: false,
    showTable: true,
  },
};

export const ThreeDayRange: Story = {
  args: {
    id: "noaa/8443970",
    timeRange: "3d",
    showTable: true,
  },
};

export const WidgetSize: Story = {
  args: {
    id: "noaa/8443970",
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 250 }}>
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

export const DarkMode: Story = {
  args: {
    id: "noaa/8443970",
    showTable: true,
  },
  decorators: [
    (Story) => (
      <div className="dark" style={{ background: "#0f172a", padding: "2rem" }}>
        <Story />
      </div>
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
