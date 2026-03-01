import { describe, test, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { TideGraph } from "../../src/components/TideGraph.js";
import { createTestWrapper } from "../helpers.js";

const timeline = [
  { time: "2025-12-17T00:00:00Z", level: 0.5 },
  { time: "2025-12-17T03:00:00Z", level: 1.2 },
  { time: "2025-12-17T06:00:00Z", level: 1.5 },
  { time: "2025-12-17T09:00:00Z", level: 0.8 },
  { time: "2025-12-17T12:00:00Z", level: 0.3 },
  { time: "2025-12-17T15:00:00Z", level: 0.9 },
  { time: "2025-12-17T18:00:00Z", level: 1.4 },
  { time: "2025-12-17T21:00:00Z", level: 0.7 },
];

const extremes = [
  { time: "2025-12-17T06:00:00Z", level: 1.5, high: true, low: false, label: "High" },
  { time: "2025-12-17T12:00:00Z", level: 0.3, high: false, low: true, label: "Low" },
];

describe("TideGraph", () => {
  test("renders a canvas element in data-driven mode", async () => {
    const { container } = render(
      <TideGraph timeline={timeline} extremes={extremes} timezone="UTC" units="meters" />,
      { wrapper: createTestWrapper() },
    );

    await waitFor(() => {
      expect(container.querySelector("svg")).not.toBeNull();
    });
  });

  test("renders with empty extremes", async () => {
    const { container } = render(<TideGraph timeline={timeline} timezone="UTC" units="meters" />, {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(container.querySelector("svg")).not.toBeNull();
    });
  });

  test("applies className", () => {
    const { container } = render(
      <TideGraph timeline={timeline} timezone="UTC" units="meters" className="my-graph" />,
      { wrapper: createTestWrapper() },
    );

    expect(container.querySelector(".my-graph")).not.toBeNull();
  });
});
