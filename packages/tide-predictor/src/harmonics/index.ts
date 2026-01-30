import { Temporal } from "@js-temporal/polyfill";
import prediction from "./prediction.js";
import constituentModels from "../constituents/index.js";
import { d2r } from "../astronomy/constants.js";
import type { HarmonicConstituent, Prediction } from "./prediction.js";

export type * from "./prediction.js";

export interface HarmonicsOptions {
  harmonicConstituents: HarmonicConstituent[];
  offset: number | false;
}

export interface PredictionOptions {
  timeFidelity?: number;
}

export interface Harmonics {
  setTimeSpan: (
    startTime: Date | Temporal.Instant | number,
    endTime: Date | Temporal.Instant | number,
  ) => Harmonics;
  prediction: (options?: PredictionOptions) => Prediction;
}

const getInstant = (time: Date | Temporal.Instant | number): Temporal.Instant => {
  if (time instanceof Temporal.Instant) {
    return time;
  }
  if (time instanceof Date) {
    return Temporal.Instant.fromEpochMilliseconds(time.getTime());
  }
  if (typeof time === "number") {
    return Temporal.Instant.fromEpochMilliseconds(time * 1000);
  }
  throw new Error("Invalid date format, should be a Date, Temporal.Instant, or timestamp");
};

const getTimeline = (start: Temporal.Instant, end: Temporal.Instant, seconds: number = 10 * 60) => {
  const items: Temporal.Instant[] = [];
  const endEpochSeconds = end.epochMilliseconds / 1000;
  let lastTime = start.epochMilliseconds / 1000;
  const startTime = lastTime;
  const hours: number[] = [];
  while (lastTime <= endEpochSeconds) {
    items.push(Temporal.Instant.fromEpochMilliseconds(lastTime * 1000));
    hours.push((lastTime - startTime) / (60 * 60));
    lastTime += seconds;
  }

  return {
    items,
    hours,
  };
};

const harmonicsFactory = ({ harmonicConstituents, offset }: HarmonicsOptions): Harmonics => {
  if (!Array.isArray(harmonicConstituents)) {
    throw new Error("Harmonic constituents are not an array");
  }
  const constituents: HarmonicConstituent[] = [];
  harmonicConstituents.forEach((constituent) => {
    if (typeof constituent.name === "undefined") {
      throw new Error("Harmonic constituents must have a name property");
    }
    if (constituentModels[constituent.name] !== undefined) {
      constituents.push({
        ...constituent,
        phase: d2r * constituent.phase,
      });
    }
  });

  if (offset !== false) {
    constituents.push({
      name: "Z0",
      phase: 0,
      amplitude: offset,
    });
  }

  let start = Temporal.Now.instant();
  let end = Temporal.Now.instant();

  const harmonics: Harmonics = {} as Harmonics;

  harmonics.setTimeSpan = (
    startTime: Date | Temporal.Instant | number,
    endTime: Date | Temporal.Instant | number,
  ): Harmonics => {
    start = getInstant(startTime);
    end = getInstant(endTime);
    if (Temporal.Instant.compare(start, end) >= 0) {
      throw new Error("Start time must be before end time");
    }
    return harmonics;
  };

  harmonics.prediction = (options?: PredictionOptions): Prediction => {
    const opts = typeof options !== "undefined" ? options : { timeFidelity: 10 * 60 };
    return prediction({
      timeline: getTimeline(start, end, opts.timeFidelity),
      constituents,
      start,
    });
  };

  return Object.freeze(harmonics);
};

export default harmonicsFactory;
export { getInstant, getTimeline };
