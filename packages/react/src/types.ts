export type Units = "meters" | "feet";
import type { Station as BaseStation } from "@neaps/tide-database";

export interface Station extends BaseStation {
  defaultDatum: string;
}

export type StationSummary = Pick<
  Station,
  | "id"
  | "name"
  | "latitude"
  | "longitude"
  | "region"
  | "country"
  | "continent"
  | "timezone"
  | "type"
> & {
  distance?: number;
};

export interface Extreme {
  time: Date;
  level: number;
  high: boolean;
  low: boolean;
  label: string;
}

export interface TimelineEntry {
  time: Date;
  level: number;
}

export interface ExtremesResponse {
  datum: string;
  units: Units;
  station: Station;
  distance: number;
  extremes: Extreme[];
}

export interface TimelineResponse {
  datum: string;
  units: Units;
  station: Station;
  distance: number;
  timeline: TimelineEntry[];
}
