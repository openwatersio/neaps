import harmonics from "./harmonics/index.js";
import { default as constituents, buildConstituents } from "./constituents/index.js";
import { ihoStrategy } from "./node-corrections/iho.js";
import { schuremanStrategy } from "./node-corrections/schureman.js";
import { resolveStrategy } from "./node-corrections/index.js";
import type { NodeCorrectionStrategy } from "./node-corrections/types.js";
import type { HarmonicConstituent } from "./harmonics/index.js";
import type { TimelinePoint, Extreme, ExtremeOffsets } from "./harmonics/prediction.js";
export { default as astro } from "./astronomy/index.js";
export type { AstroData, AstroValue } from "./astronomy/index.js";

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

const tidePredictionFactory = (
  constituents: HarmonicConstituent[],
  options: TidePredictionOptions = {},
): TidePrediction => {
  const { nodeCorrections, ...harmonicsOpts } = options;
  const harmonicsOptions = {
    harmonicConstituents: constituents,
    strategy: resolveStrategy(nodeCorrections),
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
};

// Make constituents available on factory for reference
tidePredictionFactory.constituents = constituents;

export default tidePredictionFactory;
export { buildConstituents, ihoStrategy, schuremanStrategy };
export type { NodeCorrectionStrategy };
export type { HarmonicConstituent, TimelinePoint, Extreme };
