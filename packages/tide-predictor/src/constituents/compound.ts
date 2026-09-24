import type { Constituent, ConstituentMember } from "./types.js";

/**
 * Compound constituent decomposition per IHO TWCWG Annex B.
 *
 * Parses compound constituent names (e.g. "MS4", "2MK3", "2(MN)S6") to
 * determine which fundamental constituents they are composed of. Each
 * component is resolved to a ConstituentMember with a signed factor.
 */

interface LetterInfo {
  species: number;
}

interface ParsedToken {
  letter: string;
  multiplier: number;
}

/** Intermediate result before resolving to ConstituentMember. */
interface ResolvedComponent {
  /** Constituent name derived from letter + species (e.g. "N2", "S2", "K1") */
  constituentKey: string;
  factor: number;
}

// ─── Letter-to-species mapping ───────────────────────────────────────────────

/**
 * Maps constituent letters to their species. K is omitted because it's
 * ambiguous (K1 or K2) and resolved during sign resolution.
 */
const LETTER_MAP: Record<string, LetterInfo> = {
  M: { species: 2 },
  S: { species: 2 },
  N: { species: 2 },
  O: { species: 1 },
  P: { species: 1 },
  Q: { species: 1 },
  J: { species: 1 },
  T: { species: 2 },
  R: { species: 2 },
  L: { species: 2 },
  nu: { species: 2 },
  lambda: { species: 2 },
};

const K1_INFO: LetterInfo = { species: 1 };
const K2_INFO: LetterInfo = { species: 2 };

// ─── Name parser ─────────────────────────────────────────────────────────────

/**
 * Parse a compound constituent name into component tokens and target species.
 *
 * Format: `[multiplier]Letter[multiplier]Letter...species`
 *
 * Throws for names that cannot be decomposed — any constituent with nodal
 * correction code "x" must have a parseable compound name.
 *
 * Note: MA/MB annual variants are handled by decomposeCompound before
 * reaching parseName, so they never enter this function.
 */
export function parseName(name: string): { tokens: ParsedToken[]; targetSpecies: number } {
  const fail = (reason: string): Error =>
    new Error(`Unable to parse compound constituent "${name}": ${reason}`);

  // Extract trailing species number
  const m = name.match(/^(.+?)(\d+)$/);
  if (!m) throw fail("no trailing species digits");

  const body = m[1];
  const targetSpecies = parseInt(m[2], 10);
  if (targetSpecies === 0) throw fail("species is 0");

  const tokens: ParsedToken[] = [];
  let i = 0;

  while (i < body.length) {
    // Read optional multiplier
    let multiplier = 0;
    while (i < body.length && body[i] >= "0" && body[i] <= "9") {
      multiplier = multiplier * 10 + (body.charCodeAt(i) - 48);
      i++;
    }
    if (multiplier === 0) multiplier = 1;

    if (i >= body.length) throw fail("trailing digits with no letter");

    // Parenthesized group: multiplier distributes to all letters inside
    if (body[i] === "(") {
      i++; // skip (
      const groupLetters: string[] = [];
      while (i < body.length && body[i] !== ")") {
        const letter = readLetter(body, i);
        if (!letter) throw fail(`unrecognized character at position ${i}`);
        groupLetters.push(letter);
        i += letter.length;
      }
      if (i >= body.length || body[i] !== ")") throw fail("unclosed parenthesized group");
      i++; // skip )
      if (groupLetters.length === 0) throw fail("empty parenthesized group");

      for (const letter of groupLetters) {
        if (!isKnownLetter(letter)) throw fail(`unknown letter "${letter}"`);
        tokens.push({ letter, multiplier });
      }
      continue;
    }

    // Read a letter
    const letter = readLetter(body, i);
    if (!letter) throw fail(`unrecognized character at position ${i}`);
    if (!isKnownLetter(letter)) throw fail(`unknown letter "${letter}"`);
    i += letter.length;
    tokens.push({ letter, multiplier });
  }

  return { tokens, targetSpecies };
}

/** Read a single letter or multi-char token (nu, lambda) at position i. */
function readLetter(body: string, i: number): string | null {
  // Multi-char tokens (must check before single uppercase)
  if (body.startsWith("nu", i) && (i + 2 >= body.length || !isLower(body[i + 2]))) {
    return "nu";
  }
  if (body.startsWith("lambda", i)) {
    return "lambda";
  }

  const ch = body[i];
  // Uppercase letter
  if (ch >= "A" && ch <= "Z") return ch;

  // Unrecognized (lowercase suffix, etc.)
  return null;
}

function isLower(ch: string): boolean {
  return ch >= "a" && ch <= "z";
}

function popcount(n: number): number {
  let count = 0;
  while (n) {
    count += n & 1;
    n >>= 1;
  }
  return count;
}

function isKnownLetter(letter: string): boolean {
  // A and B are not compound letters per Annex B exceptions
  if (letter === "A" || letter === "B") return false;
  return letter === "K" || letter in LETTER_MAP;
}

// ─── Sign resolution ─────────────────────────────────────────────────────────

/**
 * Resolve component signs using the IHO Annex B progressive right-to-left
 * sign-flipping algorithm.
 *
 * For K (ambiguous between K1 and K2), tries all 2^N combinations of K1/K2
 * per K token, starting with all-K2 (most common in even-species compounds).
 */
