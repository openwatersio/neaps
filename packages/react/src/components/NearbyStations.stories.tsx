import type { Meta, StoryObj } from "@storybook/react";
import { NeapsProvider } from "../provider.js";
import { NearbyStations } from "./NearbyStations.js";

const meta: Meta<typeof NearbyStations> = {
  title: "Components/NearbyStations",
  component: NearbyStations,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 400 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof NearbyStations>;

export const ByStation: Story = {
  args: {
    stationId: "noaa/8443970",
    onStationSelect: (station) => console.log("Selected:", station),
  },
};

export const ByPosition: Story = {
  args: {
    latitude: 42.3541,
    longitude: -71.0495,
    onStationSelect: (station) => console.log("Selected:", station),
  },
};

export const LimitedResults: Story = {
  args: {
    stationId: "noaa/8443970",
    maxResults: 3,
    onStationSelect: (station) => console.log("Selected:", station),
  },
};

export const DarkMode: Story = {
  args: {
    stationId: "noaa/8443970",
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
    stationId: "noaa/8443970",
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
    stationId: "nonexistent/station",
    onStationSelect: (station) => console.log("Selected:", station),
  },
};
