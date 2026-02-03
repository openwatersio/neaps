import {
  stations,
  near,
  nearest,
  type NearOptions,
  type NearestOptions,
} from "@neaps/tide-database";
import {
  useStation,
  type Station,
  type StationPredictor,
  type StationExtremesOptions,
  type StationTimelineOptions,
  type StationWaterLevelOptions,
} from "@neaps/tide-predictor";

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
 *   datum: 'MLLW', // optional, defaults to station's datum
 * })
 */
export function getExtremesPrediction(options: NearestOptions & StationExtremesOptions) {
  return nearestStation(options).getExtremesPrediction(options);
}

/**
 * Get timeline prediction using the nearest station to the given position.
 */
export function getTimelinePrediction(options: NearestOptions & StationTimelineOptions) {
  return nearestStation(options).getTimelinePrediction(options);
}

/**
 * Get water level at a specific time using the nearest station to the given position.
 */
export function getWaterLevelAtTime(options: NearestOptions & StationWaterLevelOptions) {
  return nearestStation(options).getWaterLevelAtTime(options);
}

/**
 * Find the nearest station to the given position.
 */
export function nearestStation(options: NearestOptions) {
  const data = nearest(options);
  if (!data) throw new Error(`No stations found with options: ${JSON.stringify(options)}`);
  return useStation(...data, findStation);
}

/**
 * Find stations near the given position.
 * @param limit Maximum number of stations to return (default: 10)
 */
export function stationsNear(options: NearOptions) {
  return near(options).map(([station, distance]) => useStation(station, distance, findStation));
}

/**
 * Find a specific station by its ID or source ID.
 */
export function findStation(query: string): StationPredictor {
  const searches = [(s: Station) => s.id === query, (s: Station) => s.source.id === query];

  let found: Station | undefined = undefined;

  for (const search of searches) {
    found = stations.find(search);
    if (found) break;
  }

  if (!found) throw new Error(`Station not found: ${query}`);
  return useStation(found, undefined, findStation);
}
