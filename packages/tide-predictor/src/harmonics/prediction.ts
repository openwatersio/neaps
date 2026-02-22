import astro from "../astronomy/index.js";
import { d2r } from "../astronomy/constants.js";
import type { Constituent } from "../constituents/types.js";
import { iho, type Fundamentals } from "../node-corrections/index.js";

export interface Timeline {
  items: Date[];
  hours: number[];
}

export interface HarmonicConstituent {
  name: string;
  amplitude: number;
  phase: number;
  speed?: number;
  description?: string;
}

export interface TimelinePoint {
  time: Date;
  hour: number;
  level: number;
}

export interface Extreme {
  time: Date;
  level: number;
  high: boolean;
  low: boolean;
  label: string;
}

export interface ExtremeOffsets {
  height?: {
    high?: number;
    low?: number;
    type?: "fixed" | "ratio";
  };
  time?: {
    high?: number;
    low?: number;
  };
}

export interface ExtremeLabels {
  high?: string;
  low?: string;
}

export interface ExtremesOptions {
  labels?: ExtremeLabels;
  offsets?: ExtremeOffsets;
}

export interface TimelinePredictionOptions {
  offsets?: ExtremeOffsets;
}

export interface Prediction {
  getExtremesPrediction: (options?: ExtremesOptions) => Extreme[];
  getTimelinePrediction: (options?: TimelinePredictionOptions) => TimelinePoint[];
}

/** Get the height adjustment value for a high or low extreme, with identity default. */
function getHeightOffset(isHigh: boolean, offsets?: ExtremeOffsets): number {
  const value = isHigh ? offsets?.height?.high : offsets?.height?.low;
  return value ?? (offsets?.height?.type === "fixed" ? 0 : 1);
}

function addExtremesOffsets(extreme: Extreme, offsets?: ExtremeOffsets): Extreme {
  if (typeof offsets === "undefined" || !offsets) {
    return extreme;
  }

  const heightAdj = getHeightOffset(extreme.high, offsets);
  if (offsets.height?.type === "fixed") {
    extreme.level += heightAdj;
  } else {
    extreme.level *= heightAdj;
  }
  if (extreme.high && offsets.time?.high) {
    extreme.time = new Date(extreme.time.getTime() + offsets.time.high * 60 * 1000);
  }
  if (extreme.low && offsets.time?.low) {
    extreme.time = new Date(extreme.time.getTime() + offsets.time.low * 60 * 1000);
  }
  return extreme;
}

function getExtremeLabel(label: "high" | "low", highLowLabels?: ExtremeLabels): string {
  if (typeof highLowLabels !== "undefined" && typeof highLowLabels[label] !== "undefined") {
    return highLowLabels[label]!;
  }
  const labels = {
    high: "High",
    low: "Low",
  };
  return labels[label];
}

interface PredictionFactoryParams {
  timeline: Timeline;
  constituents: HarmonicConstituent[];
  constituentModels: Record<string, Constituent>;
  fundamentals?: Fundamentals;
  start: Date;
}

/**
 * Precomputed constituent parameters with node corrections baked in.
 * Used for fast evaluation of h(t), h'(t), and h''(t).
 */
interface ConstituentParam {
  A: number; // amplitude * f (effective amplitude)
  w: number; // speed in radians per hour
  phi: number; // V0 + u - phase (total phase offset in radians)
}

/** Tolerance for bisection root-finding: 1 second in hours */
const TOLERANCE_HOURS = 1 / 3600;

/** Recompute node corrections daily for long spans */
const CORRECTION_INTERVAL_HOURS = 24;

/** Linear interpolation between two keyframe values */
function interpolate(fraction: number, a: number, b: number): number {
  return a + fraction * (b - a);
}

/** Cosine interpolation: eases smoothly between values, useful for continuous quantities */
function easeCosine(fraction: number): number {
  return 0.5 * (1 - Math.cos(Math.PI * fraction));
}

/** Evaluate h(t) = Σ Aᵢ·cos(ωᵢ·t + φᵢ) */
function evalH(t: number, params: ConstituentParam[]): number {
  let sum = 0;
  for (let i = 0; i < params.length; i++) {
    const { A, w, phi } = params[i];
    sum += A * Math.cos(w * t + phi);
  }
  return sum;
}

/** Evaluate h'(t) = -Σ Aᵢ·ωᵢ·sin(ωᵢ·t + φᵢ) */
function evalHPrime(t: number, params: ConstituentParam[]): number {
  let sum = 0;
  for (let i = 0; i < params.length; i++) {
    const { A, w, phi } = params[i];
    sum -= A * w * Math.sin(w * t + phi);
  }
  return sum;
}

