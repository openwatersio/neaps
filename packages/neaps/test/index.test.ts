import { stations } from "@neaps/tide-database";
import {
  getExtremesPrediction,
  nearestStation,
  findStation,
  useStation,
  getTimelinePrediction,
  getWaterLevelAtTime,
  stationsNear,
} from "../src/index.js";
import { describe, test, expect } from "vitest";

describe("timezone independence", () => {
  const location = { lat: 26.772, lon: -80.05 };

  test("equivalent instants yield identical extremes", () => {
    const station = nearestStation(location);

    // Same instant range expressed in different offsets
    const utc = {
      start: new Date("2025-12-18T00:00:00Z"),
      end: new Date("2025-12-19T00:00:00Z"),
      datum: "MLLW" as const,
    };
    const newYork = {
      start: new Date("2025-12-17T19:00:00-05:00"),
      end: new Date("2025-12-18T19:00:00-05:00"),
      datum: "MLLW" as const,
    };
    const tokyo = {
      start: new Date("2025-12-18T09:00:00+09:00"),
      end: new Date("2025-12-19T09:00:00+09:00"),
      datum: "MLLW" as const,
    };

    const baseline = station.getExtremesPrediction(utc).extremes;
    const ny = station.getExtremesPrediction(newYork).extremes;
    const jp = station.getExtremesPrediction(tokyo).extremes;

    [ny, jp].forEach((result) => {
      expect(result.length).toBe(baseline.length);
      result.forEach((extreme, index) => {
        const base = baseline[index];
        expect(extreme.time.valueOf()).toBe(base.time.valueOf());
        expect(extreme.high).toBe(base.high);
        expect(extreme.low).toBe(base.low);
        expect(extreme.label).toBe(base.label);
        expect(extreme.level).toBeCloseTo(base.level, 6);
      });
    });
  });
});

describe("getExtremesPrediction", () => {
  const options = {
    lat: 26.772,
    lon: -80.05,
    start: new Date("2025-12-18T00:00:00-05:00"),
    end: new Date("2025-12-19T00:00:00-05:00"),
    timeFidelity: 60,
    datum: "MLLW",
  };

  test("gets extremes from nearest station", () => {
    const prediction = getExtremesPrediction(options);

    expect(prediction.station.id).toEqual("noaa/8722588");
    expect(prediction.datum).toBe("MLLW");

    const { extremes } = prediction;
    expect(extremes.length).toBe(4);
    expect(extremes[0].time).toEqual(new Date("2025-12-18T05:30:23.517Z"));
    expect(extremes[0].level).toBeCloseTo(0.02, 2);
    expect(extremes[0].high).toBe(false);
    expect(extremes[0].low).toBe(true);
    expect(extremes[0].label).toBe("Low");
    expect(prediction.units).toBe("meters");
  });

  test("with units=feet", () => {
    const prediction = getExtremesPrediction({ ...options, units: "feet" });
    expect(prediction.units).toBe("feet");
    expect(prediction.extremes[0].level).toBeCloseTo(0.07, 2);
    expect(prediction.extremes[1].level).toBeCloseTo(3.0, 2);
  });
});

describe("getTimelinePrediction", () => {
  test("gets timeline from nearest station", () => {
    const prediction = getTimelinePrediction({
      lat: 26.772,
      lon: -80.05,
      start: new Date("2025-12-19T00:00:00-05:00"),
      end: new Date("2025-12-19T01:00:00-05:00"),
    });

    expect(prediction.station.id).toEqual("noaa/8722588");
    expect(prediction.datum).toBe("MLLW");
    expect(prediction.units).toBe("meters");
    expect(prediction.timeline.length).toBe(7); // Every 10 minutes for 1 hour = 7 points
  });

  test("with units=feet", () => {
    const prediction = getTimelinePrediction({
      lat: 26.772,
      lon: -80.05,
      start: new Date("2025-12-19T00:00:00-05:00"),
      end: new Date("2025-12-19T01:00:00-05:00"),
      units: "feet",
    });
    expect(prediction.units).toBe("feet");
    expect(prediction.timeline[0].level).toBeCloseTo(0.24, 2);
  });
});

