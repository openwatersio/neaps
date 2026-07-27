export const queryKeys = {
  station: (id: string | undefined) => ["neaps", "station", id] as const,
  stations: (params: object) => ["neaps", "stations", params] as const,
  nearbyStations: (params: object) => ["neaps", "nearby-stations", params] as const,
  extremes: (params: object) => ["neaps", "extremes", params] as const,
  timeline: (params: object) => ["neaps", "timeline", params] as const,
};
