import type { AstroData, NodalCorrection } from "./types.js";

/**
 * Compound constituent decomposition per IHO TWCWG Annex B.
 *
 * Constituents with nodal correction code "x" derive their f and u
 * corrections from the component fundamentals encoded in their name.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CompoundComponent {
  /** Key into the Fundamentals map ("M2", "O1", etc.), or null for UNITY. */
  fundamentalKey: string | null;
  /** How many times this component appears. */
  multiplier: number;
  /** +1 for additive, -1 for subtractive (affects u only, not f). */
  sign: 1 | -1;
}

interface LetterInfo {
  species: number;
  fundamentalKey: string | null;
}

interface ParsedToken {
  letter: string;
  multiplier: number;
}

// ─── Letter-to-fundamental mapping ──────────────────────────────────────────

/**
 * Maps constituent letters to their species and fundamental correction key.
 * K is omitted because it's ambiguous (K1 or K2) and resolved during sign
 * resolution.
 */
const LETTER_MAP: Record<string, LetterInfo> = {
  M: { species: 2, fundamentalKey: "M2" },
  S: { species: 2, fundamentalKey: null },
  N: { species: 2, fundamentalKey: "M2" }, // N2 has same correction as M2
  O: { species: 1, fundamentalKey: "O1" },
  P: { species: 1, fundamentalKey: null },
  Q: { species: 1, fundamentalKey: "O1" }, // Q1 has same correction as O1
  J: { species: 1, fundamentalKey: "J1" },
  T: { species: 2, fundamentalKey: null },
  R: { species: 2, fundamentalKey: null },
  L: { species: 2, fundamentalKey: "L2" },
  nu: { species: 2, fundamentalKey: "M2" }, // ν2 same as M2
  lambda: { species: 2, fundamentalKey: "M2" }, // λ2 same as M2
};

const K1_INFO: LetterInfo = { species: 1, fundamentalKey: "K1" };
const K2_INFO: LetterInfo = { species: 2, fundamentalKey: "K2" };

// ─── Name parser ────────────────────────────────────────────────────────────

/**
 * Parse a compound constituent name into component tokens and target species.
 *
 * Format: `[multiplier]Letter[multiplier]Letter...species`
 *
 * Throws for names that cannot be decomposed — any constituent with nodal
 * correction code "x" must have a parseable compound name.
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

function isKnownLetter(letter: string): boolean {
  // A and B are not compound letters per Annex B exceptions
  if (letter === "A" || letter === "B") return false;
  return letter === "K" || letter in LETTER_MAP;
}

// ─── Sign resolution ────────────────────────────────────────────────────────

/**
 * Resolve component signs using the IHO Annex B progressive right-to-left
 * sign-flipping algorithm.
 *
 * For K (ambiguous between K1 and K2), tries K2 first then K1.
 */
export function resolveSigns(
  tokens: ParsedToken[],
  targetSpecies: number,
): CompoundComponent[] | null {
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
): CompoundComponent[] | null {
  const infos = tokens.map((t) => (t.letter === "K" ? kInfo : LETTER_MAP[t.letter]));

  // Single-letter overtide: e.g. M4 = M2 × M2
  if (tokens.length === 1) {
    const info = infos[0];
    const letterSpecies = info.species;
    if (letterSpecies > 0 && targetSpecies > letterSpecies && targetSpecies % letterSpecies === 0) {
      const expandedMultiplier = targetSpecies / letterSpecies;
      return [
        {
          fundamentalKey: info.fundamentalKey,
          multiplier: expandedMultiplier,
          sign: 1,
        },
      ];
    }
    // Single letter, species matches directly (shouldn't normally be "x" code)
    if (letterSpecies === targetSpecies) {
      return [
        {
          fundamentalKey: info.fundamentalKey,
          multiplier: 1,
          sign: 1,
        },
      ];
    }
    return null;
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
    fundamentalKey: infos[j].fundamentalKey,
    multiplier: t.multiplier,
    sign: signs[j],
  }));
}

// ─── Decomposition with caching ────────────────────────────────────────────

const cache = new Map<string, CompoundComponent[] | null>();

/**
 * Decompose a compound constituent name into its fundamental components.
 * Returns null if the name cannot be parsed or sign resolution fails
 * (caller should use UNITY).
 * Results are cached per name.
 *
 * @param name - Constituent name (e.g. "MS4", "2MK3", "2(MN)S6")
 * @param species - Species from coefficients[0], or 0 if XDO is null
 */
export function decomposeCompound(name: string, species: number): CompoundComponent[] | null {
  const cached = cache.get(name);
  if (cached !== undefined) return cached;

  // IHO Annex B exception: MA and MB constituents are annual variants
  // that follow the same nodal correction derivation as their base M constituent.
  // Strip A or B and decompose as if it were M + rest.
  let nameToDecompose = name;
  if (name.startsWith("MA") && name.length > 2) {
    nameToDecompose = "M" + name.substring(2);
  } else if (name.startsWith("MB") && name.length > 2) {
    nameToDecompose = "M" + name.substring(2);
  }

  let parsed: ReturnType<typeof parseName>;
  try {
    parsed = parseName(nameToDecompose);
  } catch {
    cache.set(name, null);
    return null;
  }

  // If species was provided and doesn't match trailing digits, prefer
  // the one from coefficients (it's authoritative when XDO is present).
  // parsed.targetSpecies is always > 0 (parseName rejects species=0).
  const targetSpecies = species > 0 ? species : parsed.targetSpecies;

  const result = resolveSigns(parsed.tokens, targetSpecies);
  cache.set(name, result);
  return result;
}

// ─── Correction computation ─────────────────────────────────────────────────

/**
 * Compute the combined nodal correction for a compound constituent.
 *
 * u = Σ sign × multiplier × u(fundamental)
 * f = Π f(fundamental) ^ multiplier
 *
 * Per IHO Annex B: f is ALWAYS obtained by multiplication, never division,
 * even when the sign is negative.
 */
export function computeCompoundCorrection(
  components: CompoundComponent[],
  get: (name: string, astro: AstroData) => NodalCorrection,
  astro: AstroData,
): NodalCorrection {
  let u = 0;
  let f = 1;

  for (const { fundamentalKey, multiplier, sign } of components) {
    if (!fundamentalKey) continue; // UNITY contribution (solar terms)
    const corr = get(fundamentalKey, astro);
    u += sign * multiplier * corr.u;
    f *= Math.pow(corr.f, multiplier);
  }

  return { u, f };
}
