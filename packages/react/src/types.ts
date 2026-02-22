export type Units = "meters" | "feet";

export interface StationSummary {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  region: string;
  country: string;
  continent: string;
  timezone: string;
  type: "reference" | "subordinate";
  distance?: number;
}

export interface Station extends StationSummary {
  source: {
    id: string;
    name: string;
    url: string;
  };
  license: {
    type: string;
    commercial_use: boolean;
    url?: string;
    notes?: string;
  };
  disclaimers?: string;
  datums: Record<string, number>;
  defaultDatum?: string;
  harmonic_constituents: {
    name: string;
    amplitude: number;
    phase: number;
  }[];
  offsets?: {
    reference: string;
    height?: {
      high: number;
      low: number;
      type: "ratio" | "fixed";
    };
    time?: {
      high: number;
      low: number;
    };
  };
}

export interface Extreme {
  time: string;
  level: number;
  high: boolean;
  low: boolean;
  label: string;
}

export interface TimelineEntry {
  time: string;
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
