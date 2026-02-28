import {
  useState,
  useCallback,
  useMemo,
  forwardRef,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  Map,
  Source,
  Layer,
  Popup,
  type MapRef,
  type ViewStateChangeEvent,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { keepPreviousData } from "@tanstack/react-query";

import { useStation } from "../hooks/use-station.js";
import { useStations } from "../hooks/use-stations.js";
import { useDebouncedCallback } from "../hooks/use-debounced-callback.js";
import { useExtremes } from "../hooks/use-extremes.js";
import { useNeapsConfig } from "../provider.js";
import { useDarkMode } from "../hooks/use-dark-mode.js";
import { useThemeColors } from "../hooks/use-theme-colors.js";
import { formatLevel, formatTime } from "../utils/format.js";
import type { StationSummary, Extreme } from "../types.js";

// Props that StationsMap manages internally and cannot be overridden
type ManagedMapProps = "onMove" | "onClick" | "interactiveLayerIds" | "style" | "cursor";

export interface StationsMapProps extends Omit<ComponentProps<typeof Map>, ManagedMapProps> {
  /** Optional dark mode style URL. Switches automatically based on .dark class or prefers-color-scheme. */
  darkMapStyle?: string;
  onStationSelect?: (station: StationSummary) => void;
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  /** Whether to show the geolocation button. Defaults to true. */
  showGeolocation?: boolean;
  /** Station ID to highlight with a larger marker. The marker is never absorbed by clusters. */
  focusStation?: string;
  /** Enable clustering of station markers. Defaults to true. */
  clustering?: boolean;
  /** Max zoom level at which clusters are generated. Defaults to 14. */
  clusterMaxZoom?: number;
  /** Cluster radius in pixels. Defaults to 50. */
  clusterRadius?: number;
  /**
   * Controls popup content when clicking a station.
   * - `"preview"` (default): shows station name + next tide (fetched), only at zoom >= 10
   * - `"simple"`: shows station name + region, no API call, no zoom gate
   * - function: receives station summary, return ReactNode, no zoom gate
   * - `false`: disables popups entirely (onStationSelect still fires)
   */
  popupContent?: "preview" | "simple" | ((station: StationSummary) => ReactNode) | false;
  /** CSS class applied to the outer wrapper div. */
  className?: string;
}

function stationsToGeoJSON(stations: StationSummary[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: stations.map((s) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [s.longitude, s.latitude] },
      properties: { id: s.id, name: s.name, region: s.region, country: s.country, type: s.type },
    })),
  };
}

function getNextExtreme(extremes: Extreme[]): Extreme | null {
  const now = new Date();
  return extremes.find((e) => new Date(e.time) > now) ?? null;
}

