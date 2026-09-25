// SVD is an independent solver oracle for the TS and Swift QR implementations.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { astro, constituents } from "@neaps/tide-predictor";
import { Matrix, SingularValueDecomposition } from "ml-matrix";
import { writeJSON } from "./write.mjs";

const input = JSON.parse(readFileSync(new URL("../harmonic-fit.json", import.meta.url)));
const radians = Math.PI / 180;
const cases = input.cases.map(({ days, samples }) => {
  const rows = samples.map(({ t }) => {
    const state = astro(new Date(t));
    return [1, ...input.basis.flatMap((name) => {
      const c = constituents[name];
      const { f, u } = c.correction(state);
      const angle = (c.value(state) + u) * radians;
      return [f * Math.cos(angle), f * Math.sin(angle)];
    })];
  });
  const matrix = new Matrix(rows);
  const solution = new SingularValueDecomposition(matrix).solve(
    Matrix.columnVector(samples.map(({ v }) => v)),
  ).getColumn(0);
  const residuals = rows.map((row, i) =>
    row.reduce((sum, value, j) => sum + value * solution[j], 0) - samples[i].v);
  return {
    days,
    expected: {
      offset: solution[0],
      rms: Math.hypot(...residuals) / Math.sqrt(samples.length),
      constituents: input.basis.map((name, j) => ({
        name,
        amplitude: Math.hypot(solution[1 + 2 * j], solution[2 + 2 * j]),
        phase: (Math.atan2(solution[2 + 2 * j], solution[1 + 2 * j]) / radians + 360) % 360,
      })),
    },
  };
});
const path = fileURLToPath(new URL("../harmonic-fit-parity.json", import.meta.url));
if (process.argv.includes("--check")) {
  const expected = JSON.parse(readFileSync(path)).cases;
  assert.equal(cases.length, expected.length);
  // SVD roundoff differs across platforms; these limits are tighter than consumer parity tests.
  cases.forEach((entry, i) => {
    assert.equal(entry.days, expected[i].days);
    for (const key of ["offset", "rms"]) {
      const delta = Math.abs(entry.expected[key] - expected[i].expected[key]);
      assert(delta < 1e-9, `${entry.days}d ${key} drift: ${delta}`);
    }
    const actual = entry.expected.constituents;
    const wanted = expected[i].expected.constituents;
    assert.equal(actual.length, wanted.length);
    actual.forEach((c, j) => {
      assert.equal(c.name, wanted[j].name);
      assert(Math.abs(c.amplitude - wanted[j].amplitude) < 1e-9, `${c.name} amplitude drift`);
      const phaseDelta = Math.abs(((c.phase - wanted[j].phase + 540) % 360) - 180);
      assert(phaseDelta < 1e-6, `${c.name} phase drift: ${phaseDelta}`);
    });
  });
  console.log("checked harmonic-fit-parity.json");
} else {
  writeJSON(path, {
    source: "Per-sample astronomy, ml-matrix SVD; inputs in harmonic-fit.json",
    cases,
  });
}