describe("getWaterLevelAtTime", () => {
  test("gets water level at specific time from nearest station", () => {
    const prediction = getWaterLevelAtTime({
      lat: 26.772,
      lon: -80.05,
      time: new Date("2025-12-19T00:30:00-05:00"),
      datum: "MSL",
    });

    expect(prediction.station.id).toEqual("noaa/8722588");
    expect(prediction.datum).toBe("MSL");
    expect(prediction.time).toEqual(new Date("2025-12-19T05:30:00.000Z"));
    expect(typeof prediction.level).toBe("number");
  });

  test("with units=feet", () => {
    const prediction = getWaterLevelAtTime({
      lat: 26.772,
      lon: -80.05,
      time: new Date("2025-12-19T00:30:00-05:00"),
      datum: "MSL",
      units: "feet",
    });
    expect(prediction.units).toBe("feet");
    expect(prediction.level).toBeCloseTo(-1.43, 2);
  });

  test("with unknown units", () => {
    expect(() =>
      getWaterLevelAtTime({
        lat: 26.772,
        lon: -80.05,
        time: new Date("2025-12-19T00:30:00-05:00"),
        // @ts-expect-error Testing unknown units
        units: "fathoms",
      }),
    ).toThrow("Unsupported units: fathoms");
  });
});

