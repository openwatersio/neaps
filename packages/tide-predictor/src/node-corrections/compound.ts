import type { AstroData, NodalCorrection } from "./types.js";
import type { ConstituentMember } from "../constituents/definition.js";

/**
 * Compute the combined nodal correction for a compound constituent.
 *
 * u = Σ sign × multiplier × u(fundamental)
 * f = Π f(fundamental) ^ multiplier
 *
 * Per IHO Annex B: f is ALWAYS obtained by multiplication, never division,
 * even when the sign is negative.
 */
export function computeCompoundCorrection(
  members: ConstituentMember[],
  get: (name: string, astro: AstroData) => NodalCorrection,
  astro: AstroData,
): NodalCorrection {
  let u = 0;
  let f = 1;

  for (const { constituent, factor } of members) {
    const corr = get(constituent.names[0], astro);
    u += factor * corr.u;
    f *= Math.pow(corr.f, Math.abs(factor));
  }

  return { u, f };
}
