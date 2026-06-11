import { describe, test, expect } from "vitest";
import { render, within, waitFor } from "@testing-library/react";
import { TideGraph } from "../../src/components/TideGraph/TideGraph.js";
import { TideGraphChart } from "../../src/components/TideGraph/TideGraphChart.js";
import { createTestWrapper } from "../helpers.js";
import type { TimelineEntry, Extreme } from "../../src/types.js";

const timeline: TimelineEntry[] = [
  { time: new Date("2025-12-17T00:00:00Z"), level: 0.5 },
  { time: new Date("2025-12-17T03:00:00Z"), level: 1.2 },
  { time: new Date("2025-12-17T06:00:00Z"), level: 1.5 },
  { time: new Date("2025-12-17T09:00:00Z"), level: 0.8 },
  { time: new Date("2025-12-17T12:00:00Z"), level: 0.3 },
  { time: new Date("2025-12-17T15:00:00Z"), level: 0.9 },
  { time: new Date("2025-12-17T18:00:00Z"), level: 1.4 },
  { time: new Date("2025-12-17T21:00:00Z"), level: 0.7 },
];

const extremes: Extreme[] = [
  { time: new Date("2025-12-17T06:00:00Z"), level: 1.5, high: true, low: false, label: "High" },
  { time: new Date("2025-12-17T12:00:00Z"), level: 0.3, high: false, low: true, label: "Low" },
];

const noop = () => {};

describe("TideGraphChart", () => {
  test("renders with active entry tooltip", () => {
    const activeEntry: TimelineEntry = {
      time: new Date("2025-12-17T09:00:00Z"),
      level: 0.8,
    };

    const { container } = render(
      <TideGraphChart
        timeline={timeline}
        extremes={extremes}
        timezone="UTC"
        units="meters"
        svgWidth={600}
        activeEntry={activeEntry}
        onSelect={noop}
      />,
      { wrapper: createTestWrapper() },
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    // Active entry renders a level label
    expect(container.textContent).toContain("0.80 m");
  });

  test("renders with coordinates (night bands + daylight axis)", () => {
    const { container } = render(
      <TideGraphChart
        timeline={timeline}
        extremes={extremes}
        timezone="UTC"
        units="meters"
        svgWidth={600}
        latitude={42.36}
        longitude={-71.06}
        onSelect={noop}
      />,
      { wrapper: createTestWrapper() },
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  test("renders with yDomainOverride", () => {
    const { container } = render(
      <TideGraphChart
        timeline={timeline}
        extremes={extremes}
        timezone="UTC"
        units="feet"
        svgWidth={600}
        yDomainOverride={[-1, 3]}
        onSelect={noop}
      />,
      { wrapper: createTestWrapper() },
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  test("renders nothing with zero width", () => {
    const { container } = render(
      <TideGraphChart
        timeline={timeline}
        extremes={extremes}
        timezone="UTC"
        units="meters"
        svgWidth={0}
        onSelect={noop}
      />,
      { wrapper: createTestWrapper() },
    );

    expect(container.querySelector("svg")).toBeNull();
  });

  test("renders extreme point labels", () => {
    const { container } = render(
      <TideGraphChart
        timeline={timeline}
        extremes={extremes}
        timezone="UTC"
        units="meters"
        svgWidth={800}
        onSelect={noop}
      />,
      { wrapper: createTestWrapper() },
    );

    // Should show high and low labels
    expect(container.textContent).toContain("1.50 m");
    expect(container.textContent).toContain("0.30 m");
  });
});

describe("TideGraph (scrollable wrapper)", () => {
  test("shows loading state initially", () => {
    const { container } = render(<TideGraph id="noaa/8443970" />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    expect(view.getByText(/Loading tide data/)).toBeDefined();
  });

  test("renders scrollable region after loading", async () => {
    const { container } = render(<TideGraph id="noaa/8443970" />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    await waitFor(
      () => {
        expect(view.queryByText(/Loading tide data/)).toBeNull();
      },
      { timeout: 15000 },
    );

    const region = view.getByRole("region", { name: /scrollable/i });
    expect(region).toBeDefined();
  });

  test("applies className", () => {
    const { container } = render(<TideGraph id="noaa/8443970" className="my-graph" />, {
      wrapper: createTestWrapper(),
    });

    expect(container.querySelector(".my-graph")).not.toBeNull();
  });

  test("renders Now button", async () => {
    const { container } = render(<TideGraph id="noaa/8443970" />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    await waitFor(
      () => {
        expect(view.queryByText(/Loading tide data/)).toBeNull();
      },
      { timeout: 15000 },
    );

    const nowButton = view.getByLabelText("Scroll to current time");
    expect(nowButton).toBeDefined();
  });
});