describe("for a specific station", () => {
  const station = nearestStation({ lat: 45.6, lon: -122.7 });

  describe("getExtremesPrediction", () => {
    test("can return extremes from station", () => {
      const station = nearestStation({ lat: 26.772, lon: -80.05 });

      const start = new Date("2025-12-17T00:00:00-05:00");
      const end = new Date("2025-12-18T05:00:00-05:00");

      const { extremes: predictions } = station.getExtremesPrediction({
        start,
        end,
        timeFidelity: 60,
        datum: "MLLW",
      });

      expect(predictions.length).toBe(4);
      expect(predictions[0].time).toEqual(new Date("2025-12-17T11:22:46.134Z"));
      expect(predictions[0].level).toBeCloseTo(0.9, 1);
      expect(predictions[0].high).toBe(true);
      expect(predictions[0].low).toBe(false);
      expect(predictions[0].label).toBe("High");
    });
  });

  describe("for a subordinate station", () => {
    const station = findStation("8724307");

    test("gets datums and harmonic_constituents from reference station", () => {
      expect(station.type).toBe("subordinate");
      const reference = findStation("8724580");

      expect(station.datums).toBeDefined();
      expect(station.datums).toEqual(reference.datums);
      expect(station.harmonic_constituents).toBeDefined();
      expect(station.harmonic_constituents).toEqual(reference.harmonic_constituents);
      expect(station.defaultDatum).toBe("MLLW");
    });

    describe("getExtremesPrediction", () => {
      test("matches NOAA extremes for subordinate station", () => {
        const start = new Date("2025-12-17T00:00:00Z");
        const end = new Date("2025-12-19T00:00:00Z");

        const prediction = station.getExtremesPrediction({
          start,
          end,
          timeFidelity: 60,
          datum: "MLLW",
        });

        // https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=8724307&format=json&product=predictions&units=metric&time_zone=gmt&begin_date=2025-12-17&end_date=2025-12-18&interval=hilo&datum=MLLW
        const noaa = [
          { t: "2025-12-17T02:55:00z", v: 1.128, type: "H" },
          { t: "2025-12-17T10:57:00z", v: -0.044, type: "L" },
          { t: "2025-12-17T16:48:00z", v: 0.658, type: "H" },
          { t: "2025-12-17T22:04:00z", v: 0.337, type: "L" },
          { t: "2025-12-18T03:33:00z", v: 1.148, type: "H" },
          { t: "2025-12-18T11:35:00z", v: -0.099, type: "L" },
          { t: "2025-12-18T17:25:00z", v: 0.64, type: "H" },
          { t: "2025-12-18T22:40:00z", v: 0.316, type: "L" },
        ];

        noaa.forEach((expected, index) => {
          const actual = prediction.extremes[index];
          expect(actual.time).toBeWithin(new Date(expected.t).valueOf(), 8 * 60 * 1000 /* min */);
          expect(actual.level).toBeWithin(expected.v, 0.04 /* m */);
        });
      });
    });

    describe("getTimelinePrediction", () => {
      test("returns interpolated timeline", () => {
        const prediction = station.getTimelinePrediction({
          start: new Date("2025-12-17T00:00:00Z"),
          end: new Date("2025-12-17T01:00:00Z"),
          datum: "MLLW",
        });

        expect(prediction.timeline.length).toBe(7); // 10-min intervals for 1 hour
        expect(prediction.datum).toBe("MLLW");
        expect(prediction.units).toBe("meters");
        prediction.timeline.forEach((point) => {
          expect(typeof point.level).toBe("number");
          expect(point.level).not.toBeNaN();
        });
      });

      test("timeline levels are consistent with extremes", () => {
        const start = new Date("2025-12-17T00:00:00Z");
        const end = new Date("2025-12-18T00:00:00Z");

        const { extremes } = station.getExtremesPrediction({ start, end, datum: "MLLW" });
        const { timeline } = station.getTimelinePrediction({ start, end, datum: "MLLW" });

        const timelineLevels = timeline.map((p) => p.level);
        const maxTimeline = Math.max(...timelineLevels);
        const minTimeline = Math.min(...timelineLevels);

        // Timeline max/min should be close to (but not exceed) the extremes
        const highExtremes = extremes.filter((e) => e.high).map((e) => e.level);
        const lowExtremes = extremes.filter((e) => e.low).map((e) => e.level);

        expect(maxTimeline).toBeLessThanOrEqual(Math.max(...highExtremes) + 0.01);
        expect(minTimeline).toBeGreaterThanOrEqual(Math.min(...lowExtremes) - 0.01);
      });

      test("tidal range is scaled by height offset ratios", () => {
        const start = new Date("2025-01-15T00:00:00Z");
        const end = new Date("2025-01-18T00:00:00Z");

        const reference = findStation("8724580");
        const { timeline: refTimeline } = reference.getTimelinePrediction({
          start,
          end,
          datum: "MLLW",
        });
        const { timeline: subTimeline } = station.getTimelinePrediction({
          start,
          end,
          datum: "MLLW",
        });

        // Height ratio offsets: high=2.13, low=1.83
        // Subordinate levels should be roughly in the range [1.83x, 2.13x] of reference
        // but time-shifted, so we compare overall scale rather than point-by-point.
        const refRange =
          Math.max(...refTimeline.map((p) => p.level)) -
          Math.min(...refTimeline.map((p) => p.level));
        const subRange =
          Math.max(...subTimeline.map((p) => p.level)) -
          Math.min(...subTimeline.map((p) => p.level));
        const rangeRatio = subRange / refRange;

        // Range ratio should be between the low and high height ratios
        expect(rangeRatio).toBeGreaterThan(1.83);
        expect(rangeRatio).toBeLessThan(2.13);
      });
    });

    describe("getWaterLevelAtTime", () => {
      test("returns water level at specific time", () => {
        const prediction = station.getWaterLevelAtTime({
          time: new Date("2025-12-17T12:00:00Z"),
          datum: "MLLW",
        });

        expect(prediction.time).toEqual(new Date("2025-12-17T12:00:00Z"));
        expect(prediction.datum).toBe("MLLW");
        expect(typeof prediction.level).toBe("number");
        expect(prediction.level).not.toBeNaN();
      });
    });
  });

  describe("subordinate vs reference curve comparison", () => {
    const start = new Date("2025-01-15T00:00:00Z");
    const end = new Date("2025-01-18T00:00:00Z");

    function rmsError(a: { level: number }[], b: { level: number }[]): number {
      let sumSq = 0;
      for (let i = 0; i < a.length; i++) {
        const diff = a[i].level - b[i].level;
        sumSq += diff * diff;
      }
      return Math.sqrt(sumSq / a.length);
    }

    function tidalRange(timeline: { level: number }[]): number {
      const levels = timeline.map((p) => p.level);
      return Math.max(...levels) - Math.min(...levels);
    }

    describe("identity offsets (Cabrillo Beach: height=1.0/1.0, time=0/0)", () => {
      const sub = findStation("9410650");
      const ref = findStation(sub.offsets!.reference!);

      test("timeline matches reference curve", () => {
        const { timeline: refTimeline } = ref.getTimelinePrediction({ start, end });
        const { timeline: subTimeline } = sub.getTimelinePrediction({ start, end });

        expect(subTimeline.length).toBe(refTimeline.length);
        expect(rmsError(subTimeline, refTimeline) / tidalRange(refTimeline)).toBeLessThan(0.05);
      });

      test("extremes match reference", () => {
        const { extremes: refExtremes } = ref.getExtremesPrediction({ start, end });
        const { extremes: subExtremes } = sub.getExtremesPrediction({ start, end });

        expect(subExtremes.length).toBe(refExtremes.length);
        for (let i = 0; i < refExtremes.length; i++) {
          expect(subExtremes[i].level).toBeCloseTo(refExtremes[i].level, 2);
          expect(subExtremes[i].high).toBe(refExtremes[i].high);
        }
      });
    });

    describe("time-only offsets (Hanauma Bay: height=1.0/1.0, time=-59/-45 min)", () => {
      const sub = findStation("1612301");
      const ref = findStation(sub.offsets!.reference!);

      test("timeline has same tidal range as reference", () => {
        const { timeline: refTimeline } = ref.getTimelinePrediction({ start, end });
        const { timeline: subTimeline } = sub.getTimelinePrediction({ start, end });

        // Same height ratios (1.0), so tidal ranges should be nearly equal
        const refRange = tidalRange(refTimeline);
        const subRange = tidalRange(subTimeline);
        expect(subRange / refRange).toBeGreaterThan(0.95);
        expect(subRange / refRange).toBeLessThan(1.05);
      });

      test("extremes are time-shifted but same height as reference", () => {
        const { extremes: refExtremes } = ref.getExtremesPrediction({ start, end });
        const { extremes: subExtremes } = sub.getExtremesPrediction({ start, end });

        expect(subExtremes.length).toBe(refExtremes.length);
        for (let i = 0; i < refExtremes.length; i++) {
          // Heights should match (ratio=1.0)
          expect(subExtremes[i].level).toBeCloseTo(refExtremes[i].level, 2);
          // Times should differ by the offset (high=-59min, low=-45min)
          const timeDiffMin =
            (subExtremes[i].time.getTime() - refExtremes[i].time.getTime()) / 60000;
          const expectedOffset = subExtremes[i].high ? -59 : -45;
          expect(timeDiffMin).toBeCloseTo(expectedOffset, 0);
        }
      });
    });

    describe("height-only offsets (Great Diamond Island: height=1.0/1.03, time=0/0)", () => {
      const sub = findStation("8417988");
      const ref = findStation(sub.offsets!.reference!);

      test("extremes occur at same times as reference", () => {
        const { extremes: refExtremes } = ref.getExtremesPrediction({ start, end });
        const { extremes: subExtremes } = sub.getExtremesPrediction({ start, end });

        expect(subExtremes.length).toBe(refExtremes.length);
        for (let i = 0; i < refExtremes.length; i++) {
          // Times should be identical (time offset = 0)
          expect(subExtremes[i].time.getTime()).toBe(refExtremes[i].time.getTime());
          // Heights: high should match (1.0), low should be scaled by 1.03
          if (subExtremes[i].high) {
            expect(subExtremes[i].level).toBeCloseTo(refExtremes[i].level, 2);
          } else {
            expect(subExtremes[i].level).toBeCloseTo(refExtremes[i].level * 1.03, 2);
          }
        }
      });

      test("timeline closely follows reference curve", () => {
        const { timeline: refTimeline } = ref.getTimelinePrediction({ start, end });
        const { timeline: subTimeline } = sub.getTimelinePrediction({ start, end });

        // With only a 3% low ratio difference and no time shift, curves should be close
        expect(rmsError(subTimeline, refTimeline) / tidalRange(refTimeline)).toBeLessThan(0.1);
      });
    });
  });

  describe("getTimelinePrediction", () => {
    test("gets timeline", () => {
      const prediction = station.getTimelinePrediction({
        start: new Date("2025-12-19T00:00:00Z"),
        end: new Date("2025-12-19T01:00:00Z"),
      });
      // Every 10 minutes for 1 hour = 7 points
      expect(prediction.timeline.length).toBe(7);
      expect(prediction.datum).toBe("MLLW");
    });
  });

  describe("getWaterLevelAtTime", () => {
    test("gets water level at specific time", () => {
      const prediction = station.getWaterLevelAtTime({
        time: new Date("2025-12-19T00:30:00Z"),
      });
      expect(prediction.time).toEqual(new Date("2025-12-19T00:30:00Z"));
      expect(prediction.datum).toBe("MLLW");
      expect(typeof prediction.level).toBe("number");
    });
  });
});

