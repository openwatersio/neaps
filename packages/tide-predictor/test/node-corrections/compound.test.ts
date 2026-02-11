import { describe, it, expect } from "vitest";
import {
  parseName,
  resolveSigns,
  decomposeCompound,
  computeCompoundCorrection,
  normalizeAnnualVariant,
} from "../../src/node-corrections/compound.js";
import { ihoStrategy } from "../../src/node-corrections/iho.js";
import astro from "../../src/astronomy/index.js";
import constituents from "../../src/constituents/index.js";
import data from "../../src/constituents/data.json" with { type: "json" };
import type { AstroData, NodalCorrection } from "../../src/node-corrections/types.js";

const sampleTime = new Date("2019-10-04T10:15:40.010Z");
const testAstro = astro(sampleTime);

// ─── parseName ──────────────────────────────────────────────────────────────

describe("parseName", () => {
  it("parses simple two-letter compounds", () => {
    expect(parseName("MS4")).toEqual({
      tokens: [
        { letter: "M", multiplier: 1 },
        { letter: "S", multiplier: 1 },
      ],
      targetSpecies: 4,
    });
  });

  it("parses leading multiplier", () => {
    expect(parseName("2MN6")).toEqual({
      tokens: [
        { letter: "M", multiplier: 2 },
        { letter: "N", multiplier: 1 },
      ],
      targetSpecies: 6,
    });
  });

  it("parses internal multiplier", () => {
    expect(parseName("3M2S2")).toEqual({
      tokens: [
        { letter: "M", multiplier: 3 },
        { letter: "S", multiplier: 2 },
      ],
      targetSpecies: 2,
    });
  });

  it("parses three-letter compounds", () => {
    expect(parseName("MSK5")).toEqual({
      tokens: [
        { letter: "M", multiplier: 1 },
        { letter: "S", multiplier: 1 },
        { letter: "K", multiplier: 1 },
      ],
      targetSpecies: 5,
    });
  });

  it("parses parenthesized groups", () => {
    expect(parseName("2(MN)S6")).toEqual({
      tokens: [
        { letter: "M", multiplier: 2 },
        { letter: "N", multiplier: 2 },
        { letter: "S", multiplier: 1 },
      ],
      targetSpecies: 6,
    });
  });

  it("parses parenthesized groups mid-name", () => {
    expect(parseName("M(SK)2")).toEqual({
      tokens: [
        { letter: "M", multiplier: 1 },
        { letter: "S", multiplier: 1 },
        { letter: "K", multiplier: 1 },
      ],
      targetSpecies: 2,
    });
  });

  it("parses multi-char token nu", () => {
    expect(parseName("MnuS2")).toEqual({
      tokens: [
        { letter: "M", multiplier: 1 },
        { letter: "nu", multiplier: 1 },
        { letter: "S", multiplier: 1 },
      ],
      targetSpecies: 2,
    });
  });

  it("parses nu at start", () => {
    expect(parseName("nuK1")).toEqual({
      tokens: [
        { letter: "nu", multiplier: 1 },
        { letter: "K", multiplier: 1 },
      ],
      targetSpecies: 1,
    });
  });

  it("parses multi-char token lambda", () => {
    expect(parseName("lambdaO1")).toEqual({
      tokens: [
        { letter: "lambda", multiplier: 1 },
        { letter: "O", multiplier: 1 },
      ],
      targetSpecies: 1,
    });
  });

  it("parses multi-digit species", () => {
    expect(parseName("M10")).toEqual({
      tokens: [{ letter: "M", multiplier: 1 }],
      targetSpecies: 10,
    });
  });

  it("parses multi-digit species with multiplier", () => {
    expect(parseName("5MNS10")).toEqual({
      tokens: [
        { letter: "M", multiplier: 5 },
        { letter: "N", multiplier: 1 },
        { letter: "S", multiplier: 1 },
      ],
      targetSpecies: 10,
    });
  });

  it("throws for unknown letter outside parenthesized group", () => {
    expect(() => parseName("MA4")).toThrow('unknown letter "A"');
    expect(() => parseName("MB5")).toThrow('unknown letter "B"');
  });

  it("throws for unknown letter inside parenthesized group", () => {
    expect(() => parseName("(MA)4")).toThrow('unknown letter "A"');
    expect(() => parseName("2(AB)4")).toThrow('unknown letter "A"');
  });

  it("throws for unrecognized character inside parenthesized group", () => {
    expect(() => parseName("(x)4")).toThrow("unrecognized character");
  });

  it("throws for names with no trailing digits", () => {
    expect(() => parseName("2SMN")).toThrow("no trailing species digits");
  });

  it("throws for trailing multiplier with no letter after it", () => {
    expect(() => parseName("34")).toThrow("trailing digits with no letter");
  });

  it("throws for empty parenthesized group", () => {
    expect(() => parseName("M()4")).toThrow("empty parenthesized group");
  });

  it("throws for unclosed parenthesized group", () => {
    expect(() => parseName("(MN4")).toThrow("unclosed parenthesized group");
  });

  it("throws for species 0", () => {
    expect(() => parseName("M0")).toThrow("species is 0");
  });

  it("throws for unrecognized lowercase character", () => {
    expect(() => parseName("Mx4")).toThrow("unrecognized character");
  });
});

