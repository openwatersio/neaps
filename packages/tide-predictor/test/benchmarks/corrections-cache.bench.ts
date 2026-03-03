import { describe, bench } from "vitest";
import harmonics from "../../src/harmonics/index.js";
import { createCorrectionsCache } from "../../src/corrections-cache.js";
import mockConstituents from "../_mocks/constituents.js";

// Simulate the "many stations at one time" use case: predict water level at a
// single point in time for a large set of stations.
// Node corrections are purely time-dependent, so without a cache they're
// recomputed from scratch for every station on each call.

const STATION_COUNT = 500;
const time = new Date("2024-06-15T12:00:00Z");
const end = new Date(time.getTime() + 10 * 60 * 1000); // 10-min window for getWaterLevelAtTime

// Build a pool of mock stations with slightly varied amplitudes/phases
// to prevent any accidental short-circuit optimisation.
const stations = Array.from({ length: STATION_COUNT }, (_, i) => {
  const scale = 0.5 + (i % 10) * 0.1; // 0.5 – 1.4
  const phaseShift = (i % 37) * 5; // 0 – 180°
  return mockConstituents.map((c) => ({
    ...c,
    amplitude: c.amplitude * scale,
    phase: (c.phase + phaseShift) % 360,
  }));
});

describe("many-stations-single-time: getWaterLevelAtTime", () => {
  bench("without cache — corrections recomputed per station", () => {
    for (const constituents of stations) {
      void harmonics({ harmonicConstituents: constituents, offset: false })
        .setTimeSpan(time, end)
        .prediction()
        .getTimelinePrediction()[0];
    }
  });

  bench("with shared cache — corrections computed once", () => {
    const cache = createCorrectionsCache();
    for (const constituents of stations) {
      void harmonics({ harmonicConstituents: constituents, offset: false, cache })
        .setTimeSpan(time, end)
        .prediction()
        .getTimelinePrediction()[0];
    }
  });
});

// Iterate through a 24-hour period at 10-minute resolution across many stations:
// the inner scenario from the issue (times × stations loop).

const STEP_COUNT = 24 * 6; // 144 points over 24 hours, every 10 minutes
const times = Array.from({ length: STEP_COUNT }, (_, i) => {
  const t = new Date("2024-06-15T00:00:00Z");
  t.setUTCMinutes(i * 10);
  return t;
});

// Use a smaller station count here — the outer loop is over times×stations
const SMALL_COUNT = 50;
const smallStations = stations.slice(0, SMALL_COUNT);

describe("time-series × many-stations: getWaterLevelAtTime", () => {
  bench("without cache — corrections recomputed per (time, station)", () => {
    for (const t of times) {
      const e = new Date(t.getTime() + 10 * 60 * 1000);
      for (const constituents of smallStations) {
        void harmonics({ harmonicConstituents: constituents, offset: false })
          .setTimeSpan(t, e)
          .prediction()
          .getTimelinePrediction()[0];
      }
    }
  });

  bench("with shared cache — corrections shared across time steps and stations", () => {
    const cache = createCorrectionsCache();
    for (const t of times) {
      const e = new Date(t.getTime() + 10 * 60 * 1000);
      for (const constituents of smallStations) {
        void harmonics({ harmonicConstituents: constituents, offset: false, cache })
          .setTimeSpan(t, e)
          .prediction()
          .getTimelinePrediction()[0];
      }
    }
  });
});
