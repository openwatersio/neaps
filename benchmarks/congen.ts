import { expect } from "vitest";
import { readFile } from "fs/promises";
import { createWriteStream } from "fs";
import { join } from "path";
import { astro, constituents, iho, schureman } from "@neaps/tide-predictor";
import type { Fundamentals } from "@neaps/tide-predictor";

const __dirname = new URL(".", import.meta.url).pathname;

// ─── Congen output parser ───────────────────────────────────────────────────

interface CongenConstituent {
  name: string;
  speed: number;
  equilibriumArgs: number[];
  nodeFactors: number[];
}

interface CongenData {
  startYear: number;
  numYears: number;
  constituents: Map<string, CongenConstituent>;
}

/**
 * Parse a congen output file. Three sections:
 *   1. Speeds: count, then `<name> <speed>` lines
 *   2. Equilibrium arguments: start year, count, per-constituent name + value rows, *END*
 *   3. Node factors: count, per-constituent name + value rows, *END*
 */
async function parseCongenOutput(filePath: string): Promise<CongenData> {
  const text = await readFile(filePath, "utf-8");
  const lines = text.split("\n");

  let i = 0;
  const next = () => lines[i++].trim();
  const skipComments = () => {
    while (i < lines.length && (lines[i].trim() === "" || lines[i].trim().startsWith("#"))) i++;
  };

  // Section 1: Speeds
  skipComments();
  const numConstituents = parseInt(next());
  skipComments();

  const names: string[] = [];
  const speeds: number[] = [];
  for (let c = 0; c < numConstituents; c++) {
    const parts = next().split(/\s+/);
    names.push(parts[0]);
    speeds.push(parseFloat(parts[parts.length - 1]));
  }

  // Section 2: Equilibrium arguments
  skipComments();
  const startYear = parseInt(next());
  skipComments();
  const numYears = parseInt(next());

  const eqArgs = parseValueTable(lines, i, names, numYears);
  i = eqArgs.nextLine;

  // Section 3: Node factors
  skipComments();
  const nfYears = parseInt(next());
  if (nfYears !== numYears) {
    throw new Error(`Node factor year count ${nfYears} != equilibrium arg year count ${numYears}`);
  }

  const nodeFactors = parseValueTable(lines, i, names, numYears);

  // Build result
  const result = new Map<string, CongenConstituent>();
  for (let c = 0; c < numConstituents; c++) {
    result.set(names[c], {
      name: names[c],
      speed: speeds[c],
      equilibriumArgs: eqArgs.values[c],
      nodeFactors: nodeFactors.values[c],
    });
  }

  return { startYear, numYears, constituents: result };
}

function parseValueTable(
  lines: string[],
  startLine: number,
  names: string[],
  numYears: number,
): { values: number[][]; nextLine: number } {
  let i = startLine;
  const values: number[][] = [];

  for (let c = 0; c < names.length; c++) {
    const nameLine = lines[i++].trim();
    if (nameLine !== names[c]) {
      throw new Error(`Expected constituent '${names[c]}' but got '${nameLine}' at line ${i}`);
    }

    const vals: number[] = [];
    while (vals.length < numYears) {
      const row = lines[i++]
        .trim()
        .split(/\s+/)
        .map((v) => parseFloat(v));
      vals.push(...row);
    }
    values.push(vals.slice(0, numYears));
  }

  // Skip past *END*
  while (i < lines.length && lines[i].trim() !== "*END*") i++;
  i++;

  return { values, nextLine: i };
}

// ─── Benchmark ──────────────────────────────────────────────────────────────

// Parse the congen reference data (1700–2100, 176 constituents)
const congen = await parseCongenOutput(join(__dirname, "congen_output.txt"));

// Test one complete nodal cycle (~18.6 years) ending near the present
const NODAL_CYCLE = 19;
const TEST_END = Math.min(new Date().getUTCFullYear(), congen.startYear + congen.numYears - 1);
const TEST_START = Math.max(TEST_END - NODAL_CYCLE + 1, congen.startYear);

const schemes: Record<string, Fundamentals> = { iho, schureman };

interface Stat {
  scheme: string;
  constituent: string;
  year: number;
  speed_delta: number;
  f_delta: number;
  u_delta: number;
}

const stats: Stat[] = [];
const matched = [...congen.constituents.keys()].filter((name) => constituents[name]).length;
const skipped = congen.constituents.size - matched;

for (const [schemeName, fundamentals] of Object.entries(schemes)) {
  for (const [name, ref] of congen.constituents) {
    const c = constituents[name];
    if (!c) continue;

    for (let year = TEST_START; year <= TEST_END; year++) {
      const yearIndex = year - congen.startYear;
      if (yearIndex < 0 || yearIndex >= congen.numYears) {
        throw new Error(
          `Year ${year} outside congen range ${congen.startYear}–${congen.startYear + congen.numYears - 1}`,
        );
      }

      // Equilibrium argument: congen gives V₀+u at Jan 1 00:00 UTC
      const jan1 = new Date(Date.UTC(year, 0, 1));
      const astroJan1 = astro(jan1);
      const v0 = c.value(astroJan1);
      const { u } = c.correction(astroJan1, fundamentals);
      const neapsEqArg = (((v0 + u) % 360) + 360) % 360;
      const congenEqArg = ref.equilibriumArgs[yearIndex];

      // Circular difference (handle wrap-around at 0/360)
      let uDelta = neapsEqArg - congenEqArg;
      if (uDelta > 180) uDelta -= 360;
      if (uDelta < -180) uDelta += 360;

      // Node factor: congen gives f at midyear (July 2)
      const jul2 = new Date(Date.UTC(year, 6, 2));
      const astroJul2 = astro(jul2);
      const { f: fMid } = c.correction(astroJul2, fundamentals);
      const congenF = ref.nodeFactors[yearIndex];
      const fDelta = fMid - congenF;

      // Speed: constant, compare once per year (same value each time)
      const speedDelta = c.speed - ref.speed;

      stats.push({
        scheme: schemeName,
        constituent: name,
        year,
        speed_delta: speedDelta,
        f_delta: fDelta,
        u_delta: uDelta,
      });
    }
  }
}