// ─── resolveSigns ───────────────────────────────────────────────────────────

describe("resolveSigns", () => {
  it("all positive when species matches (MS4 = M2 + S2)", () => {
    const result = resolveSigns(
      [
        { letter: "M", multiplier: 1 },
        { letter: "S", multiplier: 1 },
      ],
      4,
    );
    expect(result).toEqual([
      { fundamentalKey: "M2", multiplier: 1, sign: 1 },
      { fundamentalKey: null, multiplier: 1, sign: 1 },
    ]);
  });

  it("all positive with multiplier (2MN6 = 2×M2 + N2)", () => {
    const result = resolveSigns(
      [
        { letter: "M", multiplier: 2 },
        { letter: "N", multiplier: 1 },
      ],
      6,
    );
    expect(result).toEqual([
      { fundamentalKey: "M2", multiplier: 2, sign: 1 },
      { fundamentalKey: "M2", multiplier: 1, sign: 1 },
    ]);
  });

  it("flips rightmost sign (4MN6 = 4×M2 − N2)", () => {
    const result = resolveSigns(
      [
        { letter: "M", multiplier: 4 },
        { letter: "N", multiplier: 1 },
      ],
      6,
    );
    expect(result).toEqual([
      { fundamentalKey: "M2", multiplier: 4, sign: 1 },
      { fundamentalKey: "M2", multiplier: 1, sign: -1 },
    ]);
  });

  it("flips for diurnal (MP1 = M2 − P1)", () => {
    const result = resolveSigns(
      [
        { letter: "M", multiplier: 1 },
        { letter: "P", multiplier: 1 },
      ],
      1,
    );
    expect(result).toEqual([
      { fundamentalKey: "M2", multiplier: 1, sign: 1 },
      { fundamentalKey: null, multiplier: 1, sign: -1 },
    ]);
  });

  it("flips with internal multiplier (3M2S2 = 3×M2 − 2×S2)", () => {
    const result = resolveSigns(
      [
        { letter: "M", multiplier: 3 },
        { letter: "S", multiplier: 2 },
      ],
      2,
    );
    expect(result).toEqual([
      { fundamentalKey: "M2", multiplier: 3, sign: 1 },
      { fundamentalKey: null, multiplier: 2, sign: -1 },
    ]);
  });

  it("resolves K as K1 (MK3 = M2 + K1)", () => {
    const result = resolveSigns(
      [
        { letter: "M", multiplier: 1 },
        { letter: "K", multiplier: 1 },
      ],
      3,
    );
    expect(result).toEqual([
      { fundamentalKey: "M2", multiplier: 1, sign: 1 },
      { fundamentalKey: "K1", multiplier: 1, sign: 1 },
    ]);
  });

  it("resolves K as K2 (MK4 = M2 + K2)", () => {
    const result = resolveSigns(
      [
        { letter: "M", multiplier: 1 },
        { letter: "K", multiplier: 1 },
      ],
      4,
    );
    expect(result).toEqual([
      { fundamentalKey: "M2", multiplier: 1, sign: 1 },
      { fundamentalKey: "K2", multiplier: 1, sign: 1 },
    ]);
  });

  it("resolves K as K1 with sign flip (2MK3 = 2×M2 − K1)", () => {
    const result = resolveSigns(
      [
        { letter: "M", multiplier: 2 },
        { letter: "K", multiplier: 1 },
      ],
      3,
    );
    expect(result).toEqual([
      { fundamentalKey: "M2", multiplier: 2, sign: 1 },
      { fundamentalKey: "K1", multiplier: 1, sign: -1 },
    ]);
  });

  it("resolves K as K2 with sign flip (4MK6 = 4×M2 − K2)", () => {
    const result = resolveSigns(
      [
        { letter: "M", multiplier: 4 },
        { letter: "K", multiplier: 1 },
      ],
      6,
    );
    expect(result).toEqual([
      { fundamentalKey: "M2", multiplier: 4, sign: 1 },
      { fundamentalKey: "K2", multiplier: 1, sign: -1 },
    ]);
  });

  it("resolves MSK5 = M2 + S2 + K1", () => {
    const result = resolveSigns(
      [
        { letter: "M", multiplier: 1 },
        { letter: "S", multiplier: 1 },
        { letter: "K", multiplier: 1 },
      ],
      5,
    );
    expect(result).toEqual([
      { fundamentalKey: "M2", multiplier: 1, sign: 1 },
      { fundamentalKey: null, multiplier: 1, sign: 1 },
      { fundamentalKey: "K1", multiplier: 1, sign: 1 },
    ]);
  });

  it("resolves MSK6 = M2 + S2 + K2", () => {
    const result = resolveSigns(
      [
        { letter: "M", multiplier: 1 },
        { letter: "S", multiplier: 1 },
        { letter: "K", multiplier: 1 },
      ],
      6,
    );
    expect(result).toEqual([
      { fundamentalKey: "M2", multiplier: 1, sign: 1 },
      { fundamentalKey: null, multiplier: 1, sign: 1 },
      { fundamentalKey: "K2", multiplier: 1, sign: 1 },
    ]);
  });

  it("single-letter direct species match (M with species=2)", () => {
    const result = resolveSigns([{ letter: "M", multiplier: 1 }], 2);
    expect(result).toEqual([{ fundamentalKey: "M2", multiplier: 1, sign: 1 }]);
  });

  it("expands single-letter overtide (M4 = M2 × M2)", () => {
    const result = resolveSigns([{ letter: "M", multiplier: 1 }], 4);
    expect(result).toEqual([{ fundamentalKey: "M2", multiplier: 2, sign: 1 }]);
  });

  it("expands single-letter overtide (M6 = M2 × M2 × M2)", () => {
    const result = resolveSigns([{ letter: "M", multiplier: 1 }], 6);
    expect(result).toEqual([{ fundamentalKey: "M2", multiplier: 3, sign: 1 }]);
  });

  it("expands single-letter overtide (S4 = S2 × S2, still UNITY)", () => {
    const result = resolveSigns([{ letter: "S", multiplier: 1 }], 4);
    expect(result).toEqual([{ fundamentalKey: null, multiplier: 2, sign: 1 }]);
  });

  it("flips multiple signs from right (2KM(SN)2 with K2)", () => {
    // 2K + M + S + N, target 2
    // K2: 4+2+2+2=10, flip N: 6, flip S: 2 ✓
    const result = resolveSigns(
      [
        { letter: "K", multiplier: 2 },
        { letter: "M", multiplier: 1 },
        { letter: "S", multiplier: 1 },
        { letter: "N", multiplier: 1 },
      ],
      2,
    );
    expect(result).toEqual([
      { fundamentalKey: "K2", multiplier: 2, sign: 1 },
      { fundamentalKey: "M2", multiplier: 1, sign: 1 },
      { fundamentalKey: null, multiplier: 1, sign: -1 },
      { fundamentalKey: "M2", multiplier: 1, sign: -1 },
    ]);
  });

  it("resolves 2SM2 = 2×S2 − M2", () => {
    const result = resolveSigns(
      [
        { letter: "S", multiplier: 2 },
        { letter: "M", multiplier: 1 },
      ],
      2,
    );
    expect(result).toEqual([
      { fundamentalKey: null, multiplier: 2, sign: 1 },
      { fundamentalKey: "M2", multiplier: 1, sign: -1 },
    ]);
  });

  it("returns null for impossible decomposition", () => {
    // M + S = 4, need 3, can't reach
    const result = resolveSigns(
      [
        { letter: "M", multiplier: 1 },
        { letter: "S", multiplier: 1 },
      ],
      3,
    );
    expect(result).toBeNull();
  });

  it("resolves J letter (KJ2 = K1 + J1)", () => {
    const result = resolveSigns(
      [
        { letter: "K", multiplier: 1 },
        { letter: "J", multiplier: 1 },
      ],
      2,
    );
    expect(result).toEqual([
      { fundamentalKey: "K1", multiplier: 1, sign: 1 },
      { fundamentalKey: "J1", multiplier: 1, sign: 1 },
    ]);
  });

  it("resolves L letter (ML4 = M2 + L2)", () => {
    const result = resolveSigns(
      [
        { letter: "M", multiplier: 1 },
        { letter: "L", multiplier: 1 },
      ],
      4,
    );
    expect(result).toEqual([
      { fundamentalKey: "M2", multiplier: 1, sign: 1 },
      { fundamentalKey: "L2", multiplier: 1, sign: 1 },
    ]);
  });

  it("resolves O and Q letters (OQ2 = O1 + Q1)", () => {
    const result = resolveSigns(
      [
        { letter: "O", multiplier: 1 },
        { letter: "Q", multiplier: 1 },
      ],
      2,
    );
    expect(result).toEqual([
      { fundamentalKey: "O1", multiplier: 1, sign: 1 },
      { fundamentalKey: "O1", multiplier: 1, sign: 1 },
    ]);
  });
});

