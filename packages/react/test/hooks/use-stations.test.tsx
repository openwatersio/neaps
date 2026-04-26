import { describe, test, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useStations } from "../../src/hooks/use-stations.js";
import { createTestWrapper } from "../helpers.js";

describe("useStations", () => {
  test("fetches all stations with no params", async () => {
    const { result } = renderHook(() => useStations(), {
      wrapper: createTestWrapper(),
    });

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

  test("searches stations by query", async () => {
    const { result } = renderHook(() => useStations({ query: "Boston" }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 10000 },
    );

    expect(result.current.data).toBeDefined();
    expect(result.current.data!.length).toBeGreaterThan(0);
    expect(result.current.data![0].name).toBeDefined();
  });

  test("searches stations by proximity", async () => {
    const { result } = renderHook(
      () => useStations({ latitude: 42.3541, longitude: -71.0495, maxResults: 3 }),
      { wrapper: createTestWrapper() },
    );

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 10000 },
    );

    expect(result.current.data).toBeDefined();
    expect(result.current.data!.length).toBeLessThanOrEqual(3);
  });
});
