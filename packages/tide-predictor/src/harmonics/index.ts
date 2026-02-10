import prediction from "./prediction.js";
import defaultConstituentModels from "../constituents/index.js";
import type { Constituent } from "../constituents/definition.js";
import { ihoStrategy } from "../node-corrections/iho.js";
import type { NodeCorrectionStrategy } from "../node-corrections/types.js";
import { d2r } from "../astronomy/constants.js";
import type { HarmonicConstituent, Prediction } from "./prediction.js";

export type * from "./prediction.js";

export interface HarmonicsOptions {
  harmonicConstituents: HarmonicConstituent[];
  constituentModels?: Record<string, Constituent>;
  strategy?: NodeCorrectionStrategy;
  offset: number | false;
}

export interface PredictionOptions {
  timeFidelity?: number;
}

export interface Harmonics {
  setTimeSpan: (startTime: Date | number, endTime: Date | number) => Harmonics;
  prediction: (options?: PredictionOptions) => Prediction;
}

const getDate = (time: Date | number): Date => {
  if (time instanceof Date) {
    return time;
  }
  if (typeof time === "number") {
    return new Date(time * 1000);
  }
  throw new Error("Invalid date format, should be a Date object, or timestamp");
};

const getTimeline = (start: Date, end: Date, seconds: number = 10 * 60) => {
  const items: Date[] = [];
  const endTime = end.getTime() / 1000;
  let lastTime = start.getTime() / 1000;
  const startTime = lastTime;
  const hours: number[] = [];
  while (lastTime <= endTime) {
    items.push(new Date(lastTime * 1000));
    hours.push((lastTime - startTime) / (60 * 60));
    lastTime += seconds;
  }

  return {
    items,
    hours,
  };
};

const harmonicsFactory = ({
  harmonicConstituents,
  constituentModels = defaultConstituentModels,
  strategy = ihoStrategy,
  offset,
}: HarmonicsOptions): Harmonics => {
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

  let start = new Date();
  let end = new Date();

  const harmonics: Harmonics = {} as Harmonics;

  harmonics.setTimeSpan = (startTime: Date | number, endTime: Date | number): Harmonics => {
    start = getDate(startTime);
    end = getDate(endTime);
    if (start.getTime() >= end.getTime()) {
      throw new Error("Start time must be before end time");
    }
    return harmonics;
  };

  harmonics.prediction = (options?: PredictionOptions): Prediction => {
    const opts = typeof options !== "undefined" ? options : { timeFidelity: 10 * 60 };
    return prediction({
      timeline: getTimeline(start, end, opts.timeFidelity),
      constituents,
      constituentModels,
      strategy,
      start,
    });
  };

  return Object.freeze(harmonics);
};

export default harmonicsFactory;
export { getDate, getTimeline };
