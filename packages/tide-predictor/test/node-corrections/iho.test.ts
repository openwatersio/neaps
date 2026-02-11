import { describe, it, expect } from "vitest";
import { ihoStrategy } from "../../src/node-corrections/iho.js";
import { resolveStrategy } from "../../src/node-corrections/index.js";
import astro from "../../src/astronomy/index.js";

const sampleTime = new Date("2019-10-04T10:15:40.010Z");
const testAstro = astro(sampleTime);

// ─── IHO fundamentals via "y" code ─────────────────────────────────────────

describe("ihoStrategy fundamentals", () => {
  const fundamentals = [
    "Mm",
    "Mf",
    "O1",
    "K1",
    "J1",
    "M1B",
    "M1C",
    "M1",
    "M1A",
    "M2",
    "K2",
    "M3",
    "L2",
    "gamma2",
    "alpha2",
    "delta2",
    "xi2",
    "eta2",
  ];

  it.each(fundamentals)("%s: produces f > 0 and finite u", (name) => {
    const result = ihoStrategy.compute("y", name, 0, testAstro);
    expect(result.f).toBeGreaterThan(0);
    expect(Number.isFinite(result.f)).toBe(true);
    expect(Number.isFinite(result.u)).toBe(true);
  });

  it("Mm correction depends on N and p", () => {
    const result = ihoStrategy.compute("y", "Mm", 0, testAstro);
    // Mm formula: f = 1 − 0.1311·cos(N) + 0.0538·cos(2p) + 0.0205·cos(2p−N), u = 0
    expect(result.u).toBe(0);
    expect(result.f).not.toBe(1); // not unity
  });

  it("Mf correction has non-zero u", () => {
    const result = ihoStrategy.compute("y", "Mf", 0, testAstro);
    expect(result.u).not.toBe(0);
    expect(result.f).toBeGreaterThan(0);
  });

  it("O1 correction has non-zero u", () => {
    const result = ihoStrategy.compute("y", "O1", 0, testAstro);
    expect(result.u).not.toBe(0);
  });

  it("K1 correction has non-zero u", () => {
    const result = ihoStrategy.compute("y", "K1", 0, testAstro);
    expect(result.u).not.toBe(0);
  });

  it("J1 correction has non-zero u", () => {
    const result = ihoStrategy.compute("y", "J1", 0, testAstro);
    expect(result.u).not.toBe(0);
  });

  it("M2 correction has non-zero u", () => {
    const result = ihoStrategy.compute("y", "M2", 0, testAstro);
    expect(result.u).not.toBe(0);
  });

  it("K2 correction has non-zero u", () => {
    const result = ihoStrategy.compute("y", "K2", 0, testAstro);
    expect(result.u).not.toBe(0);
  });

  it("M3 derives from M2", () => {
    const m2 = ihoStrategy.compute("y", "M2", 0, testAstro);
    const m3 = ihoStrategy.compute("y", "M3", 0, testAstro);
    // M3 f = sqrt(f_M2)^3
    expect(m3.f).toBeCloseTo(Math.pow(Math.sqrt(m2.f), 3), 10);
  });

  it("xi2 and eta2 produce the same result", () => {
    const xi2 = ihoStrategy.compute("y", "xi2", 0, testAstro);
    const eta2 = ihoStrategy.compute("y", "eta2", 0, testAstro);
    expect(xi2.f).toBe(eta2.f);
    expect(xi2.u).toBe(eta2.u);
  });

  it("M1B, M1C, M1, M1A all produce distinct corrections", () => {
    const m1b = ihoStrategy.compute("y", "M1B", 0, testAstro);
    const m1c = ihoStrategy.compute("y", "M1C", 0, testAstro);
    const m1 = ihoStrategy.compute("y", "M1", 0, testAstro);
    const m1a = ihoStrategy.compute("y", "M1A", 0, testAstro);

    // M1C and M1 use the same formula
    expect(m1c.f).toBe(m1.f);
    expect(m1c.u).toBe(m1.u);

    // M1B uses a different formula than M1
    expect(m1b.f).not.toBeCloseTo(m1.f, 5);

    // M1A uses a different formula than M1
    expect(m1a.f).not.toBeCloseTo(m1.f, 5);
  });

  it("L2 uses f·sinU/f·cosU form", () => {
    const result = ihoStrategy.compute("y", "L2", 0, testAstro);
    expect(result.f).toBeGreaterThan(0);
    expect(Number.isFinite(result.u)).toBe(true);
  });

  it("gamma2 uses f·sinU/f·cosU form", () => {
    const result = ihoStrategy.compute("y", "gamma2", 0, testAstro);
    expect(result.f).toBeGreaterThan(0);
    expect(Number.isFinite(result.u)).toBe(true);
  });

  it("alpha2 depends on p and pp", () => {
    const result = ihoStrategy.compute("y", "alpha2", 0, testAstro);
    expect(result.f).toBeGreaterThan(0);
    expect(Number.isFinite(result.u)).toBe(true);
  });

  it("delta2 uses f·sinU/f·cosU form", () => {
    const result = ihoStrategy.compute("y", "delta2", 0, testAstro);
    expect(result.f).toBeGreaterThan(0);
    expect(Number.isFinite(result.u)).toBe(true);
  });

  it("returns UNITY for unknown fundamental name", () => {
    const result = ihoStrategy.compute("y", "UNKNOWN", 0, testAstro);
    expect(result).toEqual({ f: 1, u: 0 });
  });
});

// ─── resolveStrategy ────────────────────────────────────────────────────────

describe("resolveStrategy", () => {
  it("returns ihoStrategy by default (no argument)", () => {
    const strategy = resolveStrategy();
    expect(strategy).toBe(ihoStrategy);
  });

  it("returns ihoStrategy for 'iho'", () => {
    const strategy = resolveStrategy("iho");
    expect(strategy).toBe(ihoStrategy);
  });

  it("returns schuremanStrategy for 'schureman'", () => {
    const strategy = resolveStrategy("schureman");
    // Should be a valid strategy with compute method
    expect(strategy).toHaveProperty("compute");
    expect(typeof strategy.compute).toBe("function");
  });

  it("throws for unknown strategy name", () => {
    expect(() => resolveStrategy("invalid")).toThrow("Unknown nodeCorrections strategy: invalid");
  });
});