// ─── decomposeCompound ──────────────────────────────────────────────────────

describe("decomposeCompound", () => {
  it("decomposes a simple compound", () => {
    const result = decomposeCompound("MS4", 4);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
  });

  it("decomposes MA annual variants (IHO Annex B)", () => {
    // MA4 should decompose as M4 (= M2 × M2)
    const ma4 = decomposeCompound("MA4", 4);
    expect(ma4).not.toBeNull();
    expect(ma4).toEqual([{ fundamentalKey: "M2", multiplier: 2, sign: 1 }]);

    // MA6 should decompose as M6 (= M2 × M2 × M2)
    const ma6 = decomposeCompound("MA6", 6);
    expect(ma6).not.toBeNull();
    expect(ma6).toEqual([{ fundamentalKey: "M2", multiplier: 3, sign: 1 }]);
  });

  it("MB5 attempts to decompose as M5", () => {
    // MB5 should try to decompose as M5, but M5 (single letter, species 5)
    // doesn't match the single-letter overtide rule, so it returns null
    const mb5 = decomposeCompound("MB5", 5);
    expect(mb5).toBeNull();
  });

  it("returns null for unparseable names", () => {
    expect(decomposeCompound("XYZ", 0)).toBeNull();
    expect(decomposeCompound("MSm", 0)).toBeNull();
  });

  it("handles null-XDO entries (species=0, trailing digits)", () => {
    // 3SM4 has null XDO, so species=0 from coefficients
    // But trailing "4" in the name gives the actual species
    const result = decomposeCompound("3SM4", 0);
    expect(result).not.toBeNull();
  });

  it("caches results", () => {
    const a = decomposeCompound("MN4", 4);
    const b = decomposeCompound("MN4", 4);
    expect(a).toBe(b); // same reference
  });
});

