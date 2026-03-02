import { describe, test, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTimeline } from "../../src/hooks/use-timeline.js";
import { createTestWrapper } from "../helpers.js";

describe("useTimeline", () => {
  test("fetches timeline by station ID", async () => {
    const now = new Date();
    const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { result } = renderHook(
      () => useTimeline({ id: "noaa/8443970", start: now.toISOString(), end: end.toISOString() }),
      { wrapper: createTestWrapper() },
    );

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 10000 },
    );

    expect(result.current.data).toBeDefined();
    expect(result.current.data!.timeline).toBeDefined();
    expect(Array.isArray(result.current.data!.timeline)).toBe(true);
    expect(result.current.data!.timeline.length).toBeGreaterThan(0);
  });

  test("timeline entries have time and level", async () => {
    const now = new Date();
    const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { result } = renderHook(
      () => useTimeline({ id: "noaa/8443970", start: now.toISOString(), end: end.toISOString() }),
      { wrapper: createTestWrapper() },
    );

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 10000 },
    );

    const entry = result.current.data!.timeline[0];
    expect(entry.time).toBeTypeOf("string");
    expect(entry.level).toBeTypeOf("number");
  });

  test("returns error for invalid station", async () => {
    const { result } = renderHook(() => useTimeline({ id: "nonexistent/station" }), {
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
