import { describe, it, expect } from "vitest";
import { schuremanStrategy } from "../../src/node-corrections/schureman.js";
import astro, { AstroData } from "../../src/astronomy/index.js";

const testItems = {
  i: { value: 5 },
  I: { value: 6 },
  omega: { value: 3 },
  nu: { value: 4 },
  nup: { value: 4 },
  nupp: { value: 2 },
  P: { value: 14 },
  xi: { value: 4 },
} as AstroData;

describe("schuremanStrategy", () => {
  it("Mm: Schureman equations 73, 65 — f only, u = 0", () => {
    const result = schuremanStrategy.compute("y", "Mm", 0, testItems);
    expect(result.f).toBeCloseTo(0.999051998091, 4);
    expect(result.u).toBe(0);
  });

  it("Mf: Schureman equations 74, 66 / u_Mf", () => {
    const result = schuremanStrategy.compute("y", "Mf", 0, testItems);
    expect(result.f).toBeCloseTo(4.00426673883, 4);
    expect(result.u).toBe(-8.0);
  });

  it("O1: Schureman equations 75, 67 / u_O1", () => {
    const result = schuremanStrategy.compute("y", "O1", 0, testItems);
    expect(result.f).toBeCloseTo(2.00076050158, 4);
    expect(result.u).toBe(4.0);
  });

  it("J1: Schureman equations 76, 68 / u_J1", () => {
    const result = schuremanStrategy.compute("y", "J1", 0, testItems);
    expect(result.f).toBeCloseTo(2.0119685329, 4);
    expect(result.u).toBe(-4);
  });

  it("OO1: Schureman equations 77, 69 / u_OO1", () => {
    const result = schuremanStrategy.compute("y", "OO1", 0, testItems);
    expect(result.f).toBeCloseTo(8.01402871709, 4);
    expect(result.u).toBe(-12.0);
  });

  it("M2: Schureman equations 78, 70 / u_M2", () => {
    const result = schuremanStrategy.compute("y", "M2", 0, testItems);
    expect(result.f).toBeCloseTo(0.999694287563, 4);
    expect(result.u).toBe(0.0);
  });

  it("K1: Schureman equations 227, 226, 68 / u_K1", () => {
    const result = schuremanStrategy.compute("y", "K1", 0, testItems);
    expect(result.f).toBeCloseTo(1.23843964182, 4);
    expect(result.u).toBe(-4);
  });

  it("L2: Schureman equations 215, 213, 204 / u_L2 (eq 214)", () => {
    const result = schuremanStrategy.compute("y", "L2", 0, testItems);
    expect(result.f).toBeCloseTo(0.98517860327, 4);
    expect(result.u).toBeCloseTo(-0.449812364499, 4);
  });

  it("K2: Schureman equations 235, 234, 71 / u_K2", () => {
    const result = schuremanStrategy.compute("y", "K2", 0, testItems);
    expect(result.f).toBeCloseTo(1.09775430048, 4);
    expect(result.u).toBe(-4.0);
  });

  it("M1: Schureman equations 206, 207, 195 / u_M1 (eq 202)", () => {
    const result = schuremanStrategy.compute("y", "M1", 0, testItems);
    expect(result.f).toBeCloseTo(3.90313810168, 4);
    expect(result.u).toBeCloseTo(7.09154172301, 4);
  });

  it("M3: Schureman equation 149 / u_Modd", () => {
    const result = schuremanStrategy.compute("y", "M3", 0, testItems);
    expect(result.f).toBeCloseTo(0.999541466395, 4);
    expect(result.u).toBe(0);
  });

  it("returns UNITY for unknown fundamental", () => {
    const result = schuremanStrategy.compute("y", "UNKNOWN", 0, testItems);
    expect(result).toEqual({ f: 1, u: 0 });
  });
});

// ─── With realistic astronomical data ──────────────────────────────────────

const sampleTime = new Date("2019-10-04T10:15:40.010Z");
const testAstro = astro(sampleTime);

describe("schuremanStrategy with real astro data", () => {
  const fundamentals = ["Mm", "Mf", "O1", "K1", "J1", "OO1", "M2", "K2", "L2", "M1", "M3"];

  it.each(fundamentals)("%s: produces f > 0 and finite u", (name) => {
    const result = schuremanStrategy.compute("y", name, 0, testAstro);
    expect(result.f).toBeGreaterThan(0);
    expect(Number.isFinite(result.f)).toBe(true);
    expect(Number.isFinite(result.u)).toBe(true);
  });
});
