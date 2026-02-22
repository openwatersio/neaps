import type { Meta, StoryObj } from "@storybook/react";
import { NeapsProvider } from "../provider.js";
import { StationsMap } from "./StationsMap.js";

const meta: Meta<typeof StationsMap> = {
  title: "Components/StationsMap",
  component: StationsMap,
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: 500 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StationsMap>;

export const Default: Story = {
  args: {
    mapStyle: "https://demotiles.maplibre.org/style.json",
    onStationSelect: (station) => console.log("Selected:", station),
  },
};

export const USEastCoast: Story = {
  args: {
    mapStyle: "https://demotiles.maplibre.org/style.json",
    center: [-71.05, 42.36],
    zoom: 8,
    onStationSelect: (station) => console.log("Selected:", station),
  },
};

export const NoSearch: Story = {
  args: {
    mapStyle: "https://demotiles.maplibre.org/style.json",
    center: [-71.05, 42.36],
    zoom: 8,
    showSearch: false,
    onStationSelect: (station) => console.log("Selected:", station),
  },
};

export const HighZoom: Story = {
  args: {
    mapStyle: "https://demotiles.maplibre.org/style.json",
    center: [-71.05, 42.36],
    zoom: 12,
    onStationSelect: (station) => console.log("Selected:", station),
  },
};

export const DarkMode: Story = {
  args: {
    mapStyle: "https://demotiles.maplibre.org/style.json",
    onStationSelect: (station) => console.log("Selected:", station),
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
    mapStyle: "https://demotiles.maplibre.org/style.json",
    onStationSelect: (station) => console.log("Selected:", station),
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
    mapStyle: "https://demotiles.maplibre.org/style.json",
    onStationSelect: (station) => console.log("Selected:", station),
  },
  decorators: [
    (Story) => (
      <NeapsProvider baseUrl="http://localhost:1">
        <Story />
      </NeapsProvider>
    ),
  ],
};
