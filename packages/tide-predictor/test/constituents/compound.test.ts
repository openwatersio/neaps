import { describe, it, expect } from "vitest";
import { parseName, resolveSigns, decomposeCompound } from "../../src/constituents/compound.js";
import constituents from "../../src/constituents/index.js";
import data from "../../src/constituents/data.json" with { type: "json" };

// ─── parseName ──────────────────────────────────────────────────────────────

describe("parseName", () => {
  it("parses simple two-letter compounds", () => {
    expect(parseName("MS4")).toEqual({
      tokens: [
        { letter: "M", multiplier: 1 },
        { letter: "S", multiplier: 1 },
      ],
      targetSpecies: 4,
    });
  });

  it("parses leading multiplier", () => {
    expect(parseName("2MN6")).toEqual({
      tokens: [
        { letter: "M", multiplier: 2 },
        { letter: "N", multiplier: 1 },
      ],
      targetSpecies: 6,
    });
  });

  it("parses internal multiplier", () => {
    expect(parseName("3M2S2")).toEqual({
      tokens: [
        { letter: "M", multiplier: 3 },
        { letter: "S", multiplier: 2 },
      ],
      targetSpecies: 2,
    });
  });

  it("parses three-letter compounds", () => {
    expect(parseName("MSK5")).toEqual({
      tokens: [
        { letter: "M", multiplier: 1 },
        { letter: "S", multiplier: 1 },
        { letter: "K", multiplier: 1 },
      ],
      targetSpecies: 5,
    });
  });

  it("parses parenthesized groups", () => {
    expect(parseName("2(MN)S6")).toEqual({
      tokens: [
        { letter: "M", multiplier: 2 },
        { letter: "N", multiplier: 2 },
        { letter: "S", multiplier: 1 },
      ],
      targetSpecies: 6,
    });
  });

  it("parses parenthesized groups mid-name", () => {
    expect(parseName("M(SK)2")).toEqual({
      tokens: [
        { letter: "M", multiplier: 1 },
        { letter: "S", multiplier: 1 },
        { letter: "K", multiplier: 1 },
      ],
      targetSpecies: 2,
    });
  });

  it("parses multi-char token nu", () => {
    expect(parseName("MnuS2")).toEqual({
      tokens: [
        { letter: "M", multiplier: 1 },
        { letter: "nu", multiplier: 1 },
        { letter: "S", multiplier: 1 },
      ],
      targetSpecies: 2,
    });
  });

  it("parses nu at start", () => {
    expect(parseName("nuK1")).toEqual({
      tokens: [
        { letter: "nu", multiplier: 1 },
        { letter: "K", multiplier: 1 },
      ],
      targetSpecies: 1,
    });
  });

  it("parses multi-char token lambda", () => {
    expect(parseName("lambdaO1")).toEqual({
      tokens: [
        { letter: "lambda", multiplier: 1 },
        { letter: "O", multiplier: 1 },
      ],
      targetSpecies: 1,
    });
  });

  it("parses multi-digit species", () => {
    expect(parseName("M10")).toEqual({
      tokens: [{ letter: "M", multiplier: 1 }],
      targetSpecies: 10,
    });
  });

  it("parses multi-digit species with multiplier", () => {
    expect(parseName("5MNS10")).toEqual({
      tokens: [
        { letter: "M", multiplier: 5 },
        { letter: "N", multiplier: 1 },
        { letter: "S", multiplier: 1 },
      ],
      targetSpecies: 10,
    });
  });

  it("parses MA/MB annual variants (IHO Annex B)", () => {
    // MA4 is normalized to M4 before parsing
    expect(parseName("MA4")).toEqual({
      tokens: [{ letter: "M", multiplier: 1 }],
      targetSpecies: 4,
    });
    // MB5 is normalized to M5 before parsing
    expect(parseName("MB5")).toEqual({
      tokens: [{ letter: "M", multiplier: 1 }],
      targetSpecies: 5,
    });
  });

  it("throws for unknown letter outside parenthesized group", () => {
    // A and B are only valid as part of MA/MB pattern
    expect(() => parseName("A4")).toThrow('unknown letter "A"');
    expect(() => parseName("B5")).toThrow('unknown letter "B"');
    expect(() => parseName("SA4")).toThrow('unknown letter "A"');
  });

  it("throws for unknown letter inside parenthesized group", () => {
    expect(() => parseName("(MA)4")).toThrow('unknown letter "A"');
    expect(() => parseName("2(AB)4")).toThrow('unknown letter "A"');
  });

  it("throws for unrecognized character inside parenthesized group", () => {
    expect(() => parseName("(x)4")).toThrow("unrecognized character");
  });

  it("throws for names with no trailing digits", () => {
    expect(() => parseName("2SMN")).toThrow("no trailing species digits");
  });

  it("throws for trailing multiplier with no letter after it", () => {
    expect(() => parseName("34")).toThrow("trailing digits with no letter");
  });

  it("throws for empty parenthesized group", () => {
    expect(() => parseName("M()4")).toThrow("empty parenthesized group");
  });

  it("throws for unclosed parenthesized group", () => {
    expect(() => parseName("(MN4")).toThrow("unclosed parenthesized group");
  });

  it("throws for species 0", () => {
    expect(() => parseName("M0")).toThrow("species is 0");
  });

  it("throws for unrecognized lowercase character", () => {
    expect(() => parseName("Mx4")).toThrow("unrecognized character");
  });
});

