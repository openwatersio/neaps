import type { AstroData } from "../astronomy/index.js";

export interface NodalCorrection {
  f: number; // amplitude factor
  u: number; // phase correction in degrees
}

export type CorrectionFn = (astro: AstroData) => NodalCorrection;
export type Fundamentals = Record<string, CorrectionFn>;
