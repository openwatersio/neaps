import { findStation } from "../src/index.js";
import { describe, it, expect } from "vitest";

/**
 * Snapshot tests for a curated sample of stations covering all tidal regimes,
 * amplitude ranges, data sources, and geographies. These catch regressions
 * when model changes (constituents, node corrections, algorithm) affect
 * real-world predictions.
 *
 * Update snapshots with: npx vitest run packages/neaps/test/snapshots.test.ts --update
 */

const STATIONS = [
  "noaa/8410140", // Eastport, ME — semidiurnal, large range
  "ticon/immingham-imm-gbr-cmems", // Immingham, UK — semidiurnal, North Sea
  "noaa/9414290", // San Francisco — mixed semidiurnal
  "ticon/cabo_san_lucas-034-mex-uhslc_fd", // Cabo San Lucas — mixed semidiurnal
  "noaa/1612340", // Honolulu — mixed semidiurnal, Pacific
  "noaa/8723970", // Vaca Key, FL — mixed diurnal, Gulf
  "noaa/6835001", // Jakarta — diurnal, Southeast Asia
  "noaa/8728853", // White City, FL — diurnal, very high form number
  "noaa/8518750", // The Battery, NYC — US East Coast
  "ticon/sydney_fort_denison-60370-aus-bom", // Sydney — Southern hemisphere
  "ticon/hong_kong-329-hkg-uhslc_fd", // Hong Kong — China Sea
  "ticon/buenos_aires-285a-arg-uhslc_rq", // Buenos Aires — South America
  "noaa/8771450", // Galveston, TX — US Gulf Coast
  "noaa/9751364", // Christiansted, USVI — Caribbean
  "noaa/9451600", // Sitka, AK — high latitude
  "noaa/1610367", // Nonopapa, Niihau Is. — subordinate station
  "noaa/9447130", // Seattle, WA — Pacific Northwest
  "ticon/vancouver_bc-7735-can-meds", // Vancouver — Pacific Canada
];

const start = new Date("2025-01-15T00:00:00Z");
const end = new Date("2025-01-18T00:00:00Z");

describe("prediction snapshots", () => {
  for (const id of STATIONS) {
    it(id, () => {
      const station = findStation(id);
      const { extremes, datum } = station.getExtremesPrediction({ start, end });

      expect({
        name: station.name,
        datum,
        extremes: extremes.map((e) => ({
          time: e.time.toISOString(),
          level: Math.round(e.level * 1000) / 1000,
          high: e.high,
        })),
      }).toMatchSnapshot();
    });
  }
});
