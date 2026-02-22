import type { Meta, StoryObj } from "@storybook/react";
import { NeapsProvider } from "../provider.js";
import { TideGraph } from "./TideGraph.js";

const meta: Meta<typeof TideGraph> = {
  title: "Components/TideGraph",
  component: TideGraph,
  decorators: [
    (Story) => (
      <div style={{ width: "100%", maxWidth: 800, height: 300 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TideGraph>;

export const Default: Story = {
  args: {
    id: "noaa/8443970",
    timeRange: "24h",
  },
};

export const ThreeDays: Story = {
  args: {
    id: "noaa/8443970",
    timeRange: "3d",
  },
};

export const SevenDays: Story = {
  args: {
    id: "noaa/8443970",
    timeRange: "7d",
  },
};

export const WithTimeRangeSelector: Story = {
  args: {
    id: "noaa/8443970",
    showTimeRangeSelector: true,
  },
};

export const NarrowWidth: Story = {
  args: {
    id: "noaa/8443970",
    timeRange: "24h",
  },
  decorators: [
    (Story) => (
      <div style={{ width: 280, height: 200 }}>
        <Story />
      </div>
    ),
  ],
};

export const MediumWidth: Story = {
  args: {
    id: "noaa/8443970",
    timeRange: "3d",
  },
  decorators: [
    (Story) => (
      <div style={{ width: 500, height: 250 }}>
        <Story />
      </div>
    ),
  ],
};

export const DarkMode: Story = {
  args: {
    id: "noaa/8443970",
    timeRange: "24h",
  },
  decorators: [
    (Story) => (
      <div className="dark" style={{ background: "#0f172a", padding: "2rem", height: 300 }}>
        <Story />
      </div>
    ),
  ],
};

export const Loading: Story = {
  args: {
    id: "noaa/8443970",
    timeRange: "24h",
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
    timeRange: "24h",
  },
};
