import { describe, it, expect } from "vitest";
import nodeCorrections from "../../src/node-corrections/schureman.js";
import { AstroData } from "../../src/astronomy/index.js";

const testItems = {
  i: {
    value: 5,
  },
  I: { value: 6 },
  omega: { value: 3 },
  nu: { value: 4 },
  nup: { value: 4 },
  nupp: { value: 2 },
  P: { value: 14 },
  xi: {
    value: 4,
  },
} as AstroData;

describe("Node corrections", () => {
  it("have correct unity", () => {
    expect(nodeCorrections.fUnity()).toBe(1);
  });

  it("calculates Schureman equations 73, 65 (f_Mm)", () => {
    expect(nodeCorrections.fMm(testItems)).toBeCloseTo(0.999051998091, 4);
  });

  it("calculates Schureman equations 74, 66 (f_Mf)", () => {
    expect(nodeCorrections.fMf(testItems)).toBeCloseTo(4.00426673883, 4);
  });

  it("calculates Schureman equations 75, 67 (f_O1)", () => {
    expect(nodeCorrections.fO1(testItems)).toBeCloseTo(2.00076050158, 4);
  });

  it("calculates Schureman equations 76, 68 (f_J1)", () => {
    expect(nodeCorrections.fJ1(testItems)).toBeCloseTo(2.0119685329, 4);
  });

  it("calculates Schureman equations 77, 69 (f_OO1)", () => {
    expect(nodeCorrections.fOO1(testItems)).toBeCloseTo(8.01402871709, 4);
  });

  it("calculates Schureman equations 78, 70 (f_M2)", () => {
    expect(nodeCorrections.fM2(testItems)).toBeCloseTo(0.999694287563, 4);
  });

  it("calculates Schureman equations 227, 226, 68 (f_K1)", () => {
    expect(nodeCorrections.fK1(testItems)).toBeCloseTo(1.23843964182, 4);
  });

  it("calculates Schureman equations 215, 213, 204 (f_L2)", () => {
    expect(nodeCorrections.fL2(testItems)).toBeCloseTo(0.98517860327, 4);
  });

  it("calculates Schureman equations 235, 234, 71 (f_K2)", () => {
    expect(nodeCorrections.fK2(testItems)).toBeCloseTo(1.09775430048, 4);
  });

  it("calculates Schureman equations 206, 207, 195 (f_M1)", () => {
    expect(nodeCorrections.fM1(testItems)).toBeCloseTo(3.90313810168, 4);
  });

  it("calculates e.g. Schureman equation 149 (f_Modd)", () => {
    expect(nodeCorrections.fModd(testItems, 3)).toBeCloseTo(0.999541466395, 4);
  });

  it("has a zero for u_zero", () => {
    expect(nodeCorrections.uZero()).toBe(0.0);
  });

  it("calculates u_Mf", () => {
    expect(nodeCorrections.uMf(testItems)).toBe(-8.0);
  });

  it("calculates u_O1", () => {
    expect(nodeCorrections.uO1(testItems)).toBe(4.0);
  });

  it("calculates u_J1", () => {
    expect(nodeCorrections.uJ1(testItems)).toBe(-4);
  });

  it("calculates u_OO1", () => {
    expect(nodeCorrections.uOO1(testItems)).toBe(-12.0);
  });

  it("calculates u_M2", () => {
    expect(nodeCorrections.uM2(testItems)).toBe(0.0);
  });

  it("calculates u_K1", () => {
    expect(nodeCorrections.uK1(testItems)).toBe(-4);
  });

  it("calculates u_L2", () => {
    expect(nodeCorrections.uL2(testItems)).toBeCloseTo(-0.449812364499, 4);
  });

  it("calculates u_K2", () => {
    expect(nodeCorrections.uK2(testItems)).toBe(-4.0);
  });

  it("calculates u_K2", () => {
    expect(nodeCorrections.uK2(testItems)).toBe(-4.0);
  });

  it("calculates u_M1", () => {
    expect(nodeCorrections.uM1(testItems)).toBeCloseTo(7.09154172301, 4);
  });

  it("calculates u_Modd", () => {
    expect(nodeCorrections.uModd(testItems, 3)).toBe(0);
  });
});
