import type { AstroData, NodalCorrection, NodeCorrectionStrategy } from "./types.js";
import { decomposeCompound, computeCompoundCorrection } from "./compound.js";

const UNITY: NodalCorrection = { f: 1, u: 0 };

export type CorrectionFn = (astro: AstroData) => NodalCorrection;
export type Fundamentals = Record<string, CorrectionFn>;

/**
 * Build a NodeCorrectionStrategy from a set of fundamental correction functions.
 *
 * The IHO letter codes in data.json encode how to derive each constituent's
 * nodal corrections from a small set of fundamentals (Mm, Mf, O1, K1, J1,
 * M2, K2, etc.). The dispatch logic is the same regardless of which set of
 * formulas is used — only the fundamentals differ between IHO and Schureman.
 */
export function createStrategy(fundamentals: Fundamentals): NodeCorrectionStrategy {
  const get = (name: string, astro: AstroData): NodalCorrection => {
    const fn = fundamentals[name];
    return fn ? fn(astro) : UNITY;
  };

  return {
    compute(
      code: string,
      constituentName: string,
      species: number,
      astro: AstroData,
    ): NodalCorrection {
      switch (code) {
        case "z":
        case "f":
          return UNITY;

        // Look up by constituent name
        case "y":
          return get(constituentName, astro);

        // Direct fundamental references
        case "a":
          return get("Mm", astro);
        case "m":
          return get("M2", astro);
        case "o":
          return get("O1", astro);
        case "k":
          return get("K1", astro);
        case "j":
          return get("J1", astro);
        case "e":
          return get("K2", astro);

        // Compound codes derived from M2
        case "b": {
          const m2 = get("M2", astro);
          return { f: m2.f, u: -m2.u };
        }
        case "c": {
          const m2 = get("M2", astro);
          return { f: m2.f * m2.f, u: -2 * m2.u };
        }
        case "g": {
          const m2 = get("M2", astro);
          return {
            f: Math.pow(Math.sqrt(m2.f), species),
            u: (species / 2.0) * m2.u,
          };
        }
        // "p" = same as 2MN2
        case "p": {
          return computeCompoundCorrection(decomposeCompound("2MN2", species)!, get, astro);
        }

        // Multi-fundamental compounds
        case "d": {
          return computeCompoundCorrection(decomposeCompound("KQ1", species)!, get, astro);
        }
        // "q" = same as NKM2
        case "q": {
          return computeCompoundCorrection(decomposeCompound("NKM2", species)!, get, astro);
        }
        case "x": {
          const components = decomposeCompound(constituentName, species);
          if (!components) return UNITY;
          return computeCompoundCorrection(components, get, astro);
        }
        default:
          return UNITY;
      }
    },
  };
}
