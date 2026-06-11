import { describe, test, expect } from "vitest";
import { render } from "@testing-library/react";
import { TideGraphChart } from "../../src/components/TideGraph/index.js";
import { createTestWrapper } from "../helpers.js";

const timeline = [
  { time: new Date("2025-12-17T00:00:00Z"), level: 0.5 },
  { time: new Date("2025-12-17T03:00:00Z"), level: 1.2 },
  { time: new Date("2025-12-17T06:00:00Z"), level: 1.5 },
  { time: new Date("2025-12-17T09:00:00Z"), level: 0.8 },
  { time: new Date("2025-12-17T12:00:00Z"), level: 0.3 },
  { time: new Date("2025-12-17T15:00:00Z"), level: 0.9 },
  { time: new Date("2025-12-17T18:00:00Z"), level: 1.4 },
  { time: new Date("2025-12-17T21:00:00Z"), level: 0.7 },
];

const extremes = [
  { time: new Date("2025-12-17T06:00:00Z"), level: 1.5, high: true, low: false, label: "High" },
  { time: new Date("2025-12-17T12:00:00Z"), level: 0.3, high: false, low: true, label: "Low" },
];

const noop = () => {};

describe("TideGraphChart", () => {
  test("renders an svg element", () => {
    const { container } = render(
      <TideGraphChart
        timeline={timeline}
        extremes={extremes}
        timezone="UTC"
        units="meters"
        svgWidth={600}
        onSelect={noop}
      />,
      { wrapper: createTestWrapper() },
    );

    expect(container.querySelector("svg")).not.toBeNull();
  });

  test("renders with empty extremes", () => {
    const { container } = render(
      <TideGraphChart
        timeline={timeline}
        extremes={[]}
        timezone="UTC"
        units="meters"
        svgWidth={600}
        onSelect={noop}
      />,
      { wrapper: createTestWrapper() },
    );

    expect(container.querySelector("svg")).not.toBeNull();
  });
});
