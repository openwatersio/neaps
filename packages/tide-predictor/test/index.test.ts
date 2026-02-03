import { describe, it, expect } from "vitest";
import mockConstituents from "./_mocks/constituents.js";
import { createTidePredictor } from "../src/index.js";

const startDate = new Date("2019-09-01T00:00:00Z");
const endDate = new Date("2019-09-01T06:00:00Z");

describe("Tidal station", () => {
  it("it is created correctly", () => {
    let stationCreated = true;

    try {
      createTidePredictor(mockConstituents);
    } catch {
      stationCreated = false;
    }
    expect(stationCreated).toBe(true);

    try {
      createTidePredictor(mockConstituents);
    } catch {
      stationCreated = false;
    }
    expect(stationCreated).toBe(true);
  });

  it("it predicts the tides in a timeline", () => {
    const results = createTidePredictor(mockConstituents).getTimelinePrediction({
      start: startDate,
      end: endDate,
    });
    expect(results.length).toBe(37);
    expect(results[0].level).toBeCloseTo(-1.46903456, 3);
    const lastResult = results.pop();
    expect(lastResult?.level).toBeCloseTo(2.83490872, 3);
  });

  it("it predicts the tides in a timeline with time fidelity", () => {
    const results = createTidePredictor(mockConstituents).getTimelinePrediction({
      start: startDate,
      end: endDate,
      timeFidelity: 60,
    });
    expect(results.length).toBe(361);
    expect(results[0].level).toBeCloseTo(-1.46903456, 3);
    const lastResult = results.pop();
    expect(lastResult?.level).toBeCloseTo(2.83490872, 3);
  });

  it("it predicts the tidal extremes", () => {
    const results = createTidePredictor(mockConstituents).getExtremesPrediction({
      start: startDate,
      end: endDate,
    });
    expect(results[0].level).toBeCloseTo(-1.67283933, 4);
  });

  it("it predicts the tidal extremes with high fidelity", () => {
    const results = createTidePredictor(mockConstituents).getExtremesPrediction({
      start: startDate,
      end: endDate,
      timeFidelity: 60,
    });
    expect(results[0].level).toBeCloseTo(-1.67283933, 4);
  });

  it("it fetches a single water level", () => {
    const result = createTidePredictor(mockConstituents).getWaterLevelAtTime({
      time: startDate,
    });
    expect(result.level).toBeCloseTo(-1.46903456, 4);
  });

  it("it adds offset phases", () => {
    const results = createTidePredictor(mockConstituents, {
      offset: 3,
    }).getExtremesPrediction({ start: startDate, end: endDate });

    expect(results[0].level).toBeCloseTo(1.32716067, 4);
  });

  it("equivalent instants in different timezones yield identical extremes", () => {
    const predictor = createTidePredictor(mockConstituents);

    const utc = { start: new Date("2019-09-01T00:00:00Z"), end: new Date("2019-09-01T06:00:00Z") };
    const newYork = {
      start: new Date("2019-08-31T20:00:00-04:00"),
      end: new Date("2019-09-01T02:00:00-04:00"),
    };
    const tokyo = {
      start: new Date("2019-09-01T09:00:00+09:00"),
      end: new Date("2019-09-01T15:00:00+09:00"),
    };

    const baseline = predictor.getExtremesPrediction(utc);
    const ny = predictor.getExtremesPrediction(newYork);
    const jp = predictor.getExtremesPrediction(tokyo);

    [ny, jp].forEach((result) => {
      expect(result.length).toBe(baseline.length);
      result.forEach((extreme, index) => {
        expect(extreme.time.valueOf()).toBe(baseline[index].time.valueOf());
        expect(extreme.level).toBeCloseTo(baseline[index].level, 6);
      });
    });
  });
});
