import { d2r, r2d } from "../astronomy/constants.js";
import type { AstroData, NodalCorrection } from "./types.js";
import { createStrategy } from "./strategy.js";

/**
 * Compute f and u from f·sinU / f·cosU form.
 */
function fromSinCos(fsinU: number, fcosU: number): NodalCorrection {
  const f = Math.sqrt(fsinU * fsinU + fcosU * fcosU);
  const u = r2d * Math.atan2(fsinU, fcosU);
  return { f, u };
}

// ─── Fundamental constituent formulas (IHO TWCWG Annex A) ────────────────────

function corrMm(N: number, p: number): NodalCorrection {
  return {
    f: 1 - 0.1311 * Math.cos(N) + 0.0538 * Math.cos(2 * p) + 0.0205 * Math.cos(2 * p - N),
    u: 0,
  };
}

function corrMf(N: number): NodalCorrection {
  return {
    f: 1.084 + 0.415 * Math.cos(N) + 0.039 * Math.cos(2 * N),
    u: -23.7 * Math.sin(N) + 2.7 * Math.sin(2 * N) - 0.4 * Math.sin(3 * N),
  };
}

function corrO1(N: number): NodalCorrection {
  return {
    f: 1.0176 + 0.1871 * Math.cos(N) - 0.0147 * Math.cos(2 * N),
    u: 10.8 * Math.sin(N) - 1.34 * Math.sin(2 * N) + 0.19 * Math.sin(3 * N),
  };
}

function corrK1(N: number): NodalCorrection {
  return {
    f: 1.006 + 0.115 * Math.cos(N) - 0.0088 * Math.cos(2 * N) + 0.0006 * Math.cos(3 * N),
    u: -8.86 * Math.sin(N) + 0.68 * Math.sin(2 * N) - 0.07 * Math.sin(3 * N),
  };
}

function corrJ1(N: number): NodalCorrection {
  return {
    f: 1.1029 + 0.1676 * Math.cos(N) - 0.017 * Math.cos(2 * N) + 0.0016 * Math.cos(3 * N),
    u: -12.94 * Math.sin(N) + 1.34 * Math.sin(2 * N) - 0.19 * Math.sin(3 * N),
  };
}

function corrM2(N: number): NodalCorrection {
  return {
    f: 1.0007 - 0.0373 * Math.cos(N) + 0.0002 * Math.cos(2 * N),
    u: -2.14 * Math.sin(N),
  };
}

function corrK2(N: number): NodalCorrection {
  return {
    f: 1.0246 + 0.2863 * Math.cos(N) + 0.0083 * Math.cos(2 * N) - 0.0015 * Math.cos(3 * N),
    u: -17.74 * Math.sin(N) + 0.68 * Math.sin(2 * N) - 0.04 * Math.sin(3 * N),
  };
}

function corrM3(N: number): NodalCorrection {
  const m2 = corrM2(N);
  return {
    f: Math.pow(Math.sqrt(m2.f), 3),
    u: -3.21 * Math.sin(N),
  };
}

// ─── Special constituents (f·sinU / f·cosU form) ─────────────────────────────

function corrM1B(N: number, p: number): NodalCorrection {
  const fsinU = 2.783 * Math.sin(2 * p) + 0.558 * Math.sin(2 * p - N) + 0.184 * Math.sin(N);
  const fcosU = 1 + 2.783 * Math.cos(2 * p) + 0.558 * Math.cos(2 * p - N) + 0.184 * Math.cos(N);
  return fromSinCos(fsinU, fcosU);
}

function corrM1(N: number, p: number): NodalCorrection {
  const fsinU = Math.sin(p) + 0.2 * Math.sin(p - N);
  const fcosU = 2 * (Math.cos(p) + 0.2 * Math.cos(p - N));
  return fromSinCos(fsinU, fcosU);
}

function corrM1A(N: number, p: number): NodalCorrection {
  const fsinU = -0.3593 * Math.sin(2 * p) - 0.2 * Math.sin(N) - 0.066 * Math.sin(2 * p - N);
  const fcosU = 1 + 0.3593 * Math.cos(2 * p) + 0.2 * Math.cos(N) + 0.066 * Math.cos(2 * p - N);
  return fromSinCos(fsinU, fcosU);
}

function corrGamma2(N: number, p: number): NodalCorrection {
  const fsinU = 0.147 * Math.sin(2 * (N - p));
  const fcosU = 1 + 0.147 * Math.cos(2 * (N - p));
  return fromSinCos(fsinU, fcosU);
}

function corrAlpha2(p: number, pp: number): NodalCorrection {
  const fsinU = -0.0446 * Math.sin(p - pp);
  const fcosU = 1 - 0.0446 * Math.cos(p - pp);
  return fromSinCos(fsinU, fcosU);
}

function corrDelta2(N: number): NodalCorrection {
  const fsinU = 0.477 * Math.sin(N);
  const fcosU = 1 - 0.477 * Math.cos(N);
  return fromSinCos(fsinU, fcosU);
}

function corrXiEta2(N: number): NodalCorrection {
  const fsinU = -0.439 * Math.sin(N);
  const fcosU = 1 + 0.439 * Math.cos(N);
  return fromSinCos(fsinU, fcosU);
}

function corrL2(N: number, p: number): NodalCorrection {
  const fsinU =
    -0.2505 * Math.sin(2 * p) -
    0.1102 * Math.sin(2 * p - N) -
    0.0156 * Math.sin(2 * p - 2 * N) -
    0.037 * Math.sin(N);
  const fcosU =
    1 -
    0.2505 * Math.cos(2 * p) -
    0.1102 * Math.cos(2 * p - N) -
    0.0156 * Math.cos(2 * p - 2 * N) -
    0.037 * Math.cos(N);
  return fromSinCos(fsinU, fcosU);
}

// ─── IHO fundamentals ────────────────────────────────────────────────────────

export const ihoStrategy = createStrategy({
  Mm: (a: AstroData) => corrMm(d2r * a.N.value, d2r * a.p.value),
  Mf: (a: AstroData) => corrMf(d2r * a.N.value),
  O1: (a: AstroData) => corrO1(d2r * a.N.value),
  K1: (a: AstroData) => corrK1(d2r * a.N.value),
  J1: (a: AstroData) => corrJ1(d2r * a.N.value),
  M1B: (a: AstroData) => corrM1B(d2r * a.N.value, d2r * a.p.value),
  M1C: (a: AstroData) => corrM1(d2r * a.N.value, d2r * a.p.value),
  M1: (a: AstroData) => corrM1(d2r * a.N.value, d2r * a.p.value),
  M1A: (a: AstroData) => corrM1A(d2r * a.N.value, d2r * a.p.value),
  M2: (a: AstroData) => corrM2(d2r * a.N.value),
  K2: (a: AstroData) => corrK2(d2r * a.N.value),
  M3: (a: AstroData) => corrM3(d2r * a.N.value),
  L2: (a: AstroData) => corrL2(d2r * a.N.value, d2r * a.p.value),
  gamma2: (a: AstroData) => corrGamma2(d2r * a.N.value, d2r * a.p.value),
  alpha2: (a: AstroData) => corrAlpha2(d2r * a.p.value, d2r * a.pp.value),
  delta2: (a: AstroData) => corrDelta2(d2r * a.N.value),
  xi2: (a: AstroData) => corrXiEta2(d2r * a.N.value),
  eta2: (a: AstroData) => corrXiEta2(d2r * a.N.value),
});
