import { describe, test, expect } from "vitest";
import { render, within } from "@testing-library/react";
import { TideTable } from "../../src/components/TideTable.js";
import { createTestWrapper } from "../helpers.js";

describe("TideTable data grouping and state", () => {
  test("groups extremes by date", () => {
    // Two days of extremes
    const extremes = [
      { time: new Date("2025-12-17T04:30:00Z"), level: 1.5, high: true, low: false, label: "High" },
      { time: new Date("2025-12-17T10:45:00Z"), level: 0.2, high: false, low: true, label: "Low" },
      { time: new Date("2025-12-18T05:00:00Z"), level: 1.4, high: true, low: false, label: "High" },
      { time: new Date("2025-12-18T11:15:00Z"), level: 0.3, high: false, low: true, label: "Low" },
    ];

    const { container } = render(<TideTable extremes={extremes} timezone="UTC" units="meters" />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    // Should show both dates
    expect(view.getByText(/Dec 17/)).toBeDefined();
    expect(view.getByText(/Dec 18/)).toBeDefined();
  });

  test("highlights next upcoming extreme", () => {
    const now = new Date();
    const upcoming = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour ahead
    const past = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago

    const extremes = [
      { time: past, level: 1.5, high: true, low: false, label: "High" },
      { time: upcoming, level: 0.2, high: false, low: true, label: "Low" },
    ];

    const { container } = render(<TideTable extremes={extremes} timezone="UTC" units="meters" />, {
      wrapper: createTestWrapper(),
    });

    // The next upcoming row should have aria-current="true"
    const currentRow = container.querySelector('[aria-current="true"]');
    expect(currentRow).not.toBeNull();
  });

  test("does not highlight when all extremes are in the past", () => {
    const past1 = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const past2 = new Date(Date.now() - 1 * 60 * 60 * 1000);

    const extremes = [
      { time: past1, level: 1.5, high: true, low: false, label: "High" },
      { time: past2, level: 0.2, high: false, low: true, label: "Low" },
    ];

    const { container } = render(<TideTable extremes={extremes} timezone="UTC" units="meters" />, {
      wrapper: createTestWrapper(),
    });

    const currentRow = container.querySelector('[aria-current="true"]');
    expect(currentRow).toBeNull();
  });

  test("renders date in first row with rowspan", () => {
    const extremes = [
      { time: new Date("2025-12-17T04:30:00Z"), level: 1.5, high: true, low: false, label: "High" },
      { time: new Date("2025-12-17T10:45:00Z"), level: 0.2, high: false, low: true, label: "Low" },
    ];

    const { container } = render(<TideTable extremes={extremes} timezone="UTC" units="meters" />, {
      wrapper: createTestWrapper(),
    });

    // First row has the date cell with rowspan
    const rowspanCells = container.querySelectorAll("td[rowspan]");
    expect(rowspanCells.length).toBe(1);
    expect(rowspanCells[0].getAttribute("rowspan")).toBe("2");
  });

  test("renders with feet units", () => {
    const extremes = [
      {
        time: new Date("2025-12-17T06:00:00Z"),
        level: 4.78,
        high: true,
        low: false,
        label: "High",
      },
    ];

    const { container } = render(<TideTable extremes={extremes} timezone="UTC" units="feet" />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    expect(view.getByText("4.8 ft")).toBeDefined();
  });

  test("uses provider units when none specified", () => {
    const extremes = [
      { time: new Date("2025-12-17T06:00:00Z"), level: 1.5, high: true, low: false, label: "High" },
    ];

    const { container } = render(<TideTable extremes={extremes} timezone="UTC" />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    // Provider defaults to feet (en-US locale)
    expect(view.getByText("1.5 ft")).toBeDefined();
  });
});
