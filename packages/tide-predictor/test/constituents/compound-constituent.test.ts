import { describe, it, expect } from "vitest";
import { defineCompoundConstituent } from "../../src/constituents/definition.js";
import constituents from "../../src/constituents/index.js";
import astro from "../../src/astronomy/index.js";

const sampleTime = new Date("2019-10-04T10:15:40.010Z");
const testAstro = astro(sampleTime);

const compoundTest = defineCompoundConstituent("test compound", [
  { constituent: constituents.M2, factor: 1 },
  { constituent: constituents.S2, factor: -1 },
]);

describe("compound constituent", () => {
  it("calculates compound coefficients", () => {
    const expected = constituents.M2.coefficients.map(
      (c, i) => c - constituents.S2.coefficients[i],
    );
    expect(compoundTest.coefficients).toEqual(expected);
  });

  it("calculates speed", () => {
    const expectedSpeed = constituents.M2.speed - constituents.S2.speed;
    expect(compoundTest.speed).toBeCloseTo(expectedSpeed, 4);
  });

  it("calculates value", () => {
    const expectedValue = constituents.M2.value(testAstro) - constituents.S2.value(testAstro);
    expect(compoundTest.value(testAstro)).toBeCloseTo(expectedValue, 4);
  });

  it("has nodalCorrectionCode 'z' for compound constituents", () => {
    expect(compoundTest.nodalCorrectionCode).toBe("z");
  });

  it("accepts an array of names", () => {
    const compound = defineCompoundConstituent(
      ["alias1", "alias2"],
      [
        { constituent: constituents.M2, factor: 1 },
        { constituent: constituents.S2, factor: -1 },
      ],
    );
    expect(compound.names).toEqual(["alias1", "alias2"]);
  });
});
