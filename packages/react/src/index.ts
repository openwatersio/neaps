// Provider
export { NeapsProvider, useNeapsConfig } from "./provider.js";
export type { NeapsProviderProps, NeapsConfig } from "./provider.js";

// Hooks
export { useStation } from "./hooks/use-station.js";
export { useStations } from "./hooks/use-stations.js";
export { useExtremes } from "./hooks/use-extremes.js";
export type { UseExtremesParams } from "./hooks/use-extremes.js";
export { useTimeline } from "./hooks/use-timeline.js";
export type { UseTimelineParams } from "./hooks/use-timeline.js";
export { useNearbyStations } from "./hooks/use-nearby-stations.js";
export type { UseNearbyStationsParams } from "./hooks/use-nearby-stations.js";
export { useThemeColors, withAlpha } from "./hooks/use-theme-colors.js";
export type { ThemeColors } from "./hooks/use-theme-colors.js";

// Components
export { TideStation } from "./components/TideStation.js";
export type { TideStationProps } from "./components/TideStation.js";
export { TideConditions } from "./components/TideConditions.js";
export type { TideConditionsProps } from "./components/TideConditions.js";
export { TideGraph } from "./components/TideGraph.js";
export type { TideGraphProps, TimeRange } from "./components/TideGraph.js";
export { TideTable } from "./components/TideTable.js";
export type { TideTableProps } from "./components/TideTable.js";
export { StationSearch } from "./components/StationSearch.js";
export type { StationSearchProps } from "./components/StationSearch.js";
export { NearbyStations } from "./components/NearbyStations.js";
export type { NearbyStationsProps } from "./components/NearbyStations.js";
export { StationsMap } from "./components/StationsMap.js";
export type { StationsMapProps } from "./components/StationsMap.js";

// Client
export {
  fetchExtremes,
  fetchTimeline,
  fetchStation,
  fetchStations,
  fetchStationExtremes,
  fetchStationTimeline,
} from "./client.js";

// Types
export type {
  Units,
  Station,
  StationSummary,
  Extreme,
  TimelineEntry,
  ExtremesResponse,
  TimelineResponse,
} from "./types.js";

// Utilities
export { formatLevel, formatTime, formatDate, formatDistance } from "./utils/format.js";
