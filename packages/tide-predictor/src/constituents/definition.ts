import type { AstroData } from "../astronomy/index.js";

export interface ConstituentMember {
  constituent: Constituent;
  factor: number;
}

export interface Constituent {
  names: string[];
  coefficients: number[];
  members: ConstituentMember[] | null;
  speed: number;
  value: (astro: AstroData) => number;
}

const ZERO_COEFFICIENTS: number[] = Object.freeze([0, 0, 0, 0, 0, 0, 0]) as number[];

// ─── XDO-based constituent creation ──────────────────────────────────────────

/**
 * Convert XDO digit array to Doodson coefficients.
 * D₁ is the τ coefficient (NOT offset). D₂–D₆ are each offset by 5.
 * D₇ (90° phase) is negated to convert from IHO XDO convention to the
 * Schureman/NOAA convention used by published harmonic constants.
 */
export function xdoToCoefficients(xdo: number[]): number[] {
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
export function computeV0(coefficients: number[], astro: AstroData): number {
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
 * Create a constituent from IHO data.json entry.
 *
 * Returns an unfrozen object with `members: null` — the caller resolves
 * members and freezes the object (see buildConstituents).
 *
 * For null-XDO compounds, V₀ is derived lazily from members once they
 * are resolved (V₀ = Σ factor × V₀(member)).
 */
export function defineConstituent(
  names: string[],
  speed: number,
  xdo: number[] | null,
): Constituent {
  const coefficients = xdo ? xdoToCoefficients(xdo) : ZERO_COEFFICIENTS;

  const constituent: Constituent = {
    names,
    coefficients,
    members: null,
    speed,

    value: (astro: AstroData): number => {
      if (xdo) return computeV0(coefficients, astro);

      // Null-XDO compound: derive V₀ from structural members
      if (!constituent.members) return 0;
      let v = 0;
      for (const { constituent: c, factor } of constituent.members) {
        v += c.value(astro) * factor;
      }
      return v;
    },
  };

  return constituent;
}
