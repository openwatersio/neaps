import type { Meta, StoryObj } from "@storybook/react";
import { NeapsProvider } from "../../provider.js";
import { TideGraph } from "./TideGraph.js";

const meta: Meta<typeof TideGraph> = {
  title: "Components/TideGraph",
  component: TideGraph,
  argTypes: {
    id: { control: "text" },
    pxPerDay: { control: { type: "range", min: 100, max: 400, step: 25 } },
  },
};

export default meta;
type Story = StoryObj<typeof TideGraph>;

export const Default: Story = {
  args: {
    id: "noaa/8443970",
  },
};

export const DenseScale: Story = {
  args: {
    id: "noaa/8443970",
    pxPerDay: 100,
  },
};

export const WideScale: Story = {
  args: {
    id: "noaa/8443970",
    pxPerDay: 350,
  },
};

export const MobileWidth: Story = {
  args: {
    id: "noaa/8443970",
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
};

export const DesktopWidth: Story = {
  args: {
    id: "noaa/8443970",
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 1200 }}>
        <Story />
      </div>
    ),
  ],
};

export const DarkMode: Story = {
  args: {
    id: "noaa/8443970",
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
