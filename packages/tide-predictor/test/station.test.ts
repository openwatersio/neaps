import { describe, test, expect } from "vitest";
import { stations } from "@neaps/tide-database";
import { useStation } from "../src/station.js";
import mockConstituents from "./_mocks/constituents.js";
import type { Station, StationPredictor } from "../src/station.js";

function findStation(query: string): StationPredictor {
  const found = stations.find((s) => s.id === query || s.source.id === query);
  if (!found) throw new Error(`Station not found: ${query}`);
  return useStation(found as Station, undefined, findStation);
}

const baseStation: Station = {
  id: "test/station",
  name: "Test Station",
  continent: "North America",
  country: "US",
  timezone: "America/New_York",
  disclaimers: "",
  latitude: 0,
  longitude: 0,
  source: { name: "test", id: "station", url: "" },
  datums: { MSL: 0, MLLW: -0.5, MHHW: 0.5 },
  chart_datum: "MLLW",
  type: "reference",
  harmonic_constituents: mockConstituents,
};

describe("useStation", () => {
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
      expect(iho.extremes.map((e) => e.level)).not.toEqual(schureman.extremes.map((e) => e.level));
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
      expect(iho.timeline.map((e) => e.level)).not.toEqual(schureman.timeline.map((e) => e.level));
    });

    test("getWaterLevelAtTime produces different results", () => {
      const options = { time: new Date("2025-12-19T00:30:00Z"), datum: "MLLW" };
      const [iho, schureman] = corrections.map((nodeCorrections) =>
        station.getWaterLevelAtTime({ ...options, nodeCorrections }),
      );
      expect(iho.level).not.toBe(schureman.level);
    });
  });

  describe("datum", () => {
    test("defaults to station's chart datum", () => {
      const noaa = findStation("noaa/8722274").getExtremesPrediction({
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
      const extremes = findStation("8722274").getExtremesPrediction({
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { MSL: _, ...datums } = baseStation.datums;
      const station = { ...baseStation, datums };
      expect(() => {
        useStation(station).getExtremesPrediction({
          start: new Date("2025-12-17T00:00:00Z"),
          end: new Date("2025-12-18T00:00:00Z"),
          datum: Object.keys(datums)[0],
        });
      }).toThrow(/missing MSL/);
    });

    test("does not apply datums when none available", () => {
      const stationData = stations.find(
        (s) => s.type === "reference" && Object.entries(s.datums).length === 0,
      );
      if (!stationData) expect.fail("No station without datums found");
      const station = useStation(stationData as Station);
      const extremes = station.getExtremesPrediction({
        start: new Date("2025-12-17T00:00:00Z"),
        end: new Date("2025-12-18T00:00:00Z"),
      });
      expect(extremes.datum).toBeUndefined();
      expect(extremes.extremes.length).toBeGreaterThan(0);
    });
  });

  describe("subordinate station", () => {
    test("throws when findStation is not provided", () => {
      const station: Station = {
        ...baseStation,
        type: "subordinate",
        offsets: { reference: "test/reference" },
      };
      expect(() => useStation(station)).toThrow(/findStation/);
    });

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
          expect(actual.time).toBeWithin(new Date(expected.t).valueOf(), 5 * 60 * 1000);
          expect(actual.level).toBeWithin(expected.v, 0.04);
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
        const highExtremes = extremes.filter((e) => e.high).map((e) => e.level);
        const lowExtremes = extremes.filter((e) => e.low).map((e) => e.level);

        expect(Math.max(...timelineLevels)).toBeLessThanOrEqual(Math.max(...highExtremes) + 0.01);
        expect(Math.min(...timelineLevels)).toBeGreaterThanOrEqual(Math.min(...lowExtremes) - 0.01);
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
        const refRange =
          Math.max(...refTimeline.map((p) => p.level)) -
          Math.min(...refTimeline.map((p) => p.level));
        const subRange =
          Math.max(...subTimeline.map((p) => p.level)) -
          Math.min(...subTimeline.map((p) => p.level));
        const rangeRatio = subRange / refRange;

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
          expect(subExtremes[i].level).toBeCloseTo(refExtremes[i].level, 2);
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
          expect(subExtremes[i].time.getTime()).toBe(refExtremes[i].time.getTime());
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

        expect(rmsError(subTimeline, refTimeline) / tidalRange(refTimeline)).toBeLessThan(0.1);
      });
    });
  });
});
