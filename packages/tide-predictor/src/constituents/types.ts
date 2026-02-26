import type { AstroData } from "../astronomy/index.js";
import type { Fundamentals, NodalCorrection } from "../node-corrections/types.js";

export interface DefineConstituentOptions {
  name: string;
  speed: number;
  coefficients: Coefficients | null;
  xdo: string | null;
  aliases?: string[];
  members?: [string, number][];
}

export interface Constituent {
  name: string;
  aliases: string[];
  coefficients: Coefficients | null;
  members: ConstituentMember[];
  speed: number;
  value: (astro: AstroData) => number;
  correction: (astro: AstroData, fundamentals?: Fundamentals) => NodalCorrection;
}

export interface ConstituentMember {
  constituent: Constituent;
  factor: number;
}

export type Coefficients = [number, number, number, number, number, number, number];
