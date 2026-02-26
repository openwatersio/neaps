import { describe, it, expect } from "vitest";
import { parseName, resolveSigns, decomposeCompound } from "../lib/compound.js";
import constituents from "../../packages/tide-predictor/src/constituents/index.js";
import data from "../../packages/tide-predictor/src/constituents/data.json" with { type: "json" };

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

  it("throws for unknown letter outside parenthesized group", () => {
    // A and B are not compound letters (MA/MB handled by decomposeCompound)
    expect(() => parseName("A4")).toThrow('unknown letter "A"');
    expect(() => parseName("B5")).toThrow('unknown letter "B"');
    expect(() => parseName("MA4")).toThrow('unknown letter "A"');
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

  it("expands single-letter overtide with fractional factor (M5 = M2 × 2.5)", () => {
    const result = resolveSigns([{ letter: "M", multiplier: 1 }], 5);
    expect(result).toEqual([{ constituentKey: "M2", factor: 2.5 }]);
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

  it("decomposes MA annual variants as (n/2)×M2 - Sa (IHO Annex B)", () => {
    // MA4 = 2×M2 - Sa
    const ma4 = decomposeCompound("MA4", 4, constituents);
    expect(ma4).not.toBeNull();
    expect(ma4).toHaveLength(2);
    expect(ma4![0].constituent).toBe(constituents.M2);
    expect(ma4![0].factor).toBe(2);
    expect(ma4![1].constituent).toBe(constituents.Sa);
    expect(ma4![1].factor).toBe(-1);

    // MA6 = 3×M2 - Sa
    const ma6 = decomposeCompound("MA6", 6, constituents);
    expect(ma6).not.toBeNull();
    expect(ma6).toHaveLength(2);
    expect(ma6![0].factor).toBe(3);
    expect(ma6![1].constituent).toBe(constituents.Sa);
    expect(ma6![1].factor).toBe(-1);
  });

  it("decomposes MB/MA annual variants with fractional factors", () => {
    // MB5 = 2.5×M2 + Sa
    const mb5 = decomposeCompound("MB5", 5, constituents);
    expect(mb5).not.toBeNull();
    expect(mb5).toHaveLength(2);
    expect(mb5![0].constituent).toBe(constituents.M2);
    expect(mb5![0].factor).toBe(2.5);
    expect(mb5![1].constituent).toBe(constituents.Sa);
    expect(mb5![1].factor).toBe(1);

    // MA9 = 4.5×M2 - Sa
    const ma9 = decomposeCompound("MA9", 9, constituents);
    expect(ma9).not.toBeNull();
    expect(ma9).toHaveLength(2);
    expect(ma9![0].constituent).toBe(constituents.M2);
    expect(ma9![0].factor).toBe(4.5);
    expect(ma9![1].constituent).toBe(constituents.Sa);
    expect(ma9![1].factor).toBe(-1);
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

  function memberSpeed(members: { constituent: { speed: number }; factor: number }[]) {
    return members.reduce((sum, m) => sum + m.factor * m.constituent.speed, 0);
  }

  // Sign pattern [+3, -3, +1] not reachable by right-to-left flip algorithm.
  // Doodson: (2, 5, -6, 1, 0, 0) → 3×S2 - 3×M2 + N2
  it("3(SM)N2 = 3×S2 - 3×M2 + N2", () => {
    const result = decomposeCompound("3(SM)N2", 0, constituents);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(3);
    expect(memberSpeed(result!)).toBeCloseTo(constituents["3(SM)N2"].speed, 6);
  });

  // Both K tokens must resolve independently: first K→K1, second K→K2.
  // Doodson: (5, 5, -2, 0, 0, 0) → S2 + K1 + K2
  it("(SK)K5 = S2 + K1 + K2", () => {
    const result = decomposeCompound("(SK)K5", 0, constituents);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(3);
    expect(result![0].constituent).toBe(constituents.S2);
    expect(result![1].constituent).toBe(constituents.K1);
    expect(result![2].constituent).toBe(constituents.K2);
    expect(memberSpeed(result!)).toBeCloseTo(constituents["(SK)K5"].speed, 6);
  });

  // IHO name "4ML12" is a naming error — should be 5ML12 (5×M2 + L2).
  // TideHarmonics uses the corrected name. 4ML12 is kept as an alias.
  // Name now decomposes correctly: 5×M + L = 10+2 = 12.
  it("5ML12 = 5×M2 + L2 (IHO name corrected from 4ML12)", () => {
    const c = constituents["5ML12"];
    expect(c.members).toHaveLength(2);
    expect(c.members[0].constituent).toBe(constituents.M2);
    expect(c.members[0].factor).toBe(5);
    expect(c.members[1].constituent).toBe(constituents.L2);
    expect(c.members[1].factor).toBe(1);
    expect(memberSpeed(c.members)).toBeCloseTo(c.speed, 6);
    // Old IHO name still accessible via alias
    expect(constituents["4ML12"]).toBe(c);
  });

  // IHO "5MSN12" is a naming error — Doodson (12,3,0,-1) has h=0, ruling
  // out S2 (h=-2). The real composition is 6×M2 + Mfm. TideHarmonics
  // omits this entry entirely. We drop it too (6MSN12 is the valid 12th-
  // diurnal M+S-N compound).
  it("5MSN12 is dropped (naming error in IHO list)", () => {
    expect(constituents["5MSN12"]).toBeUndefined();
  });

  // Per IHO Annex B: 3×N2 + 2×M2 + S2, all positive (species 6+4+2=12).
  // The stored speed (173.362) differs from the member sum (173.287) by
  // 0.075°/hr — a data discrepancy, not a parser issue.
  it("3N2MS12 = 3×N2 + 2×M2 + S2 (IHO Annex B)", () => {
    const result = decomposeCompound("3N2MS12", 0, constituents);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(3);
    expect(result![0].constituent).toBe(constituents.N2);
    expect(result![0].factor).toBe(3);
    expect(result![1].constituent).toBe(constituents.M2);
    expect(result![1].factor).toBe(2);
    expect(result![2].constituent).toBe(constituents.S2);
    expect(result![2].factor).toBe(1);
  });

  // MA normalization strips "A" → "M12" → 6×M2, but MA12 is actually
  // the annual variant: 6×M2 - Sa. Doodson differs in h coefficient.
  it("MA12 = 6×M2 - Sa (annual modulation)", () => {
    const result = decomposeCompound("MA12", 0, constituents);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result![0].constituent).toBe(constituents.M2);
    expect(result![0].factor).toBe(6);
    expect(result![1].constituent).toBe(constituents.Sa);
    expect(result![1].factor).toBe(-1);
    expect(memberSpeed(result!)).toBeCloseTo(constituents.MA12.speed, 6);
  });
});

// ─── Data integrity ─────────────────────────────────────────────────────────

describe("data.json integrity", () => {
  const entriesWithMembers = data.filter((d) => d.members && d.members.length > 0);

  it("all entries with members reference valid constituent names", () => {
    for (const entry of entriesWithMembers) {
      for (const [memberName] of entry.members!) {
        expect(
          constituents[memberName],
          `${entry.name}: member "${memberName}" not found`,
        ).toBeDefined();
      }
    }
  });

  it("no entry has self-referential members", () => {
    for (const entry of entriesWithMembers) {
      for (const [memberName] of entry.members!) {
        expect(memberName, `${entry.name} references itself`).not.toBe(entry.name);
      }
    }
  });
});
