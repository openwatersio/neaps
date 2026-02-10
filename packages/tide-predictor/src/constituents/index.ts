import {
  type Constituent,
  defineConstituentFromData,
  defineCompoundConstituent,
} from "./definition.js";
import type { NodalCorrectionCode } from "../node-corrections/types.js";
import data from "./data.json" with { type: "json" };

/**
 * Build the constituent map from data.json.
 * Constituents store nodal correction metadata (code + species) but do not
 * depend on any particular NodeCorrectionStrategy — that is applied at
 * prediction time.
 */
function buildConstituents(): Record<string, Constituent> {
  const constituents: Record<string, Constituent> = {};

  for (const entry of data) {
    const names = [entry.name, ...entry.aliases];

    const constituent = defineConstituentFromData(
      names,
      entry.speed,
      entry.xdo,
      entry.nodalCorrection as NodalCorrectionCode,
    );

    for (const name of names) {
      constituents[name] = constituent;
    }
  }

  // Supplementary compound constituents not in IHO dataset
  const supplementary: [string, string, number][] = [
    ["T3", "T2", 1.5], // Solar elliptic terdiurnal
    ["R3", "R2", 1.5], // Solar elliptic terdiurnal
    ["3L2", "L2", 3], // Triple lunar elliptic
    ["3N2", "N2", 3], // Triple N2 shallow-water
  ];

  for (const [name, base, factor] of supplementary) {
    if (constituents[base] && !constituents[name]) {
      const compound = defineCompoundConstituent(name, [
        { constituent: constituents[base], factor },
      ]);
      constituents[name] = compound;
    }
  }

  return constituents;
}

const constituents = buildConstituents();

export default constituents;
export { buildConstituents };
