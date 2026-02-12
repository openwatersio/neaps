import type { AstroData } from "../astronomy/index.js";
import type { Constituent } from "../constituents/definition.js";

export interface NodalCorrection {
  f: number; // amplitude factor
  u: number; // phase correction in degrees
}

/**
 * A nodal correction strategy computes f and u for any constituent
 * using its pre-resolved members array.
 */
export interface NodeCorrectionStrategy {
  /** Look up the nodal correction for a fundamental by name. */
  get(name: string, astro: AstroData): NodalCorrection;

  /** Compute the nodal correction for a constituent. */
  compute(constituent: Constituent, astro: AstroData): NodalCorrection;
}

export type { AstroData };
