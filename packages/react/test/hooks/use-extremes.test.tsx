import { describe, test, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useExtremes } from "../../src/hooks/use-extremes.js";
import { createTestWrapper } from "../helpers.js";

describe("useExtremes", () => {
  test("fetches extremes by station ID", async () => {
    const now = new Date();
    const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { result } = renderHook(
      () => useExtremes({ id: "noaa/8443970", start: now.toISOString(), end: end.toISOString() }),
      { wrapper: createTestWrapper() },
    );

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 10000 },
    );

    expect(result.current.data).toBeDefined();
    expect(result.current.data!.extremes).toBeDefined();
    expect(Array.isArray(result.current.data!.extremes)).toBe(true);
    expect(result.current.data!.datum).toBeDefined();
  });

  test("inherits units from provider", async () => {
    const now = new Date();
    const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { result } = renderHook(
      () => useExtremes({ id: "noaa/8443970", start: now.toISOString(), end: end.toISOString() }),
      { wrapper: createTestWrapper() },
    );

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 10000 },
    );

    expect(result.current.data!.units).toBeDefined();
  });

  test("returns error for invalid station", async () => {
    const { result } = renderHook(() => useExtremes({ id: "nonexistent/station" }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 10000 },
    );

    expect(result.current.error).toBeDefined();
  });
});
