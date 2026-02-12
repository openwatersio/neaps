import { describe, it, expect } from "vitest";
import { ihoStrategy } from "../../src/node-corrections/iho.js";
import astro from "../../src/astronomy/index.js";
import constituents from "../../src/constituents/index.js";

const sampleTime = new Date("2019-10-04T10:15:40.010Z");
const testAstro = astro(sampleTime);

// ─── Compound nodal corrections ─────────────────────────────────────────────

describe("compound nodal corrections", () => {
  it("MS4 = M2 + S2: f=f_M2, u=u_M2", () => {
    const result = ihoStrategy.compute(constituents.MS4, testAstro);
    const m2 = ihoStrategy.get("M2", testAstro);

    expect(result.f).toBeCloseTo(m2.f, 10);
    expect(result.u).toBeCloseTo(m2.u, 10);
  });

  it("MN4 = M2 + N2: f=f_M2², u=2*u_M2", () => {
    const result = ihoStrategy.compute(constituents.MN4, testAstro);
    const m2 = ihoStrategy.get("M2", testAstro);

    expect(result.f).toBeCloseTo(m2.f * m2.f, 10);
    expect(result.u).toBeCloseTo(2 * m2.u, 10);
  });

  it("2MK3 = 2×M2 − K1: f=f_M2²·f_K1, u=2u_M2−u_K1", () => {
    const result = ihoStrategy.compute(constituents["2MK3"], testAstro);
    const m2 = ihoStrategy.get("M2", testAstro);
    const k1 = ihoStrategy.get("K1", testAstro);

    expect(result.f).toBeCloseTo(m2.f * m2.f * k1.f, 10);
    expect(result.u).toBeCloseTo(2 * m2.u - k1.u, 10);
  });

  it("KO2 = K1 + O1: f=f_K1·f_O1, u=u_K1+u_O1", () => {
    const result = ihoStrategy.compute(constituents.KO2, testAstro);
    const k1 = ihoStrategy.get("K1", testAstro);
    const o1 = ihoStrategy.get("O1", testAstro);

    expect(result.f).toBeCloseTo(k1.f * o1.f, 10);
    expect(result.u).toBeCloseTo(k1.u + o1.u, 10);
  });

  it("2SM2 = 2×S2 − M2: f=f_M2, u=−u_M2", () => {
    const result = ihoStrategy.compute(constituents["2SM2"], testAstro);
    const m2 = ihoStrategy.get("M2", testAstro);

    expect(result.f).toBeCloseTo(m2.f, 10);
    expect(result.u).toBeCloseTo(-m2.u, 10);
  });

  it("M4 (single-letter overtide): f=f_M2², u=2*u_M2", () => {
    const result = ihoStrategy.compute(constituents.M4, testAstro);
    const m2 = ihoStrategy.get("M2", testAstro);

    expect(result.f).toBeCloseTo(m2.f * m2.f, 10);
    expect(result.u).toBeCloseTo(2 * m2.u, 10);
  });

  it("4MN6 = 4×M2 − N2: f=f_M2⁵, u=3*u_M2", () => {
    const result = ihoStrategy.compute(constituents["4MN6"], testAstro);
    const m2 = ihoStrategy.get("M2", testAstro);

    // f = f_M2^4 × f_N2^1 = f_M2^4 × f_M2 = f_M2^5
    expect(result.f).toBeCloseTo(Math.pow(m2.f, 5), 10);
    // u = 4*u_M2 - u_N2 = 4*u_M2 - u_M2 = 3*u_M2
    expect(result.u).toBeCloseTo(3 * m2.u, 10);
  });

  it("ML4 = M2 + L2: uses L2 fundamental correction", () => {
    const result = ihoStrategy.compute(constituents.ML4, testAstro);
    const m2 = ihoStrategy.get("M2", testAstro);
    const l2 = ihoStrategy.get("L2", testAstro);

    expect(result.f).toBeCloseTo(m2.f * l2.f, 10);
    expect(result.u).toBeCloseTo(m2.u + l2.u, 10);
  });

  it("all constituents with members produce finite f > 0 and finite u", () => {
    for (const [name, c] of Object.entries(constituents)) {
      if (!c.members) continue;
      const result = ihoStrategy.compute(c, testAstro);
      expect(result.f, `${name}: f`).toBeGreaterThan(0);
      expect(Number.isFinite(result.f), `${name}: f finite`).toBe(true);
      expect(Number.isFinite(result.u), `${name}: u finite`).toBe(true);
    }
  });
});
