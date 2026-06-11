import { describe, test, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useStation } from "../../src/hooks/use-station.js";
import { createTestWrapper } from "../helpers.js";

describe("useStation", () => {
  test("fetches station data by ID", async () => {
    const { result } = renderHook(() => useStation("noaa/8443970"), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 10000 },
    );

    expect(result.current.data).toBeDefined();
    expect(result.current.data!.name).toBeDefined();
    expect(result.current.data!.latitude).toBeTypeOf("number");
    expect(result.current.data!.longitude).toBeTypeOf("number");
  });

  test("is disabled when id is undefined", () => {
    const { result } = renderHook(() => useStation(undefined), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  test("returns error for invalid station", async () => {
    const { result } = renderHook(() => useStation("nonexistent/station"), {
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
