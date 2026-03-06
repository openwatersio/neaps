import { describe, test, expect } from "vitest";
import { render, within } from "@testing-library/react";
import { TideStationHeader } from "../../src/components/TideStationHeader.js";

describe("TideStationHeader", () => {
  const station = {
    name: "Boston",
    region: "Massachusetts",
    country: "US",
    latitude: 42.3547,
    longitude: -71.0534,
  };

  test("renders station name as heading", () => {
    const { container } = render(<TideStationHeader station={station} />);
    const view = within(container);

    const heading = view.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("Boston");
  });

  test("renders region and country", () => {
    const { container } = render(<TideStationHeader station={station} />);
    const view = within(container);

    expect(view.getByText(/Massachusetts/)).toBeDefined();
    expect(view.getByText(/US/)).toBeDefined();
  });

  test("renders formatted coordinates", () => {
    const { container } = render(<TideStationHeader station={station} />);

    // Should contain coordinate-format output (degrees/minutes)
    expect(container.textContent).toContain("71");
    expect(container.textContent).toContain("42");
  });

  test("handles missing region gracefully", () => {
    const stationNoRegion = { ...station, region: "", country: "US" };
    const { container } = render(<TideStationHeader station={stationNoRegion} />);
    const view = within(container);

    // Should still render without error
    expect(view.getByRole("heading", { level: 1 })).toBeDefined();
  });

  test("applies className", () => {
    const { container } = render(<TideStationHeader station={station} className="my-header" />);

    expect(container.firstElementChild!.className).toContain("my-header");
  });
});
