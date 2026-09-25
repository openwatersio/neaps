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
 * IHO Annex B exception: MA and MB constituents are annual variants that
 * follow the same decomposition as their base M constituent.
 */
export function parseName(name: string): { tokens: ParsedToken[]; targetSpecies: number } {
  const fail = (reason: string): Error =>
    new Error(`Unable to parse compound constituent "${name}": ${reason}`);

  // IHO Annex B exception: Normalize MA/MB annual variants to M
  let normalizedName = name;
  if ((name.startsWith("MA") || name.startsWith("MB")) && name.length > 2) {
    normalizedName = "M" + name.substring(2);
  }

  // Extract trailing species number
  const m = normalizedName.match(/^(.+?)(\d+)$/);
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
 * For K (ambiguous between K1 and K2), tries K2 first then K1.
 */
export function resolveSigns(
  tokens: ParsedToken[],
  targetSpecies: number,
): ResolvedComponent[] | null {
  const hasK = tokens.some((t) => t.letter === "K");

  if (hasK) {
    // Try K2 first (more common in even-species compounds)
    const result = tryResolve(tokens, targetSpecies, K2_INFO);
    if (result) return result;
    // Fall back to K1
    return tryResolve(tokens, targetSpecies, K1_INFO);
  }

  return tryResolve(tokens, targetSpecies, K2_INFO);
}

function tryResolve(
  tokens: ParsedToken[],
  targetSpecies: number,
  kInfo: LetterInfo,
): ResolvedComponent[] | null {
  const infos = tokens.map((t) => (t.letter === "K" ? kInfo : LETTER_MAP[t.letter]));

  /** Derive constituent key: letter + species (e.g. "M2", "S2", "K1") */
  const keyOf = (j: number) => tokens[j].letter + infos[j].species;

  // Single-letter overtide: e.g. M4 = M2 × M2
  if (tokens.length === 1) {
    const info = infos[0];
    const letterSpecies = info.species;
    if (letterSpecies > 0 && targetSpecies > letterSpecies) {
      return [
        {
          constituentKey: keyOf(0),
          factor: targetSpecies / letterSpecies,
        },
      ];
    }
    // Single letter, species matches directly (shouldn't normally be "x" code)
    if (letterSpecies === targetSpecies) {
      return [
        {
          constituentKey: keyOf(0),
          factor: 1,
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

  if (total !== targetSpecies) return null;

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
