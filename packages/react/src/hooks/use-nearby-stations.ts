import { useQuery } from "@tanstack/react-query";
import { useNeapsConfig } from "../provider.js";
import { fetchStations } from "../client.js";
import { queryKeys } from "../query-keys.js";

export interface UseNearbyStationsParams {
  latitude: number;
  longitude: number;
  maxResults?: number;
  maxDistance?: number;
}

export function useNearbyStations(params: UseNearbyStationsParams | undefined) {
  const { baseUrl } = useNeapsConfig();

  return useQuery({
    queryKey: queryKeys.nearbyStations(params ?? {}),
    queryFn: () => fetchStations(baseUrl, params!),
    enabled: !!params,
  });
}