export function resolveSigns(
  tokens: ParsedToken[],
  targetSpecies: number,
): ResolvedComponent[] | null {
  const kIndices: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].letter === "K") kIndices.push(i);
  }

  const nK = kIndices.length;
  const nCombinations = nK > 0 ? 1 << nK : 1;

  for (let kMask = 0; kMask < nCombinations; kMask++) {
    const infos = tokens.map((t, i) => {
      if (t.letter !== "K") return LETTER_MAP[t.letter];
      const ki = kIndices.indexOf(i);
      return kMask & (1 << ki) ? K1_INFO : K2_INFO;
    });
    const result = tryResolve(tokens, targetSpecies, infos);
    if (result) return result;
  }

  return null;
}

function tryResolve(
  tokens: ParsedToken[],
  targetSpecies: number,
  infos: LetterInfo[],
): ResolvedComponent[] | null {
  /** Derive constituent key: letter + species (e.g. "M2", "S2", "K1") */
  const keyOf = (j: number) => tokens[j].letter + infos[j].species;

  // Single-letter overtide: e.g. M4 = 2×M2, M6 = 3×M2
  if (tokens.length === 1) {
    const letterSpecies = infos[0].species;
    if (letterSpecies > 0 && targetSpecies > letterSpecies) {
      return [
        {
          constituentKey: keyOf(0),
          factor: targetSpecies / letterSpecies,
        },
      ];
    }
  }

  // Progressive right-to-left sign flip (IHO Annex B)
  const signs: (1 | -1)[] = new Array(tokens.length).fill(1);
  let total = 0;
  for (let j = 0; j < tokens.length; j++) {
    total += tokens[j].multiplier * infos[j].species;
  }

  for (let j = tokens.length - 1; j >= 0; j--) {
    if (total === targetSpecies) break;
    signs[j] = -1;
    total -= 2 * tokens[j].multiplier * infos[j].species;
  }

  if (total !== targetSpecies) {
    // Brute-force fallback: try all 2^N sign combinations.
    // Handles non-contiguous patterns like [+, -, +] that the
    // right-to-left heuristic misses. Collect all valid combinations
    // and prefer fewest negatives, with negatives on later tokens
    // (matching the IHO convention where leading letters are positive).
    const n = tokens.length;
    const valid: number[] = [];
    for (let mask = 0; mask < 1 << n; mask++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        const sign = mask & (1 << j) ? -1 : 1;
        sum += sign * tokens[j].multiplier * infos[j].species;
      }
      if (sum === targetSpecies) valid.push(mask);
    }
    if (valid.length > 0) {
      valid.sort((a, b) => {
        const popA = popcount(a);
        const popB = popcount(b);
        if (popA !== popB) return popA - popB;
        // Among same popcount, prefer negatives on later tokens (higher bits)
        return b - a;
      });
      const mask = valid[0];
      return tokens.map((t, j) => ({
        constituentKey: keyOf(j),
        factor: ((mask & (1 << j) ? -1 : 1) as 1 | -1) * t.multiplier,
      }));
    }
    return null;
  }

  return tokens.map((t, j) => ({
    constituentKey: keyOf(j),
    factor: signs[j] * t.multiplier,
  }));
}

// ─── Decomposition ───────────────────────────────────────────────────────────

/**
 * Decompose a compound constituent name into its structural members.
 * Each letter is mapped to its own constituent (e.g. N→N2, S→S2) with
 * signed factors from the IHO Annex B sign-resolution algorithm.
 *
 * Returns null if the name cannot be parsed or sign resolution fails.
 * Long-period constituents with non-standard naming conventions (e.g.
 * "MSm", "KOo") use explicit members in data.json instead.
 *
 * @param name - Constituent name (e.g. "MS4", "2MK3", "2(MN)S6")
 * @param species - Species from coefficients[0], or 0 if XDO is null
 * @param constituents - Map of all constituents for resolving keys
 */
export function decomposeCompound(
  name: string,
  species: number,
  constituents: Record<string, Constituent>,
): ConstituentMember[] | null {
  // MA/MB annual variants: overtide of M2 with annual modulation (±Sa).
  // MA{n} = (n/2)×M2 − Sa, MB{n} = (n/2)×M2 + Sa.
  const maMatch = name.match(/^M([AB])(\d+)$/);
  if (maMatch) {
    const [, variant, speciesStr] = maMatch;
    const m2 = constituents.M2;
    const sa = constituents.Sa;
    if (!m2 || !sa) return null;
    return [
      { constituent: m2, factor: parseInt(speciesStr, 10) / 2 },
      { constituent: sa, factor: variant === "A" ? -1 : 1 },
    ];
  }

  let parsed: ReturnType<typeof parseName>;
  try {
    parsed = parseName(name);
  } catch {
    return null;
  }

  // If species was provided and doesn't match trailing digits, prefer
  // the one from coefficients (it's authoritative when XDO is present).
  // parsed.targetSpecies is always > 0 (parseName rejects species=0).
  const targetSpecies = species > 0 ? species : parsed.targetSpecies;

  const resolved = resolveSigns(parsed.tokens, targetSpecies);
  if (!resolved) return null;

  const members: ConstituentMember[] = [];
  for (const { constituentKey, factor } of resolved) {
    const constituent = constituents[constituentKey];
    if (!constituent) return null;
    members.push({ constituent, factor });
  }

  return members.length > 0 ? members : null;
}
