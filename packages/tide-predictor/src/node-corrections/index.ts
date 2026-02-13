import iho from "./iho.js";
import schureman from "./schureman.js";
import type { Fundamentals } from "./types.js";

export type * from "./types.js";

export { iho, schureman };

export const fundamentals: Record<string, Fundamentals> = {
  iho,
  schureman,
};

export function resolveFundamentals(name?: string): Fundamentals {
  if (!name) return iho;
  const fundamental = fundamentals[name];
  if (!fundamental) throw new Error(`Unknown fundamentals: ${name}`);
  return fundamental;
}
