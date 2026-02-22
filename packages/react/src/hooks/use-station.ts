import { useQuery } from "@tanstack/react-query";
import { useNeapsConfig } from "../provider.js";
import { fetchStation } from "../client.js";

export function useStation(id: string | undefined) {
  const { baseUrl } = useNeapsConfig();

  return useQuery({
    queryKey: ["neaps", "station", id],
    queryFn: () => fetchStation(baseUrl, id!),
    enabled: !!id,
  });
}