// ─── computeCompoundCorrection ──────────────────────────────────────────────

describe("computeCompoundCorrection", () => {
  // Helper: get fundamental correction via ihoStrategy
  const getFundamental = (name: string, a: AstroData): NodalCorrection => {
    // Use ihoStrategy.compute with code "y" to look up a fundamental
    return ihoStrategy.compute("y", name, 0, a);
  };

  it("MS4 = M2 + S2: f=f_M2, u=u_M2", () => {
    const components = decomposeCompound("MS4", 4)!;
    const result = computeCompoundCorrection(components, getFundamental, testAstro);
    const m2 = getFundamental("M2", testAstro);

    expect(result.f).toBeCloseTo(m2.f, 10);
    expect(result.u).toBeCloseTo(m2.u, 10);
  });

  it("MN4 = M2 + N2: f=f_M2², u=2*u_M2", () => {
    const components = decomposeCompound("MN4", 4)!;
    const result = computeCompoundCorrection(components, getFundamental, testAstro);
    const m2 = getFundamental("M2", testAstro);

    expect(result.f).toBeCloseTo(m2.f * m2.f, 10);
    expect(result.u).toBeCloseTo(2 * m2.u, 10);
  });

  it("2MK3 = 2×M2 − K1: f=f_M2²·f_K1, u=2u_M2−u_K1", () => {
    const components = decomposeCompound("2MK3", 3)!;
    const result = computeCompoundCorrection(components, getFundamental, testAstro);
    const m2 = getFundamental("M2", testAstro);
    const k1 = getFundamental("K1", testAstro);

    expect(result.f).toBeCloseTo(m2.f * m2.f * k1.f, 10);
    expect(result.u).toBeCloseTo(2 * m2.u - k1.u, 10);
  });

  it("KO2 = K1 + O1: f=f_K1·f_O1, u=u_K1+u_O1", () => {
    const components = decomposeCompound("KO2", 2)!;
    const result = computeCompoundCorrection(components, getFundamental, testAstro);
    const k1 = getFundamental("K1", testAstro);
    const o1 = getFundamental("O1", testAstro);

    expect(result.f).toBeCloseTo(k1.f * o1.f, 10);
    expect(result.u).toBeCloseTo(k1.u + o1.u, 10);
  });

  it("2SM2 = 2×S2 − M2: f=f_M2, u=−u_M2", () => {
    const components = decomposeCompound("2SM2", 2)!;
    const result = computeCompoundCorrection(components, getFundamental, testAstro);
    const m2 = getFundamental("M2", testAstro);

    expect(result.f).toBeCloseTo(m2.f, 10);
    expect(result.u).toBeCloseTo(-m2.u, 10);
  });

  it("M4 (single-letter overtide): f=f_M2², u=2*u_M2", () => {
    const components = decomposeCompound("M4", 4)!;
    const result = computeCompoundCorrection(components, getFundamental, testAstro);
    const m2 = getFundamental("M2", testAstro);

    expect(result.f).toBeCloseTo(m2.f * m2.f, 10);
    expect(result.u).toBeCloseTo(2 * m2.u, 10);
  });

  it("S4 (solar overtide): f=1, u=0 (all UNITY)", () => {
    const components = decomposeCompound("S4", 4)!;
    const result = computeCompoundCorrection(components, getFundamental, testAstro);

    expect(result.f).toBe(1);
    expect(result.u).toBe(0);
  });

  it("4MN6 = 4×M2 − N2: f=f_M2⁵, u=3*u_M2", () => {
    const components = decomposeCompound("4MN6", 6)!;
    const result = computeCompoundCorrection(components, getFundamental, testAstro);
    const m2 = getFundamental("M2", testAstro);

    // f = f_M2^4 × f_N2^1 = f_M2^4 × f_M2 = f_M2^5
    expect(result.f).toBeCloseTo(Math.pow(m2.f, 5), 10);
    // u = 4*u_M2 - u_N2 = 4*u_M2 - u_M2 = 3*u_M2
    expect(result.u).toBeCloseTo(3 * m2.u, 10);
  });

  it("ML4 = M2 + L2: uses L2 fundamental correction", () => {
    const components = decomposeCompound("ML4", 4)!;
    const result = computeCompoundCorrection(components, getFundamental, testAstro);
    const m2 = getFundamental("M2", testAstro);
    const l2 = getFundamental("L2", testAstro);

    expect(result.f).toBeCloseTo(m2.f * l2.f, 10);
    expect(result.u).toBeCloseTo(m2.u + l2.u, 10);
  });
});

