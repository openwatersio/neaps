import { create } from "storybook/internal/theming";

const brand = {
  brandTitle: "Neaps",
  brandUrl: "https://openwaters.io/tides/neaps",
};

export const light = create({ base: "light", ...brand });
export const dark = create({ base: "dark", ...brand });