describe("nearestStation", () => {
  [
    { lat: 26.772, lon: -80.052 },
    { lat: 26.772, lng: -80.052 },
    { latitude: 26.772, longitude: -80.052 },
  ].forEach((position) => {
    test(`finds station with ${Object.keys(position).join("/")}`, () => {
      const station = nearestStation(position);
      expect(station.source.id).toBe("8722588");
    });
  });

  test("raises error when no stations found", () => {
    expect(() => nearestStation({ lat: 0, lon: 0, maxDistance: 1 })).toThrow(
      'No stations found with options: {"lat":0,"lon":0,"maxDistance":1}',
    );
  });
});

describe("stationsNear", () => {
  test("finds nearby stations", () => {
    const nearby = stationsNear({ lat: 26.772, lon: -80.05, maxResults: 3 });
    expect(nearby.length).toBe(3);
  });
});

describe("findStation", () => {
  test("raises error for unknown station", () => {
    expect(() => findStation("unknown")).toThrow("Station not found: unknown");
  });

  test("finds station by id", () => {
    const station = findStation("noaa/8443970");
    expect(station).toBeDefined();
    expect(station.source.id).toBe("8443970");
    expect(station.getExtremesPrediction).toBeDefined();
  });

  test("finds station by source id", () => {
    const station = findStation("8443970");
    expect(station).toBeDefined();
    expect(station.id).toBe("noaa/8443970");
    expect(station.getExtremesPrediction).toBeDefined();
  });
});

