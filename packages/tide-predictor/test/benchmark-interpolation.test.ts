/**
 * Benchmark: cosine vs quadratic interpolation between tidal extremes.
 *
 * For each reference station, we:
 *   1. Compute the true harmonic timeline (direct h(t) evaluation)
 *   2. Compute extremes for the same period
 *   3. Interpolate between extremes using cosine and quadratic methods
 *   4. Compare each against the true curve (RMS error, max error)
 *
 * This measures interpolation quality without confounding it with offset accuracy.
 */
import { describe, test, expect } from "vitest";
import harmonicsFactory from "../src/harmonics/index.js";
import { resolveFundamentals } from "../src/node-corrections/index.js";
import { stations } from "@neaps/tide-database";
import type { Extreme, TimelinePoint } from "../src/harmonics/prediction.js";

// --- Interpolation methods ---

function cosineInterp(fraction: number, a: number, b: number): number {
  const t = 0.5 * (1 - Math.cos(Math.PI * fraction));
  return a + t * (b - a);
}

function quadraticInterp(fraction: number, prev: Extreme, curr: Extreme, next: Extreme): number {
  // Three-point quadratic (Lagrange) interpolation using neighboring extremes.
  // curr is the left bracketing extreme, next is the right.
  // prev provides the third point for the parabola.
  const t0 = prev.time.getTime();
  const t1 = curr.time.getTime();
  const t2 = next.time.getTime();
  const t = curr.time.getTime() + fraction * (next.time.getTime() - curr.time.getTime());

  const L0 = ((t - t1) * (t - t2)) / ((t0 - t1) * (t0 - t2));
  const L1 = ((t - t0) * (t - t2)) / ((t1 - t0) * (t1 - t2));
  const L2 = ((t - t0) * (t - t1)) / ((t2 - t0) * (t2 - t1));

  return L0 * prev.level + L1 * curr.level + L2 * next.level;
}

// Simple quadratic without 3rd point: just cosine's competitor using
// a parabola fitted to two endpoints and zero-derivative at extremes.
function parabolicInterp(fraction: number, a: number, b: number): number {
  // Attempt a simple parabolic ease: y = a + (b-a) * f(t)
  // where f(0) = 0, f(1) = 1, and f'(0) = f'(1) = 0 for smooth extremes.
  // f(t) = 3t² - 2t³ (Hermite / smoothstep)
  const t = 3 * fraction * fraction - 2 * fraction * fraction * fraction;
  return a + t * (b - a);
}

// --- Test stations covering all tidal regimes ---

const TEST_STATIONS = [
  "noaa/8410140", // Eastport, ME — semidiurnal, large range
  "noaa/9414290", // San Francisco — mixed semidiurnal
  "noaa/1612340", // Honolulu — mixed semidiurnal, Pacific
  "noaa/8723970", // Vaca Key, FL — mixed diurnal, Gulf
  "noaa/8518750", // The Battery, NYC — US East Coast
  "noaa/9447130", // Seattle, WA — Pacific Northwest
];

const start = new Date("2025-01-15T00:00:00Z");
const end = new Date("2025-01-18T00:00:00Z");

interface Stats {
  rms: number;
  maxErr: number;
  meanErr: number;
}

function computeStats(predicted: number[], actual: number[]): Stats {
  let sumSq = 0;
  let maxErr = 0;
  let sumAbs = 0;
  for (let i = 0; i < predicted.length; i++) {
    const err = Math.abs(predicted[i] - actual[i]);
    sumSq += err * err;
    if (err > maxErr) maxErr = err;
    sumAbs += err;
  }
  return {
    rms: Math.sqrt(sumSq / predicted.length),
    maxErr,
    meanErr: sumAbs / predicted.length,
  };
}

function interpolateTimeline(
  extremes: Extreme[],
  timeline: TimelinePoint[],
  method: "cosine" | "parabolic" | "lagrange",
): number[] {
  const results: number[] = [];
  let kfIdx = 0;

  for (const point of timeline) {
    const tMs = point.time.getTime();

    // Advance to correct bracketing extremes pair
    while (kfIdx < extremes.length - 2 && extremes[kfIdx + 1].time.getTime() < tMs) {
      kfIdx++;
    }

    const e0 = extremes[kfIdx];
    const e1 = extremes[kfIdx + 1];
    const interval = e1.time.getTime() - e0.time.getTime();
    const fraction =
      interval > 0 ? Math.max(0, Math.min(1, (tMs - e0.time.getTime()) / interval)) : 0;

    let level: number;
    if (method === "cosine") {
      level = cosineInterp(fraction, e0.level, e1.level);
    } else if (method === "parabolic") {
      level = parabolicInterp(fraction, e0.level, e1.level);
    } else {
      // Lagrange quadratic needs a 3rd point — use neighbor on whichever side is available
      const third =
        kfIdx > 0 ? extremes[kfIdx - 1] : kfIdx + 2 < extremes.length ? extremes[kfIdx + 2] : null;
      level = third
        ? quadraticInterp(fraction, third, e0, e1)
        : cosineInterp(fraction, e0.level, e1.level);
    }

    results.push(level);
  }

  return results;
}

