import { Temporal } from "@js-temporal/polyfill";
import harmonics from "./harmonics/index.js";
import { default as constituents } from "./constituents/index.js";
import type { HarmonicConstituent } from "./harmonics/index.js";
import type { TimelinePoint, Extreme, ExtremeOffsets } from "./harmonics/prediction.js";

export interface TidePredictionOptions {
  offset?: number | false;
}

export interface TimeSpan {
  start: Date | Temporal.Instant;
  end: Date | Temporal.Instant;
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
  getWaterLevelAtTime: (params: { time: Date | Temporal.Instant }) => TimelinePoint;
}

const tidePredictionFactory = (
  constituents: HarmonicConstituent[],
  options: TidePredictionOptions = {},
): TidePrediction => {
  const harmonicsOptions = {
    harmonicConstituents: constituents,
    offset: false as number | false,
    ...options,
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

    getWaterLevelAtTime: ({ time }: { time: Date | Temporal.Instant }): TimelinePoint => {
      const instant =
        time instanceof Temporal.Instant
          ? time
          : Temporal.Instant.fromEpochMilliseconds(time.getTime());
      const endInstant = instant.add({ minutes: 10 });
      return harmonics(harmonicsOptions)
        .setTimeSpan(instant, endInstant)
        .prediction()
        .getTimelinePrediction()[0];
    },
  };

  return tidePrediction;
};

// Make constituents available on factory for reference
tidePredictionFactory.constituents = constituents;

export default tidePredictionFactory;
export type { HarmonicConstituent, TimelinePoint, Extreme };
