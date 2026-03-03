import { describe, it, expect } from "vitest";
import mockConstituents from "./_mocks/constituents.js";
import tidePrediction from "../src/index.js";

const startDate = new Date("2019-09-01T00:00:00Z");
const endDate = new Date("2019-09-01T06:00:00Z");

describe("Tidal station", () => {
  it("it is created correctly", () => {
    let stationCreated = true;

    try {
      tidePrediction(mockConstituents);
    } catch {
      stationCreated = false;
    }
    expect(stationCreated).toBe(true);

    try {
      tidePrediction(mockConstituents);
    } catch {
      stationCreated = false;
    }
    expect(stationCreated).toBe(true);
  });

  it("it predicts the tides in a timeline", () => {
    const results = tidePrediction(mockConstituents).getTimelinePrediction({
      start: startDate,
      end: endDate,
    });
    expect(results.length).toBe(37);
    expect(results[0].level).toBeCloseTo(-1.43403692, 3);
    const lastResult = results.pop();
    expect(lastResult?.level).toBeCloseTo(2.81345665, 3);
  });

  it("it predicts the tides in a timeline with time fidelity", () => {
    const results = tidePrediction(mockConstituents).getTimelinePrediction({
      start: startDate,
      end: endDate,
      timeFidelity: 60,
    });
    expect(results.length).toBe(361);
    expect(results[0].level).toBeCloseTo(-1.43403692, 3);
    const lastResult = results.pop();
    expect(lastResult?.level).toBeCloseTo(2.81345665, 3);
  });

  it("it predicts the tidal extremes", () => {
    const results = tidePrediction(mockConstituents).getExtremesPrediction({
      start: startDate,
      end: endDate,
    });
    expect(results[0].level).toBeCloseTo(-1.65723814, 4);
  });

  it("it predicts the tidal extremes with high fidelity", () => {
    const results = tidePrediction(mockConstituents).getExtremesPrediction({
      start: startDate,
      end: endDate,
      timeFidelity: 60,
    });
    expect(results[0].level).toBeCloseTo(-1.65723814, 4);
  });

  it("it fetches a single water level", () => {
    const result = tidePrediction(mockConstituents).getWaterLevelAtTime({
      time: startDate,
    });
    expect(result.level).toBeCloseTo(-1.434038, 4);
  });

  it("it adds offset phases", () => {
    const results = tidePrediction(mockConstituents, {
      offset: 3,
    }).getExtremesPrediction({ start: startDate, end: endDate });

    expect(results[0].level).toBeCloseTo(1.34276186, 4);
  });
});
