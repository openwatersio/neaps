import astro from "./astronomy/index.js";
import type { AstroData } from "./astronomy/index.js";
import { d2r } from "./astronomy/constants.js";
import type { Constituent } from "./constituents/types.js";
import type { Fundamentals, NodalCorrection } from "./node-corrections/types.js";

/** Cached node corrections for a single time bucket. The same object reference
 * is returned for all times that fall within the same bucket, enabling callers
 * to detect bucket transitions via `!==` reference comparison. */
export interface CachedCorrections {
  readonly astro: AstroData;
  readonly corrections: Map<string, NodalCorrection>;
}

/** A reusable node corrections cache. Pass to `createTidePredictor` to share
 * astronomical computations across multiple station predictors. */
export interface CorrectionsCache {
  readonly interval: number; // quantization interval in hours
  /** Quantized astro — evaluated at bucket midpoint. Used for f/u corrections. */
  getAstro(time: Date): AstroData;
  /** V0 equilibrium arguments (d2r * model.value(baseAstro)) for all models,
   * keyed by constituent name. Computed once per (models, start time) pair and
   * shared across all predictors with the same start time. */
  getV0(time: Date, models: Record<string, Constituent>): Map<string, number>;
  getCorrections(
    time: Date,
    models: Record<string, Constituent>,
    fundamentals: Fundamentals,
  ): CachedCorrections;
}

export interface CorrectionsCacheOptions {
  /** Quantization interval in hours. Default: 24.
   * Node corrections change by <0.01% per day, so 24h introduces <0.1mm error. */
  interval?: number;
}

/**
 * Create a reusable node corrections cache.
 *
 * When predicting tides for many stations at the same time, pass the same cache
 * to each `createTidePredictor` call. Astronomical computations and constituent
 * node corrections are computed once per time bucket and shared across all
 * station predictors.
 *
 * @example
 * ```ts
 * import { createCorrectionsCache, createTidePredictor } from "@neaps/tide-predictor";
 *
 * const cache = createCorrectionsCache();
 *
 * for (const station of stations) {
 *   const predictor = createTidePredictor(station.constituents, { cache });
 *   results.push(predictor.getWaterLevelAtTime({ time }));
 * }
 * ```
 */
export function createCorrectionsCache({
  interval = 24,
}: CorrectionsCacheOptions = {}): CorrectionsCache {
  const intervalMs = interval * 3_600_000;

  // exact ms → AstroData evaluated at that precise time (for V0 arguments)
  const astroCache = new Map<number, AstroData>();

  // fundamentals ref → bucket start (ms) → CachedCorrections
  // The corrections Map is populated incrementally across calls so different
  // models dicts can share the same CachedCorrections per (fundamentals, bucket).
  const correctionsCache = new WeakMap<Fundamentals, Map<number, CachedCorrections>>();

  // models ref → exact ms → constituent name → d2r * model.value(baseAstro)
  const v0Cache = new WeakMap<Record<string, Constituent>, Map<number, Map<string, number>>>();

  function bucketStart(time: Date): number {
    return Math.floor(time.getTime() / intervalMs) * intervalMs;
  }

  function getCachedAstro(time: Date): AstroData {
    const key = time.getTime();
    let cached = astroCache.get(key);
    if (!cached) {
      cached = astro(time);
      astroCache.set(key, cached);
    }
    return cached;
  }

  const cache: CorrectionsCache = {
    interval,

    // Quantize time to bucket and return astro evaluated at bucket midpoint.
    getAstro(time: Date): AstroData {
      return getCachedAstro(new Date(bucketStart(time) + intervalMs / 2));
    },

    getV0(time: Date, models: Record<string, Constituent>): Map<string, number> {
      const key = time.getTime();

      let byTime = v0Cache.get(models);
      if (!byTime) {
        byTime = new Map();
        v0Cache.set(models, byTime);
      }

      let v0 = byTime.get(key);
      if (!v0) {
        const baseAstro = getCachedAstro(time);
        v0 = new Map<string, number>();
        for (const name of Object.keys(models)) {
          v0.set(name, d2r * models[name].value(baseAstro));
        }
        byTime.set(key, v0);
      }

      return v0;
    },

    getCorrections(
      time: Date,
      models: Record<string, Constituent>,
      fundamentals: Fundamentals,
    ): CachedCorrections {
      const key = bucketStart(time);

      let byBucket = correctionsCache.get(fundamentals);
      if (!byBucket) {
        byBucket = new Map();
        correctionsCache.set(fundamentals, byBucket);
      }

      const cached = byBucket.get(key);
      if (cached) return cached;

      const astro = cache.getAstro(time);
      const corrections = new Map<string, NodalCorrection>();
      for (const name of Object.keys(models)) {
        corrections.set(name, models[name].correction(astro, fundamentals));
      }

      const entry: CachedCorrections = { astro, corrections };
      byBucket.set(key, entry);
      return entry;
    },
  };

  return cache;
}
