import { type QueryClient } from "@tanstack/react-query";

import type { Units } from "./types.js";
import { queryKeys } from "./query-keys.js";
import {
  fetchStation,
  fetchStationTimeline,
  fetchStationExtremes,
  fetchStations,
} from "./client.js";
import { getDefaultRange } from "./utils/defaults.js";

export interface PrefetchTideStationOptions {
  units: Units;
  datum?: string;
}

/**
 * Prefetch all queries that the `<TideStation>` component will make.
 * Call this on the server, then use `dehydrate(queryClient)` to pass the
 * cache to the client via `<HydrationBoundary>`.
 */
export async function prefetchTideStation(
  queryClient: QueryClient,
  baseUrl: string,
  id: string,
  { units, datum }: PrefetchTideStationOptions,
): Promise<void> {
  const range = getDefaultRange();
  const params = { id, start: range.start, end: range.end, units, datum };

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.station(id),
      queryFn: () => fetchStation(baseUrl, id),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.timeline(params),
      queryFn: () => fetchStationTimeline(baseUrl, params),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.extremes(params),
      queryFn: () => fetchStationExtremes(baseUrl, params),
    }),
  ]);
}

export interface PrefetchNearbyStationsOptions {
  latitude: number;
  longitude: number;
  maxResults?: number;
}

/**
 * Prefetch the nearby-stations query that `<NearbyStations stationId={...}>` will make.
 * The default maxResults matches the component's internal default (5 + 1 for the
 * excluded current station).
 */
export async function prefetchNearbyStations(
  queryClient: QueryClient,
  baseUrl: string,
  { latitude, longitude, maxResults = 6 }: PrefetchNearbyStationsOptions,
): Promise<void> {
  const params = { latitude, longitude, maxResults };

  await queryClient.prefetchQuery({
    queryKey: queryKeys.nearbyStations(params),
    queryFn: () => fetchStations(baseUrl, params),
  });
}
