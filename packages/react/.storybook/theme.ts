import { create } from "storybook/internal/theming";

const brand = {
  brandTitle: "Slackwater",
  brandUrl: "https://openwaters.io/tides/slackwater",
};

export const light = create({ base: "light", ...brand });
export const dark = create({ base: "dark", ...brand });
