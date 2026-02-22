import { useStation } from "../hooks/use-station.js";
import { useNearbyStations } from "../hooks/use-nearby-stations.js";
import { useNeapsConfig } from "../provider.js";
import { formatDistance } from "../utils/format.js";
import type { StationSummary } from "../types.js";

export interface NearbyStationsPositionProps {
  latitude: number;
  longitude: number;
  stationId?: undefined;
}

export interface NearbyStationsStationProps {
  stationId: string;
  latitude?: undefined;
  longitude?: undefined;
}

export type NearbyStationsProps = (NearbyStationsPositionProps | NearbyStationsStationProps) & {
  maxResults?: number;
  onStationSelect?: (station: StationSummary) => void;
  className?: string;
};

export function NearbyStations(props: NearbyStationsProps) {
  if (props.stationId) {
    return <NearbyFromStation {...props} stationId={props.stationId} />;
  }
  return (
    <NearbyFromPosition
      latitude={props.latitude!}
      longitude={props.longitude!}
      maxResults={props.maxResults}
      onStationSelect={props.onStationSelect}
      className={props.className}
    />
  );
}

function NearbyFromStation({
  stationId,
  maxResults,
  onStationSelect,
  className,
}: {
  stationId: string;
  maxResults?: number;
  onStationSelect?: (station: StationSummary) => void;
  className?: string;
}) {
  const station = useStation(stationId);

  if (station.isLoading)
    return <div className="p-4 text-center text-sm text-(--neaps-text-muted)">Loading...</div>;
  if (station.error)
    return <div className="p-4 text-center text-sm text-red-500">{station.error.message}</div>;

  return (
    <NearbyFromPosition
      latitude={station.data!.latitude}
      longitude={station.data!.longitude}
      maxResults={maxResults}
      onStationSelect={onStationSelect}
      className={className}
    />
  );
}

function NearbyFromPosition({
  latitude,
  longitude,
  maxResults = 5,
  onStationSelect,
  className,
}: {
  latitude: number;
  longitude: number;
  maxResults?: number;
  onStationSelect?: (station: StationSummary) => void;
  className?: string;
}) {
  const config = useNeapsConfig();
  const {
    data: stations = [],
    isLoading,
    error,
  } = useNearbyStations({
    latitude,
    longitude,
    maxResults,
  });

  if (isLoading)
    return (
      <div className="p-4 text-center text-sm text-(--neaps-text-muted)">
        Loading nearby stations...
      </div>
    );
  if (error) return <div className="p-4 text-center text-sm text-red-500">{error.message}</div>;

  return (
    <ul className={`list-none m-0 p-0 ${className ?? ""}`}>
      {stations.map((station) => (
        <li key={station.id} className="border-b border-(--neaps-border) last:border-b-0">
          <button
            type="button"
            className="flex items-center justify-between w-full px-4 py-3 border-none bg-transparent cursor-pointer text-left transition-colors hover:bg-(--neaps-bg-subtle)"
            onClick={() => onStationSelect?.(station)}
          >
            <div>
              <span className="block font-medium text-(--neaps-text)">{station.name}</span>
              <span className="block text-xs text-(--neaps-text-muted)">
                {[station.region, station.country].filter(Boolean).join(", ")}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {station.distance !== undefined && (
                <span className="text-sm font-medium text-(--neaps-text-muted)">
                  {formatDistance(station.distance, config.units)}
                </span>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
