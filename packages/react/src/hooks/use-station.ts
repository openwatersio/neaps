import { useQuery } from "@tanstack/react-query";
import { useNeapsConfig } from "../provider.js";
import { fetchStation } from "../client.js";
import { queryKeys } from "../query-keys.js";

export function useStation(id: string | undefined) {
  const { baseUrl } = useNeapsConfig();

  return useQuery({
    queryKey: queryKeys.station(id),
    queryFn: () => fetchStation(baseUrl, id!),
    enabled: !!id,
  });
}
