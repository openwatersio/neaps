import { d2r, r2d } from "./constants.js";
import coefficients from "./coefficients.js";

export interface AstroValue {
  value: number;
  speed: number;
}

export interface AstroData {
  s: AstroValue;
  h: AstroValue;
  p: AstroValue;
  N: AstroValue;
  pp: AstroValue;
  "90": AstroValue;
  omega: AstroValue;
  i: AstroValue;
  I: AstroValue;
  xi: AstroValue;
  nu: AstroValue;
  nup: AstroValue;
  nupp: AstroValue;
  "T+h-s": AstroValue;
  P: AstroValue;
}

// Evaluates a polynomial at argument
const polynomial = (coefficients: number[], argument: number): number => {
  const result: number[] = [];
  coefficients.forEach((coefficient, index) => {
    result.push(coefficient * Math.pow(argument, index));
  });
  return result.reduce((a, b) => a + b);
};

// Evaluates a derivative polynomial at argument
const derivativePolynomial = (coefficients: number[], argument: number): number => {
  const result: number[] = [];
  coefficients.forEach((coefficient, index) => {
    result.push(coefficient * index * Math.pow(argument, index - 1));
  });
  return result.reduce((a, b) => a + b);
};

// Meeus formula 11.1
const T = (t: Date): number => {
  return (JD(t) - 2451545.0) / 36525;
};

// Meeus formula 7.1
const JD = (t: Date): number => {
  let Y = t.getUTCFullYear();
  let M = t.getUTCMonth() + 1;
  const D =
    t.getUTCDate() +
    t.getUTCHours() / 24.0 +
    t.getUTCMinutes() / (24.0 * 60.0) +
    t.getUTCSeconds() / (24.0 * 60.0 * 60.0) +
    t.getUTCMilliseconds() / (24.0 * 60.0 * 60.0 * 1e6);
  if (M <= 2) {
    Y = Y - 1;
    M = M + 12;
  }
  const A = Math.floor(Y / 100.0);
  const B = 2 - A + Math.floor(A / 4.0);
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + D + B - 1524.5;
};

const _I = (N: number, i: number, omega: number): number => {
  N = d2r * N;
  i = d2r * i;
  omega = d2r * omega;
  const cosI = Math.cos(i) * Math.cos(omega) - Math.sin(i) * Math.sin(omega) * Math.cos(N);
  return r2d * Math.acos(cosI);
};

const _xi = (N: number, i: number, omega: number): number => {
  N = d2r * N;
  i = d2r * i;
  omega = d2r * omega;
  let e1 = (Math.cos(0.5 * (omega - i)) / Math.cos(0.5 * (omega + i))) * Math.tan(0.5 * N);
  let e2 = (Math.sin(0.5 * (omega - i)) / Math.sin(0.5 * (omega + i))) * Math.tan(0.5 * N);
  e1 = Math.atan(e1);
  e2 = Math.atan(e2);
  e1 = e1 - 0.5 * N;
  e2 = e2 - 0.5 * N;
  return -(e1 + e2) * r2d;
};

const _nu = (N: number, i: number, omega: number): number => {
  N = d2r * N;
  i = d2r * i;
  omega = d2r * omega;
  let e1 = (Math.cos(0.5 * (omega - i)) / Math.cos(0.5 * (omega + i))) * Math.tan(0.5 * N);
  let e2 = (Math.sin(0.5 * (omega - i)) / Math.sin(0.5 * (omega + i))) * Math.tan(0.5 * N);
  e1 = Math.atan(e1);
  e2 = Math.atan(e2);
  e1 = e1 - 0.5 * N;
  e2 = e2 - 0.5 * N;
  return (e1 - e2) * r2d;
};

// Schureman equation 224
const _nup = (N: number, i: number, omega: number): number => {
  const I = d2r * _I(N, i, omega);
  const nu = d2r * _nu(N, i, omega);
  return (
    r2d * Math.atan((Math.sin(2 * I) * Math.sin(nu)) / (Math.sin(2 * I) * Math.cos(nu) + 0.3347))
  );
};

// Schureman equation 232
const _nupp = (N: number, i: number, omega: number): number => {
  const I = d2r * _I(N, i, omega);
  const nu = d2r * _nu(N, i, omega);
  const tan2nupp =
    (Math.sin(I) ** 2 * Math.sin(2 * nu)) / (Math.sin(I) ** 2 * Math.cos(2 * nu) + 0.0727);
  return r2d * 0.5 * Math.atan(tan2nupp);
};

const modulus = (a: number, b: number): number => {
  return ((a % b) + b) % b;
};

const astro = (time: Date): AstroData => {
  // This gets cast to `AstroData` later, but we build it up step by step here
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = {};

  const polynomials: Record<string, number[]> = {
    s: coefficients.lunarLongitude,
    h: coefficients.solarLongitude,
    p: coefficients.lunarPerigee,
    N: coefficients.lunarNode,
    pp: coefficients.solarPerigee,
    "90": [90.0],
    omega: coefficients.terrestrialObliquity,
    i: coefficients.lunarInclination,
  };

  // Polynomials are in T, that is Julian Centuries; we want our speeds to be
  // in the more convenient unit of degrees per hour.
  const dTdHour = 1 / (24 * 365.25 * 100);
  for (const name in polynomials) {
    result[name] = {
      value: modulus(polynomial(polynomials[name], T(time)), 360.0),
      speed: derivativePolynomial(polynomials[name], T(time)) * dTdHour,
    };
  }

  // Some other parameters defined by Schureman which are dependent on the
  // parameters N, i, omega for use in node factor calculations. We don't need
  // their speeds.
  const functions: Record<string, (N: number, i: number, omega: number) => number> = {
    I: _I,
    xi: _xi,
    nu: _nu,
    nup: _nup,
    nupp: _nupp,
  };
  Object.keys(functions).forEach((name) => {
    const functionCall = functions[name];
    result[name] = {
      value: modulus(functionCall(result.N.value, result.i.value, result.omega.value), 360.0),
      speed: null,
    };
  });

  // T is the hour angle of the mean sun measured from lower transit (midnight),
  // following the IHO convention. JD epochs at noon, so we shift by +0.5 day
  // to get a civil day fraction (0 at midnight, 0.5 at noon).
  const jd = JD(time) + 0.5;
  const hour = {
    value: (jd - Math.floor(jd)) * 360.0,
    speed: 15.0,
  };

  result["T+h-s"] = {
    value: hour.value + result.h.value - result.s.value,
    speed: hour.speed + result.h.speed - result.s.speed,
  };

  // It is convenient to calculate Schureman's P here since several node
  // factors need it, although it could be argued that these
  // (along with I, xi, nu etc) belong somewhere else.
  result.P = {
    value: result.p.value - (result.xi.value % 360.0),
    speed: null,
  };

  return result as AstroData;
};

export default astro;
export { polynomial, derivativePolynomial, T, JD, _I, _xi, _nu, _nup, _nupp };
