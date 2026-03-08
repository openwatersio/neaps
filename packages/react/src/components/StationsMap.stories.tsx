import type { Meta, StoryObj } from "@storybook/react";
import { NeapsProvider } from "../provider.js";
import { StationsMap } from "./StationsMap.js";

const meta: Meta<typeof StationsMap> = {
  title: "Components/StationsMap",
  component: StationsMap,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "100vw", height: "100vh" }}>
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
    initialViewState: { longitude: -71.05, latitude: 42.36, zoom: 8 },
    onStationSelect: (station) => console.log("Selected:", station),
  },
};

export const HighZoom: Story = {
  args: {
    mapStyle: "https://demotiles.maplibre.org/style.json",
    initialViewState: { longitude: -71.05, latitude: 42.36, zoom: 12 },
    onStationSelect: (station) => console.log("Selected:", station),
  },
};

export const Mini: Story = {
  args: {
    mapStyle: "https://demotiles.maplibre.org/style.json",
    initialViewState: {
      latitude: 40.6067008972168,
      longitude: -74.05500030517578,
      zoom: 11,
    },
    focusStation: "noaa/8519024",
    clustering: false,
    showGeolocation: false,
    className: "aspect-video rounded-lg overflow-hidden",
  },
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "300px", height: "200px" }}>
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