// ─── Integration: ihoStrategy.compute with code "x" ────────────────────────

describe("ihoStrategy.compute with code x", () => {
  it("returns non-UNITY for decomposable compounds", () => {
    const result = ihoStrategy.compute("x", "MS4", 4, testAstro);
    expect(result.f).not.toBe(1);
    expect(result.u).not.toBe(0);
  });

  it("returns non-UNITY for MA annual variants (IHO Annex B)", () => {
    // MA4 should decompose as M4 and return non-UNITY values
    const result = ihoStrategy.compute("x", "MA4", 4, testAstro);
    expect(result.f).not.toBe(1);
    expect(result.u).not.toBe(0);
  });

  it("MS4 matches code m (both = M2 correction)", () => {
    const xResult = ihoStrategy.compute("x", "MS4", 4, testAstro);
    const mResult = ihoStrategy.compute("m", "MS4", 2, testAstro);
    expect(xResult.f).toBeCloseTo(mResult.f, 10);
    expect(xResult.u).toBeCloseTo(mResult.u, 10);
  });

  it("2SM2 matches code b (both = M2 with negated u)", () => {
    // 2SM2 = 2S2 − M2: u = −u_M2, f = f_M2
    const xResult = ihoStrategy.compute("x", "2SM2", 2, testAstro);
    const bResult = ihoStrategy.compute("b", "2SM2", 2, testAstro);
    expect(xResult.f).toBeCloseTo(bResult.f, 10);
    expect(xResult.u).toBeCloseTo(bResult.u, 10);
  });
});

