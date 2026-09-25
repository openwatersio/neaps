# @neaps/harmonics

Fit tidal heights or signed current velocities to a caller-selected harmonic basis.

```ts
import { fit } from "@neaps/harmonics";
import { createTidePredictor } from "@neaps/tide-predictor";

const result = fit(samples, ["M2", "S2", "K1", "O1"]);
const predictor = createTidePredictor(result.constituents, { offset: result.offset });
```

Each sample is `{ time: Date, value: number }`. Values and times must be finite, ordered by time, and span a positive duration. At least `max(2, 1 + 2 * names.length)` samples are required. Repeated timestamps keep their weight. Names and aliases follow the predictor catalog; unknown names and duplicate aliases are rejected, not silently dropped.

The result contains unrounded `constituents` (amplitude in input units, Greenwich phase in degrees), `offset`, training residual `rms`, and `unseparable` Rayleigh warnings. Warnings do not remove constituents. An empty basis fits only the offset. No trend, rounding, automatic constituent selection, parsing, or database-specific frequency filtering is applied.

The full-rank least-squares fit evaluates equilibrium arguments and IHO nodal corrections at every sample. `ml-matrix` QR runs in bounded batches, retaining only a reduced matrix between batches so workspace does not grow with the observation count. A second pass computes residuals. Rank-deficient and underdetermined fits are rejected; this is not a minimum-norm SVD API.

Invalid input throws `RangeError` with a message beginning with `invalidSamples`, `unknownConstituent`, `duplicateConstituent`, or `rankDeficient`. These correspond to the [Swift fitter's](../../swift/README.md#harmonic-fitting) errors. Swift uses Accelerate QR on Apple platforms; TypeScript works on Linux and in browsers.

Both implementations consume the same noisy 60- and 210-day inputs, independent SVD expected coefficients, and invalid-input fixtures. Parity tolerances are `1e-7` for offset/RMS, `1e-6` for amplitudes, and `1e-3` degrees for circular phase differences. Run `npm run coverage` and `swift test -c release`. Regenerate the SVD oracle with `node fixtures/generate/gen-fit.mjs` after building the predictor; `npm run fixtures:check` checks for drift.

Callers choose a resolvable basis and validate predictions on held-out observations. Training RMS is not a forecast accuracy guarantee. Not for navigation.
