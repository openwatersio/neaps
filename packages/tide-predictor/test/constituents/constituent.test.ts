import { describe, it, expect } from "vitest";
import constituents from "../../src/constituents/index.js";
import astro from "../../src/astronomy/index.js";

const sampleTime = new Date("2019-10-04T10:15:40.010Z");
const testAstro = astro(sampleTime);

describe("constituent", () => {
  it("computes constituent value (V₀)", () => {
    expect(constituents.M2.value(testAstro)).toBeCloseTo(537.008710124, 4);
  });

  it("computes constituent speed", () => {
    expect(constituents.M2.speed).toBeCloseTo(28.9841042, 4);
  });
});
