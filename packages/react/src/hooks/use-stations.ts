import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useNeapsConfig } from "../provider.js";
import { fetchStations, type StationsSearchParams } from "../client.js";
import type { StationSummary } from "../types.js";

type StationsQueryOptions = Pick<UseQueryOptions<StationSummary[]>, "placeholderData">;

export function useStations(params: StationsSearchParams = {}, options: StationsQueryOptions = {}) {
  const { baseUrl } = useNeapsConfig();

  return useQuery({
    queryKey: ["neaps", "stations", params],
    queryFn: () => fetchStations(baseUrl, params),
    ...options,
  });
}
