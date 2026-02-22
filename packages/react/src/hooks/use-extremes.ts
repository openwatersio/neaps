import { useQuery } from "@tanstack/react-query";
import { useNeapsConfig } from "../provider.js";
import {
  fetchExtremes,
  fetchStationExtremes,
  type LocationParams,
  type StationPredictionParams,
  type PredictionParams,
} from "../client.js";

export type UseExtremesParams =
  | ({ id: string } & PredictionParams)
  | (LocationParams & { id?: undefined });

export function useExtremes(params: UseExtremesParams) {
  const { baseUrl, units, datum } = useNeapsConfig();
  const mergedUnits = params.units ?? units;
  const mergedDatum = params.datum ?? datum;

  return useQuery({
    queryKey: ["neaps", "extremes", { ...params, units: mergedUnits, datum: mergedDatum }],
    queryFn: () => {
      if (params.id) {
        return fetchStationExtremes(baseUrl, {
          ...params,
          id: params.id,
          units: mergedUnits,
          datum: mergedDatum,
        } as StationPredictionParams);
      }
      return fetchExtremes(baseUrl, {
        ...(params as LocationParams),
        units: mergedUnits,
        datum: mergedDatum,
      });
    },
  });
}
