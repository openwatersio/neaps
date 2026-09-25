export const queryKeys = {
  station: (id: string | undefined) => ["slackwater", "station", id] as const,
  stations: (params: object) => ["slackwater", "stations", params] as const,
  nearbyStations: (params: object) => ["slackwater", "nearby-stations", params] as const,
  extremes: (params: object) => ["slackwater", "extremes", params] as const,
  timeline: (params: object) => ["slackwater", "timeline", params] as const,
};
