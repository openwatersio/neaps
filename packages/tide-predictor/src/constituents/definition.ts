import type { AstroData } from "../astronomy/index.js";
import { iho, type Fundamentals, type NodalCorrection } from "../node-corrections/index.js";
import { decomposeCompound } from "./compound.js";
import {
  Constituent,
  DefineConstituentOptions,
  ConstituentMember,
  NodalCorrectionCode,
  Coefficients,
  XDO,
} from "./types.js";

export const constituents: Record<string, Constituent> = {};

/**
 * Create a constituent
 *
 * For null-XDO compounds, V₀ is derived lazily from members once they
 * are resolved (V₀ = Σ factor × V₀(member)).
 */
export function defineConstituent({
  name,
  speed,
  xdo,
  aliases = [],
  members: memberRefs,
  nodalCorrection,
}: DefineConstituentOptions): Constituent {
  const coefficients = xdo ? xdoToCoefficients(xdo) : null;
  let resolvedMembers: ConstituentMember[] | null = null;

  const constituent: Constituent = {
    name,
    speed,
    aliases,
    coefficients,

    get members() {
      if (!resolvedMembers) {
        if (memberRefs) {
          // Explicit members take precedence over nodal correction codes
          resolvedMembers = memberRefs.map(([name, factor]) => {
            const constituent = constituents[name];
            return { constituent, factor };
          });
        } else {
          resolvedMembers = resolveMembers(nodalCorrection, name, xdo?.[0] ?? 0) ?? [];
        }
      }

      return resolvedMembers;
    },

    value(astro: AstroData): number {
      if (coefficients) return computeV0(coefficients, astro);

      // Null-XDO compound: derive V₀ from structural members
      let v = 0;
      for (const { constituent: c, factor } of constituent.members) {
        v += c.value(astro) * factor;
      }
      return v;
    },

    correction(astro: AstroData, fundamentals: Fundamentals = iho): NodalCorrection {
      // Fundamentals have their own correction formula
      const fundamental = fundamentals[name];
      if (fundamental) return fundamental(astro);

      // Start with UNITY
      let f = 1;
      let u = 0;

      // Compound: recurse through members
      // u = Σ factor × u(member), f = Π f(member)^|factor|
      for (const { constituent: member, factor } of constituent.members) {
        const corr = member.correction(astro, fundamentals);
        u += factor * corr.u;
        f *= Math.pow(corr.f, Math.abs(factor));
      }

      return { u, f };
    },
  };

  [constituent.name, ...aliases].forEach((alias) => {
    constituents[alias] = constituent;
  });

  return constituent;
}

/**
 * Convert XDO digit array to Doodson coefficients.
 * D₁ is the τ coefficient (NOT offset). D₂–D₆ are each offset by 5.
 * D₇ (90° phase) is negated to convert from IHO XDO convention to the
 * Schureman/NOAA convention used by published harmonic constants.
 */
export function xdoToCoefficients(xdo: XDO): Coefficients {
  return [
    xdo[0], // D₁: τ coefficient (NOT offset by 5)
    xdo[1] - 5, // D₂: s
    xdo[2] - 5, // D₃: h
    xdo[3] - 5, // D₄: p
    xdo[4] - 5, // D₅: N' (used directly, NOT negated)
    xdo[5] - 5, // D₆: p' (solar perigee)
    5 - xdo[6], // D₇: 90° phase (negated: IHO → Schureman convention)
  ];
}

/**
 * Compute V₀ using Doodson coefficients and standard astronomical arguments.
 * Uses N' = −N from the existing astronomy module's N value.
 */
export function computeV0(coefficients: Coefficients, astro: AstroData): number {
  const values = [
    astro["T+h-s"].value, // τ
    astro.s.value, // s
    astro.h.value, // h
    astro.p.value, // p
    -astro.N.value, // N' = −N
    astro.pp.value, // p'
    90.0, // constant phase
  ];
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    sum += coefficients[i] * values[i];
  }
  return sum;
}

/**
 * Resolve the IHO nodal correction code into pre-computed ConstituentMember[].
 * This maps every code to the constituent members needed to compute
 * f and u at prediction time, eliminating the code dispatch at runtime.
 *
 * Members reference structural constituents (e.g. N→N2 not M2). Each
 * constituent's correction method recursively resolves each member's
 * correction through its own members chain (N2.members → [{M2,1}] → M2 fundamental).
 */
function resolveMembers(
  code: NodalCorrectionCode,
  name: string,
  species: number,
): ConstituentMember[] | null {
  switch (code) {
    // UNITY — no nodal correction
    case "z":
    case "f":
      return null;

    // Fundamentals — correction looked up by name in the fundamentals,
    // so no members needed for indirection.
    case "y":
      return null;

    // Direct constituent references
    case "a":
      return [{ constituent: constituents["Mm"], factor: 1 }];
    case "m":
      return [{ constituent: constituents["M2"], factor: 1 }];
    case "o":
      return [{ constituent: constituents["O1"], factor: 1 }];
    case "k":
      return [{ constituent: constituents["K1"], factor: 1 }];
    case "j":
      return [{ constituent: constituents["J1"], factor: 1 }];

    // M2-derived
    case "b":
      return [{ constituent: constituents["M2"], factor: -1 }];
    case "c":
      return [{ constituent: constituents["M2"], factor: -2 }];
    case "g":
      return [{ constituent: constituents["M2"], factor: species / 2 }];

    // Compound decomposition — returns structural members
    case "p":
      return decomposeCompound("2MN2", species, constituents);
    case "d":
      return decomposeCompound("KQ1", species, constituents);
    case "q":
      return decomposeCompound("NKM2", species, constituents);
    case "x":
      return decomposeCompound(name, species, constituents);
  }
}
