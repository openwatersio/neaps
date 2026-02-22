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

  it("generates subordinate timeline with ratio offsets", () => {
    const offsets: ExtremeOffsets = {
      height: { type: "ratio", high: 1.1, low: 0.9 },
      time: { high: 30, low: 15 },
    };

    const prediction = harmonics({
      harmonicConstituents: mockHarmonicConstituents,
      offset: false,
    })
      .setTimeSpan(startDate, extremesEndDate)
      .prediction();

    const refTimeline = prediction.getTimelinePrediction();
    const subTimeline = prediction.getTimelinePrediction({ offsets });

    expect(subTimeline.length).toBe(refTimeline.length);
    // Every point should have a finite level
    for (const point of subTimeline) {
      expect(Number.isFinite(point.level)).toBe(true);
    }
  });

  it("generates subordinate timeline with fixed offsets", () => {
    const offsets: ExtremeOffsets = {
      height: { type: "fixed", high: 0.5, low: -0.3 },
      time: { high: 10, low: -10 },
    };

    const subTimeline = harmonics({
      harmonicConstituents: mockHarmonicConstituents,
      offset: false,
    })
      .setTimeSpan(startDate, extremesEndDate)
      .prediction()
      .getTimelinePrediction({ offsets });

    expect(subTimeline.length).toBeGreaterThan(0);
    for (const point of subTimeline) {
      expect(Number.isFinite(point.level)).toBe(true);
    }
  });

  it("subordinate timeline with identity offsets matches reference", () => {
    const offsets: ExtremeOffsets = {
      height: { type: "ratio", high: 1, low: 1 },
      time: { high: 0, low: 0 },
    };

    const prediction = harmonics({
      harmonicConstituents: mockHarmonicConstituents,
      offset: false,
    })
      .setTimeSpan(startDate, extremesEndDate)
      .prediction();

    const refTimeline = prediction.getTimelinePrediction();
    const subTimeline = prediction.getTimelinePrediction({ offsets });

    // With identity offsets, subordinate should exactly match reference
    expect(subTimeline.length).toBe(refTimeline.length);
    for (let i = 0; i < refTimeline.length; i++) {
      expect(subTimeline[i].time.getTime()).toBe(refTimeline[i].time.getTime());
      expect(subTimeline[i].level).toBe(refTimeline[i].level);
    }
  });

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

  it("uniform ratio with zero time offsets scales every point equally", () => {
    const offsets: ExtremeOffsets = {
      height: { type: "ratio", high: 2, low: 2 },
      time: { high: 0, low: 0 },
    };

    const prediction = harmonics({
      harmonicConstituents: mockHarmonicConstituents,
      offset: false,
    })
      .setTimeSpan(startDate, extremesEndDate)
      .prediction();

    const refTimeline = prediction.getTimelinePrediction();
    const subTimeline = prediction.getTimelinePrediction({ offsets });

    expect(subTimeline.length).toBe(refTimeline.length);
    for (let i = 0; i < refTimeline.length; i++) {
      expect(subTimeline[i].time.getTime()).toBe(refTimeline[i].time.getTime());
      expect(subTimeline[i].level).toBeCloseTo(refTimeline[i].level * 2, 5);
    }
  });

  it("uniform fixed offset with zero time offsets shifts every point equally", () => {
    const offsets: ExtremeOffsets = {
      height: { type: "fixed", high: 0.5, low: 0.5 },
      time: { high: 0, low: 0 },
    };

    const prediction = harmonics({
      harmonicConstituents: mockHarmonicConstituents,
      offset: false,
    })
      .setTimeSpan(startDate, extremesEndDate)
      .prediction();

    const refTimeline = prediction.getTimelinePrediction();
    const subTimeline = prediction.getTimelinePrediction({ offsets });

    expect(subTimeline.length).toBe(refTimeline.length);
    for (let i = 0; i < refTimeline.length; i++) {
      expect(subTimeline[i].time.getTime()).toBe(refTimeline[i].time.getTime());
      expect(subTimeline[i].level).toBeCloseTo(refTimeline[i].level + 0.5, 5);
    }
  });

  it("non-uniform ratio with zero time offsets adjusts extremes correctly", () => {
    const offsets: ExtremeOffsets = {
      height: { type: "ratio", high: 1.5, low: 0.8 },
      time: { high: 0, low: 0 },
    };

    const prediction = harmonics({
      harmonicConstituents: mockHarmonicConstituents,
      offset: false,
    })
      .setTimeSpan(startDate, extremesEndDate)
      .prediction();

    const refTimeline = prediction.getTimelinePrediction();
    const subTimeline = prediction.getTimelinePrediction({ offsets });

    const refExtremes = prediction.getExtremesPrediction();
    const subExtremes = prediction.getExtremesPrediction({ offsets });

    // Timestamps should match since time offsets are zero
    expect(subTimeline.length).toBe(refTimeline.length);
    for (let i = 0; i < refTimeline.length; i++) {
      expect(subTimeline[i].time.getTime()).toBe(refTimeline[i].time.getTime());
    }

    // Extremes should be scaled by the correct per-type ratio
    for (let i = 0; i < refExtremes.length; i++) {
      const ratio = refExtremes[i].high ? 1.5 : 0.8;
      expect(subExtremes[i].level).toBeCloseTo(refExtremes[i].level * ratio, 4);
    }

    // All subordinate levels should remain finite
    for (const point of subTimeline) {
      expect(Number.isFinite(point.level)).toBe(true);
    }
  });

  it("non-uniform fixed offset with zero time offsets adjusts extremes correctly", () => {
    const offsets: ExtremeOffsets = {
      height: { type: "fixed", high: 0.3, low: -0.2 },
      time: { high: 0, low: 0 },
    };

    const prediction = harmonics({
      harmonicConstituents: mockHarmonicConstituents,
      offset: false,
    })
      .setTimeSpan(startDate, extremesEndDate)
      .prediction();

    const refTimeline = prediction.getTimelinePrediction();
    const subTimeline = prediction.getTimelinePrediction({ offsets });

    const refExtremes = prediction.getExtremesPrediction();
    const subExtremes = prediction.getExtremesPrediction({ offsets });

    // Timestamps should match since time offsets are zero
    expect(subTimeline.length).toBe(refTimeline.length);
    for (let i = 0; i < refTimeline.length; i++) {
      expect(subTimeline[i].time.getTime()).toBe(refTimeline[i].time.getTime());
    }

    // Extremes should be shifted by the correct per-type offset
    for (let i = 0; i < refExtremes.length; i++) {
      const adj = refExtremes[i].high ? 0.3 : -0.2;
      expect(subExtremes[i].level).toBeCloseTo(refExtremes[i].level + adj, 4);
    }

    // All subordinate levels should remain finite
    for (const point of subTimeline) {
      expect(Number.isFinite(point.level)).toBe(true);
    }
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
