import { describe, it, expect } from "vitest";
import coefficients, { sexagesimalToDecimal } from "../../src/astronomy/coefficients.js";

describe("astronomy coefficients", () => {
  it("converts a sexagesimal angle into decimal degrees", () => {
    expect(sexagesimalToDecimal(10, 10, 10, 10, 10)).toBe(10.169447225);
    expect(sexagesimalToDecimal(10)).toBe(10);
  });

  it("calculates terrestrial oliquity coefficients rewritten to T", () => {
    expect(coefficients.terrestrialObliquity[1]).toBe(-0.013002583333333335);
  });
});
