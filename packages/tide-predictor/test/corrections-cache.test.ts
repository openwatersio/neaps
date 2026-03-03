import { describe, it, expect } from "vitest";
import { createCorrectionsCache } from "../src/corrections-cache.js";
import defaultConstituentModels from "../src/constituents/index.js";
import { iho, schureman } from "../src/node-corrections/index.js";

const time1 = new Date("2024-01-15T06:00:00Z"); // 06:00 — first half of the day
const time2 = new Date("2024-01-15T18:00:00Z"); // 18:00 — second half, same 24h bucket
const time3 = new Date("2024-01-16T06:00:00Z"); // next calendar day — different bucket

describe("createCorrectionsCache", () => {
  it("defaults to a 24-hour interval", () => {
    const cache = createCorrectionsCache();
    expect(cache.interval).toBe(24);
  });

  it("accepts a custom interval", () => {
    const cache = createCorrectionsCache({ interval: 12 });
    expect(cache.interval).toBe(12);
  });
});

describe("CorrectionsCache.getAstro", () => {
  const cache = createCorrectionsCache();

  it("returns AstroData with expected properties", () => {
    const result = cache.getAstro(time1);
    expect(result).toHaveProperty("s");
    expect(result).toHaveProperty("h");
    expect(result).toHaveProperty("N");
    expect(result).toHaveProperty("p");
  });

  it("returns same reference for times in the same bucket", () => {
    const a = cache.getAstro(time1);
    const b = cache.getAstro(time2);
    expect(a).toBe(b);
  });

  it("returns different reference for a different bucket", () => {
    const a = cache.getAstro(time1);
    const c = cache.getAstro(time3);
    expect(a).not.toBe(c);
  });
});

describe("CorrectionsCache.getV0", () => {
  const cache = createCorrectionsCache();

  it("returns finite numbers for known constituents", () => {
    const v0 = cache.getV0(time1, defaultConstituentModels);
    expect(v0.has("M2")).toBe(true);
    expect(Number.isFinite(v0.get("M2"))).toBe(true);
  });

  it("returns same reference for the same time and models", () => {
    const a = cache.getV0(time1, defaultConstituentModels);
    const b = cache.getV0(time1, defaultConstituentModels);
    expect(a).toBe(b);
  });

  it("returns different reference for different times", () => {
    const a = cache.getV0(time1, defaultConstituentModels);
    const b = cache.getV0(time2, defaultConstituentModels);
    expect(a).not.toBe(b);
  });
});

describe("CorrectionsCache.getCorrections", () => {
  const cache = createCorrectionsCache();

  it("returns corrections with f and u for known constituents", () => {
    const result = cache.getCorrections(time1, defaultConstituentModels, iho);
    expect(result.corrections.has("M2")).toBe(true);
    const m2 = result.corrections.get("M2");
    expect(typeof m2!.f).toBe("number");
    expect(typeof m2!.u).toBe("number");
    expect(Number.isFinite(m2!.f)).toBe(true);
    expect(Number.isFinite(m2!.u)).toBe(true);
  });

  it("returns same reference for times in the same bucket and same fundamentals", () => {
    const a = cache.getCorrections(time1, defaultConstituentModels, iho);
    const b = cache.getCorrections(time2, defaultConstituentModels, iho);
    expect(a).toBe(b);
  });

  it("returns different reference for a different bucket", () => {
    const a = cache.getCorrections(time1, defaultConstituentModels, iho);
    const c = cache.getCorrections(time3, defaultConstituentModels, iho);
    expect(a).not.toBe(c);
  });

  it("returns different reference for different fundamentals at the same time", () => {
    const a = cache.getCorrections(time1, defaultConstituentModels, iho);
    const b = cache.getCorrections(time1, defaultConstituentModels, schureman);
    expect(a).not.toBe(b);
  });
});

describe("CorrectionsCache custom interval", () => {
  it("separates times that fall in different 12-hour buckets", () => {
    const cache = createCorrectionsCache({ interval: 12 });
    // 06:00 and 18:00 are in different 12h buckets (00-12 vs 12-24)
    const morning = cache.getCorrections(time1, defaultConstituentModels, iho);
    const evening = cache.getCorrections(time2, defaultConstituentModels, iho);
    expect(morning).not.toBe(evening);
  });

  it("groups times that fall in the same 12-hour bucket", () => {
    const cache = createCorrectionsCache({ interval: 12 });
    const t1 = new Date("2024-01-15T02:00:00Z");
    const t2 = new Date("2024-01-15T10:00:00Z");
    const a = cache.getCorrections(t1, defaultConstituentModels, iho);
    const b = cache.getCorrections(t2, defaultConstituentModels, iho);
    expect(a).toBe(b);
  });
});
