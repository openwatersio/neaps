import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { render, waitFor } from "@testing-library/react";
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

describe("TideCycleGraph chart rendering", () => {
  // The chart only renders once the ResizeObserver reports a non-zero size,
  // so give the container real dimensions.
  let style: HTMLStyleElement;

  beforeAll(() => {
    style = document.createElement("style");
    style.textContent = ".sized-graph { width: 300px; height: 150px; }";
    document.head.appendChild(style);
  });

  afterAll(() => {
    style.remove();
  });

  test("renders the SVG chart with extremes and current-level marker", async () => {
    const { container } = render(
      <TideCycleGraph timeline={timeline} extremes={extremes} className="sized-graph" />,
      { wrapper: createTestWrapper() },
    );

    await waitFor(() => {
      expect(container.querySelector("svg")).not.toBeNull();
    });

    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("aria-label")).toBe("Tide cycle graph");
    // One circle per extreme within the window
    expect(svg.querySelectorAll("circle").length).toBe(extremes.length);
    // Area fill references a unique gradient that exists in the document
    const gradient = svg.querySelector("linearGradient");
    expect(gradient).not.toBeNull();
    const fill = svg.querySelector("path")?.getAttribute("fill") ?? "";
    expect(fill).toContain(gradient!.id);
  });
});
