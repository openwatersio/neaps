import { describe, it, expect } from "vitest";
import { resolveFundamentals, fundamentals } from "../../src/node-corrections/index.js";

describe("resolveFundamentals", () => {
  it("returns iho by default (no argument)", () => {
    const result = resolveFundamentals();
    expect(result).toBe(fundamentals.iho);
  });

  it("returns iho for 'iho'", () => {
    const result = resolveFundamentals("iho");
    expect(result).toBe(fundamentals.iho);
  });

  it("returns schuremanFundamentals for 'schureman'", () => {
    const result = resolveFundamentals("schureman");
    expect(result).toBe(fundamentals.schureman);
  });

  it("throws for unknown fundamentals name", () => {
    expect(() => resolveFundamentals("invalid")).toThrow("Unknown fundamentals: invalid");
  });
});