/** Evaluate h''(t) = -Σ Aᵢ·ωᵢ²·cos(ωᵢ·t + φᵢ) */
function evalHDoublePrime(t: number, params: ConstituentParam[]): number {
  let sum = 0;
  for (let i = 0; i < params.length; i++) {
    const { A, w, phi } = params[i];
    sum -= A * w * w * Math.cos(w * t + phi);
  }
  return sum;
}

/**
 * Find root of h'(t) in [a, b] where h'(a) and h'(b) have opposite signs.
 * Uses bisection for guaranteed convergence to within TOLERANCE_HOURS.
 */
function bisect(a: number, b: number, fa: number, params: ConstituentParam[]): number {
  // Bisection halves the interval each iteration; convergence is guaranteed.
  // A 3-hour bracket reaches 1-second tolerance in ~13 iterations.
  while (true) {
    const mid = (a + b) / 2;
    if (b - a < TOLERANCE_HOURS) return mid;

    const fMid = evalHPrime(mid, params);
    if (fMid === 0) return mid;

    const sameSign = fa > 0 ? fMid > 0 : fMid < 0;
    if (sameSign) {
      a = mid;
      fa = fMid;
    } else {
      b = mid;
    }
  }
}

function predictionFactory({
  timeline,
  constituents,
  constituentModels,
  start,
  fundamentals = iho,
}: PredictionFactoryParams): Prediction {
  const baseAstro = astro(start);
  const startMs = start.getTime();
  const endHour = (timeline.items[timeline.items.length - 1].getTime() - startMs) / 3600000;

  /**
   * Precompute flat constituent parameters with node corrections evaluated
   * at a given time. Node corrections vary on the 18.6-year nodal cycle
   * and change by <0.01% per day.
   */
  function prepareParams(correctionTime: Date): ConstituentParam[] {
    const correctionAstro = astro(correctionTime);
    const params: ConstituentParam[] = [];

    for (const constituent of constituents) {
      if (constituent.amplitude === 0) continue;

      const model = constituentModels[constituent.name];
      if (!model) continue;

      const V0 = d2r * model.value(baseAstro);
      const speed = d2r * model.speed;
      const correction = model.correction(correctionAstro, fundamentals);

      params.push({
        A: constituent.amplitude * correction.f,
        w: speed,
        phi: V0 + d2r * correction.u - constituent.phase,
      });
    }

    return params;
  }

  /**
   * Create a function that returns constituent params with node corrections
   * recomputed at CORRECTION_INTERVAL_HOURS. Returns a new array reference
   * when corrections are recomputed, so callers can detect changes via `!==`.
   */
  function correctedParams(): (hour: number) => ConstituentParam[] {
    const firstChunkEnd = Math.min(CORRECTION_INTERVAL_HOURS, endHour);
    let params = prepareParams(new Date(startMs + (firstChunkEnd / 2) * 3600000));
    let nextCorrectionAt = CORRECTION_INTERVAL_HOURS;

    return (hour: number): ConstituentParam[] => {
      if (hour >= nextCorrectionAt) {
        const chunkEnd = Math.min(nextCorrectionAt + CORRECTION_INTERVAL_HOURS, endHour);
        params = prepareParams(new Date(startMs + ((nextCorrectionAt + chunkEnd) / 2) * 3600000));
        nextCorrectionAt += CORRECTION_INTERVAL_HOURS;
      }
      return params;
    };
  }

  /**
   * Find tidal extremes in [fromHour, toHour] using derivative root-finding.
   *
   * Finds zeros of h'(t) by bracketing at intervals guaranteed to contain
   * at most one root, then bisecting to sub-second precision. Extremes
   * are classified via the sign of h''(t). Spurious extremes with
   * negligible prominence (< 2% of Σ|Aᵢ|) are filtered out.
   *
   * Since h(t) is a sum of cosines, it is valid for any t — including
   * hours before 0 or beyond endHour.
   */
  function findExtremes(fromHour: number, toHour: number): Extreme[] {
    const results: Extreme[] = [];
    const getParams = correctedParams();
    let params = getParams(Math.max(0, fromHour));

    if (params.length === 0) return results;

    // Bracket size: quarter-wavelength of the fastest constituent.
    // h'(t) can have at most one zero-crossing per quarter-period.
    let maxSpeed = 0;
    for (const { w } of params) {
      if (w > maxSpeed) maxSpeed = w;
    }
    // Z0 (mean water level offset) has speed=0: it shifts levels but h'(t)=0,
    // so it doesn't affect extreme timing. If it's the only constituent, no extremes exist.
    if (maxSpeed === 0) return results;

    const bracket = Math.PI / (2 * maxSpeed);

    let tPrev = fromHour;
    let dPrev = evalHPrime(tPrev, params);

    for (let tNext = tPrev + bracket; tNext <= toHour + bracket; tNext += bracket) {
      // Recompute node corrections for long spans
      const newParams = getParams(tPrev);
      if (newParams !== params) {
        params = newParams;
        dPrev = evalHPrime(tPrev, params);
      }

      const tBound = Math.min(tNext, toHour);
      const dNext = evalHPrime(tBound, params);

      const signChanged = dPrev !== 0 && dNext !== 0 && (dPrev > 0 ? dNext < 0 : dNext > 0);
      if (signChanged) {
        const tRoot = bisect(tPrev, tBound, dPrev, params);

        if (tRoot >= fromHour && tRoot <= toHour) {
          const isHigh = evalHDoublePrime(tRoot, params) < 0;

          results.push({
            time: new Date(startMs + tRoot * 60 * 60 * 1000),
            level: evalH(tRoot, params),
            high: isHigh,
            low: !isHigh,
            label: getExtremeLabel(isHigh ? "high" : "low"),
          });
        }
      }

      if (tBound >= toHour) break;
      tPrev = tBound;
      dPrev = dNext;
    }

    return results;
  }

  function getExtremesPrediction({ labels, offsets }: ExtremesOptions = {}): Extreme[] {
    return findExtremes(0, endHour).map((extreme) => {
      if (labels) {
        extreme.label = getExtremeLabel(extreme.high ? "high" : "low", labels);
      }
      return addExtremesOffsets(extreme, offsets);
    });
  }

  /** 36-hour buffer in hours — ensures diurnal stations are fully bracketed by extremes. */
  const BUFFER_HOURS = 36;

  function getTimelinePrediction({ offsets }: TimelinePredictionOptions = {}): TimelinePoint[] {
    if (!offsets) {
      const getParams = correctedParams();
      const results: TimelinePoint[] = [];

      for (let i = 0; i < timeline.items.length; i++) {
        const hour = timeline.hours[i];
        results.push({
          time: timeline.items[i],
          hour,
          level: evalH(hour, getParams(hour)),
        });
      }

      return results;
    }

    // Subordinate station interpolation: find reference extremes in a wider
    // range for proper bracketing, build keyframes, then interpolate time mapping
    // (linear) and height adjustments (cosine) over the pre-built output timeline.
    const refExtremes = findExtremes(-BUFFER_HOURS, endHour + BUFFER_HOURS);

    // Build keyframes mapping subordinate time → reference time + height adjustment
    const isFixed = offsets.height?.type === "fixed";
    const keyframes = refExtremes.map((extreme) => {
      const timeOffset = (extreme.high ? offsets.time?.high : offsets.time?.low) ?? 0;

      return {
        subTime: extreme.time.getTime() + timeOffset * 60 * 1000,
        refTime: extreme.time.getTime(),
        heightAdj: getHeightOffset(extreme.high, offsets),
      };
    });

    const getParams = correctedParams();

    // Iterate over the pre-built output timeline
    const results: TimelinePoint[] = [];
    let kfIdx = 0;

    for (let i = 0; i < timeline.items.length; i++) {
      const tMs = timeline.items[i].getTime();

      // Advance to the correct bracketing keyframe pair
      while (kfIdx < keyframes.length - 2 && keyframes[kfIdx + 1].subTime < tMs) {
        kfIdx++;
      }

      const kf0 = keyframes[kfIdx];
      const kf1 = keyframes[kfIdx + 1];

      const interval = kf1.subTime - kf0.subTime;
      const fraction = interval > 0 ? Math.max(0, Math.min(1, (tMs - kf0.subTime) / interval)) : 0;

      // Map subordinate time → reference time (linear), then evaluate reference curve
      const mappedRefTimeMs = interpolate(fraction, kf0.refTime, kf1.refTime);
      const mappedHour = (mappedRefTimeMs - startMs) / 3600000;
      const refLevel = evalH(mappedHour, getParams(mappedHour));

      // Interpolate height adjustment
      const heightAdj = interpolate(easeCosine(fraction), kf0.heightAdj, kf1.heightAdj);

      results.push({
        time: timeline.items[i],
        hour: timeline.hours[i],
        level: isFixed ? refLevel + heightAdj : refLevel * heightAdj,
      });
    }

    return results;
  }

  return Object.freeze({ getExtremesPrediction, getTimelinePrediction });
}

export default predictionFactory;
