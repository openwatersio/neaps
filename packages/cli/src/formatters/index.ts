import text from "./text.js";
import json from "./json.js";
import type { Station } from "@neaps/tide-database";
import type { getExtremesPrediction, getTimelinePrediction } from "neaps";

export const formatters = {
  text,
  json,
};

export type Formats = keyof typeof formatters;
export type ExtremesPrediction = ReturnType<typeof getExtremesPrediction>;
export type TimelinePrediction = ReturnType<typeof getTimelinePrediction>;

export interface StationResult extends Station {
  distance?: number;
}

export interface Formatter {
  extremes(prediction: ExtremesPrediction): void;
  timeline(prediction: TimelinePrediction): void;
  listStations(stations: StationResult[]): void;
}

export const availableFormats = Object.keys(formatters) as Formats[];

export default function getFormat(format: Formats): Formatter {
  return formatters[format]();
}
