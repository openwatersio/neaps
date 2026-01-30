import { describe, it, expect } from "vitest";
import harmonics, { ExtremeOffsets } from "../../src/harmonics/index.js";
import mockHarmonicConstituents from "../_mocks/constituents.js";

const startDate = new Date("2019-09-01T00:00:00Z");
const endDate = new Date("2019-09-01T06:00:00Z");
const extremesEndDate = new Date("2019-09-03T00:00:00Z");

const setUpPrediction = () => {
  const harmonic = harmonics({
    harmonicConstituents: mockHarmonicConstituents,
    offset: false,
  });
  harmonic.setTimeSpan(startDate, endDate);
  return harmonic.prediction();
};

describe("harmonic prediction", () => {
  it("it creates a timeline prediction", () => {
    const testPrediction = setUpPrediction();
    const results = testPrediction.getTimelinePrediction();
    const lastResult = results.pop();
    expect(results[0].level).toBeCloseTo(-1.347125, 3);
    expect(lastResult?.level).toBeCloseTo(2.85263589, 3);
  });

  it("it finds high and low tides", () => {
    const results = harmonics({
      harmonicConstituents: mockHarmonicConstituents,
      offset: false,
    })
      .setTimeSpan(startDate, extremesEndDate)
      .prediction()
      .getExtremesPrediction();
    expect(results[0].level).toBeCloseTo(-1.5650332, 4);

    const customLabels = {
      high: "Super high",
      low: "Wayyy low",
    };

    const labelResults = harmonics({
      harmonicConstituents: mockHarmonicConstituents,
      offset: false,
    })
      .setTimeSpan(startDate, extremesEndDate)
      .prediction()
      .getExtremesPrediction({ labels: customLabels });
    expect(labelResults[0].label).toBe(customLabels.low);
  });

  it("it finds high and low tides with high fidelity", () => {
    const results = harmonics({
      harmonicConstituents: mockHarmonicConstituents,
      offset: false,
    })
      .setTimeSpan(startDate, extremesEndDate)
      .prediction({ timeFidelity: 60 })
      .getExtremesPrediction();
    expect(results[0].level).toBeCloseTo(-1.5653894, 4);
  });
});

describe("Secondary stations", () => {
  const regularResults = harmonics({
    harmonicConstituents: mockHarmonicConstituents,
    offset: false,
  })
    .setTimeSpan(startDate, extremesEndDate)
    .prediction()
    .getExtremesPrediction();

  it("it can add ratio offsets to secondary stations", () => {
    const offsets: ExtremeOffsets = {
      height: {
        type: "ratio",
        high: 1.1,
        low: 1.2,
      },
      time: {
        high: 1,
        low: 2,
      },
    };

    const offsetResults = harmonics({
      harmonicConstituents: mockHarmonicConstituents,
      offset: false,
    })
      .setTimeSpan(startDate, extremesEndDate)
      .prediction()
      .getExtremesPrediction({ offsets });

    offsetResults.forEach((offsetResult, index) => {
      if (offsetResult.low) {
        expect(offsetResult.level).toBeCloseTo(
          regularResults[index].level * offsets.height!.low!,
          4,
        );
        expect(offsetResult.time.epochMilliseconds).toBe(
          regularResults[index].time.epochMilliseconds + offsets.time!.low! * 60 * 1000,
        );
      }
      if (offsetResult.high) {
        expect(offsetResult.level).toBeCloseTo(
          regularResults[index].level * offsets.height!.high!,
          4,
        );

        expect(offsetResult.time.epochMilliseconds).toBe(
          regularResults[index].time.epochMilliseconds + offsets.time!.high! * 60 * 1000,
        );
      }
    });
  });
  it("it can add fixed offsets to secondary stations", () => {
    const offsets: ExtremeOffsets = {
      height: {
        type: "fixed",
        high: 1.1,
        low: 1.2,
      },
      time: {
        high: 1,
        low: 2,
      },
    };

    const offsetResults = harmonics({
      harmonicConstituents: mockHarmonicConstituents,
      offset: false,
    })
      .setTimeSpan(startDate, extremesEndDate)
      .prediction()
      .getExtremesPrediction({ offsets });

    offsetResults.forEach((offsetResult, index) => {
      if (offsetResult.low) {
        expect(offsetResult.level).toBeCloseTo(
          regularResults[index].level + offsets.height!.low!,
          4,
        );
        expect(offsetResult.time.epochMilliseconds).toBe(
          regularResults[index].time.epochMilliseconds + offsets.time!.low! * 60 * 1000,
        );
      }
      if (offsetResult.high) {
        expect(offsetResult.level).toBeCloseTo(
          regularResults[index].level + offsets.height!.high!,
          4,
        );

        expect(offsetResult.time.epochMilliseconds).toBe(
          regularResults[index].time.epochMilliseconds + offsets.time!.high! * 60 * 1000,
        );
      }
    });
  });
});
