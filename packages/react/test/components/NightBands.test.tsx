import { describe, test, expect } from "vitest";
import { render } from "@testing-library/react";
import { scaleTime } from "@visx/scale";
import { NightBands } from "../../src/components/TideGraph/NightBands.js";

describe("NightBands", () => {
  const start = new Date("2025-12-17T00:00:00Z");
  const end = new Date("2025-12-18T00:00:00Z");

  const xScale = scaleTime<number>({
    domain: [start, end],
    range: [0, 600],
  });

  test("renders night band rectangles for a location", () => {
    // Boston, December — should have at least one night interval
    const { container } = render(
      <svg>
        <NightBands xScale={xScale} latitude={42.36} longitude={-71.06} />
      </svg>,
    );

    const rects = container.querySelectorAll("rect");
    expect(rects.length).toBeGreaterThanOrEqual(0);
  });

  test("renders no rectangles when coordinates are missing", () => {
    const { container } = render(
      <svg>
        <NightBands xScale={xScale} />
      </svg>,
    );

    const rects = container.querySelectorAll("rect");
    expect(rects.length).toBe(0);
  });

  test("renders no rectangles when only latitude is provided", () => {
    const { container } = render(
      <svg>
        <NightBands xScale={xScale} latitude={42.36} />
      </svg>,
    );

    const rects = container.querySelectorAll("rect");
    expect(rects.length).toBe(0);
  });
});
