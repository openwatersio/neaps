import { describe, test, expect } from "vitest";
import { renderChart } from "../../src/lib/chart.js";

function makePoints(count: number, opts: { startHour?: number; intervalMinutes?: number } = {}) {
  const { startHour = 0, intervalMinutes = 60 } = opts;
  const points = [];
  for (let i = 0; i < count; i++) {
    const time = new Date(Date.UTC(2026, 0, 1, startHour));
    time.setUTCMinutes(i * intervalMinutes);
    // Sine wave to get interesting chart data
    points.push({ time, level: Math.sin((i / count) * Math.PI * 2) });
  }
  return points;
}

describe("renderChart", () => {
  test("returns message for empty data", () => {
    expect(renderChart([], { units: "meters" })).toBe("No data points.");
  });

  test("renders a chart with meters", () => {
    const points = makePoints(25);
    const chart = renderChart(points, { units: "meters", width: 40, height: 5 });
    const lines = chart.split("\n");

    // Should have height rows + axis line + label line
    expect(lines.length).toBe(7);
    // Y-axis labels should use "m"
    expect(chart).toContain("m");
    // Should contain chart characters
    expect(chart).toContain("\u2524"); // row delimiter
    expect(chart).toContain("\u2500"); // axis line
  });

  test("renders a chart with feet", () => {
    const points = makePoints(25);
    const chart = renderChart(points, { units: "feet", width: 40, height: 5 });
    expect(chart).toContain("ft");
  });

  test("renders vertical connectors between points", () => {
    // Points with a big level jump to trigger vertical bars
    const points = [
      { time: new Date(Date.UTC(2026, 0, 1, 0)), level: 0 },
      { time: new Date(Date.UTC(2026, 0, 1, 1)), level: 2 },
      { time: new Date(Date.UTC(2026, 0, 1, 2)), level: 0 },
    ];
    const chart = renderChart(points, { units: "meters", width: 12, height: 10 });
    // Vertical connector should appear between big jumps
    expect(chart).toContain("\u2502");
  });

  test("handles single point", () => {
    const points = [{ time: new Date(Date.UTC(2026, 0, 1, 0)), level: 1.5 }];
    const chart = renderChart(points, { units: "meters", width: 20, height: 5 });
    expect(chart).toContain("\u2022"); // dot
  });

  test("handles flat data (all same level)", () => {
    const points = makePoints(10).map((p) => ({ ...p, level: 1.0 }));
    const chart = renderChart(points, { units: "meters", width: 20, height: 5 });
    // Should still render without crashing (range = 0 → fallback to 1)
    expect(chart).toContain("\u2022");
  });

  test("renders time labels on x-axis", () => {
    // 24-hour span: labels should appear at 3-hour intervals
    const points = makePoints(25, { startHour: 0, intervalMinutes: 60 });
    const chart = renderChart(points, { units: "meters", width: 40, height: 5 });
    expect(chart).toContain("00:00");
  });

  test("uses 1-hour labels for short spans", () => {
    // 4-hour span
    const points = makePoints(5, { startHour: 10, intervalMinutes: 60 });
    const chart = renderChart(points, { units: "meters", width: 40, height: 5 });
    // Should include some hour labels
    expect(chart).toContain(":00");
  });

  test("handles negative levels", () => {
    const points = [
      { time: new Date(Date.UTC(2026, 0, 1, 0)), level: -0.5 },
      { time: new Date(Date.UTC(2026, 0, 1, 1)), level: 0.5 },
      { time: new Date(Date.UTC(2026, 0, 1, 2)), level: -0.3 },
    ];
    const chart = renderChart(points, { units: "meters", width: 20, height: 5 });
    // Negative values should appear without leading space
    expect(chart).toContain("-0.5");
  });

  test("narrower width produces shorter chart rows", () => {
    const points = makePoints(50);
    const narrow = renderChart(points, { units: "meters", width: 30, height: 5 });
    const wide = renderChart(points, { units: "meters", width: 80, height: 5 });
    const narrowRows = narrow.split("\n").filter((l) => l.includes("\u2524"));
    const wideRows = wide.split("\n").filter((l) => l.includes("\u2524"));
    expect(narrowRows.length).toBe(5);
    expect(wideRows.length).toBe(5);
    // Narrow chart rows should be shorter than wide chart rows
    expect(narrowRows[0].length).toBeLessThan(wideRows[0].length);
  });
});
