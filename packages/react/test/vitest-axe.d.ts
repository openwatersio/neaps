import "vitest";

interface AxeMatchers {
  toHaveNoViolations(): void;
}

declare module "vitest" {
  // eslint-disable-next-line
  interface Assertion<T = unknown> extends AxeMatchers {}
  // eslint-disable-next-line
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