// Write detailed CSV
const csv = createWriteStream(join(__dirname, "congen.csv"));
csv.write("scheme,constituent,year,speed_delta,f_delta,u_delta\n");
for (const s of stats) {
  csv.write(
    [
      s.scheme,
      s.constituent,
      s.year,
      s.speed_delta.toFixed(7),
      s.f_delta.toFixed(4),
      s.u_delta.toFixed(2),
    ].join(",") + "\n",
  );
}
csv.end();

console.log(
  `\nCompared ${matched} of ${congen.constituents.size} congen constituents (${skipped} skipped)`,
);

// Report summary per scheme
for (const schemeName of Object.keys(schemes)) {
  const schemeStats = stats.filter((s) => s.scheme === schemeName);
  const numYears = TEST_END - TEST_START + 1;

  // Aggregate per-constituent (worst across years)
  const byConstituent = new Map<
    string,
    { maxAbsSpeed: number; maxAbsF: number; maxAbsU: number }
  >();
  for (const s of schemeStats) {
    const prev = byConstituent.get(s.constituent) ?? {
      maxAbsSpeed: 0,
      maxAbsF: 0,
      maxAbsU: 0,
    };
    prev.maxAbsSpeed = Math.max(prev.maxAbsSpeed, Math.abs(s.speed_delta));
    prev.maxAbsF = Math.max(prev.maxAbsF, Math.abs(s.f_delta));
    prev.maxAbsU = Math.max(prev.maxAbsU, Math.abs(s.u_delta));
    byConstituent.set(s.constituent, prev);
  }

  // Count constituents in each accuracy band
  const speedOk = [...byConstituent.values()].filter((v) => v.maxAbsSpeed < 0.001).length;
  const uClose = [...byConstituent.values()].filter((v) => v.maxAbsU < 1).length;
  const uMedium = [...byConstituent.values()].filter(
    (v) => v.maxAbsU >= 1 && v.maxAbsU < 15,
  ).length;
  const uFlipped = [...byConstituent.values()].filter((v) => v.maxAbsU >= 15).length;
  const fClose = [...byConstituent.values()].filter((v) => v.maxAbsF < 0.01).length;

  // Overall stats
  const absSpeedDeltas = schemeStats.map((s) => Math.abs(s.speed_delta));
  const absFDeltas = schemeStats.map((s) => Math.abs(s.f_delta));
  const absUDeltas = schemeStats.map((s) => Math.abs(s.u_delta));

  console.log(`\n${schemeName} (${byConstituent.size} constituents x ${numYears} years):`);
  console.log(`  Speed: ${speedOk}/${byConstituent.size} match (<0.001 deg/hr)`);
  console.log(`  u: ${uClose} close (<1°), ${uMedium} medium (1-15°), ${uFlipped} flipped (>15°)`);
  console.log(`  Node factor: ${fClose}/${byConstituent.size} close (<0.01)`);
  console.log(`  Max |speed delta|: ${Math.max(...absSpeedDeltas).toFixed(7)} deg/hr`);
  console.log(`  Max |f delta|: ${Math.max(...absFDeltas).toFixed(4)}`);
  console.log(
    `  p95 |f delta|: ${percentile(
      absFDeltas.sort((a, b) => a - b),
      0.95,
    ).toFixed(4)}`,
  );
  console.log(`  Max |u delta|: ${Math.max(...absUDeltas).toFixed(2)}°`);
  console.log(
    `  p95 |u delta|: ${percentile(
      absUDeltas.sort((a, b) => a - b),
      0.95,
    ).toFixed(2)}°`,
  );

  // Print outliers
  const outliers = [...byConstituent.entries()]
    .filter(([, v]) => v.maxAbsU >= 15 || v.maxAbsF >= 0.5 || v.maxAbsSpeed >= 0.001)
    .sort((a, b) => b[1].maxAbsU - a[1].maxAbsU);

  if (outliers.length > 0) {
    console.log(`  Outliers:`);
    for (const [name, v] of outliers) {
      const reasons = [];
      if (v.maxAbsSpeed >= 0.001) reasons.push(`speed=${v.maxAbsSpeed.toFixed(4)}`);
      if (v.maxAbsU >= 15) reasons.push(`u=${v.maxAbsU.toFixed(1)}°`);
      if (v.maxAbsF >= 0.5) reasons.push(`f=${v.maxAbsF.toFixed(4)}`);
      console.log(`    ${name}: ${reasons.join(", ")}`);
    }
  }

  // Baseline assertions. Congen uses Schureman equations, so schureman scheme
  // matches better for node factors. Many compound constituents have different
  // definitions (sign conventions, Doodson numbers) causing ~180° phase flips.
  // These baselines should be tightened as discrepancies are resolved.
  const n = byConstituent.size;
  expect(speedOk / n, `${schemeName} speeds`).toBeGreaterThanOrEqual(0.98);
  expect(fClose / n, `${schemeName} node factors close (<0.01)`).toBeGreaterThanOrEqual(
    schemeName === "schureman" ? 0.85 : 0.64,
  );
  expect(uClose / n, `${schemeName} u close (<1°)`).toBeGreaterThanOrEqual(0.25);
}

function percentile(sorted: number[], p: number): number {
  return sorted[Math.floor(sorted.length * p)] ?? NaN;
}
