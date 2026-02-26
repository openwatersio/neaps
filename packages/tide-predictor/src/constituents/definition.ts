import type { AstroData } from "../astronomy/index.js";
import { iho, type Fundamentals, type NodalCorrection } from "../node-corrections/index.js";
import { Constituent, DefineConstituentOptions, ConstituentMember, Coefficients } from "./types.js";

export const constituents: Record<string, Constituent> = {};

/**
 * Create a constituent from data.json and register it in the global registry.
 *
 * For null-coefficients, V₀ is derived lazily from members once they
 * are resolved (V₀ = Σ factor × V₀(member)).
 */
export function defineConstituent({
  name,
  speed,
  coefficients,
  aliases = [],
  members: memberRefs,
}: DefineConstituentOptions): Constituent {
  let resolvedMembers: ConstituentMember[] | null = null;

  const constituent: Constituent = {
    name,
    speed,
    aliases,
    coefficients,

    get members() {
      if (!resolvedMembers) {
        if (memberRefs) {
          resolvedMembers = memberRefs.map(([name, factor]) => {
            const constituent = constituents[name];
            return { constituent, factor };
          });
        } else {
          resolvedMembers = [];
        }
      }

      return resolvedMembers;
    },

    value(astro: AstroData): number {
      let v: number;
      if (coefficients) {
        v = computeV0(coefficients, astro);
      } else {
        // Null-coefficients compound: derive V₀ from structural members
        v = 0;
        for (const { constituent: c, factor } of constituent.members) {
          v += c.value(astro) * factor;
        }
      }
      return ((v % 360) + 360) % 360;
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