describe("nodeCorrections", () => {
  const station = findStation("noaa/8722588");
  const corrections = ["iho", "schureman"] as const;

  test("getExtremesPrediction produces different results", () => {
    const options = {
      start: new Date("2025-12-17T00:00:00Z"),
      end: new Date("2025-12-18T00:00:00Z"),
      timeFidelity: 60,
      datum: "MLLW",
    };

    const [iho, schureman] = corrections.map((nodeCorrections) =>
      station.getExtremesPrediction({ ...options, nodeCorrections }),
    );

    expect(iho.extremes.length).toBeGreaterThan(0);
    expect(schureman.extremes.length).toBeGreaterThan(0);

    const ihoLevels = iho.extremes.map((e) => e.level);
    const schuremanLevels = schureman.extremes.map((e) => e.level);
    expect(ihoLevels).not.toEqual(schuremanLevels);
  });

  test("getTimelinePrediction produces different results", () => {
    const options = {
      start: new Date("2025-12-19T00:00:00Z"),
      end: new Date("2025-12-19T01:00:00Z"),
    };

    const [iho, schureman] = corrections.map((nodeCorrections) =>
      station.getTimelinePrediction({ ...options, nodeCorrections }),
    );

    expect(iho.timeline.length).toBeGreaterThan(0);
    expect(schureman.timeline.length).toBeGreaterThan(0);

    const ihoLevels = iho.timeline.map((e) => e.level);
    const schuremanLevels = schureman.timeline.map((e) => e.level);
    expect(ihoLevels).not.toEqual(schuremanLevels);
  });

  test("getWaterLevelAtTime produces different results", () => {
    const options = {
      time: new Date("2025-12-19T00:30:00Z"),
      datum: "MLLW",
    };

    const [iho, schureman] = corrections.map((nodeCorrections) =>
      station.getWaterLevelAtTime({ ...options, nodeCorrections }),
    );

    expect(iho.level).not.toBe(schureman.level);
  });
});