// ─── resolveSigns ───────────────────────────────────────────────────────────

describe("resolveSigns", () => {
  it("all positive when species matches (MS4 = M2 + S2)", () => {
    const result = resolveSigns(
      [
        { letter: "M", multiplier: 1 },
        { letter: "S", multiplier: 1 },
      ],
      4,
    );
    expect(result).toEqual([
      { constituentKey: "M2", factor: 1 },
      { constituentKey: "S2", factor: 1 },
    ]);
  });

  it("all positive with multiplier (2MN6 = 2×M2 + N2)", () => {
    const result = resolveSigns(
      [
        { letter: "M", multiplier: 2 },
        { letter: "N", multiplier: 1 },
      ],
      6,
    );
    expect(result).toEqual([
      { constituentKey: "M2", factor: 2 },
      { constituentKey: "N2", factor: 1 },
    ]);
  });

  it("flips rightmost sign (4MN6 = 4×M2 − N2)", () => {
    const result = resolveSigns(
      [
        { letter: "M", multiplier: 4 },
        { letter: "N", multiplier: 1 },
      ],
      6,
    );
    expect(result).toEqual([
      { constituentKey: "M2", factor: 4 },
      { constituentKey: "N2", factor: -1 },
    ]);
  });

  it("flips for diurnal (MP1 = M2 − P1)", () => {
    const result = resolveSigns(
      [
        { letter: "M", multiplier: 1 },
        { letter: "P", multiplier: 1 },
      ],
      1,
    );
    expect(result).toEqual([
      { constituentKey: "M2", factor: 1 },
      { constituentKey: "P1", factor: -1 },
    ]);
  });

  it("flips with internal multiplier (3M2S2 = 3×M2 − 2×S2)", () => {
    const result = resolveSigns(
      [
        { letter: "M", multiplier: 3 },
        { letter: "S", multiplier: 2 },
      ],
      2,
    );
    expect(result).toEqual([
      { constituentKey: "M2", factor: 3 },
      { constituentKey: "S2", factor: -2 },
    ]);
  });

  it("resolves K as K1 (MK3 = M2 + K1)", () => {
    const result = resolveSigns(
      [
        { letter: "M", multiplier: 1 },
        { letter: "K", multiplier: 1 },
      ],
      3,
    );
    expect(result).toEqual([
      { constituentKey: "M2", factor: 1 },
      { constituentKey: "K1", factor: 1 },
    ]);
  });

  it("resolves K as K2 (MK4 = M2 + K2)", () => {
    const result = resolveSigns(
      [
        { letter: "M", multiplier: 1 },
        { letter: "K", multiplier: 1 },
      ],
      4,
    );
    expect(result).toEqual([
      { constituentKey: "M2", factor: 1 },
      { constituentKey: "K2", factor: 1 },
    ]);
  });

  it("resolves K as K1 with sign flip (2MK3 = 2×M2 − K1)", () => {
    const result = resolveSigns(
      [
        { letter: "M", multiplier: 2 },
        { letter: "K", multiplier: 1 },
      ],
      3,
    );
    expect(result).toEqual([
      { constituentKey: "M2", factor: 2 },
      { constituentKey: "K1", factor: -1 },
    ]);
  });

  it("resolves K as K2 with sign flip (4MK6 = 4×M2 − K2)", () => {
    const result = resolveSigns(
      [
        { letter: "M", multiplier: 4 },
        { letter: "K", multiplier: 1 },
      ],
      6,
    );
    expect(result).toEqual([
      { constituentKey: "M2", factor: 4 },
      { constituentKey: "K2", factor: -1 },
    ]);
  });

  it("resolves MSK5 = M2 + S2 + K1", () => {
    const result = resolveSigns(
      [
        { letter: "M", multiplier: 1 },
        { letter: "S", multiplier: 1 },
        { letter: "K", multiplier: 1 },
      ],
      5,
    );
    expect(result).toEqual([
      { constituentKey: "M2", factor: 1 },
      { constituentKey: "S2", factor: 1 },
      { constituentKey: "K1", factor: 1 },
    ]);
  });

  it("resolves MSK6 = M2 + S2 + K2", () => {
    const result = resolveSigns(
      [
        { letter: "M", multiplier: 1 },
        { letter: "S", multiplier: 1 },
        { letter: "K", multiplier: 1 },
      ],
      6,
    );
    expect(result).toEqual([
      { constituentKey: "M2", factor: 1 },
      { constituentKey: "S2", factor: 1 },
      { constituentKey: "K2", factor: 1 },
    ]);
  });

  it("single-letter direct species match (M with species=2)", () => {
    const result = resolveSigns([{ letter: "M", multiplier: 1 }], 2);
    expect(result).toEqual([{ constituentKey: "M2", factor: 1 }]);
  });

  it("expands single-letter overtide (M4 = M2 × M2)", () => {
    const result = resolveSigns([{ letter: "M", multiplier: 1 }], 4);
    expect(result).toEqual([{ constituentKey: "M2", factor: 2 }]);
  });

  it("expands single-letter overtide (M6 = M2 × M2 × M2)", () => {
    const result = resolveSigns([{ letter: "M", multiplier: 1 }], 6);
    expect(result).toEqual([{ constituentKey: "M2", factor: 3 }]);
  });

  it("expands single-letter overtide (S4 = S2 × S2)", () => {
    const result = resolveSigns([{ letter: "S", multiplier: 1 }], 4);
    expect(result).toEqual([{ constituentKey: "S2", factor: 2 }]);
  });

  it("flips multiple signs from right (2KM(SN)2 with K2)", () => {
    // 2K + M + S + N, target 2
    // K2: 4+2+2+2=10, flip N: 6, flip S: 2 ✓
    const result = resolveSigns(
      [
        { letter: "K", multiplier: 2 },
        { letter: "M", multiplier: 1 },
        { letter: "S", multiplier: 1 },
        { letter: "N", multiplier: 1 },
      ],
      2,
    );
    expect(result).toEqual([
      { constituentKey: "K2", factor: 2 },
      { constituentKey: "M2", factor: 1 },
      { constituentKey: "S2", factor: -1 },
      { constituentKey: "N2", factor: -1 },
    ]);
  });

  it("resolves 2SM2 = 2×S2 − M2", () => {
    const result = resolveSigns(
      [
        { letter: "S", multiplier: 2 },
        { letter: "M", multiplier: 1 },
      ],
      2,
    );
    expect(result).toEqual([
      { constituentKey: "S2", factor: 2 },
      { constituentKey: "M2", factor: -1 },
    ]);
  });

  it("returns null for impossible decomposition", () => {
    // M + S = 4, need 3, can't reach
    const result = resolveSigns(
      [
        { letter: "M", multiplier: 1 },
        { letter: "S", multiplier: 1 },
      ],
      3,
    );
    expect(result).toBeNull();
  });

  it("resolves J letter (KJ2 = K1 + J1)", () => {
    const result = resolveSigns(
      [
        { letter: "K", multiplier: 1 },
        { letter: "J", multiplier: 1 },
      ],
      2,
    );
    expect(result).toEqual([
      { constituentKey: "K1", factor: 1 },
      { constituentKey: "J1", factor: 1 },
    ]);
  });

  it("resolves L letter (ML4 = M2 + L2)", () => {
    const result = resolveSigns(
      [
        { letter: "M", multiplier: 1 },
        { letter: "L", multiplier: 1 },
      ],
      4,
    );
    expect(result).toEqual([
      { constituentKey: "M2", factor: 1 },
      { constituentKey: "L2", factor: 1 },
    ]);
  });

  it("resolves O and Q letters (OQ2 = O1 + Q1)", () => {
    const result = resolveSigns(
      [
        { letter: "O", multiplier: 1 },
        { letter: "Q", multiplier: 1 },
      ],
      2,
    );
    expect(result).toEqual([
      { constituentKey: "O1", factor: 1 },
      { constituentKey: "Q1", factor: 1 },
    ]);
  });
});

