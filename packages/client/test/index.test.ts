import type { Server } from "node:http";
import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "../src/index.js";
import type {
  Station,
  StationSummary,
  HarmonicConstituent,
  Offsets,
  Extreme,
  PredictionResponse,
  ExtremesResponse,
  TimelineEntry,
  TimelineResponse,
  ApiError,
} from "../src/index.js";
import { createApp } from "../../api/src/index.js";

describe("@neaps/client", () => {
  describe("createClient", () => {
    test("returns an object with HTTP method helpers", () => {
      const client = createClient();
      expect(typeof client.GET).toBe("function");
    });
  });

  // Type-shape tests: if the generated types are wrong or missing,
  // these fail at compile time (tsc) before they ever run.
  describe("exported types", () => {
    const stationBase = {
      id: "8722588",
      name: "Miami",
      latitude: 25.761,
      longitude: -80.192,
      country: "US",
      continent: "North America",
      timezone: "America/New_York",
      type: "reference" as const,
    };

    const referenceStation = {
      ...stationBase,
      harmonic_constituents: [{ name: "M2", amplitude: 0.5, phase: 180 }],
      datums: { MLLW: 0 },
      source: { id: "noaa", name: "NOAA", url: "https://example.com", published_harmonics: true },
      license: { type: "MIT", commercial_use: true, url: "https://opensource.org/licenses/MIT" },
    };

    test("StationSummary", () => {
      const v: StationSummary = stationBase;
      expect(v.id).toBe("8722588");
    });

    test("Station – reference", () => {
      const v: Station = referenceStation;
      expect(v.id).toBe("8722588");
    });

    test("Station – subordinate", () => {
      const v: Station = {
        ...stationBase,
        type: "subordinate" as const,
        offsets: {
          reference: "noaa/8722588",
          height: { high: 0.1, low: -0.05, type: "ratio" as const },
          time: { high: 5, low: -3 },
        },
        source: { id: "noaa", name: "NOAA", url: "https://example.com", published_harmonics: true },
        license: { type: "MIT", commercial_use: true, url: "https://opensource.org/licenses/MIT" },
      };
      expect(v.type).toBe("subordinate");
    });

    test("HarmonicConstituent", () => {
      const v: HarmonicConstituent = { name: "M2", amplitude: 0.5, phase: 180 };
      expect(v.name).toBe("M2");
    });

    test("Offsets", () => {
      const v: Offsets = {
        reference: "noaa/8722588",
        height: { high: 0.1, low: -0.05, type: "ratio" as const },
        time: { high: 5, low: -3 },
      };
      expect(v.reference).toBe("noaa/8722588");
    });

    test("Extreme", () => {
      const v: Extreme = {
        time: "2025-01-01T00:00:00Z",
        level: 1.2,
        high: true,
        low: false,
        label: "HW",
      };
      expect(v.high).toBe(true);
    });

    test("PredictionResponse", () => {
      const v: PredictionResponse = {
        datum: "MLLW",
        units: "meters",
        station: referenceStation,
      };
      expect(v.station.id).toBe("8722588");
    });

    test("ExtremesResponse", () => {
      const v: ExtremesResponse = {
        datum: "MLLW",
        units: "meters",
        station: referenceStation,
        extremes: [],
      };
      expect(v.datum).toBe("MLLW");
    });

    test("TimelineEntry", () => {
      const v: TimelineEntry = { time: "2025-01-01T00:00:00Z", level: 0.5 };
      expect(v.level).toBe(0.5);
    });

    test("TimelineResponse", () => {
      const v: TimelineResponse = {
        datum: "MLLW",
        units: "feet",
        station: referenceStation,
        timeline: [],
      };
      expect(v.units).toBe("feet");
    });

    test("ApiError", () => {
      const v: ApiError = { message: "Bad request" };
      expect(v.message).toBe("Bad request");
    });
  });
});

