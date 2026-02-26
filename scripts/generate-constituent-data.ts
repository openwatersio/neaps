/**
 * Generation script for data.json constituent definitions.
 *
 * This script resolves compound member decompositions and generates
 * alphabetical XDO strings from Doodson coefficients. Run it after
 * modifying data.json to ensure all derived fields are consistent.
 *
 * Usage: npx tsx scripts/generate-constituent-data.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

import {
  constituents,
  defineConstituent,
} from "../packages/tide-predictor/src/constituents/definition.js";
import type { Coefficients } from "../packages/tide-predictor/src/constituents/types.js";

const __dirname = new URL(".", import.meta.url).pathname;

// ─── Types ──────────────────────────────────────────────────────────────────

interface DataEntry {
  name: string;
  speed: number;
  coefficients: Coefficients | null;
  xdo: string | null;
  aliases: string[];
  members?: [string, number][];
}

// ─── XDO alphabetical encoding ──────────────────────────────────────────────

/**
 * Convert a single Doodson coefficient to its IHO alphabetical letter.
 *
 * The encoding: Z=0, A=1, B=2, ..., H=8, Y=-1, X=-2, ..., R=-8
 */
function coefficientToLetter(value: number): string {
  if (value === 0) return "Z";
  if (value > 0) return String.fromCharCode("A".charCodeAt(0) + value - 1);
  return String.fromCharCode("Z".charCodeAt(0) + value);
}

/**
 * Convert raw Doodson coefficients to an alphabetical XDO string.
 * Format: "D1 D2D3D4 D5D6D7" with spaces grouping per IHO convention.
 */
export function coefficientsToXdoString(coefficients: Coefficients): string {
  const letters = coefficients.map(coefficientToLetter);
  return `${letters[0]} ${letters[1]}${letters[2]}${letters[3]} ${letters[4]}${letters[5]}${letters[6]}`;
}

/**
 * Decode an alphabetical XDO string back to raw Doodson coefficients.
 */
export function xdoStringToCoefficients(xdo: string): Coefficients {
  const letters = xdo.replace(/ /g, "");
  return letters.split("").map((ch) => {
    if (ch === "Z") return 0;
    const code = ch.charCodeAt(0);
    if (code >= "A".charCodeAt(0) && code <= "Y".charCodeAt(0)) {
      return code - "A".charCodeAt(0) + 1;
    }
    // Should not happen for valid XDO, but handle gracefully
    return code - "Z".charCodeAt(0);
  }) as Coefficients;
}

// ─── Main ───────────────────────────────────────────────────────────────────

const dataJsonPath = join(__dirname, "../packages/tide-predictor/src/constituents/data.json");
const data: DataEntry[] = JSON.parse(readFileSync(dataJsonPath, "utf-8"));

// Step 1: Load all constituents (needed for decomposeCompound member resolution)
for (const entry of data) {
  defineConstituent(entry);
}

// Step 2: Ensure XDO strings are consistent with coefficients
let xdoUpdated = 0;
const failures: string[] = [];

for (const entry of data) {
  if (entry.coefficients) {
    const expected = coefficientsToXdoString(entry.coefficients);
    if (entry.xdo !== expected) {
      entry.xdo = expected;
      xdoUpdated++;
    }
  }
}

// Step 3: Verification pass
for (const entry of data) {
  if (!entry.members) continue;
  for (const [memberName] of entry.members) {
    if (!constituents[memberName]) {
      failures.push(`${entry.name}: member "${memberName}" not found in registry`);
    }
  }
}

// Step 4: Write
writeFileSync(dataJsonPath, JSON.stringify(data, null, 2) + "\n");

console.log("Generation complete:");
console.log(`  XDO strings updated: ${xdoUpdated}`);
console.log(`  Total entries:       ${data.length}`);
if (failures.length > 0) {
  console.error("\nFailures:");
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
