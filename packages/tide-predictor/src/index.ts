import harmonics from "./harmonics/index.js";
import { default as constituents } from "./constituents/index.js";
import { resolveFundamentals } from "./node-corrections/index.js";
import type { HarmonicConstituent } from "./harmonics/index.js";
import type { TimelinePoint, Extreme, ExtremeOffsets } from "./harmonics/prediction.js";

export { default as astro } from "./astronomy/index.js";
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
  timeFidelity?: number;
}

export interface ExtremesInput extends TimeSpan {
  labels?: {
    high?: string;
    low?: string;
  };
  offsets?: ExtremeOffsets;
}

export interface TidePrediction {
  getTimelinePrediction: (params: TimeSpan) => TimelinePoint[];
  getExtremesPrediction: (params: ExtremesInput) => Extreme[];
  getWaterLevelAtTime: (params: { time: Date }) => TimelinePoint;
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
    getTimelinePrediction: ({ start, end, timeFidelity }: TimeSpan): TimelinePoint[] => {
      return harmonics(harmonicsOptions)
        .setTimeSpan(start, end)
        .prediction({ timeFidelity })
        .getTimelinePrediction();
    },

    getExtremesPrediction: ({
      start,
      end,
      labels,
      offsets,
      timeFidelity,
    }: ExtremesInput): Extreme[] => {
      return harmonics(harmonicsOptions)
        .setTimeSpan(start, end)
        .prediction({ timeFidelity })
        .getExtremesPrediction({ labels, offsets });
    },

    getWaterLevelAtTime: ({ time }: { time: Date }): TimelinePoint => {
      const endDate = new Date(time.getTime() + 10 * 60 * 1000);
      return harmonics(harmonicsOptions)
        .setTimeSpan(time, endDate)
        .prediction()
        .getTimelinePrediction()[0];
    },
  };

  return tidePrediction;
}

// Make constituents available on factory for reference
createTidePredictor.constituents = constituents;

export default createTidePredictor;
