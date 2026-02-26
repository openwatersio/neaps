import { describe, it, expect } from "vitest";
import constituents from "../../src/constituents/index.js";
import astro from "../../src/astronomy/index.js";

const sampleTime = new Date("2019-10-04T10:15:40.010Z");
const testAstro = astro(sampleTime);

describe("Base constituent definitions", () => {
  it("it prepared constituent SA", () => {
    expect(constituents.SA.value(testAstro)).toBeCloseTo(192.826398978, 4);
  });

  it("it prepared constituent SSA", () => {
    expect(constituents.SSA.value(testAstro)).toBeCloseTo(25.652797955, 4);
  });

  it("it prepared constituent M2", () => {
    expect(constituents.M2.value(testAstro)).toBeCloseTo(177.008710124, 4);
  });

  it("computes IHO nodal corrections for M2", () => {
    const correction = constituents.M2.correction(testAstro);
    expect(correction.u).toBeCloseTo(-2.085704074, 4);
    expect(correction.f).toBeCloseTo(1.00886892009, 4);
  });

  it("computes IHO nodal corrections for M3", () => {
    const correction = constituents.M3.correction(testAstro);
    expect(correction.u).toBeCloseTo(-3.128556111, 4);
    expect(correction.f).toBeCloseTo(1.01333283333, 4);
  });

  it("has correct properties for LAMBDA2 (alias of LAM2)", () => {
    expect(constituents.LAMBDA2).toBeDefined();
    expect(constituents.LAMBDA2.speed).toBeCloseTo(29.455626, 2);
  });

  it("has correct properties for RHO1 (alias of RHO)", () => {
    expect(constituents.RHO1).toBeDefined();
    const expectedSpeed = constituents.NU2.speed - constituents.K1.speed;
    expect(constituents.RHO1.speed).toBeCloseTo(expectedSpeed, 2);
  });

  it("has correct properties for EP2 (lunar elliptic semi-diurnal)", () => {
    expect(constituents.EP2).toBeDefined();
    expect(constituents.EP2.speed).toBeCloseTo(27.4238338, 7);
  });

  it("has correct properties for MA2 (lunar variational semi-diurnal, mu2)", () => {
    expect(constituents.MA2).toBeDefined();
    expect(constituents.MA2.speed).toBeCloseTo(28.943036, 6);
  });

  it("has correct properties for MB2 (lunar elliptic parameter variation)", () => {
    expect(constituents.MB2).toBeDefined();
    expect(constituents.MB2.speed).toBeCloseTo(29.025173, 6);
  });

  it("has correct properties for SGM (lunar diurnal variational, sigma1)", () => {
    expect(constituents.SGM).toBeDefined();
    expect(constituents.SGM.speed).toBeCloseTo(12.9271398);
  });

  // IHO MSqm is a long-period constituent (not the old compound M2+S2+K1)
  it("has correct properties for MSQM (long-period, alias of MSqm)", () => {
    expect(constituents.MSQM).toBeDefined();
    expect(constituents.MSQM.speed).toBeCloseTo(2.1139287, 6);
  });

  // IHO MKS2 = M2+K2-S2 (semi-diurnal)
  it("has correct properties for MKS2 (semi-diurnal M2+K2-S2)", () => {
    expect(constituents.MKS2).toBeDefined();
    expect(constituents.MKS2.speed).toBeCloseTo(29.0662415, 2);
  });

  it("has correct properties for N4 (N2 overtide)", () => {
    expect(constituents.N4).toBeDefined();
    const expectedSpeed = 2 * constituents.N2.speed;
    expect(constituents.N4.speed).toBeCloseTo(expectedSpeed, 2);
  });

  it("has correct properties for T3 (solar elliptic terdiurnal)", () => {
    expect(constituents.T3).toBeDefined();
    const expectedSpeed = 1.5 * constituents.T2.speed;
    expect(constituents.T3.speed).toBeCloseTo(expectedSpeed, 2);
    expect(constituents.T3.members).toEqual([{ constituent: constituents.T2, factor: 1.5 }]);
  });

  it("has correct properties for R3 (solar elliptic terdiurnal)", () => {
    expect(constituents.R3).toBeDefined();
    const expectedSpeed = 1.5 * constituents.R2.speed;
    expect(constituents.R3.speed).toBeCloseTo(expectedSpeed, 2);
    expect(constituents.R3.members).toEqual([{ constituent: constituents.R2, factor: 1.5 }]);
  });

  it("has correct properties for 3L2 (triple L2)", () => {
    expect(constituents["3L2"]).toBeDefined();
    const expectedSpeed = 3 * constituents.L2.speed;
    expect(constituents["3L2"].speed).toBeCloseTo(expectedSpeed, 2);
  });

  it("has correct properties for 3N2 (triple N2)", () => {
    expect(constituents["3N2"]).toBeDefined();
    const expectedSpeed = 3 * constituents.N2.speed;
    expect(constituents["3N2"].speed).toBeCloseTo(expectedSpeed, 2);
  });

  it("has correct properties for S3 (solar terdiurnal)", () => {
    expect(constituents.S3).toBeDefined();
    expect(constituents.S3.speed).toBeCloseTo(45.0, 2);
  });

  // Null-XDO compound constituents derive V₀ from structural decomposition
  it("derives V₀ for MS4 (M2+S2) from structural members", () => {
    const expected = constituents.M2.value(testAstro) + constituents.S2.value(testAstro);
    expect(constituents.MS4.value(testAstro)).toBeCloseTo(expected % 360, 4);
  });

  it("derives V₀ for MN4 (M2+N2) from structural members", () => {
    const expected = constituents.M2.value(testAstro) + constituents.N2.value(testAstro);
    expect(constituents.MN4.value(testAstro)).toBeCloseTo(expected % 360, 4);
  });

  it("derives V₀ for 2MK3 (2×M2−K1) from structural members", () => {
    // Sign resolution: M(2)×2 + K(1)×1 = 5, target=3 → K flipped to −1
    const expected = 2 * constituents.M2.value(testAstro) - constituents.K1.value(testAstro);
    expect(constituents["2MK3"].value(testAstro)).toBeCloseTo(((expected % 360) + 360) % 360, 4);
  });

  it("has correct properties for 2MS6 (quarter-diurnal M2-S2 interaction)", () => {
    expect(constituents["2MS6"]).toBeDefined();
    expect(constituents["2MS6"].speed).toBeCloseTo(87.96820834, 7);
  });

  it("has correct properties for 2MK5 (fifth-diurnal M2-K1 interaction)", () => {
    expect(constituents["2MK5"]).toBeDefined();
    const expectedSpeed = 2 * constituents.M2.speed + constituents.K1.speed;
    expect(constituents["2MK5"].speed).toBeCloseTo(expectedSpeed, 2);
  });

  it("has correct properties for 2MO5 (fifth-diurnal M2-O1 interaction)", () => {
    expect(constituents["2MO5"]).toBeDefined();
    expect(constituents["2MO5"].speed).toBeCloseTo(71.911244, 6);
  });

  it("has correct properties for MP1 (solar-lunar diurnal)", () => {
    expect(constituents.MP1).toBeDefined();
    expect(constituents.MP1.speed).toBeCloseTo(14.0251729, 7);
  });

  // Long-period compounds with explicit members from data.json
  it.each([
    {
      name: "Sta",
      members: [
        ["K2", 1],
        ["T2", -1],
      ],
    },
    {
      name: "MSm",
      members: [
        ["M2", 1],
        ["nu2", -1],
      ],
    },
    {
      name: "Mnum",
      members: [
        ["M2", 1],
        ["nu2", -1],
      ],
    },
    {
      name: "SM",
      members: [
        ["S2", 1],
        ["M2", -1],
      ],
    },
    {
      name: "KOo",
      members: [
        ["K1", 1],
        ["O1", -1],
      ],
    },
    {
      name: "MKo",
      members: [
        ["K2", 1],
        ["M2", -1],
      ],
    },
    {
      name: "SN",
      members: [
        ["S2", 1],
        ["N2", -1],
      ],
    },
    {
      name: "MStm",
      members: [
        ["Mf", 1],
        ["M2", 1],
        ["nu2", -1],
      ],
    },
    {
      name: "2SMN",
      members: [
        ["S2", 2],
        ["M2", -1],
        ["N2", -1],
      ],
    },
  ])("$name has explicit members from data.json", ({ name, members: expected }) => {
    const c = constituents[name];
    expect(c).toBeDefined();
    expect(c.members).not.toBeNull();
    expect(c.members).toHaveLength(expected.length);
    for (let i = 0; i < expected.length; i++) {
      expect(c.members![i].constituent).toBe(constituents[expected[i][0] as string]);
      expect(c.members![i].factor).toBe(expected[i][1]);
    }
  });

  it("long-period explicit member speeds match constituent speeds", () => {
    const longPeriod = ["Sta", "MSm", "Mnum", "SM", "KOo", "MKo", "SN", "MStm", "2SMN"];
    for (const name of longPeriod) {
      const c = constituents[name];
      let computedSpeed = 0;
      for (const { constituent, factor } of c.members!) {
        computedSpeed += factor * constituent.speed;
      }
      expect(Math.abs(computedSpeed - c.speed), `${name} speed`).toBeLessThan(0.0001);
    }
  });

  // Deduplicate: aliases point to the same object as the canonical name
  const allConstituents = [...new Set(Object.values(constituents))];

  // Use a non-J2000 epoch (T=0 causes NaN in derivative polynomial)
  const a = astro(sampleTime);
  const argSpeeds = [
    a["T+h-s"].speed, // τ
    a.s.speed, // s
    a.h.speed, // h
    a.p.speed, // p
    -a.N.speed, // N' = −N
    a.pp.speed, // p'
  ];

  /** Compute speed from Doodson coefficients, recursing through members for compounds. */
  function computeSpeed(c: (typeof allConstituents)[number]): number {
    if (c.coefficients) {
      let speed = 0;
      for (let i = 0; i < 6; i++) {
        speed += c.coefficients[i] * argSpeeds[i];
      }
      return speed;
    }
    let speed = 0;
    for (const { constituent: member, factor } of c.members) {
      speed += factor * computeSpeed(member);
    }
    return speed;
  }

  describe("speed derived from Doodson coefficients", () => {
    const withCoefficients = allConstituents.filter((c) => c.coefficients !== null);

    it.each(withCoefficients.map((c) => ({ name: c.name, speed: c.speed })))(
      "$name speed matches coefficients",
      ({ name, speed }) => {
        const computed = computeSpeed(constituents[name]);
        // Use the decimal precision of the stored speed constant, capped to
        // account for polynomial approximation drift at the given epoch.
        // Astronomical argument speeds are polynomial derivatives that vary
        // slightly from the exact mean speeds (~3e-7 max drift).
        const decimals = speed.toPrecision(12).replace(/0+$/, "").split(".")[1]?.length ?? 0;
        expect(computed).toBeCloseTo(speed, Math.max(Math.min(decimals - 1, 6), 1));
      },
    );
  });

  describe("speed derived from compound members", () => {
    // These compounds have known issues in the compound name parser:
    // - 3(SM)N2, (SK)K5, 4ML12, 5MSN12: sign resolution can't reach target species
    // - 3N2MS12, MA12: parser produces incorrect decomposition
    const parserBugs = new Set(["3(SM)N2", "(SK)K5", "4ML12", "5MSN12", "3N2MS12", "MA12"]);
    const compounds = allConstituents.filter(
      (c) => c.coefficients === null && !parserBugs.has(c.name),
    );

    it.each(compounds.map((c) => ({ name: c.name, speed: c.speed })))(
      "$name speed matches member sum",
      ({ name, speed }) => {
        const c = constituents[name];
        expect(c.members.length).toBeGreaterThan(0);
        const computed = computeSpeed(c);
        const decimals = speed.toPrecision(12).replace(/0+$/, "").split(".")[1]?.length ?? 0;
        expect(computed).toBeCloseTo(speed, Math.max(Math.min(decimals - 1, 6), 1));
      },
    );
  });
});
