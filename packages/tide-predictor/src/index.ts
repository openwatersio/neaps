import harmonics from "./harmonics/index.js";
import { default as constituents } from "./constituents/index.js";
import { resolveFundamentals } from "./node-corrections/index.js";
import type { HarmonicConstituent } from "./harmonics/index.js";
import type { TimelinePoint, Extreme, ExtremeOffsets } from "./harmonics/prediction.js";

export { default as astro } from "./astronomy/index.js";
export { default as constituents } from "./constituents/index.js";
export type * from "./astronomy/index.js";
export type * from "./constituents/index.js";
export type * from "./harmonics/index.js";
export type * from "./node-corrections/index.js";

export interface TidePredictionOptions {
  offset?: number | false;
  nodeCorrections?: "iho" | "schureman";
}

export interface TimeSpan {
  start: Date;
  end: Date;
}

export interface ExtremesInput extends TimeSpan {
  labels?: {
    high?: string;
    low?: string;
  };
  offsets?: ExtremeOffsets;
  /** @deprecated timeFidelity is now <1s for extremes predictions */
  timeFidelity?: number;
}

export interface TimelineInput extends TimeSpan {
  timeFidelity?: number;
  offsets?: ExtremeOffsets;
}

export interface TidePrediction {
  getTimelinePrediction: (params: TimelineInput) => TimelinePoint[];
  getExtremesPrediction: (params: ExtremesInput) => Extreme[];
  getWaterLevelAtTime: (params: { time: Date; offsets?: ExtremeOffsets }) => TimelinePoint;
}

export function createTidePredictor(
  constituents: HarmonicConstituent[],
  options: TidePredictionOptions = {},
): TidePrediction {
  const { nodeCorrections, ...harmonicsOpts } = options;
  const harmonicsOptions = {
    harmonicConstituents: constituents,
    fundamentals: resolveFundamentals(nodeCorrections),
    offset: false as number | false,
    ...harmonicsOpts,
  };

  const tidePrediction: TidePrediction = {
    getTimelinePrediction: ({
      start,
      end,
      timeFidelity,
      offsets,
    }: TimelineInput): TimelinePoint[] => {
      return harmonics(harmonicsOptions)
        .setTimeSpan(start, end)
        .prediction({ timeFidelity })
        .getTimelinePrediction({ offsets });
    },

    getExtremesPrediction: ({ start, end, labels, offsets }: ExtremesInput): Extreme[] => {
      return harmonics(harmonicsOptions)
        .setTimeSpan(start, end)
        .prediction()
        .getExtremesPrediction({ labels, offsets });
    },

    getWaterLevelAtTime: ({
      time,
      offsets,
    }: {
      time: Date;
      offsets?: ExtremeOffsets;
    }): TimelinePoint => {
      const endDate = new Date(time.getTime() + 10 * 60 * 1000);
      return harmonics(harmonicsOptions)
        .setTimeSpan(time, endDate)
        .prediction()
        .getTimelinePrediction({ offsets })[0];
    },
  };

  return tidePrediction;
}

// Make constituents available on factory for reference
/** @deprecated Use `import { constituents } from "@neaps/tide-predictor"; */
createTidePredictor.constituents = constituents;

/** @deprecated Use `import { createTidePredictor } from "@neaps/tide-predictor";` */
export default createTidePredictor;