describe("datum", () => {
  test("defaults to station's chart datum", () => {
    const station = findStation("noaa/8722274");
    const noaa = station.getExtremesPrediction({
      start: new Date("2025-12-17T00:00:00Z"),
      end: new Date("2025-12-18T00:00:00Z"),
    });
    expect(noaa.datum).toBe("MLLW");

    const aus = findStation("ticon/fremantle-62230-aus-bom").getExtremesPrediction({
      start: new Date("2025-12-17T00:00:00Z"),
      end: new Date("2025-12-18T00:00:00Z"),
    });
    expect(aus.datum).toBe("LAT");
  });

  test("accepts datum option", () => {
    const station = findStation("8722274");
    const extremes = station.getExtremesPrediction({
      start: new Date("2025-12-17T00:00:00Z"),
      end: new Date("2025-12-18T00:00:00Z"),
      datum: "NAVD88",
    });
    expect(extremes.datum).toBe("NAVD88");
  });

  test("throws error for unavailable datum", () => {
    const station = findStation("noaa/8443970");
    expect(() => {
      station.getExtremesPrediction({
        start: new Date("2025-12-17T00:00:00Z"),
        end: new Date("2025-12-18T00:00:00Z"),
        datum: "UNKNOWN_DATUM",
      });
    }).toThrow(/missing UNKNOWN_DATUM/);
  });

  test("throws error when missing MSL datum", () => {
    // Find station without MSL but with other datums
    const station = stations.find(
      (s) => s.type === "reference" && !("MSL" in s.datums) && Object.keys(s.datums).length > 0,
    );
    if (!station) expect.fail("No station without MSL datum found");
    expect(() => {
      useStation(station).getExtremesPrediction({
        start: new Date("2025-12-17T00:00:00Z"),
        end: new Date("2025-12-18T00:00:00Z"),
        datum: Object.keys(station.datums)[0],
      });
    }).toThrow(/missing MSL/);
  });

  test("does not apply datums when non available", () => {
    // Find a station with no datums
    const station = stations.find(
      (s) => s.type === "reference" && Object.entries(s.datums).length === 0,
    );
    if (!station) expect.fail("No station without datums found");
    const extremes = useStation(station).getExtremesPrediction({
      start: new Date("2025-12-17T00:00:00Z"),
      end: new Date("2025-12-18T00:00:00Z"),
    });

    expect(extremes.datum).toBeUndefined();
    expect(extremes.extremes.length).toBeGreaterThan(0);
  });
});
