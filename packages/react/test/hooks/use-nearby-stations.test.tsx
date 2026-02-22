import { describe, test, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useNearbyStations } from "../../src/hooks/use-nearby-stations.js";
import { createTestWrapper } from "../helpers.js";

describe("useNearbyStations", () => {
  test("fetches nearby stations by position", async () => {
    const { result } = renderHook(
      () => useNearbyStations({ latitude: 42.3541, longitude: -71.0495 }),
      { wrapper: createTestWrapper() },
    );

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 10000 },
    );

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
    expect(result.current.data!.length).toBeGreaterThan(0);
  });

  test("respects maxResults", async () => {
    const { result } = renderHook(
      () => useNearbyStations({ latitude: 42.3541, longitude: -71.0495, maxResults: 2 }),
      { wrapper: createTestWrapper() },
    );

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 10000 },
    );

    expect(result.current.data!.length).toBeLessThanOrEqual(2);
  });

  test("is disabled when params are undefined", () => {
    const { result } = renderHook(() => useNearbyStations(undefined), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  test("station results have expected shape", async () => {
    const { result } = renderHook(
      () => useNearbyStations({ latitude: 42.3541, longitude: -71.0495, maxResults: 1 }),
      { wrapper: createTestWrapper() },
    );

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 10000 },
    );

    const station = result.current.data![0];
    expect(station.id).toBeTypeOf("string");
    expect(station.name).toBeTypeOf("string");
    expect(station.latitude).toBeTypeOf("number");
    expect(station.longitude).toBeTypeOf("number");
  });
});
