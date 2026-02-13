import { test, expect } from "vitest";
import { stations } from "@neaps/tide-database";
import constituents from "../../src/constituents/index.js";

const usedConstituents = new Set(
  stations.flatMap((station) => station.harmonic_constituents || []).map(({ name }) => name),
);

test.each(Array.from(usedConstituents))("%s is supported", (name) => {
  expect(constituents[name], `Unsupported constituent: ${name}`).toBeDefined();
});
