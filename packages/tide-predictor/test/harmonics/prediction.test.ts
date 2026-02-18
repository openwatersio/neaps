import { describe, it, expect } from "vitest";
import harmonics, { ExtremeOffsets, getTimeline } from "../../src/harmonics/index.js";
import predictionFactory from "../../src/harmonics/prediction.js";
import defaultConstituentModels from "../../src/constituents/index.js";
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
    expect(results[0].level).toBeCloseTo(-1.46903456, 3);
    expect(lastResult?.level).toBeCloseTo(2.83490872, 3);
  });

  it("it finds high and low tides", () => {
    const results = harmonics({
      harmonicConstituents: mockHarmonicConstituents,
      offset: false,
    })
      .setTimeSpan(startDate, extremesEndDate)
      .prediction()
      .getExtremesPrediction();
    expect(results[0].level).toBeCloseTo(-1.67283933, 4);

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
    expect(results[0].level).toBeCloseTo(-1.67283933, 4);
  });
});

describe("unknown constituent handling", () => {
  it("silently skips unknown constituents in prepare()", () => {
    // Call predictionFactory directly with a constituent that has no model,
    // bypassing harmonicsFactory's filtering. This exercises the
    // `if (!model) return` guards in prepare() (lines 224, 237).
    const timeline = getTimeline(startDate, endDate);
    const constituents = [
      {
        name: "FAKE_CONSTITUENT",
        amplitude: 1.0,
        phase: 0,
        speed: 15.0,
      },
    ];

    const prediction = predictionFactory({
      timeline,
      constituents,
      constituentModels: defaultConstituentModels,
      start: startDate,
    });

    // Should not throw — unknown constituent is silently skipped in prepare()
    expect(() => prediction.getTimelinePrediction()).not.toThrow();
    expect(() => prediction.getExtremesPrediction()).not.toThrow();
  });
});

describe("prominence filtering", () => {
  it("filters spurious extremes from low-amplitude stations", () => {
    // Simulate a Baltic-like station dominated by seasonal constituents
    // with negligible semi-diurnal signal (like Vahemadal, Estonia)
    const lowAmpConstituents = [
      { name: "SA", amplitude: 0.06, phase: 277 },
      { name: "SSA", amplitude: 0.16, phase: 190 },
      { name: "M2", amplitude: 0.006, phase: 223 },
      { name: "K1", amplitude: 0.014, phase: 342 },
      { name: "O1", amplitude: 0.015, phase: 289 },
    ];

    const results = harmonics({
      harmonicConstituents: lowAmpConstituents,
      offset: false,
    })
      .setTimeSpan(startDate, extremesEndDate)
      .prediction()
      .getExtremesPrediction();

    // Without filtering this would produce ~12 spurious extremes in 2 days.
    // With prominence filtering, only significant level changes are kept.
    expect(results.length).toBeLessThanOrEqual(6);

    // All remaining extremes should have meaningful level differences
    for (let i = 0; i < results.length - 1; i++) {
      const diff = Math.abs(results[i + 1].level - results[i].level);
      expect(diff).toBeGreaterThan(0.004); // > 4mm
    }
  });

  it("preserves all extremes for normal tidal stations", () => {
    // The mock constituents have large amplitudes (M2: 1.61m, K1: 1.2m)
    // so no extremes should be filtered
    const results = harmonics({
      harmonicConstituents: mockHarmonicConstituents,
      offset: false,
    })
      .setTimeSpan(startDate, extremesEndDate)
      .prediction()
      .getExtremesPrediction();

    // 2 days should produce ~8 extremes for a mixed semidiurnal signal
    expect(results.length).toBeGreaterThanOrEqual(7);
    expect(results.length).toBeLessThanOrEqual(9);
    expect(results[0].level).toBeCloseTo(-1.67283933, 4);
  });
});

describe("extremes edge cases", () => {
  it("returns empty for zero-amplitude constituents", () => {
    const timeline = getTimeline(startDate, endDate);
    const constituents = [{ name: "M2", amplitude: 0, phase: 0 }];
    const prediction = predictionFactory({
      timeline,
      constituents,
      constituentModels: defaultConstituentModels,
      start: startDate,
    });
    expect(prediction.getExtremesPrediction()).toEqual([]);
  });

  it("returns empty when only Z0 offset is present", () => {
    // Z0 has speed=0, so maxSpeed=0 → no extremes
    const timeline = getTimeline(startDate, endDate);
    const constituents = [{ name: "Z0", amplitude: 1.5, phase: 0 }];
    const prediction = predictionFactory({
      timeline,
      constituents,
      constituentModels: defaultConstituentModels,
      start: startDate,
    });
    expect(prediction.getExtremesPrediction()).toEqual([]);
  });

  it("produces identical results regardless of timeFidelity", () => {
    const results10min = harmonics({
      harmonicConstituents: mockHarmonicConstituents,
      offset: false,
    })
      .setTimeSpan(startDate, extremesEndDate)
      .prediction({ timeFidelity: 600 })
      .getExtremesPrediction();

    const results1min = harmonics({
      harmonicConstituents: mockHarmonicConstituents,
      offset: false,
    })
      .setTimeSpan(startDate, extremesEndDate)
      .prediction({ timeFidelity: 60 })
      .getExtremesPrediction();

    expect(results10min.length).toBe(results1min.length);
    results10min.forEach((extreme, i) => {
      expect(extreme.time.getTime()).toBe(results1min[i].time.getTime());
      expect(extreme.level).toBe(results1min[i].level);
      expect(extreme.high).toBe(results1min[i].high);
    });
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
        expect(offsetResult.time.getTime()).toBe(
          regularResults[index].time.getTime() + offsets.time!.low! * 60 * 1000,
        );
      }
      if (offsetResult.high) {
        expect(offsetResult.level).toBeCloseTo(
          regularResults[index].level * offsets.height!.high!,
          4,
        );

        expect(offsetResult.time.getTime()).toBe(
          regularResults[index].time.getTime() + offsets.time!.high! * 60 * 1000,
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
        expect(offsetResult.time.getTime()).toBe(
          regularResults[index].time.getTime() + offsets.time!.low! * 60 * 1000,
        );
      }
      if (offsetResult.high) {
        expect(offsetResult.level).toBeCloseTo(
          regularResults[index].level + offsets.height!.high!,
          4,
        );

        expect(offsetResult.time.getTime()).toBe(
          regularResults[index].time.getTime() + offsets.time!.high! * 60 * 1000,
        );
      }
    });
  });
});
