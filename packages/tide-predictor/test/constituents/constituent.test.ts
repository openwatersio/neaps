import { describe, it, expect } from "vitest";
import {
  astronimicDoodsonNumber,
  astronomicSpeed,
  astronomicValues,
} from "../../src/constituents/definition.js";
import constituents from "../../src/constituents/index.js";
import astro from "../../src/astronomy/index.js";

const sampleTime = new Date("2019-10-04T10:15:40.010Z");
const testAstro = astro(sampleTime);

describe("constituent", () => {
  it("fetches astronomic Doodson Number values", () => {
    const values = astronimicDoodsonNumber(testAstro);
    expect(values[0].value).toBe(testAstro["T+h-s"].value);
  });

  it("fetches astronomic speed", () => {
    const values = astronomicSpeed(testAstro);
    expect(values[0]).toBe(testAstro["T+h-s"].speed);
  });

  it("fetches astronomic values", () => {
    const values = astronomicValues(testAstro);
    expect(values[0]).toBe(testAstro["T+h-s"].value);
  });

  it("computes constituent value (V₀)", () => {
    expect(constituents.M2.value(testAstro)).toBeCloseTo(537.008710124, 4);
  });

  it("computes constituent speed", () => {
    expect(constituents.M2.speed).toBeCloseTo(28.9841042, 4);
  });
});
