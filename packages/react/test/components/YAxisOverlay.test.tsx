import { describe, test, expect } from "vitest";
import { render } from "@testing-library/react";
import { scaleLinear } from "@visx/scale";
import { YAxisOverlay } from "../../src/components/TideGraph/YAxisOverlay.js";

describe("YAxisOverlay", () => {
  const yScale = scaleLinear<number>({
    domain: [-1, 3],
    range: [200, 0],
    nice: true,
  });

  test("renders", () => {
    const { container } = render(
      <YAxisOverlay yScale={yScale} narrowRange={false} unitSuffix="m" />,
    );

    const div = container.firstElementChild as HTMLElement;
    expect(div).toBeDefined();
    expect(div.style.position || div.className).toBeTruthy();

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  test("includes unit suffix in tick labels", () => {
    const { container } = render(
      <YAxisOverlay yScale={yScale} narrowRange={false} unitSuffix="ft" />,
    );

    // Should contain "ft" somewhere in tick labels
    expect(container.textContent).toContain("ft");
  });

  test("formats narrow range with decimal places", () => {
    const narrowYScale = scaleLinear<number>({
      domain: [0.5, 1.5],
      range: [200, 0],
      nice: true,
    });

    const { container } = render(
      <YAxisOverlay yScale={narrowYScale} narrowRange={true} unitSuffix="m" />,
    );

    // narrowRange uses toFixed(1), so tick labels should contain a decimal point
    const text = container.textContent!;
    expect(text).toMatch(/\d\.\d m/);
  });

  test("formats wide range with rounded numbers", () => {
    const wideYScale = scaleLinear<number>({
      domain: [-1, 4],
      range: [200, 0],
      nice: true,
    });

    const { container } = render(
      <YAxisOverlay yScale={wideYScale} narrowRange={false} unitSuffix="m" />,
    );

    // Wide range uses Math.round, so tick labels should be integers without decimals
    const text = container.textContent!;
    expect(text).toContain("-1 m");
  });
});
