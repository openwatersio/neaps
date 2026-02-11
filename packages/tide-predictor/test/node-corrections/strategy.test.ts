import { describe, it, expect } from "vitest";
import { ihoStrategy } from "../../src/node-corrections/iho.js";
import astro from "../../src/astronomy/index.js";

const sampleTime = new Date("2019-10-04T10:15:40.010Z");
const testAstro = astro(sampleTime);

describe("strategy code dispatch", () => {
  // ─── UNITY codes ────────────────────────────────────────────────────────

  it("code 'z' returns UNITY", () => {
    const result = ihoStrategy.compute("z", "M2", 2, testAstro);
    expect(result).toEqual({ f: 1, u: 0 });
  });

  it("code 'f' returns UNITY", () => {
    const result = ihoStrategy.compute("f", "M2", 2, testAstro);
    expect(result).toEqual({ f: 1, u: 0 });
  });

  // ─── Direct fundamental references ────────────────────────────────────

  it("code 'y' looks up by constituent name", () => {
    const yResult = ihoStrategy.compute("y", "M2", 2, testAstro);
    const mResult = ihoStrategy.compute("m", "anything", 2, testAstro);
    // Both should give M2 correction
    expect(yResult.f).toBeCloseTo(mResult.f, 10);
    expect(yResult.u).toBeCloseTo(mResult.u, 10);
  });

  it("code 'a' returns Mm correction", () => {
    const aResult = ihoStrategy.compute("a", "anything", 0, testAstro);
    const yResult = ihoStrategy.compute("y", "Mm", 0, testAstro);
    expect(aResult.f).toBeCloseTo(yResult.f, 10);
    expect(aResult.u).toBeCloseTo(yResult.u, 10);
  });

  it("code 'm' returns M2 correction", () => {
    const mResult = ihoStrategy.compute("m", "anything", 2, testAstro);
    const yResult = ihoStrategy.compute("y", "M2", 2, testAstro);
    expect(mResult.f).toBeCloseTo(yResult.f, 10);
    expect(mResult.u).toBeCloseTo(yResult.u, 10);
  });

  it("code 'o' returns O1 correction", () => {
    const oResult = ihoStrategy.compute("o", "anything", 1, testAstro);
    const yResult = ihoStrategy.compute("y", "O1", 1, testAstro);
    expect(oResult.f).toBeCloseTo(yResult.f, 10);
    expect(oResult.u).toBeCloseTo(yResult.u, 10);
  });

  it("code 'k' returns K1 correction", () => {
    const kResult = ihoStrategy.compute("k", "anything", 1, testAstro);
    const yResult = ihoStrategy.compute("y", "K1", 1, testAstro);
    expect(kResult.f).toBeCloseTo(yResult.f, 10);
    expect(kResult.u).toBeCloseTo(yResult.u, 10);
  });

  it("code 'j' returns J1 correction", () => {
    const jResult = ihoStrategy.compute("j", "anything", 1, testAstro);
    const yResult = ihoStrategy.compute("y", "J1", 1, testAstro);
    expect(jResult.f).toBeCloseTo(yResult.f, 10);
    expect(jResult.u).toBeCloseTo(yResult.u, 10);
  });

  it("code 'e' returns K2 correction", () => {
    const eResult = ihoStrategy.compute("e", "anything", 2, testAstro);
    const yResult = ihoStrategy.compute("y", "K2", 2, testAstro);
    expect(eResult.f).toBeCloseTo(yResult.f, 10);
    expect(eResult.u).toBeCloseTo(yResult.u, 10);
  });

  // ─── Compound codes derived from M2 ──────────────────────────────────

  it("code 'b' returns M2 with negated u", () => {
    const m2 = ihoStrategy.compute("m", "M2", 2, testAstro);
    const bResult = ihoStrategy.compute("b", "anything", 2, testAstro);
    expect(bResult.f).toBeCloseTo(m2.f, 10);
    expect(bResult.u).toBeCloseTo(-m2.u, 10);
  });

  it("code 'c' returns M2 squared with -2u", () => {
    const m2 = ihoStrategy.compute("m", "M2", 2, testAstro);
    const cResult = ihoStrategy.compute("c", "anything", 2, testAstro);
    expect(cResult.f).toBeCloseTo(m2.f * m2.f, 10);
    expect(cResult.u).toBeCloseTo(-2 * m2.u, 10);
  });

  it("code 'g' returns M2^(species/2) with species=4", () => {
    const m2 = ihoStrategy.compute("m", "M2", 2, testAstro);
    const gResult = ihoStrategy.compute("g", "anything", 4, testAstro);
    expect(gResult.f).toBeCloseTo(Math.pow(Math.sqrt(m2.f), 4), 10);
    expect(gResult.u).toBeCloseTo(2 * m2.u, 10);
  });

  it("code 'g' returns M2^(species/2) with species=6", () => {
    const m2 = ihoStrategy.compute("m", "M2", 2, testAstro);
    const gResult = ihoStrategy.compute("g", "anything", 6, testAstro);
    expect(gResult.f).toBeCloseTo(Math.pow(Math.sqrt(m2.f), 6), 10);
    expect(gResult.u).toBeCloseTo(3 * m2.u, 10);
  });

  it("code 'p' (2MN2 = 2×M2−N2): f=f(M2)³, u=u(M2)", () => {
    const m2 = ihoStrategy.compute("m", "M2", 2, testAstro);
    const pResult = ihoStrategy.compute("p", "anything", 2, testAstro);
    expect(pResult.f).toBeCloseTo(Math.pow(m2.f, 3), 10);
    expect(pResult.u).toBeCloseTo(m2.u, 10);
  });

  it("code 'p' matches compound decomposition of 2MN2", () => {
    const pResult = ihoStrategy.compute("p", "L2A", 2, testAstro);
    const xResult = ihoStrategy.compute("x", "2MN2", 2, testAstro);
    expect(pResult.f).toBeCloseTo(xResult.f, 10);
    expect(pResult.u).toBeCloseTo(xResult.u, 10);
  });

  // ─── Multi-fundamental compounds ──────────────────────────────────────

  it("code 'd' returns K1 · O1", () => {
    const k1 = ihoStrategy.compute("y", "K1", 1, testAstro);
    const o1 = ihoStrategy.compute("y", "O1", 1, testAstro);
    const dResult = ihoStrategy.compute("d", "anything", 2, testAstro);
    expect(dResult.f).toBeCloseTo(k1.f * o1.f, 10);
    expect(dResult.u).toBeCloseTo(k1.u - o1.u, 10);
  });

  it("code 'q' (NKM2 = N2+K2−M2): f=f(M2)²·f(K2), u=u(K2)", () => {
    const m2 = ihoStrategy.compute("y", "M2", 2, testAstro);
    const k2 = ihoStrategy.compute("y", "K2", 2, testAstro);
    const qResult = ihoStrategy.compute("q", "anything", 2, testAstro);
    expect(qResult.f).toBeCloseTo(m2.f * m2.f * k2.f, 10);
    expect(qResult.u).toBeCloseTo(k2.u, 10);
  });

  it("code 'q' matches compound decomposition of NKM2", () => {
    const qResult = ihoStrategy.compute("q", "L2B", 2, testAstro);
    const xResult = ihoStrategy.compute("x", "NKM2", 2, testAstro);
    expect(qResult.f).toBeCloseTo(xResult.f, 10);
    expect(qResult.u).toBeCloseTo(xResult.u, 10);
  });

  // ─── Compound code 'x' ───────────────────────────────────────────────

  it("code 'x' decomposes compound name", () => {
    const result = ihoStrategy.compute("x", "MS4", 4, testAstro);
    const m2 = ihoStrategy.compute("y", "M2", 2, testAstro);
    // MS4 = M2 + S2, so f = f_M2, u = u_M2
    expect(result.f).toBeCloseTo(m2.f, 10);
    expect(result.u).toBeCloseTo(m2.u, 10);
  });

  it("code 'x' returns non-UNITY for MA annual variants (IHO Annex B)", () => {
    // MA4 decomposes as M4, returns non-UNITY values
    const result = ihoStrategy.compute("x", "MA4", 4, testAstro);
    expect(result.f).not.toBe(1);
    expect(result.u).not.toBe(0);
  });

  it("code 'x' returns UNITY when sign resolution fails", () => {
    // MS3 parses (M+S) but resolveSigns fails: M(2)+S(2)=4≠3, M(2)-S(2)=0≠3
    const result = ihoStrategy.compute("x", "MS3", 3, testAstro);
    expect(result).toEqual({ f: 1, u: 0 });
  });

  // ─── Default (unknown code) ───────────────────────────────────────────

  it("unknown code returns UNITY", () => {
    // Cast to bypass type check for testing default branch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = ihoStrategy.compute("zzz" as any, "M2", 2, testAstro);
    expect(result).toEqual({ f: 1, u: 0 });
  });
});
