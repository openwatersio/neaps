import type { Constituent } from "../constituents/definition.js";
import type { AstroData, NodalCorrection, NodeCorrectionStrategy } from "./types.js";

const UNITY: NodalCorrection = { f: 1, u: 0 };

type CorrectionFn = (astro: AstroData) => NodalCorrection;
type Fundamentals = Record<string, CorrectionFn>;

/**
 * Build a NodeCorrectionStrategy from a set of fundamental correction functions.
 *
 * Correction lookup is recursive:
 * 1. If the constituent's name is in the fundamentals map, use that directly
 * 2. If the constituent has members, compute compound correction recursively
 * 3. Otherwise, return UNITY (f=1, u=0)
 *
 * This allows compound constituents to reference structural members (e.g.
 * MS4 → [{M2,1}, {S2,1}]) and still get correct nodal corrections: each
 * member's correction is resolved through its own members chain.
 */
export function createStrategy(fundamentals: Fundamentals): NodeCorrectionStrategy {
  const get = (name: string, astro: AstroData): NodalCorrection => {
    const fn = fundamentals[name];
    return fn ? fn(astro) : UNITY;
  };

  const compute = (constituent: Constituent, astro: AstroData): NodalCorrection => {
    // Fundamentals have their own correction formula
    const fundamental = fundamentals[constituent.names[0]];
    if (fundamental) return fundamental(astro);

    // Compound: recurse through members
    // u = Σ factor × u(member), f = Π f(member)^|factor|
    if (constituent.members) {
      let u = 0;
      let f = 1;
      for (const { constituent: member, factor } of constituent.members) {
        const corr = compute(member, astro);
        u += factor * corr.u;
        f *= Math.pow(corr.f, Math.abs(factor));
      }
      return { u, f };
    }

    return UNITY;
  };

  return { get, compute };
}
