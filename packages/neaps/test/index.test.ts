import { stations } from "@neaps/tide-database";
import {
  getExtremesPrediction,
  nearestStation,
  findStation,
  useStation,
  getTimelinePrediction,
  getWaterLevelAtTime,
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
      timeFidelity: 60,
      datum: "MLLW" as const,
    };
    const newYork = {
      start: new Date("2025-12-17T19:00:00-05:00"),
      end: new Date("2025-12-18T19:00:00-05:00"),
      timeFidelity: 60,
      datum: "MLLW" as const,
    };
    const tokyo = {
      start: new Date("2025-12-18T09:00:00+09:00"),
      end: new Date("2025-12-19T09:00:00+09:00"),
      timeFidelity: 60,
      datum: "MLLW" as const,
    };

    const baseline = station.getExtremesPrediction(utc).extremes;
    const ny = station.getExtremesPrediction(newYork).extremes;
    const jp = station.getExtremesPrediction(tokyo).extremes;

    [ny, jp].forEach((result) => {
      expect(result.length).toBe(baseline.length);
      result.forEach((extreme, index) => {
        const base = baseline[index];
        expect(extreme.time.epochMilliseconds).toBe(base.time.epochMilliseconds);
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
    expect(extremes[0].time.epochMilliseconds).toEqual(
      new Date("2025-12-18T05:30:00.000Z").getTime(),
    );
    expect(extremes[0].level).toBeCloseTo(0.02, 2);
    expect(extremes[0].high).toBe(false);
    expect(extremes[0].low).toBe(true);
    expect(extremes[0].label).toBe("Low");
    expect(prediction.units).toBe("meters");
  });

  test("with units=feet", () => {
    const prediction = getExtremesPrediction({ ...options, units: "feet" });
    expect(prediction.units).toBe("feet");
    expect(prediction.extremes[0].level).toBeCloseTo(0.06, 2);
    expect(prediction.extremes[1].level).toBeCloseTo(3.01, 2);
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
    expect(prediction.time.epochMilliseconds).toEqual(
      new Date("2025-12-19T05:30:00.000Z").getTime(),
    );
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
    expect(prediction.level).toBeCloseTo(-1.44, 2);
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
      expect(predictions[0].time.epochMilliseconds).toEqual(
        new Date("2025-12-17T11:23:00.000Z").getTime(),
      );
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
          expect(actual.time.epochMilliseconds).toBeWithin(
            new Date(expected.t).getTime(),
            5 * 60 * 1000 /* min */,
          );
          expect(actual.level).toBeWithin(expected.v, 0.04 /* m */);
        });
      });
    });

    describe("getTimelinePrediction", () => {
      test("is not supported", () => {
        expect(() =>
          station.getTimelinePrediction({
            start: new Date("2025-12-19T00:00:00Z"),
            end: new Date("2025-12-19T01:00:00Z"),
          }),
        ).toThrow("Timeline predictions are not supported for subordinate stations");
      });
    });
    describe("getWaterLevelAtTime", () => {
      test("is not supported", () => {
        expect(() =>
          station.getWaterLevelAtTime({
            time: new Date("2025-12-19T00:00:00Z"),
          }),
        ).toThrow("Water level predictions are not supported for subordinate stations");
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
      expect(prediction.time.epochMilliseconds).toEqual(new Date("2025-12-19T00:30:00Z").getTime());
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

describe("datum", () => {
  test("defaults to MLLW datum", () => {
    const station = findStation("8722274");
    const extremes = station.getExtremesPrediction({
      start: new Date("2025-12-17T00:00:00Z"),
      end: new Date("2025-12-18T00:00:00Z"),
    });
    expect(extremes.datum).toBe("MLLW");
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