// ---------------------------------------------------------------------------
// Integration: real HTTP round-trips through the typed client
// ---------------------------------------------------------------------------
describe("integration: client requests against @neaps/api", () => {
  let client: ReturnType<typeof createClient>;
  let server: Server;

  beforeAll(
    () =>
      new Promise<void>((resolve) => {
        server = createApp().listen(0, () => {
          const { port } = server.address() as { port: number };
          client = createClient({ baseUrl: `http://localhost:${port}` });
          resolve();
        });
      }),
  );

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  // -----------------------------------------------------------------------
  // Station look-up
  // -----------------------------------------------------------------------
  describe("GET /tides/stations/{source}/{id}", () => {
    test("returns a known station with full details", async () => {
      const { data, error, response } = await client.GET("/tides/stations/{source}/{id}", {
        params: { path: { source: "noaa", id: "8722588" } },
      });

      expect(response.status).toBe(200);
      expect(error).toBeUndefined();
      expect(data!.id).toBe("noaa/8722588");
      expect(typeof data!.latitude).toBe("number");
      expect(typeof data!.longitude).toBe("number");
      expect(data!.source).toBeDefined();
    });

    test("returns 404 for a nonexistent station", async () => {
      const { error, response } = await client.GET("/tides/stations/{source}/{id}", {
        params: { path: { source: "fake", id: "nonexistent" } },
      });

      expect(response.status).toBe(404);
      expect(error!.message).toBeTruthy();
    });
  });

  // -----------------------------------------------------------------------
  // Station search / proximity
  // -----------------------------------------------------------------------
  describe("GET /tides/stations", () => {
    test("searches stations by query string", async () => {
      const { data, error, response } = await client.GET("/tides/stations", {
        params: { query: { query: "8722588" } },
      });

      expect(response.status).toBe(200);
      expect(error).toBeUndefined();
      expect(data!.length).toBeGreaterThan(0);
      expect(data!.some((s) => s.id.includes("8722588"))).toBe(true);
    });

    test("returns stations near given coordinates", async () => {
      const { data, error, response } = await client.GET("/tides/stations", {
        params: { query: { latitude: 26.772, longitude: -80.05 } },
      });

      expect(response.status).toBe(200);
      expect(error).toBeUndefined();
      expect(data!.length).toBeGreaterThan(0);
      expect(data!.length).toBeLessThanOrEqual(10);
      // proximity results carry a distance field
      expect("distance" in data![0]).toBe(true);
    });

    test("respects maxResults", async () => {
      const { data, response } = await client.GET("/tides/stations", {
        params: { query: { latitude: 26.772, longitude: -80.05, maxResults: 2 } },
      });

      expect(response.status).toBe(200);
      expect(data!.length).toBeLessThanOrEqual(2);
    });
  });

  // -----------------------------------------------------------------------
  // Extremes by coordinates
  // -----------------------------------------------------------------------
  describe("GET /tides/extremes", () => {
    test("returns high and low tides for a date range", async () => {
      const { data, error, response } = await client.GET("/tides/extremes", {
        params: {
          query: {
            latitude: 26.772,
            longitude: -80.05,
            start: "2025-12-17T00:00:00Z",
            end: "2025-12-18T00:00:00Z",
          },
        },
      });

      expect(response.status).toBe(200);
      expect(error).toBeUndefined();
      expect(data!.datum).toBeDefined();
      expect(data!.units).toBeDefined();
      expect(data!.extremes!.length).toBeGreaterThan(0);

      const highs = data!.extremes!.filter((e) => e.high);
      const lows = data!.extremes!.filter((e) => e.low);
      expect(highs.length).toBeGreaterThan(0);
      expect(lows.length).toBeGreaterThan(0);
    });

    test("returns the requested datum and units", async () => {
      const { data, response } = await client.GET("/tides/extremes", {
        params: {
          query: {
            latitude: 26.772,
            longitude: -80.05,
            start: "2025-12-17T00:00:00Z",
            end: "2025-12-18T00:00:00Z",
            datum: "MLLW",
            units: "feet",
          },
        },
      });

      expect(response.status).toBe(200);
      expect(data!.datum).toBe("MLLW");
      expect(data!.units).toBe("feet");
    });

    test("returns 400 for out-of-range latitude", async () => {
      const { error, response } = await client.GET("/tides/extremes", {
        params: {
          query: {
            latitude: -100,
            longitude: -80.05,
            start: "2025-12-17T00:00:00Z",
            end: "2025-12-18T00:00:00Z",
          },
        },
      });

      expect(response.status).toBe(400);
      expect(error!.message).toBeTruthy();
    });
  });

  // -----------------------------------------------------------------------
  // Timeline by coordinates
  // -----------------------------------------------------------------------
  describe("GET /tides/timeline", () => {
    test("returns water-level entries in chronological order", async () => {
      const { data, error, response } = await client.GET("/tides/timeline", {
        params: {
          query: {
            latitude: 26.772,
            longitude: -80.05,
            start: "2025-12-17T00:00:00Z",
            end: "2025-12-18T00:00:00Z",
          },
        },
      });

      expect(response.status).toBe(200);
      expect(error).toBeUndefined();
      expect(data!.timeline!.length).toBeGreaterThan(0);

      const times = data!.timeline!.map((e) => new Date(e.time).getTime());
      for (let i = 1; i < times.length; i++) {
        expect(times[i]).toBeGreaterThan(times[i - 1]);
      }
    });

    test("returns the requested units", async () => {
      const { data, response } = await client.GET("/tides/timeline", {
        params: {
          query: {
            latitude: 26.772,
            longitude: -80.05,
            start: "2025-12-17T00:00:00Z",
            end: "2025-12-18T00:00:00Z",
            units: "feet",
          },
        },
      });

      expect(response.status).toBe(200);
      expect(data!.units).toBe("feet");
    });
  });

  // -----------------------------------------------------------------------
  // Extremes / timeline by station ID
  // -----------------------------------------------------------------------
  describe("GET /tides/stations/{source}/{id}/extremes", () => {
    test("returns extremes for a known station", async () => {
      const { data, error, response } = await client.GET("/tides/stations/{source}/{id}/extremes", {
        params: {
          path: { source: "noaa", id: "8722588" },
          query: {
            start: "2025-12-17T00:00:00Z",
            end: "2025-12-18T00:00:00Z",
          },
        },
      });

      expect(response.status).toBe(200);
      expect(error).toBeUndefined();
      expect(data!.station!.id).toBe("noaa/8722588");
      expect(data!.extremes!.length).toBeGreaterThan(0);
    });

    test("returns 404 for a nonexistent station", async () => {
      const { error, response } = await client.GET("/tides/stations/{source}/{id}/extremes", {
        params: {
          path: { source: "fake", id: "nonexistent" },
          query: {
            start: "2025-12-17T00:00:00Z",
            end: "2025-12-18T00:00:00Z",
          },
        },
      });

      expect(response.status).toBe(404);
      expect(error!.message).toBeTruthy();
    });
  });

  describe("GET /tides/stations/{source}/{id}/timeline", () => {
    test("returns timeline for a known station", async () => {
      const { data, error, response } = await client.GET("/tides/stations/{source}/{id}/timeline", {
        params: {
          path: { source: "noaa", id: "8722588" },
          query: {
            start: "2025-12-17T00:00:00Z",
            end: "2025-12-18T00:00:00Z",
          },
        },
      });

      expect(response.status).toBe(200);
      expect(error).toBeUndefined();
      expect(data!.timeline!.length).toBeGreaterThan(0);
    });

    test("returns 404 for a nonexistent station", async () => {
      const { error, response } = await client.GET("/tides/stations/{source}/{id}/timeline", {
        params: {
          path: { source: "fake", id: "nonexistent" },
          query: {
            start: "2025-12-17T00:00:00Z",
            end: "2025-12-18T00:00:00Z",
          },
        },
      });

      expect(response.status).toBe(404);
      expect(error!.message).toBeTruthy();
    });
  });
});