// ─── All 328 "x" constituents ───────────────────────────────────────────────

describe("all x-code constituents", () => {
  const xEntries = data.filter((d: { nodalCorrection: string }) => d.nodalCorrection === "x");

  // Fundamental speeds for cross-checking decompositions
  const fundamentalSpeeds: Record<string, number> = {
    M2: constituents.M2.speed,
    S2: constituents.S2.speed,
    N2: constituents.N2.speed,
    K1: constituents.K1.speed,
    K2: constituents.K2.speed,
    O1: constituents.O1.speed,
    P1: constituents.P1.speed,
    Q1: constituents.Q1.speed,
    J1: constituents.J1.speed,
    T2: constituents.T2.speed,
    R2: constituents.R2.speed,
    L2: constituents.L2.speed,
  };

  // Map letter to speed for validation.
  // Note: nu and lambda have their own speeds (different from N2).
  const letterSpeed: Record<string, number> = {
    M: fundamentalSpeeds.M2,
    S: fundamentalSpeeds.S2,
    N: fundamentalSpeeds.N2,
    K1: fundamentalSpeeds.K1,
    K2: fundamentalSpeeds.K2,
    O: fundamentalSpeeds.O1,
    P: fundamentalSpeeds.P1,
    Q: fundamentalSpeeds.Q1,
    J: fundamentalSpeeds.J1,
    T: fundamentalSpeeds.T2,
    R: fundamentalSpeeds.R2,
    L: fundamentalSpeeds.L2,
    nu: 28.5125832, // ν₂ speed (NOT same as N₂)
    lambda: 29.4556253, // λ₂ speed
  };

  it(`has ${xEntries.length} x-code constituents`, () => {
    expect(xEntries.length).toBe(328);
  });

  const xMapped = xEntries.map((d: { name: string; xdo: number[] | null; speed: number }) => ({
    name: d.name,
    species: d.xdo ? d.xdo[0] : 0,
    speed: d.speed,
  }));

  it.each(xMapped)("$name: parses and decomposes without error", ({ name, species }) => {
    expect(() => decomposeCompound(name, species)).not.toThrow();
  });

  // Filter to entries that decompose successfully (parseName may fail for
  // non-standard names, and resolveSigns may return null).
  const decomposable = xMapped.filter(({ name, species }) => {
    return decomposeCompound(name, species) !== null;
  });

  it.each(decomposable)("$name: produces finite f > 0 and finite u", ({ name, species }) => {
    const components = decomposeCompound(name, species)!;
    const getFundamental = (n: string, a: AstroData): NodalCorrection =>
      ihoStrategy.compute("y", n, 0, a);

    const result = computeCompoundCorrection(components, getFundamental, testAstro);

    expect(result.f).toBeGreaterThan(0);
    expect(Number.isFinite(result.f)).toBe(true);
    expect(Number.isFinite(result.u)).toBe(true);
  });

  // Speed cross-check: verify that the decomposition approximately matches the
  // actual speed. Tolerance is 0.6 deg/hr because some compound names are
  // approximations for nodal correction purposes — their XDO-derived speeds
  // can differ from simple sums of component speeds (e.g. annual modulation
  // terms in parenthesized names, or constituents like 2NKMS5 whose XDO
  // coefficients don't exactly match the letter decomposition).
  it.each(decomposable)(
    "$name: decomposed speed matches data speed ($speed)",
    ({ name, species, speed }) => {
      // Handle MA/MB annual variants
      const nameToDecompose = normalizeAnnualVariant(name);

      const parsed = parseName(nameToDecompose);
      const components = resolveSigns(parsed.tokens, species > 0 ? species : parsed.targetSpecies)!;

      let computedSpeed = 0;
      for (let i = 0; i < parsed.tokens.length; i++) {
        const letter = parsed.tokens[i].letter;
        const comp = components[i];

        let fundSpeed: number;
        if (letter === "K") {
          fundSpeed = comp.fundamentalKey === "K1" ? letterSpeed.K1 : letterSpeed.K2;
        } else {
          fundSpeed = letterSpeed[letter];
        }

        computedSpeed += comp.sign * comp.multiplier * fundSpeed;
      }

      expect(Math.abs(computedSpeed - speed)).toBeLessThan(0.6);
    },
  );
});
