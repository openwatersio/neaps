import { astro, constituents, type HarmonicConstituent } from "@neaps/tide-predictor";
import { Matrix, QrDecomposition } from "ml-matrix";

export type { HarmonicConstituent };

export interface HarmonicSample {
  time: Date;
  value: number;
}

export interface HarmonicFit {
  constituents: HarmonicConstituent[];
  offset: number;
  rms: number;
  unseparable: { constituents: [string, string]; requiredDays: number }[];
}

/** Fit an offset and caller-selected harmonics using per-sample IHO astronomy. */
export function fit(samples: readonly HarmonicSample[], names: readonly string[]): HarmonicFit {
  const width = 1 + 2 * names.length;
  const count = samples.length;
  if (
    count < Math.max(2, width) ||
    count > 0x7fffffff ||
    samples.some(
      (s, i) =>
        !Number.isFinite(s.value) ||
        !Number.isFinite(s.time.getTime()) ||
        (i > 0 && s.time < samples[i - 1].time),
    ) ||
    samples[count - 1].time <= samples[0].time
  )
    throw new RangeError("invalidSamples");

  const seen = new Set<string>();
  const models = names.map((name) => {
    const model = Object.hasOwn(constituents, name) ? constituents[name] : undefined;
    if (!model) throw new RangeError(`unknownConstituent: ${name}`);
    if (seen.has(model.name)) throw new RangeError(`duplicateConstituent: ${name}`);
    seen.add(model.name);
    return model;
  });
  const radians = Math.PI / 180;
  // Adapted from https://github.com/openwatersio/tide-database/tree/main/packages/harmonic-analysis.
  const rowAt = (time: Date) => {
    const state = astro(time);
    return [
      1,
      ...models.flatMap((model) => {
        const { f, u } = model.correction(state);
        const angle = (model.value(state) + u) * radians;
        return [f * Math.cos(angle), f * Math.sin(angle)];
      }),
    ];
  };
  // Reduce [R; A_chunk] so multi-year database records need only O(width^2) workspace.
  const batchSize = Math.max(512, width);
  let reduced: number[][] = [];
  let targets: number[] = [];
  for (let start = 0; start < count; start += batchSize) {
    const batch = samples.slice(start, start + batchSize);
    const qr = new QrDecomposition(
      new Matrix([...reduced, ...batch.map(({ time }) => rowAt(time))]),
    );
    const values = Matrix.columnVector([...targets, ...batch.map(({ value }) => value)]);
    reduced = qr.upperTriangularMatrix.to2DArray();
    targets = qr.orthogonalMatrix.transpose().mmul(values).getColumn(0);
  }
  const qr = new QrDecomposition(new Matrix(reduced));
  const diagonal = qr.upperTriangularMatrix.diag().map(Math.abs);
  // Match Accelerate's numerical-rank guard, not only the solver's exact-zero check.
  const threshold = Number.EPSILON * count * Math.max(...diagonal);
  if (diagonal.some((value) => !(value > threshold))) throw new RangeError("rankDeficient");
  const solution = qr.solve(Matrix.columnVector(targets)).getColumn(0);
  if (!solution.every(Number.isFinite)) throw new RangeError("rankDeficient");
  const rms = Math.sqrt(
    samples.reduce((sum, sample) => {
      const residual =
        rowAt(sample.time).reduce((value, term, j) => value + term * solution[j], 0) - sample.value;
      return sum + residual * residual;
    }, 0) / count,
  );

  const unseparable: HarmonicFit["unseparable"] = [];
  const spanHours = (samples[count - 1].time.getTime() - samples[0].time.getTime()) / 3600000;
  models.forEach((a, i) => {
    for (let j = i + 1; j < models.length; j++) {
      const hours = 360 / Math.abs(a.speed - models[j].speed);
      if (hours > spanHours)
        unseparable.push({
          constituents: [names[i], names[j]],
          requiredDays: Math.ceil(hours / 24),
        });
    }
  });
  unseparable.sort((a, b) => b.requiredDays - a.requiredDays);
  return {
    constituents: names.map((name, j) => ({
      name,
      amplitude: Math.hypot(solution[1 + 2 * j], solution[2 + 2 * j]),
      phase: (Math.atan2(solution[2 + 2 * j], solution[1 + 2 * j]) / radians + 360) % 360,
    })),
    offset: solution[0],
    rms,
    unseparable,
  };
}