// ─── decomposeCompound ──────────────────────────────────────────────────────

describe("decomposeCompound", () => {
  it("decomposes a simple compound (MS4 = M2 + S2)", () => {
    const result = decomposeCompound("MS4", 4, constituents);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result![0].constituent).toBe(constituents.M2);
    expect(result![0].factor).toBe(1);
    expect(result![1].constituent).toBe(constituents.S2);
    expect(result![1].factor).toBe(1);
  });

  it("decomposes MA annual variants (IHO Annex B)", () => {
    // MA4 should decompose as M4 (= M2 × M2)
    const ma4 = decomposeCompound("MA4", 4, constituents);
    expect(ma4).not.toBeNull();
    expect(ma4).toHaveLength(1);
    expect(ma4![0].constituent).toBe(constituents.M2);
    expect(ma4![0].factor).toBe(2);

    // MA6 should decompose as M6 (= M2 × M2 × M2)
    const ma6 = decomposeCompound("MA6", 6, constituents);
    expect(ma6).not.toBeNull();
    expect(ma6).toHaveLength(1);
    expect(ma6![0].factor).toBe(3);
  });

  it("MB5 attempts to decompose as M5", () => {
    // MB5 should try to decompose as M5, but M5 (single letter, species 5)
    // doesn't match the single-letter overtide rule, so it returns null
    const mb5 = decomposeCompound("MB5", 5, constituents);
    expect(mb5).toBeNull();
  });

  it("returns null for unparseable names", () => {
    expect(decomposeCompound("XYZ", 0, constituents)).toBeNull();
    expect(decomposeCompound("MSm", 0, constituents)).toBeNull();
  });

  it("handles null-XDO entries (species=0, trailing digits)", () => {
    // 3SM4 has null XDO, so species=0 from coefficients
    // But trailing "4" in the name gives the actual species
    const result = decomposeCompound("3SM4", 0, constituents);
    expect(result).not.toBeNull();
  });

  it("includes all structural members", () => {
    // MS4 = M2 + S2, both included
    const ms4 = decomposeCompound("MS4", 4, constituents);
    expect(ms4).toHaveLength(2);
    expect(ms4![0].constituent).toBe(constituents.M2);
    expect(ms4![1].constituent).toBe(constituents.S2);

    // S4 = S2 × S2
    const s4 = decomposeCompound("S4", 4, constituents);
    expect(s4).toHaveLength(1);
    expect(s4![0].constituent).toBe(constituents.S2);
    expect(s4![0].factor).toBe(2);
  });

  it("maps letters to their own constituent (not correction fundamental)", () => {
    // MN4 = M2 + N2 → each maps to its own constituent
    const mn4 = decomposeCompound("MN4", 4, constituents);
    expect(mn4).not.toBeNull();
    expect(mn4).toHaveLength(2);
    expect(mn4![0].constituent).toBe(constituents.M2);
    expect(mn4![1].constituent).toBe(constituents.N2);

    // OQ2 = O1 + Q1 → Q maps to Q1 (not O1)
    const oq2 = decomposeCompound("OQ2", 2, constituents);
    expect(oq2).not.toBeNull();
    expect(oq2).toHaveLength(2);
    expect(oq2![0].constituent).toBe(constituents.O1);
    expect(oq2![1].constituent).toBe(constituents.Q1);
  });
});

