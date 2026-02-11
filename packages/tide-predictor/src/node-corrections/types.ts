import type { AstroData } from "../astronomy/index.js";

export interface NodalCorrection {
  f: number; // amplitude factor
  u: number; // phase correction in degrees
}

/** IHO letter codes from data.json that encode how to derive nodal corrections. */
export type NodalCorrectionCode =
  | "z" // zero correction (f=1, u=0)
  | "f" // zero correction (alias)
  | "y" // look up fundamental by constituent name
  | "a" // Mm
  | "m" // M2
  | "o" // O1
  | "k" // K1
  | "j" // J1
  | "e" // K2
  | "b" // M2 with negated u
  | "c" // M2 squared
  | "g" // M2^(species/2)
  | "p" // same as 2MN2
  | "d" // K1 · O1 compound (KQ1)
  | "q" // same as NKM2
  | "x"; // compound derivation (external)

/**
 * A nodal correction strategy computes f and u for any constituent,
 * dispatched by the IHO letter code from data.json.
 */
export interface NodeCorrectionStrategy {
  compute(
    code: NodalCorrectionCode,
    constituentName: string,
    species: number,
    astro: AstroData,
  ): NodalCorrection;
}

export type { AstroData };
