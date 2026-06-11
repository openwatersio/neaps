import type { Meta, StoryObj } from "@storybook/react";
import { TideConditions } from "./TideConditions.js";

const STATION_ID = "noaa/8443970";

const meta: Meta<typeof TideConditions> = {
  title: "Components/TideConditions",
  component: TideConditions,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 400 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TideConditions>;

export const Default: Story = {
  args: { id: STATION_ID },
};

export const NoDate: Story = {
  args: { id: STATION_ID, showDate: false },
};

export const NoData: Story = {
  args: {
    timeline: [],
    extremes: [],
    units: "feet",
    timezone: "UTC",
  },
};
