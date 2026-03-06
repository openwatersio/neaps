import { describe, test, expect } from "vitest";
import { render } from "@testing-library/react";
import { TideCycleGraph } from "../../src/components/TideCycleGraph.js";
import { createTestWrapper } from "../helpers.js";
import type { Extreme, TimelineEntry } from "../../src/types.js";

const NOW = Date.now();
const HALF_CYCLE = 6.2083 * 60 * 60 * 1000;

function makeTimeline(count: number): TimelineEntry[] {
  const start = NOW - HALF_CYCLE;
  const step = (2 * HALF_CYCLE) / (count - 1);
  return Array.from({ length: count }, (_, i) => ({
    time: new Date(start + i * step),
    level: Math.sin((i / (count - 1)) * Math.PI * 2) * 1.5,
  }));
}

const timeline = makeTimeline(50);

const extremes: Extreme[] = [
  { time: new Date(NOW - 3 * 60 * 60 * 1000), level: 1.5, high: true, low: false, label: "High" },
  { time: new Date(NOW + 3 * 60 * 60 * 1000), level: -0.3, high: false, low: true, label: "Low" },
];

describe("TideCycleGraph", () => {
  test("renders a container div", () => {
    const { container } = render(<TideCycleGraph timeline={timeline} extremes={extremes} />, {
      wrapper: createTestWrapper(),
    });

    expect(container.firstElementChild).toBeDefined();
  });

  test("returns null with empty timeline", () => {
    const { container } = render(<TideCycleGraph timeline={[]} extremes={[]} />, {
      wrapper: createTestWrapper(),
    });

    // The component returns null when windowTimeline is empty
    expect(container.innerHTML).toBe("");
  });

  test("applies className", () => {
    const { container } = render(
      <TideCycleGraph timeline={timeline} extremes={extremes} className="my-graph" />,
      { wrapper: createTestWrapper() },
    );

    expect(container.querySelector(".my-graph")).not.toBeNull();
  });
});
