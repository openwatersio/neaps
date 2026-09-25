// Capture the deployed CHS JavaScript fitter as an independent Swift oracle.
// Usage: node scripts/generate-fit-fixture.mjs /path/to/chs-bundle.js
import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";

const source = fs.readFileSync(process.argv[2], "utf8");
const context = vm.createContext({ console });
vm.runInContext(source, context);
const { fit, BASIS } = context.CHSConstituents;
const cases = [
  [60, "2026-01-01T03:00:00Z"],
  [210, "2017-07-01T03:00:00Z"],
].map(([days, start]) => {
  const samples = Array.from({ length: days * 12 }, (_, i) => ({
    t: Date.parse(start) + i * 2 * 3600000,
    v:
      2.3 +
      1.2 * Math.cos((i * 2 * 28.9841042 * Math.PI) / 180 - 0.7) +
      0.5 * Math.sin((i * 2 * 15.0410686 * Math.PI) / 180) +
      0.07 * Math.cos(i * 0.19),
  }));
  return {
    days,
    samples,
    expected: fit(
      samples.map((s) => ({ time: new Date(s.t), value: s.v })),
      { constituents: BASIS },
    ),
  };
});
fs.writeFileSync(
  new URL("../fixtures/harmonic-fit.json", import.meta.url),
  JSON.stringify({
    source: "@sailingnaturali/chs-constituents (MIT), Slackwater deployed bundle",
    sha256: crypto.createHash("sha256").update(source).digest("hex"),
    basis: BASIS,
    cases,
  }) + "\n",
);
