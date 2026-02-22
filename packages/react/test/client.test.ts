import { describe, test, expect, vi, beforeEach } from "vitest";
import {
  fetchStation,
  fetchStations,
  fetchExtremes,
  fetchTimeline,
  fetchStationExtremes,
  fetchStationTimeline,
} from "../src/client.js";

const BASE_URL = "https://api.example.com";

beforeEach(() => {
  vi.restoreAllMocks();
});

function mockFetch(data: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
    }),
  );
}

describe("fetchStation", () => {
  test("builds correct URL from composite id", async () => {
    mockFetch({ id: "noaa/8722588", name: "Test Station" });

    await fetchStation(BASE_URL, "noaa/8722588");

    expect(fetch).toHaveBeenCalledWith("https://api.example.com/tides/stations/noaa/8722588");
  });

  test("throws on invalid id format", () => {
    expect(() => fetchStation(BASE_URL, "invalid")).toThrow('Invalid station ID: "invalid"');
  });

  test("throws on HTTP error with message from body", async () => {
    mockFetch({ message: "Station not found" }, 404);

    await expect(fetchStation(BASE_URL, "noaa/999999")).rejects.toThrow("Station not found");
  });
});

describe("fetchStations", () => {
  test("search by query", async () => {
    mockFetch([]);

    await fetchStations(BASE_URL, { query: "palm beach" });

    expect(fetch).toHaveBeenCalledWith("https://api.example.com/tides/stations?query=palm+beach");
  });

  test("proximity search", async () => {
    mockFetch([]);

    await fetchStations(BASE_URL, { latitude: 26.7, longitude: -80.05, maxResults: 5 });

    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    const parsed = new URL(url);
    expect(parsed.searchParams.get("latitude")).toBe("26.7");
    expect(parsed.searchParams.get("longitude")).toBe("-80.05");
    expect(parsed.searchParams.get("maxResults")).toBe("5");
  });

  test("omits undefined params", async () => {
    mockFetch([]);

    await fetchStations(BASE_URL, {});

    expect(fetch).toHaveBeenCalledWith("https://api.example.com/tides/stations");
  });
});

describe("fetchExtremes", () => {
  test("includes all params in URL", async () => {
    mockFetch({ extremes: [] });

    await fetchExtremes(BASE_URL, {
      latitude: 26.7,
      longitude: -80.05,
      start: "2025-01-01T00:00:00Z",
      end: "2025-01-02T00:00:00Z",
      datum: "MLLW",
      units: "feet",
    });

    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/tides/extremes");
    expect(parsed.searchParams.get("latitude")).toBe("26.7");
    expect(parsed.searchParams.get("units")).toBe("feet");
  });
});

describe("fetchTimeline", () => {
  test("builds correct URL", async () => {
    mockFetch({ timeline: [] });

    await fetchTimeline(BASE_URL, { latitude: 26.7, longitude: -80.05 });

    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(new URL(url).pathname).toBe("/tides/timeline");
  });
});

describe("fetchStationExtremes", () => {
  test("uses station path and strips id from query params", async () => {
    mockFetch({ extremes: [] });

    await fetchStationExtremes(BASE_URL, {
      id: "noaa/8722588",
      datum: "MSL",
    });

    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/tides/stations/noaa/8722588/extremes");
    expect(parsed.searchParams.get("datum")).toBe("MSL");
    expect(parsed.searchParams.has("id")).toBe(false);
  });
});

describe("fetchStationTimeline", () => {
  test("uses station path", async () => {
    mockFetch({ timeline: [] });

    await fetchStationTimeline(BASE_URL, { id: "noaa/8722588" });

    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(new URL(url).pathname).toBe("/tides/stations/noaa/8722588/timeline");
  });
});