describe("interpolation benchmark: cosine vs quadratic vs parabolic", () => {
  const allResults: Array<{
    station: string;
    range: number;
    cosine: Stats;
    parabolic: Stats;
    lagrange: Stats;
  }> = [];

  for (const stationId of TEST_STATIONS) {
    test(stationId, () => {
      const stationData = stations.find(
        (s) => s.id === stationId || s.source.id === stationId.split("/")[1],
      );
      expect(stationData).toBeDefined();

      const h = harmonicsFactory({
        harmonicConstituents: stationData!.harmonic_constituents,
        fundamentals: resolveFundamentals(),
        offset: false as number | false,
      }).setTimeSpan(start, end);

      // True harmonic timeline at 6-minute intervals
      const prediction = h.prediction({ timeFidelity: 360 });
      const trueTimeline = prediction.getTimelinePrediction();
      const extremes = prediction.getExtremesPrediction();

      expect(extremes.length).toBeGreaterThan(4);

      const trueLevels = trueTimeline.map((p) => p.level);

      // Filter timeline to only points within the extremes range
      // (interpolation can't work outside the extremes bracket)
      const firstExtremeTime = extremes[0].time.getTime();
      const lastExtremeTime = extremes[extremes.length - 1].time.getTime();
      const bracketedTimeline = trueTimeline.filter((p) => {
        const t = p.time.getTime();
        return t >= firstExtremeTime && t <= lastExtremeTime;
      });
      const bracketedTrue = bracketedTimeline.map((p) => p.level);

      const cosineResult = interpolateTimeline(extremes, bracketedTimeline, "cosine");
      const parabolicResult = interpolateTimeline(extremes, bracketedTimeline, "parabolic");
      const lagrangeResult = interpolateTimeline(extremes, bracketedTimeline, "lagrange");

      const tideRange = Math.max(...trueLevels) - Math.min(...trueLevels);

      const cosineStats = computeStats(cosineResult, bracketedTrue);
      const parabolicStats = computeStats(parabolicResult, bracketedTrue);
      const lagrangeStats = computeStats(lagrangeResult, bracketedTrue);

      allResults.push({
        station: `${stationData!.name} (${stationId})`,
        range: tideRange,
        cosine: cosineStats,
        parabolic: parabolicStats,
        lagrange: lagrangeStats,
      });

      // Both methods should be reasonable (< 10% of tidal range RMS error)
      expect(cosineStats.rms).toBeLessThan(tideRange * 0.1);
      expect(parabolicStats.rms).toBeLessThan(tideRange * 0.1);
    });
  }

  test("summary", () => {
    console.log("\n=== Interpolation Benchmark: Cosine vs Parabolic vs Lagrange ===\n");
    console.log("All errors in meters. %Range = error as percentage of tidal range.\n");

    for (const r of allResults) {
      console.log(`--- ${r.station} (range: ${r.range.toFixed(3)}m) ---`);
      console.log(
        `  Cosine:    RMS=${r.cosine.rms.toFixed(4)}m (${((r.cosine.rms / r.range) * 100).toFixed(2)}%)  Max=${r.cosine.maxErr.toFixed(4)}m (${((r.cosine.maxErr / r.range) * 100).toFixed(2)}%)  Mean=${r.cosine.meanErr.toFixed(4)}m`,
      );
      console.log(
        `  Parabolic: RMS=${r.parabolic.rms.toFixed(4)}m (${((r.parabolic.rms / r.range) * 100).toFixed(2)}%)  Max=${r.parabolic.maxErr.toFixed(4)}m (${((r.parabolic.maxErr / r.range) * 100).toFixed(2)}%)  Mean=${r.parabolic.meanErr.toFixed(4)}m`,
      );
      console.log(
        `  Lagrange:  RMS=${r.lagrange.rms.toFixed(4)}m (${((r.lagrange.rms / r.range) * 100).toFixed(2)}%)  Max=${r.lagrange.maxErr.toFixed(4)}m (${((r.lagrange.maxErr / r.range) * 100).toFixed(2)}%)  Mean=${r.lagrange.meanErr.toFixed(4)}m`,
      );
    }

    // Compute averages
    const avg = (fn: (r: (typeof allResults)[0]) => number) =>
      allResults.reduce((sum, r) => sum + fn(r), 0) / allResults.length;

    const avgCosineRmsPct = avg((r) => (r.cosine.rms / r.range) * 100);
    const avgParabolicRmsPct = avg((r) => (r.parabolic.rms / r.range) * 100);
    const avgLagrangeRmsPct = avg((r) => (r.lagrange.rms / r.range) * 100);

    console.log("\n--- Averages (RMS as %range) ---");
    console.log(`  Cosine:    ${avgCosineRmsPct.toFixed(2)}%`);
    console.log(`  Parabolic: ${avgParabolicRmsPct.toFixed(2)}%`);
    console.log(`  Lagrange:  ${avgLagrangeRmsPct.toFixed(2)}%`);

    const winner =
      avgCosineRmsPct <= avgParabolicRmsPct && avgCosineRmsPct <= avgLagrangeRmsPct
        ? "Cosine"
        : avgParabolicRmsPct <= avgLagrangeRmsPct
          ? "Parabolic"
          : "Lagrange";
    console.log(`\n  Winner: ${winner}\n`);
  });
});
