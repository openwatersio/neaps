import type { AstroData } from "../astronomy/index.js";
import type { Fundamentals, NodalCorrection } from "../node-corrections/types.js";

export interface DefineConstituentOptions {
  name: string;
  speed: number;
  xdo: XDO | null;
  nodalCorrection: NodalCorrectionCode;
  aliases?: string[];
  members?: [string, number][];
}

export interface Constituent {
  name: string;
  aliases: string[];
  coefficients: Coefficients | null; // null for null-XDO compounds
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

export type XDO = [number, number, number, number, number, number, number];

/**
 * IHO letter codes from data.json that encode how to derive nodal corrections.
 * See the "Nodal Corrections — Application" section in docs/TWCWG_Constituent_list.md
 */
export type NodalCorrectionCode =
  | "z" // zero correction (f=1, u=0)
  | "f" // zero correction (alias)
  | "y" // fundamental — correction looked up in fundamentals directly
  // "e" (K2) is defined by IHO but unused in the current dataset
  | "a" // Mm
  | "m" // M2
  | "o" // O1
  | "k" // K1
  | "j" // J1
  | "b" // M2 with negated u
  | "c" // M2 squared
  | "g" // M2^(species/2)
  | "p" // same as 2MN2
  | "d" // same as KQ1
  | "q" // same as NKM2
  | "x"; // compound derivation (external)
