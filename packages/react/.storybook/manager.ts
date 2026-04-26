import { addons } from "storybook/internal/manager-api";
import { light, dark } from "./theme.js";

const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

addons.setConfig({ theme: prefersDark ? dark : light });
