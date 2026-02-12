import type { Constituent } from "../constituents/definition.js";
import type { AstroData, NodalCorrection, NodeCorrectionStrategy } from "./types.js";
import { computeCompoundCorrection } from "./compound.js";

const UNITY: NodalCorrection = { f: 1, u: 0 };

type CorrectionFn = (astro: AstroData) => NodalCorrection;
type Fundamentals = Record<string, CorrectionFn>;

/**
 * Build a NodeCorrectionStrategy from a set of fundamental correction functions.
 *
 * Each constituent's `members` array (resolved at definition time from IHO
 * letter codes) determines how its nodal correction is computed:
 * - `null` → UNITY (f=1, u=0)
 * - `ConstituentMember[]` → compound correction from fundamentals
 */
export function createStrategy(fundamentals: Fundamentals): NodeCorrectionStrategy {
  const get = (name: string, astro: AstroData): NodalCorrection => {
    const fn = fundamentals[name];
    return fn ? fn(astro) : UNITY;
  };

  return {
    get,
    compute(constituent: Constituent, astro: AstroData): NodalCorrection {
      if (!constituent.members) return UNITY;
      return computeCompoundCorrection(constituent.members, get, astro);
    },
  };
}
