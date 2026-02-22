import { describe, test, expect } from "vitest";
import { render, within } from "@testing-library/react";
import { TideTable } from "../../src/components/TideTable.js";
import { createTestWrapper } from "../helpers.js";

const extremes = [
  { time: "2025-12-17T04:30:00Z", level: 1.5, high: true, low: false, label: "High" },
  { time: "2025-12-17T10:45:00Z", level: 0.2, high: false, low: true, label: "Low" },
  { time: "2025-12-17T16:00:00Z", level: 1.4, high: true, low: false, label: "High" },
  { time: "2025-12-17T22:15:00Z", level: 0.3, high: false, low: true, label: "Low" },
];

describe("TideTable", () => {
  test("renders table with correct structure", () => {
    const { container } = render(<TideTable extremes={extremes} timezone="UTC" units="meters" />, {
      wrapper: createTestWrapper(),
    });

    const view = within(container);
    expect(view.getByRole("table")).toBeDefined();
    expect(view.getAllByRole("columnheader").length).toBeGreaterThanOrEqual(3);
  });

  test("renders all extremes as rows", () => {
    const { container } = render(<TideTable extremes={extremes} timezone="UTC" units="meters" />, {
      wrapper: createTestWrapper(),
    });

    const view = within(container);
    const rows = view.getAllByRole("row");
    // 1 header row + 4 data rows
    expect(rows.length).toBe(5);
  });

  test("displays High and Low labels", () => {
    const { container } = render(<TideTable extremes={extremes} timezone="UTC" units="meters" />, {
      wrapper: createTestWrapper(),
    });

    const view = within(container);
    const highLabels = view.getAllByText("High");
    const lowLabels = view.getAllByText("Low");
    expect(highLabels.length).toBe(2);
    expect(lowLabels.length).toBe(2);
  });

  test("renders empty table when no extremes", () => {
    const { container } = render(<TideTable extremes={[]} timezone="UTC" units="meters" />, {
      wrapper: createTestWrapper(),
    });

    const view = within(container);
    expect(view.getByRole("table")).toBeDefined();
    // Header row only
    const rows = view.getAllByRole("row");
    expect(rows.length).toBe(1);
  });

  test("formats levels with units", () => {
    const { container } = render(<TideTable extremes={extremes} timezone="UTC" units="meters" />, {
      wrapper: createTestWrapper(),
    });

    const view = within(container);
    expect(view.getAllByText("1.50 m").length).toBeGreaterThan(0);
    expect(view.getAllByText("0.20 m").length).toBeGreaterThan(0);
  });
});