function StationPreviewCard({ stationId }: { stationId: string }) {
  const config = useNeapsConfig();
  const now = new Date();
  const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const { data, isLoading } = useExtremes({
    id: stationId,
    start: now.toISOString(),
    end: end.toISOString(),
  });

  if (isLoading) {
    return <span className="text-xs text-(--neaps-text-muted)">Loading...</span>;
  }

  if (!data) return null;

  const next = getNextExtreme(data.extremes);
  return (
    <div className="text-xs">
      {next && (
        <div className="mt-1">
          <span className="text-(--neaps-text-muted)">Next {next.high ? "High" : "Low"}: </span>
          <span className="font-semibold text-(--neaps-text)">
            {formatLevel(next.level, data.units ?? config.units)}{" "}
            <span className="text-(--neaps-text-muted)">
              at {formatTime(next.time, data.station?.timezone ?? "UTC", config.locale)}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

export const StationsMap = forwardRef<MapRef, StationsMapProps>(function StationsMap(
  {
    mapStyle,
    darkMapStyle,
    onStationSelect,
    onBoundsChange,
    focusStation,
    showGeolocation = true,
    clustering = true,
    clusterMaxZoom: clusterMaxZoomProp = 14,
    clusterRadius: clusterRadiusProp = 50,
    popupContent = "preview",
    children,
    className,
    ...mapProps
  },
  ref,
) {
  const [viewState, setViewState] = useState(mapProps.initialViewState ?? {});
  const [bbox, setBbox] = useState<[min: [number, number], max: [number, number]] | null>(null);
  const debouncedSetBbox = useDebouncedCallback(setBbox, 200);
  const [selectedStation, setSelectedStation] = useState<StationSummary | null>(null);

  const isDarkMode = useDarkMode();
  const colors = useThemeColors();
  const effectiveMapStyle = isDarkMode && darkMapStyle ? darkMapStyle : mapStyle;

  const {
    data: stations = [],
    isLoading,
    isError,
  } = useStations(bbox ? { bbox } : {}, {
    placeholderData: keepPreviousData,
  });

  // Focus station: fetch if not in loaded stations, build separate GeoJSON
  const focusStationInList = focusStation ? stations.find((s) => s.id === focusStation) : undefined;
  const { data: fetchedFocusStation } = useStation(
    focusStation && !focusStationInList ? focusStation : undefined,
  );
  const focusStationData: StationSummary | undefined =
    focusStationInList ?? (fetchedFocusStation as StationSummary | undefined);

  const geojson = useMemo(
    () =>
      stationsToGeoJSON(focusStation ? stations.filter((s) => s.id !== focusStation) : stations),
    [stations, focusStation],
  );

  const focusGeoJSON: GeoJSON.FeatureCollection | null = useMemo(() => {
    if (!focusStationData) return null;
    return stationsToGeoJSON([focusStationData]);
  }, [focusStationData]);

  const handleMove = useCallback(
    (e: ViewStateChangeEvent) => {
      setViewState(e.viewState);
      const mapBounds = e.target.getBounds();
      debouncedSetBbox(mapBounds.toArray() as [[number, number], [number, number]]);
      onBoundsChange?.({
        north: mapBounds.getNorth(),
        south: mapBounds.getSouth(),
        east: mapBounds.getEast(),
        west: mapBounds.getWest(),
      });
    },
    [onBoundsChange],
  );

  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;

      const props = feature.properties;

      // Cluster click → zoom in
      if (props?.cluster) {
        setViewState((prev) => ({
          ...prev,
          longitude: (feature.geometry as GeoJSON.Point).coordinates[0],
          latitude: (feature.geometry as GeoJSON.Point).coordinates[1],
          zoom: Math.min((prev.zoom ?? 3) + 2, 18),
        }));
        return;
      }

      // Station point click
      if (props?.id) {
        const coords = (feature.geometry as GeoJSON.Point).coordinates;
        const station: StationSummary = {
          id: props.id,
          name: props.name,
          latitude: coords[1],
          longitude: coords[0],
          region: props.region ?? "",
          country: props.country ?? "",
          continent: "",
          timezone: "",
          type: props.type ?? "reference",
        };

        if (popupContent === "preview" ? (viewState.zoom ?? 0) >= 10 : popupContent !== false) {
          setSelectedStation(station);
        }

        onStationSelect?.(station);
      }
    },
    [onStationSelect, viewState.zoom, popupContent],
  );

  const handleLocateMe = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setViewState((prev) => ({
          ...prev,
          longitude: pos.coords.longitude,
          latitude: pos.coords.latitude,
          zoom: Math.max(prev.zoom ?? 0, 10),
        }));
      },
      () => {
        // Silently ignore geolocation errors
      },
    );
  }, []);

  return (
    <div className={`relative w-full h-full min-h-96 ${className ?? ""}`}>
      <Map
        ref={ref}
        {...mapProps}
        {...viewState}
        onMove={handleMove}
        onClick={handleMapClick}
        interactiveLayerIds={["clusters", "unclustered-point"]}
        mapStyle={effectiveMapStyle}
        style={{ width: "100%", height: "100%" }}
        cursor="pointer"
        attributionControl={false}
      >
        <Source
          id="stations"
          type="geojson"
          data={geojson}
          cluster={clustering}
          clusterMaxZoom={clusterMaxZoomProp}
          clusterRadius={clusterRadiusProp}
        >
          {/* Clustered circles */}
          <Layer
            id="clusters"
            type="circle"
            filter={["has", "point_count"]}
            paint={{
              "circle-color": [
                "step",
                ["get", "point_count"],
                "#60a5fa",
                50,
                "#3b82f6",
                200,
                "#2563eb",
              ],
              "circle-radius": ["step", ["get", "point_count"], 18, 50, 24, 200, 30],
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            }}
          />

          {/* Cluster count labels */}
          <Layer
            id="cluster-count"
            type="symbol"
            filter={["has", "point_count"]}
            layout={{
              "text-field": ["get", "point_count_abbreviated"],
              "text-size": 12,
              "text-allow-overlap": true,
            }}
            paint={{
              "text-color": "#ffffff",
            }}
          />

          {/* Unclustered station points — colored by type */}
          <Layer
            id="unclustered-point"
            type="circle"
            filter={["!", ["has", "point_count"]]}
            paint={{
              "circle-color": [
                "match",
                ["get", "type"],
                "subordinate",
                colors.secondary,
                colors.primary,
              ],
              "circle-radius": 6,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            }}
          />

          {/* Station name labels at higher zoom */}
          <Layer
            id="station-labels"
            type="symbol"
            filter={["!", ["has", "point_count"]]}
            minzoom={8}
            layout={{
              "text-field": ["get", "name"],
              "text-size": 11,
              "text-offset": [0, 1.5],
              "text-anchor": "top",
              "text-max-width": 10,
            }}
            paint={{
              "text-color": colors.text,
              "text-halo-color": colors.bg,
              "text-halo-width": 1.5,
            }}
          />
        </Source>

        {/* Focus station — rendered above clusters, never absorbed */}
        {focusGeoJSON && (
          <Source id="focus-station" type="geojson" data={focusGeoJSON}>
            <Layer
              id="focus-station-point"
              type="circle"
              paint={{
                "circle-color": colors.primary,
                "circle-radius": 10,
                "circle-stroke-width": 3,
                "circle-stroke-color": "#ffffff",
              }}
            />
            <Layer
              id="focus-station-label"
              type="symbol"
              layout={{
                "text-field": ["get", "name"],
                "text-size": 12,
                "text-offset": [0, 1.8],
                "text-anchor": "top",
                "text-max-width": 10,
                "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
              }}
              paint={{
                "text-color": colors.text,
                "text-halo-color": colors.bg,
                "text-halo-width": 2,
              }}
            />
          </Source>
        )}

        {/* Station popup */}
        {selectedStation && popupContent !== false && (
          <Popup
            longitude={selectedStation.longitude}
            latitude={selectedStation.latitude}
            anchor="bottom"
            onClose={() => setSelectedStation(null)}
            closeOnClick={false}
            className="neaps-popup"
          >
            <div className="p-2 min-w-40">
              {typeof popupContent === "function" ? (
                popupContent(selectedStation)
              ) : (
                <>
                  <div className="font-semibold text-sm text-(--neaps-text)">
                    {selectedStation.name}
                  </div>
                  {popupContent === "simple" ? (
                    <div className="text-xs text-(--neaps-text-muted)">
                      {[selectedStation.region, selectedStation.country].filter(Boolean).join(", ")}
                    </div>
                  ) : (
                    <StationPreviewCard stationId={selectedStation.id} />
                  )}
                </>
              )}
            </div>
          </Popup>
        )}
      </Map>

      {/* Locate me button */}
      {showGeolocation && "geolocation" in navigator && (
        <button
          type="button"
          onClick={handleLocateMe}
          className="absolute bottom-6 right-3 z-10 w-8 h-8 flex items-center justify-center bg-(--neaps-bg) border border-(--neaps-border) rounded-lg shadow-md cursor-pointer hover:bg-(--neaps-bg-subtle) transition-colors"
          aria-label="Center map on my location"
          title="My location"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-(--neaps-text)"
          >
            <circle cx="12" cy="12" r="3" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
          </svg>
        </button>
      )}

      {isError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-(--neaps-bg) border border-(--neaps-border) shadow-md text-sm text-(--neaps-text-muted)">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Failed to load stations
          </div>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-(--neaps-bg) border border-(--neaps-border) shadow-md text-sm text-(--neaps-text-muted)">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-spin"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Loading stations…
          </div>
        </div>
      )}

      {children}
    </div>
  );
});
