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

export interface Prediction {
  getExtremesPrediction: (options?: ExtremesOptions) => Extreme[];
  getTimelinePrediction: () => TimelinePoint[];
}

const addExtremesOffsets = (extreme: Extreme, offsets?: ExtremeOffsets): Extreme => {
  if (typeof offsets === "undefined" || !offsets) {
    return extreme;
  }

  if (extreme.high && offsets.height?.high) {
    if (offsets.height.type === "fixed") {
      extreme.level += offsets.height.high;
    } else {
      extreme.level *= offsets.height.high;
    }
  }
  if (extreme.low && offsets.height?.low) {
    if (offsets.height.type === "fixed") {
      extreme.level += offsets.height.low;
    } else {
      extreme.level *= offsets.height.low;
    }
  }
  if (extreme.high && offsets.time?.high) {
    extreme.time = new Date(extreme.time.getTime() + offsets.time.high * 60 * 1000);
  }
  if (extreme.low && offsets.time?.low) {
    extreme.time = new Date(extreme.time.getTime() + offsets.time.low * 60 * 1000);
  }
  return extreme;
};

const getExtremeLabel = (label: "high" | "low", highLowLabels?: ExtremeLabels): string => {
  if (typeof highLowLabels !== "undefined" && typeof highLowLabels[label] !== "undefined") {
    return highLowLabels[label]!;
  }
  const labels = {
    high: "High",
    low: "Low",
  };
  return labels[label];
};

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

/** Evaluate h(t) = Σ Aᵢ·cos(ωᵢ·t + φᵢ) */
const evalH = (t: number, params: ConstituentParam[]): number => {
  let sum = 0;
  for (let i = 0; i < params.length; i++) {
    const { A, w, phi } = params[i];
    sum += A * Math.cos(w * t + phi);
  }
  return sum;
};

/** Evaluate h'(t) = -Σ Aᵢ·ωᵢ·sin(ωᵢ·t + φᵢ) */
const evalHPrime = (t: number, params: ConstituentParam[]): number => {
  let sum = 0;
  for (let i = 0; i < params.length; i++) {
    const { A, w, phi } = params[i];
    sum -= A * w * Math.sin(w * t + phi);
  }
  return sum;
};

/** Evaluate h''(t) = -Σ Aᵢ·ωᵢ²·cos(ωᵢ·t + φᵢ) */
const evalHDoublePrime = (t: number, params: ConstituentParam[]): number => {
  let sum = 0;
  for (let i = 0; i < params.length; i++) {
    const { A, w, phi } = params[i];
    sum -= A * w * w * Math.cos(w * t + phi);
  }
  return sum;
};

/**
 * Find root of h'(t) in [a, b] where h'(a) and h'(b) have opposite signs.
 * Uses bisection for guaranteed convergence to within TOLERANCE_HOURS.
 */
const bisect = (a: number, b: number, fa: number, params: ConstituentParam[]): number => {
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
};

const predictionFactory = ({
  timeline,
  constituents,
  constituentModels,
  start,
  fundamentals = iho,
}: PredictionFactoryParams): Prediction => {
  const baseAstro = astro(start);
  const startMs = start.getTime();
  const endHour = (timeline.items[timeline.items.length - 1].getTime() - startMs) / 3600000;

  /**
   * Precompute flat constituent parameters with node corrections evaluated
   * at a given time. Node corrections vary on the 18.6-year nodal cycle
   * and change by <0.01% per day.
   */
  const prepareParams = (correctionTime: Date): ConstituentParam[] => {
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
  };

  /**
   * Create a function that returns constituent params with node corrections
   * recomputed at CORRECTION_INTERVAL_HOURS. Returns a new array reference
   * when corrections are recomputed, so callers can detect changes via `!==`.
   */
  const correctedParams = (): ((hour: number) => ConstituentParam[]) => {
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
  };

  /**
   * Find tidal extremes using derivative root-finding.
   *
   * Instead of stepping through a timeline and checking direction changes,
   * this finds zeros of h'(t) analytically by bracketing at intervals
   * guaranteed to contain at most one root, then bisecting to sub-second
   * precision. Extremes are classified via the sign of h''(t).
   */
  const getExtremesPrediction = (options?: ExtremesOptions): Extreme[] => {
    const { labels, offsets } = typeof options !== "undefined" ? options : {};
    const results: Extreme[] = [];
    const getParams = correctedParams();
    let params = getParams(0);

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

    let tPrev = 0;
    let dPrev = evalHPrime(tPrev, params);

    for (let tNext = tPrev + bracket; tNext <= endHour + bracket; tNext += bracket) {
      // Recompute node corrections for long spans
      const newParams = getParams(tPrev);
      if (newParams !== params) {
        params = newParams;
        dPrev = evalHPrime(tPrev, params);
      }

      const tBound = Math.min(tNext, endHour);
      const dNext = evalHPrime(tBound, params);

      const signChanged = dPrev !== 0 && dNext !== 0 && (dPrev > 0 ? dNext < 0 : dNext > 0);
      if (signChanged) {
        const tRoot = bisect(tPrev, tBound, dPrev, params);

        if (tRoot >= 0 && tRoot <= endHour) {
          const isHigh = evalHDoublePrime(tRoot, params) < 0;

          results.push(
            addExtremesOffsets(
              {
                time: new Date(startMs + tRoot * 60 * 60 * 1000),
                level: evalH(tRoot, params),
                high: isHigh,
                low: !isHigh,
                label: getExtremeLabel(isHigh ? "high" : "low", labels),
              },
              offsets,
            ),
          );
        }
      }

      if (tBound >= endHour) break;
      tPrev = tBound;
      dPrev = dNext;
    }

    return results;
  };

  const getTimelinePrediction = (): TimelinePoint[] => {
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
  };

  return Object.freeze({ getExtremesPrediction, getTimelinePrediction });
};

export default predictionFactory;
