import type { Meta, StoryObj } from "@storybook/react";
import { NeapsProvider } from "../provider.js";
import { StationSearch } from "./StationSearch.js";

const meta: Meta<typeof StationSearch> = {
  title: "Components/StationSearch",
  component: StationSearch,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 400, padding: "2rem" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StationSearch>;

export const Default: Story = {
  args: {
    onSelect: (station) => console.log("Selected:", station),
  },
};

export const CustomPlaceholder: Story = {
  args: {
    onSelect: (station) => console.log("Selected:", station),
    placeholder: "Find a tide station...",
  },
};

export const DarkMode: Story = {
  args: {
    onSelect: (station) => console.log("Selected:", station),
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
    onSelect: (station) => console.log("Selected:", station),
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
    onSelect: (station) => console.log("Selected:", station),
  },
  decorators: [
    (Story) => (
      <NeapsProvider baseUrl="http://localhost:1">
        <Story />
      </NeapsProvider>
    ),
  ],
};

export const WithRecentSearches: Story = {
  args: {
    onSelect: (station) => console.log("Selected:", station),
  },
  play: () => {
    // Seed localStorage with recent searches for this story
    const recent = [
      { id: "noaa/8443970", name: "Boston, MA", region: "Massachusetts", country: "US" },
      { id: "noaa/8518750", name: "The Battery, NY", region: "New York", country: "US" },
      { id: "noaa/9414290", name: "San Francisco, CA", region: "California", country: "US" },
    ];
    localStorage.setItem("neaps-recent-searches", JSON.stringify(recent));
  },
};
