import type { Meta, StoryObj } from "@storybook/react";
import { NeapsProvider } from "../provider.js";
import { TideTable } from "./TideTable.js";

const meta: Meta<typeof TideTable> = {
  title: "Components/TideTable",
  component: TideTable,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 500 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TideTable>;

export const SingleDay: Story = {
  args: {
    id: "noaa/8443970",
    days: 1,
  },
};

export const ThreeDays: Story = {
  args: {
    id: "noaa/8443970",
    days: 3,
  },
};

export const SevenDays: Story = {
  args: {
    id: "noaa/8443970",
    days: 7,
  },
};

export const NarrowWidth: Story = {
  args: {
    id: "noaa/8443970",
    days: 3,
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 300 }}>
        <Story />
      </div>
    ),
  ],
};

export const DarkMode: Story = {
  args: {
    id: "noaa/8443970",
    days: 3,
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
    days: 1,
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
    days: 1,
  },
};

export const Empty: Story = {
  args: {
    extremes: [],
    timezone: "America/New_York",
    units: "meters",
  },
};
