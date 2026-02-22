import { create } from "storybook/internal/theming";

export default create({
  base: "light",
  brandTitle: "Neaps",
  brandUrl: "https://openwaters.io/tides/neaps",

  // Colors
  colorPrimary: "#2563eb",
  colorSecondary: "#2563eb",

  // UI
  appBg: "#f8fafc",
  appContentBg: "#ffffff",
  appBorderColor: "#e2e8f0",
  appBorderRadius: 8,

  // Text
  textColor: "#0f172a",
  textMutedColor: "#64748b",
  textInverseColor: "#ffffff",

  // Toolbar
  barTextColor: "#64748b",
  barSelectedColor: "#2563eb",
  barBg: "#ffffff",

  // Form
  inputBg: "#ffffff",
  inputBorder: "#e2e8f0",
  inputTextColor: "#0f172a",
  inputBorderRadius: 6,
});
