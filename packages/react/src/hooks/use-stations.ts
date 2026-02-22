import { useQuery } from "@tanstack/react-query";
import { useNeapsConfig } from "../provider.js";
import { fetchStations, type StationsSearchParams } from "../client.js";

export function useStations(params: StationsSearchParams = {}) {
  const { baseUrl } = useNeapsConfig();

  return useQuery({
    queryKey: ["neaps", "stations", params],
    queryFn: () => fetchStations(baseUrl, params),
  });
}
