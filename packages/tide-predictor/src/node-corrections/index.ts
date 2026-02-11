// Re-export from schureman for backward compatibility
export type { NodalCorrection, NodalCorrectionCode, NodeCorrectionStrategy } from "./types.js";
export { ihoStrategy } from "./iho.js";
export { schuremanStrategy } from "./schureman.js";

import { ihoStrategy } from "./iho.js";
import { schuremanStrategy } from "./schureman.js";
import type { NodeCorrectionStrategy } from "./types.js";

const strategies: Record<string, NodeCorrectionStrategy> = {
  iho: ihoStrategy,
  schureman: schuremanStrategy,
};

export function resolveStrategy(name?: string): NodeCorrectionStrategy {
  if (!name) return ihoStrategy;
  const strategy = strategies[name];
  if (!strategy) throw new Error(`Unknown nodeCorrections strategy: ${name}`);
  return strategy;
}
