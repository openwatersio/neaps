import { describe, test, expect, inject } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { prefetchTideStation, prefetchNearbyStations } from "../src/prefetch.js";

const STATION_ID = "noaa/8443970";

describe("prefetchTideStation", () => {
  test("populates the query cache with station, timeline, and extremes", async () => {
    const queryClient = new QueryClient();

    await prefetchTideStation(queryClient, inject("apiBaseUrl"), STATION_ID, {
      units: "meters",
    });

    const queries = queryClient.getQueryCache().getAll();
    expect(queries.length).toBe(3);
    for (const query of queries) {
      expect(query.state.status).toBe("success");
    }
  });
});

describe("prefetchNearbyStations", () => {
  test("populates the query cache with nearby stations", async () => {
    const queryClient = new QueryClient();

    await prefetchNearbyStations(queryClient, inject("apiBaseUrl"), {
      latitude: 42.35,
      longitude: -71.05,
    });

    const queries = queryClient.getQueryCache().getAll();
    expect(queries.length).toBe(1);
    expect(queries[0].state.status).toBe("success");
    expect(Array.isArray(queries[0].state.data)).toBe(true);
  });
});