// ─── All "x" constituents ───────────────────────────────────────────────────

describe("all x-code constituents", () => {
  const xEntries = data.filter((d) => d.nodalCorrection === "x");

  // Fundamental speeds for cross-checking decompositions
  const fundamentalSpeeds: Record<string, number> = {
    M2: constituents.M2.speed,
    S2: constituents.S2.speed,
    N2: constituents.N2.speed,
    K1: constituents.K1.speed,
    K2: constituents.K2.speed,
    O1: constituents.O1.speed,
    P1: constituents.P1.speed,
    Q1: constituents.Q1.speed,
    J1: constituents.J1.speed,
    T2: constituents.T2.speed,
    R2: constituents.R2.speed,
    L2: constituents.L2.speed,
  };

  // Map letter to speed for validation.
  // Note: nu and lambda have their own speeds (different from N2).
  const letterSpeed: Record<string, number> = {
    M: fundamentalSpeeds.M2,
    S: fundamentalSpeeds.S2,
    N: fundamentalSpeeds.N2,
    K1: fundamentalSpeeds.K1,
    K2: fundamentalSpeeds.K2,
    O: fundamentalSpeeds.O1,
    P: fundamentalSpeeds.P1,
    Q: fundamentalSpeeds.Q1,
    J: fundamentalSpeeds.J1,
    T: fundamentalSpeeds.T2,
    R: fundamentalSpeeds.R2,
    L: fundamentalSpeeds.L2,
    nu: 28.5125832, // ν₂ speed (NOT same as N₂)
    lambda: 29.4556253, // λ₂ speed
  };

  const xMapped = xEntries.map((d: { name: string; xdo: number[] | null; speed: number }) => ({
    name: d.name,
    species: d.xdo ? d.xdo[0] : 0,
    speed: d.speed,
  }));

  it.each(xMapped)("$name: decomposes without error", ({ name, species }) => {
    expect(() => decomposeCompound(name, species, constituents)).not.toThrow();
  });

  // Filter to entries that decompose successfully (parseName may fail for
  // non-standard names, and resolveSigns may return null).
  const decomposable = xMapped.filter(({ name, species }) => {
    return decomposeCompound(name, species, constituents) !== null;
  });

  it.each(decomposable)("$name: resolves to ConstituentMember[]", ({ name, species }) => {
    const members = decomposeCompound(name, species, constituents)!;
    expect(members.length).toBeGreaterThan(0);
    for (const member of members) {
      expect(member.constituent).toBeDefined();
      expect(member.constituent.names).toBeDefined();
      expect(typeof member.factor).toBe("number");
    }
  });

  // Speed cross-check: verify that the decomposition approximately matches the
  // actual speed. Tolerance is 0.6 deg/hr because some compound names are
  // approximations for nodal correction purposes — their XDO-derived speeds
  // can differ from simple sums of component speeds (e.g. annual modulation
  // terms in parenthesized names, or constituents like 2NKMS5 whose XDO
  // coefficients don't exactly match the letter decomposition).
  it.each(decomposable)(
    "$name: decomposed speed matches data speed ($speed)",
    ({ name, species, speed }) => {
      // parseName handles MA/MB normalization internally
      const parsed = parseName(name);
      const components = resolveSigns(parsed.tokens, species > 0 ? species : parsed.targetSpecies)!;

      let computedSpeed = 0;
      for (let i = 0; i < parsed.tokens.length; i++) {
        const letter = parsed.tokens[i].letter;
        const comp = components[i];

        let fundSpeed: number;
        if (letter === "K") {
          fundSpeed = comp.constituentKey === "K1" ? letterSpeed.K1 : letterSpeed.K2;
        } else {
          fundSpeed = letterSpeed[letter];
        }

        computedSpeed += comp.factor * fundSpeed;
      }

      expect(Math.abs(computedSpeed - speed)).toBeLessThan(0.6);
    },
  );
});
