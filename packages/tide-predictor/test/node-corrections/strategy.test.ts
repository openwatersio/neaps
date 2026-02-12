import { describe, it, expect } from "vitest";
import { ihoStrategy } from "../../src/node-corrections/iho.js";
import astro from "../../src/astronomy/index.js";
import constituents from "../../src/constituents/index.js";
import type { Constituent } from "../../src/constituents/definition.js";

const sampleTime = new Date("2019-10-04T10:15:40.010Z");
const testAstro = astro(sampleTime);

describe("strategy.compute", () => {
  // ─── UNITY (members: null) ──────────────────────────────────────────

  it("returns UNITY when constituent is not a fundamental and has no members", () => {
    const c: Constituent = {
      names: ["S2"],
      coefficients: [2],
      members: null,
      speed: 0,
      value: () => 0,
    };
    const result = ihoStrategy.compute(c, testAstro);
    expect(result).toEqual({ f: 1, u: 0 });
  });

  // ─── Fundamentals (resolved by name) ─────────────────────────────────

  it("M2 resolves as fundamental", () => {
    const result = ihoStrategy.compute(constituents.M2, testAstro);
    const m2 = ihoStrategy.get("M2", testAstro);
    expect(result.f).toBeCloseTo(m2.f, 10);
    expect(result.u).toBeCloseTo(m2.u, 10);
  });

  it("Mm resolves as fundamental", () => {
    const result = ihoStrategy.compute(constituents.Mm, testAstro);
    const mm = ihoStrategy.get("Mm", testAstro);
    expect(result.f).toBeCloseTo(mm.f, 10);
    expect(result.u).toBeCloseTo(mm.u, 10);
  });

  it("O1 resolves as fundamental", () => {
    const result = ihoStrategy.compute(constituents.O1, testAstro);
    const o1 = ihoStrategy.get("O1", testAstro);
    expect(result.f).toBeCloseTo(o1.f, 10);
    expect(result.u).toBeCloseTo(o1.u, 10);
  });

  it("K1 resolves as fundamental", () => {
    const result = ihoStrategy.compute(constituents.K1, testAstro);
    const k1 = ihoStrategy.get("K1", testAstro);
    expect(result.f).toBeCloseTo(k1.f, 10);
    expect(result.u).toBeCloseTo(k1.u, 10);
  });

  it("J1 resolves as fundamental", () => {
    const result = ihoStrategy.compute(constituents.J1, testAstro);
    const j1 = ihoStrategy.get("J1", testAstro);
    expect(result.f).toBeCloseTo(j1.f, 10);
    expect(result.u).toBeCloseTo(j1.u, 10);
  });

  it("K2 resolves as fundamental", () => {
    const result = ihoStrategy.compute(constituents.K2, testAstro);
    const k2 = ihoStrategy.get("K2", testAstro);
    expect(result.f).toBeCloseTo(k2.f, 10);
    expect(result.u).toBeCloseTo(k2.u, 10);
  });

  // ─── M2-derived corrections ────────────────────────────────────────

  it("code 'b' (negated M2): f=f_M2, u=-u_M2", () => {
    // MSf has code 'b' → members: [{ M2, -1 }]
    const m2 = ihoStrategy.get("M2", testAstro);
    const result = ihoStrategy.compute(constituents.MSf, testAstro);
    expect(result.f).toBeCloseTo(m2.f, 10);
    expect(result.u).toBeCloseTo(-m2.u, 10);
  });

  it("code 'g' (M2^(species/2)): species=4", () => {
    const m2 = ihoStrategy.get("M2", testAstro);
    const result = ihoStrategy.compute(constituents.M4, testAstro);
    // M4 has species=4, so factor=species/2=2
    expect(result.f).toBeCloseTo(m2.f * m2.f, 10);
    expect(result.u).toBeCloseTo(2 * m2.u, 10);
  });

  // ─── Compound codes ────────────────────────────────────────────────

  it("code 'p' (2MN2): f=f(M2)^3, u=u(M2)", () => {
    const m2 = ihoStrategy.get("M2", testAstro);
    const result = ihoStrategy.compute(constituents.L2A, testAstro);
    expect(result.f).toBeCloseTo(Math.pow(m2.f, 3), 10);
    expect(result.u).toBeCloseTo(m2.u, 10);
  });

  it("code 'p' matches compound decomposition of 2MN2", () => {
    const pResult = ihoStrategy.compute(constituents.L2A, testAstro);
    const xResult = ihoStrategy.compute(constituents["2MN2"], testAstro);
    expect(pResult.f).toBeCloseTo(xResult.f, 10);
    expect(pResult.u).toBeCloseTo(xResult.u, 10);
  });

  it("code 'd' matches compound decomposition of KQ1 (K2-Q1)", () => {
    const dResult = ihoStrategy.compute(constituents.OO1, testAstro);
    const xResult = ihoStrategy.compute(constituents.KQ1, testAstro);
    expect(dResult.f).toBeCloseTo(xResult.f, 10);
    expect(dResult.u).toBeCloseTo(xResult.u, 10);
  });

  it("code 'q' (NKM2): f=f(M2)^2·f(K2), u=u(K2)", () => {
    const m2 = ihoStrategy.get("M2", testAstro);
    const k2 = ihoStrategy.get("K2", testAstro);
    const result = ihoStrategy.compute(constituents.L2B, testAstro);
    expect(result.f).toBeCloseTo(m2.f * m2.f * k2.f, 10);
    expect(result.u).toBeCloseTo(k2.u, 10);
  });

  it("code 'q' matches compound decomposition of NKM2", () => {
    const qResult = ihoStrategy.compute(constituents.L2B, testAstro);
    const xResult = ihoStrategy.compute(constituents.NKM2, testAstro);
    expect(qResult.f).toBeCloseTo(xResult.f, 10);
    expect(qResult.u).toBeCloseTo(xResult.u, 10);
  });

  // ─── Compound code 'x' ─────────────────────────────────────────────

  it("code 'x' decomposes compound name (MS4 = M2+S2)", () => {
    const result = ihoStrategy.compute(constituents.MS4, testAstro);
    const m2 = ihoStrategy.get("M2", testAstro);
    expect(result.f).toBeCloseTo(m2.f, 10);
    expect(result.u).toBeCloseTo(m2.u, 10);
  });

  it("code 'x' returns non-UNITY for MA annual variants", () => {
    const result = ihoStrategy.compute(constituents.MA4, testAstro);
    expect(result.f).not.toBe(1);
    expect(result.u).not.toBe(0);
  });

  it("returns UNITY when members are null (unresolvable compound)", () => {
    const c: Constituent = {
      names: ["MS3"],
      coefficients: [3],
      members: null,
      speed: 0,
      value: () => 0,
    };
    const result = ihoStrategy.compute(c, testAstro);
    expect(result).toEqual({ f: 1, u: 0 });
  });
});
