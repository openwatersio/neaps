import { type Constituent, type ConstituentMember, defineConstituent } from "./definition.js";
import { decomposeCompound } from "./compound.js";
import data from "./data.json" with { type: "json" };

/**
 * IHO letter codes from data.json that encode how to derive nodal corrections.
 * See the "Nodal Corrections — Application" section in docs/TWCWG_Constituent_list.md
 */
type NodalCorrectionCode =
  | "z" // zero correction (f=1, u=0)
  | "f" // zero correction (alias)
  | "y" // fundamental — correction looked up by strategy directly
  // "e" (K2) is defined by IHO but unused in the current dataset
  | "a" // Mm
  | "m" // M2
  | "o" // O1
  | "k" // K1
  | "j" // J1
  | "b" // M2 with negated u
  | "c" // M2 squared
  | "g" // M2^(species/2)
  | "p" // same as 2MN2
  | "d" // same as KQ1
  | "q" // same as NKM2
  | "x"; // compound derivation (external)

/**
 * Resolve the IHO nodal correction code into pre-computed ConstituentMember[].
 * This maps every code to the constituent members needed to compute
 * f and u at prediction time, eliminating the code dispatch at runtime.
 *
 * Members reference structural constituents (e.g. N→N2 not M2). The
 * strategy's recursive compute resolves each member's correction through
 * its own members chain (N2.members → [{M2,1}] → M2 fundamental).
 */
function resolveMembers(
  code: NodalCorrectionCode,
  name: string,
  species: number,
  constituents: Record<string, Constituent>,
): ConstituentMember[] | null {
  switch (code) {
    // UNITY — no nodal correction
    case "z":
    case "f":
      return null;

    // Fundamentals — correction looked up by name in the strategy,
    // so no members needed for indirection.
    case "y":
      return null;

    // Direct constituent references
    case "a":
      return [{ constituent: constituents["Mm"], factor: 1 }];
    case "m":
      return [{ constituent: constituents["M2"], factor: 1 }];
    case "o":
      return [{ constituent: constituents["O1"], factor: 1 }];
    case "k":
      return [{ constituent: constituents["K1"], factor: 1 }];
    case "j":
      return [{ constituent: constituents["J1"], factor: 1 }];

    // M2-derived
    case "b":
      return [{ constituent: constituents["M2"], factor: -1 }];
    case "c":
      return [{ constituent: constituents["M2"], factor: -2 }];
    case "g":
      return [{ constituent: constituents["M2"], factor: species / 2 }];

    // Compound decomposition — returns structural members
    case "p":
      return decomposeCompound("2MN2", species, constituents);
    case "d":
      return decomposeCompound("KQ1", species, constituents);
    case "q":
      return decomposeCompound("NKM2", species, constituents);
    case "x":
      return decomposeCompound(name, species, constituents);
  }
}

/**
 * Build the constituent map from data.json.
 *
 * Uses two passes:
 * 1. Create all constituents (unfrozen, members: null)
 * 2. Resolve members from the IHO letter codes
 *
 * Members are structural (each letter → its own constituent, e.g. N→N2).
 * This serves both V₀ computation (for null-XDO compounds) and nodal
 * correction (via the strategy's recursive compute).
 *
 * Then freeze all constituents.
 */
function buildConstituents(): Record<string, Constituent> {
  const constituents: Record<string, Constituent> = {};

  // Pass 1: create all constituents
  for (const entry of data) {
    const names = [entry.name, ...entry.aliases];
    const constituent = defineConstituent(names, entry.speed, entry.xdo);

    for (const name of names) {
      constituents[name] = constituent;
    }
  }

  // Pass 2: resolve members from IHO letter codes
  for (const entry of data) {
    const c = constituents[entry.name];

    // Explicit members from data.json take precedence (for compounds whose
    // names can't be parsed by Annex B rules, e.g. "MSm", "KOo", "T3")
    if (entry.members) {
      c.members = entry.members.map((m) => ({
        constituent: constituents[m[0] as string],
        factor: m[1] as number,
      }));
    } else {
      const code = entry.nodalCorrection as NodalCorrectionCode;
      const species = entry.xdo?.[0] ?? 0;
      c.members = resolveMembers(code, entry.name, species, constituents);
    }

    // Derive Doodson coefficients from structural members for null-XDO compounds
    if (!entry.xdo && c.members) {
      const coefficients: number[] = [0, 0, 0, 0, 0, 0, 0];
      for (const { constituent, factor } of c.members) {
        for (let i = 0; i < 7; i++) {
          coefficients[i] += (constituent.coefficients[i] ?? 0) * factor;
        }
      }
      c.coefficients = coefficients;
    }
  }

  // Freeze all constituents
  for (const c of new Set(Object.values(constituents))) {
    Object.freeze(c);
  }

  return constituents;
}

const constituents = buildConstituents();

export default constituents;
export { buildConstituents };
