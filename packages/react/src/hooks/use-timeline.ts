import { useQuery } from "@tanstack/react-query";
import { useNeapsConfig } from "../provider.js";
import {
  fetchTimeline,
  fetchStationTimeline,
  type LocationParams,
  type StationPredictionParams,
  type PredictionParams,
} from "../client.js";

export type UseTimelineParams =
  | ({ id: string } & PredictionParams)
  | (LocationParams & { id?: undefined });

export function useTimeline(params: UseTimelineParams) {
  const { baseUrl, units, datum } = useNeapsConfig();
  const mergedUnits = params.units ?? units;
  const mergedDatum = params.datum ?? datum;

  return useQuery({
    queryKey: ["neaps", "timeline", { ...params, units: mergedUnits, datum: mergedDatum }],
    queryFn: () => {
      if (params.id) {
        return fetchStationTimeline(baseUrl, {
          ...params,
          id: params.id,
          units: mergedUnits,
          datum: mergedDatum,
        } as StationPredictionParams);
      }
      return fetchTimeline(baseUrl, {
        ...(params as LocationParams),
        units: mergedUnits,
        datum: mergedDatum,
      });
    },
  });
}
