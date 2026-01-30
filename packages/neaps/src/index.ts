import { Temporal } from "@js-temporal/polyfill";
import { getDistance } from "geolib";
import { stations, type Station } from "@neaps/tide-database";
import tidePredictor, {
  type TimeSpan,
  type ExtremesInput,
  Extreme,
  TimelinePoint,
} from "@neaps/tide-predictor";
import type { GeolibInputCoordinates } from "geolib/es/types";

type Units = "meters" | "feet";
type PredictionOptions = {
  /** Datum to return predictions in. Defaults to 'MLLW' if available for the nearest station. */
  datum?: string;

  /** Units for returned water levels. Defaults to 'meters'. */
  units?: Units;
};

export type ExtremesOptions = ExtremesInput & PredictionOptions;
export type TimelineOptions = TimeSpan & PredictionOptions;
export type WaterLevelOptions = { time: Date | Temporal.Instant } & PredictionOptions;

const feetPerMeter = 3.2808399;
const defaultUnits: Units = "meters";

/**
 * Get extremes prediction using the nearest station to the given position.
 *
 * @example
 * ```ts
 * import { getExtremesPrediction } from 'neaps'
 *
 * const prediction = getExtremesPrediction({
 *   latitude: 26.7, // or `lat`
 *   longitude: -80.05, // or `lng` or `lon`
 *   start: new Date('2025-12-17'),
 *   end: new Date('2025-12-18'),
 *   datum: 'MLLW', // optional, defaults to MLLW if available
 * })
 */
export function getExtremesPrediction(options: GeolibInputCoordinates & ExtremesOptions) {
  return nearestStation(options).getExtremesPrediction(options);
}

/**
 * Get timeline prediction using the nearest station to the given position.
 */
export function getTimelinePrediction(options: GeolibInputCoordinates & TimelineOptions) {
  return nearestStation(options).getTimelinePrediction(options);
}

/**
 * Get water level at a specific time using the nearest station to the given position.
 */
export function getWaterLevelAtTime(options: GeolibInputCoordinates & WaterLevelOptions) {
  return nearestStation(options).getWaterLevelAtTime(options);
}

/**
 * Find the nearest station to the given position.
 */
export function nearestStation(position: GeolibInputCoordinates) {
  return stationsNear(position, 1)[0];
}

/**
 * Find stations near the given position.
 * @param limit Maximum number of stations to return (default: 10)
 */
export function stationsNear(position: GeolibInputCoordinates, limit = 10) {
  return stations
    .map((station) => ({ station, distance: getDistance(position, station) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map(({ station, distance }) => useStation(station, distance));
}

/**
 * Find a specific station by its ID or source ID.
 */
export function findStation(query: string) {
  const searches = [(s: Station) => s.id === query, (s: Station) => s.source.id === query];

  let found: Station | undefined = undefined;

  for (const search of searches) {
    found = stations.find(search);
    if (found) break;
  }

  if (!found) throw new Error(`Station not found: ${query}`);

  return useStation(found);
}

export type StationPrediction = {
  datum: string | undefined;
  units: Units;
  station: Station;
  distance?: number;
};

export type StationExtremesPrediction = StationPrediction & {
  extremes: Extreme[];
};

export type StationTimelinePrediction = StationPrediction & {
  timeline: TimelinePoint[];
};

export type StationWaterLevelPrediction = StationPrediction & TimelinePoint;

export type StationPredictor = Station & {
  distance?: number;
  defaultDatum?: string;
  getExtremesPrediction: (options: ExtremesOptions) => StationExtremesPrediction;
  getTimelinePrediction: (options: TimelineOptions) => StationTimelinePrediction;
  getWaterLevelAtTime: (options: WaterLevelOptions) => StationWaterLevelPrediction;
};

export function useStation(station: Station, distance?: number): StationPredictor {
  // If subordinate station, use the reference station for datums and constituents
  let reference = station;
  if (station.type === "subordinate") {
    reference = findStation(station.offsets?.reference || "");
  }
  const { datums, harmonic_constituents } = reference;

  // Use MLLW as the default datum if available
  const defaultDatum = "MLLW" in datums ? "MLLW" : undefined;

  function getPredictor({ datum = defaultDatum }: PredictionOptions = {}) {
    let offset = 0;

    if (datum) {
      const datumOffset = datums?.[datum];
      const mslOffset = datums?.["MSL"];

      if (typeof datumOffset !== "number") {
        throw new Error(
          `Station ${station.id} missing ${datum} datum. Available datums: ${Object.keys(datums || {}).join(", ")}`,
        );
      }

      if (typeof mslOffset !== "number") {
        throw new Error(
          `Station ${station.id} missing MSL datum, so predictions can't be given in ${datum}.`,
        );
      }

      offset = mslOffset - datumOffset;
    }

    return tidePredictor(harmonic_constituents, { offset });
  }

  return {
    ...station,
    distance,
    datums,
    harmonic_constituents,
    defaultDatum,
    getExtremesPrediction({
      datum = defaultDatum,
      units = defaultUnits,
      ...options
    }: ExtremesOptions) {
      const extremes = getPredictor({ datum })
        .getExtremesPrediction({ ...options, offsets: station.offsets })
        .map((e) => toPreferredUnits(e, units));

      return { datum, units, station, distance, extremes };
    },

    getTimelinePrediction({
      datum = defaultDatum,
      units = defaultUnits,
      ...options
    }: TimelineOptions) {
      if (station.type === "subordinate") {
        throw new Error(`Timeline predictions are not supported for subordinate stations.`);
      }
      const timeline = getPredictor({ datum })
        .getTimelinePrediction(options)
        .map((e) => toPreferredUnits(e, units));

      return { datum, units, station, distance, timeline };
    },

    getWaterLevelAtTime({ time, datum = defaultDatum, units = defaultUnits }: WaterLevelOptions) {
      if (station.type === "subordinate") {
        throw new Error(`Water level predictions are not supported for subordinate stations.`);
      }

      const prediction = toPreferredUnits(
        getPredictor({ datum }).getWaterLevelAtTime({ time }),
        units,
      );

      return { datum, units, station, distance, ...prediction };
    },
  };
}

function toPreferredUnits<T extends { level: number }>(prediction: T, units: Units): T {
  let { level } = prediction;
  if (units === "feet") level *= feetPerMeter;
  else if (units !== "meters") throw new Error(`Unsupported units: ${units}`);
  return { ...prediction, level };
}
