import type { AstroData } from "../astronomy/index.js";
import type { NodalCorrectionCode } from "../node-corrections/types.js";

export interface Constituent {
  names: string[];
  coefficients: number[];
  nodalCorrectionCode: NodalCorrectionCode;
  speed: number;
  value: (astro: AstroData) => number;
}

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
 * Compute V₀ using XDO coefficients and standard astronomical arguments.
 * Uses N' = −N from the existing astronomy module's N value.
 */
export function computeV0(xdo: number[], astro: AstroData): number {
  const coeffs = xdoToCoefficients(xdo);
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
    sum += coeffs[i] * values[i];
  }
  return sum;
}

/**
 * Create a constituent from IHO data.json entry.
 * Stores nodal correction metadata; actual u/f are computed by the
 * prediction engine using a NodeCorrectionStrategy at prediction time.
 */
export function defineConstituentFromData(
  names: string[],
  speed: number,
  xdo: number[] | null,
  nodalCorrectionCode: NodalCorrectionCode,
): Constituent {
  const coefficients = xdo ? xdoToCoefficients(xdo) : new Array(7).fill(0);

  return Object.freeze({
    names,
    coefficients,
    nodalCorrectionCode,
    speed,

    value: (astro: AstroData): number => {
      if (!xdo) return 0;
      return computeV0(xdo, astro);
    },
  });
}

export interface ConstituentMember {
  constituent: Constituent;
  factor: number;
}

export function defineCompoundConstituent(
  names: string | string[],
  members: ConstituentMember[],
): Constituent {
  const coefficients: number[] = [];
  members.forEach(({ constituent, factor }) => {
    constituent.coefficients.forEach((coefficient, index) => {
      if (typeof coefficients[index] === "undefined") {
        coefficients[index] = 0;
      }
      coefficients[index] += coefficient * factor;
    });
  });

  const speed = members.reduce(
    (sum, { constituent, factor }) => sum + constituent.speed * factor,
    0,
  );

  return Object.freeze({
    names: Array.isArray(names) ? names : [names],
    coefficients,
    nodalCorrectionCode: "z" as NodalCorrectionCode,
    speed,

    value: (astro: AstroData): number => {
      let value = 0;
      members.forEach(({ constituent, factor }) => {
        value += constituent.value(astro) * factor;
      });
      return value;
    },
  });
}

// ─── Utility functions ───────────────────────────────────────────────────────

export function astronimicDoodsonNumber(astro: AstroData): AstroData[keyof AstroData][] {
  return [astro["T+h-s"], astro.s, astro.h, astro.p, astro.N, astro.pp, astro["90"]];
}

export function astronomicSpeed(astro: AstroData): number[] {
  const results: number[] = [];
  astronimicDoodsonNumber(astro).forEach((number) => {
    results.push(number.speed);
  });
  return results;
}

export function astronomicValues(astro: AstroData): number[] {
  const results: number[] = [];
  astronimicDoodsonNumber(astro).forEach((number) => {
    results.push(number.value);
  });
  return results;
}

export default {};
