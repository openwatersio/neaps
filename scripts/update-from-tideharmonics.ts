/**
 * One-time script to update data.json speeds and coefficients from TideHarmonics reference data.
 *
 * Usage: npx tsx scripts/update-from-tideharmonics.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

import { coefficientsToXdoString } from "./generate-constituent-data.js";
import type { Coefficients } from "../packages/tide-predictor/src/constituents/types.js";

const __dirname = new URL(".", import.meta.url).pathname;

// ─── Types ──────────────────────────────────────────────────────────────────

interface THRow {
  sname: string;
  name: string;
  speed: number;
  i1: number;
  i2: number;
  i3: number;
  i4: number;
  i5: number;
  i6: number;
  phi: number;
  nodal: string;
}

interface NeapsEntry {
  name: string;
  speed: number;
  coefficients: Coefficients | null;
  xdo: string | null;
  aliases: string[];
  members?: [string, number][];
}

// ─── Parse TH CSV ───────────────────────────────────────────────────────────

function parseTHCsv(text: string): THRow[] {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cols[i]));
    return {
      sname: row.sname,
      name: row.name,
      speed: parseFloat(row.speed),
      i1: parseFloat(row.i1),
      i2: parseFloat(row.i2),
      i3: parseFloat(row.i3),
      i4: parseFloat(row.i4),
      i5: parseFloat(row.i5),
      i6: parseFloat(row.i6),
      phi: parseFloat(row.phi),
      nodal: row.nodal,
    };
  });
}

// ─── Name matching ──────────────────────────────────────────────────────────

const TH_TO_NEAPS_ALIASES: Record<string, string> = {
  gam2: "gamma2",
  alp2: "alpha2",
  del2: "delta2",
  lamO1: "lambdaO1",
};

function buildNeapsLookup(data: NeapsEntry[]): Map<string, NeapsEntry> {
  const map = new Map<string, NeapsEntry>();
  for (const entry of data) {
    map.set(entry.name, entry);
    for (const alias of entry.aliases ?? []) {
      map.set(alias, entry);
    }
  }
  return map;
}

function findNeapsMatch(th: THRow, lookup: Map<string, NeapsEntry>): NeapsEntry | undefined {
  if (lookup.has(th.sname)) return lookup.get(th.sname);
  if (lookup.has(th.name)) return lookup.get(th.name);
  const alias = TH_TO_NEAPS_ALIASES[th.sname] ?? TH_TO_NEAPS_ALIASES[th.name];
  if (alias && lookup.has(alias)) return lookup.get(alias);
  for (const [key, entry] of lookup) {
    if (key.toLowerCase() === th.sname.toLowerCase()) return entry;
    if (key.toLowerCase() === th.name.toLowerCase()) return entry;
  }
  return undefined;
}

// ─── Conversion helpers ─────────────────────────────────────────────────────

/** Convert TideHarmonics row to raw Doodson coefficients. */
function thToCoefficients(th: THRow): Coefficients {
  return [
    th.i1, // τ (species)
    th.i2, // s
    th.i3, // h
    th.i4, // p
    th.i5, // N'
    th.i6, // p'
    th.phi / 90, // phase (90° increments → integer)
  ];
}

// ─── Main ───────────────────────────────────────────────────────────────────

const thText = readFileSync(join(__dirname, "../benchmarks/tideharmonics_harmonics.csv"), "utf-8");
const dataJsonPath = join(__dirname, "../packages/tide-predictor/src/constituents/data.json");
const neapsText = readFileSync(dataJsonPath, "utf-8");

const thData = parseTHCsv(thText);
const neapsData: NeapsEntry[] = JSON.parse(neapsText);
const neapsLookup = buildNeapsLookup(neapsData);

let speedUpdates = 0;
let coefficientUpdates = 0;
let skippedNull = 0;

// Step 1: Update matched constituents
for (const th of thData) {
  const neaps = findNeapsMatch(th, neapsLookup);
  if (!neaps) continue;

  // Update speed
  const oldSpeed = neaps.speed;
  neaps.speed = th.speed;
  if (oldSpeed !== th.speed) speedUpdates++;

  // Update coefficients (skip null-coefficient compounds)
  if (neaps.coefficients !== null) {
    const newCoefficients = thToCoefficients(th);
    const changed = neaps.coefficients.some((v, i) => v !== newCoefficients[i]);
    if (changed) coefficientUpdates++;
    neaps.coefficients = newCoefficients;
    neaps.xdo = coefficientsToXdoString(newCoefficients);
  } else {
    skippedNull++;
  }
}

// Step 2a: Add "Snu" alias to Snu2
const snu2 = neapsData.find((e) => e.name === "Snu2");
if (snu2) {
  if (!snu2.aliases) snu2.aliases = [];
  if (!snu2.aliases.includes("Snu")) {
    snu2.aliases.push("Snu");
    console.log("Added alias 'Snu' to Snu2");
  }
}

// Step 2b: Add new constituents
const newConstituents: NeapsEntry[] = [];

const th2MQ5 = thData.find((r) => r.sname === "2MQ5");
if (th2MQ5 && !neapsLookup.has("2MQ5")) {
  const coefficients = thToCoefficients(th2MQ5);
  newConstituents.push({
    name: "2MQ5",
    speed: th2MQ5.speed,
    coefficients,
    xdo: coefficientsToXdoString(coefficients),
    aliases: [],
  });
}

const th5ML12 = thData.find((r) => r.sname === "5ML12");
if (th5ML12 && !neapsLookup.has("5ML12")) {
  const coefficients = thToCoefficients(th5ML12);
  newConstituents.push({
    name: "5ML12",
    speed: th5ML12.speed,
    coefficients,
    xdo: coefficientsToXdoString(coefficients),
    aliases: [],
  });
}

// Insert new constituents in speed-sorted order
for (const newEntry of newConstituents) {
  const insertIndex = neapsData.findIndex((e) => e.speed > newEntry.speed);
  if (insertIndex === -1) {
    neapsData.push(newEntry);
  } else {
    neapsData.splice(insertIndex, 0, newEntry);
  }
  console.log(`Added new constituent: ${newEntry.name} (speed=${newEntry.speed})`);
}

// Step 3: Write updated data.json
writeFileSync(dataJsonPath, JSON.stringify(neapsData, null, 2) + "\n");

console.log(`\nUpdate complete:`);
console.log(`  Speed updates:       ${speedUpdates}`);
console.log(`  Coefficient updates: ${coefficientUpdates}`);
console.log(`  Null-coeff skipped:  ${skippedNull}`);
console.log(`  New constituents:    ${newConstituents.length}`);
console.log(`  Total entries:       ${neapsData.length}`);
