# @neaps/tide-predictor

A tide harmonic calculator written in TypeScript.

<!-- START DOCS -->

> [!WARNING]
> **Not for navigational use**
>
> Do not use calculations from this project for navigation, or depend on them in any situation where inaccuracies could result in harm to a person or property. Tide predictions are only as good as the harmonics data available, and these can be inconsistent and vary widely based on the accuracy of the source data and local conditions. The tide predictions do not factor events such as storm surge, wind waves, uplift, tsunamis, or sadly, climate change. 😢

# Installation

```sh
npm install @neaps/tide-predictor
```

# Usage

`@neaps/tide-predictor` requires that you [provide your own tidal harmonics information](#constituent-object) to generate a prediction. For a complete tide prediction solution, including finding nearby stations and their harmonics, check out the [`neaps` package](https://github.com/openwatersio/neaps).

```typescript
import { createTidePredictor } from "@neaps/tide-predictor";

const constituents = [
  {
    phase: 98.7,
    amplitude: 2.687,
    name: "M2",
    speed: 28.984104,
  },
  //....there are usually many, read the docs
];

const highLowTides = createTidePredictor(constituents).getExtremesPrediction({
  start: new Date("2019-01-01"),
  end: new Date("2019-01-10"),
});
```

Note that all times internally are evaluated as UTC, so be sure to specify a timezone offset when constructing dates if you want to work in a local time. For example, to get tides for January 1st, 2019 in New York (UTC-5), create a date `new Date('2019-01-01T00:00:00-05:00')`

## Tide prediction object

Calling `createTidePredictor` will generate a new tide prediction object. It accepts the following arguments:

- `constituents` - An array of [constituent objects](#constituent-object)
- `options` - An object with one of:
  - `offset` - A value to add to **all** values predicted. This is useful if you want to, for example, offset tides by mean high water, etc.

### Tide prediction methods

The returned tide prediction object has various methods. All of these return regular JavaScript objects.

#### High and low tide - `getExtremesPrediction`

Returns the predicted high and low tides between a start and end date.

```typescript
const startDate = new Date();
const endDate = new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000);
const tides = createTidePredictor(constituents).getExtremesPrediction({
  start: startDate,
  end: endDate,
  labels: {
    //optional human-readable labels
    high: "High tide",
    low: "Low tide",
  },
});
```

If you want predictions for a subordinate station, use the reference station's constituents and pass the [subordinate station offsets](#subordinate-station) to the `getExtremesPrediction` method:

```typescript
const tides = createTidePredictor(constituents).getExtremesPrediction({
  start: startDate,
  end: endDate,
  offsets: {
    height: {
      high: 1.1,
      low: 0.9,
      type: "ratio", // or "fixed" for additive offsets
    },
    time: {
      high: 15, // minutes
      low: 20,
    },
  },
});
```

##### Options

The `getExtremesPrediction` accepts a single object with options:

- `start` - **Required ** - The date & time to start looking for high and low tides
- `end` - **Required ** - The date & time to stop looking for high and low tides
- `labels` - An object to define the human-readable labels for the tides
  - `high` - The human-readable label for high tides
  - `low` - The human-readable label for low tides
- `offsets` - The offset values if these predictions are for a [subordinate station](#subordinate-station)

##### Return values

High and low tides are returned as arrays of objects:

- `time` - A Javascript Date object of the time
- `level` - The water level
- `high` - **true** if this is a high tide, **false** if not
- `low` - **true** if this is a low tide, **false** if not
- `label` - The human-readable label (by default, 'High' or 'Low')

#### Timeline - `getTimelinePrediction`

Returns water level predictions at regular intervals between a start and end date.

```typescript
const timeline = createTidePredictor(constituents).getTimelinePrediction({
  start: new Date("2019-01-01"),
  end: new Date("2019-01-02"),
  timeFidelity: 600, // seconds between points (default: 600 = 10 minutes)
});
```

##### Options

- `start` - **Required** - The start date & time
- `end` - **Required** - The end date & time
- `timeFidelity` - Seconds between data points (default: 600)
- `offsets` - The offset values if these predictions are for a [subordinate station](#subordinate-station)

##### Return values

An array of objects:

- `time` - A Javascript Date object
- `level` - The predicted water level

#### Water level at time - `getWaterLevelAtTime`

Gives you the predicted water level at a specific time.

```typescript
const waterLevel = createTidePredictor(constituents).getWaterLevelAtTime({
  time: new Date(),
});
```

##### Options

The `getWaterLevelAtTime` accepts a single object of options:

- `time` - A Javascript date object of the time for the prediction

##### Return values

A single object is returned with:

- `time` - A Javascript date object
- `level` - The predicted water level

## Data definitions

### <a name="constituent-object"></a>Constituent definition

Tidal constituents should be an array of objects with at least:

- `name` - **string** - The NOAA constituent name, all upper-case.
- `amplitude` - **float** - The constituent amplitude
- `phase` - **float** - The phase of the constituent.

```json
[
  {
    "name": "[constituent name]",
    "amplitude": 1.3,
    "phase": 1.33
  },
  {
    "name": "[constituent name 2]",
    "amplitude": 1.3,
    "phase": 1.33
  }
]
```

### <a name="subordinate-station"></a>Subordinate station definitions

Some stations do not have defined harmonic data, but do have published offsets and a reference station. These include the offsets in time or amplitude of the high and low tides. Subordinate station offset objects include:

- `height` - **object** - Height offsets
  - `high` - **number** - Adjustment for high tide
  - `low` - **number** - Adjustment for low tide
  - `type` - **string** - `"ratio"` (multiplicative, default) or `"fixed"` (additive)
- `time` - **object** - Time offsets in minutes
  - `high` - **number** - Minutes to add to high tide times (can be negative)
  - `low` - **number** - Minutes to add to low tide times (can be negative)

```typescript
{
  height: {
    high: 1.1,
    low: 0.9,
    type: "ratio",
  },
  time: {
    high: 15,
    low: 20,
  },
}
```

# Architecture Internals

Detailed notes on the internal constituent and node correction systems. For high-level project context, see [CONTRIBUTING.md](../../CONTRIBUTING.md).

## Tidal Constituent System

Constituents are loaded from [src/constituents/data.json](src/constituents/data.json), which contains 395 entries derived from the [IHO TWCWG Constituent List](../../docs/TWCWG_Constituent_list.md).

Each entry has:

- `name` — canonical name (e.g. "M2")
- `speed` — tidal frequency in degrees/hour
- `xdo` — 7-digit IHO Extended Doodson Number (array of ints, or null for compound constituents)
- `nodalCorrection` — IHO letter code dispatching how f/u are computed
- `aliases` — alternate names (Unicode Greek variants, NOAA conventions)
- `members` — optional explicit compound member references (array of `[name, factor]` pairs)

### How constituents are built

[src/constituents/index.ts](src/constituents/index.ts) imports `data.json` and calls `defineConstituent()` from [definition.ts](src/constituents/definition.ts) for each entry. This:

1. Converts XDO digits to Doodson coefficients via `xdoToCoefficients()`
2. Resolves compound members from the IHO letter code via `resolveMembers()`
3. Attaches a `value()` function that computes V₀ (astronomical argument)
4. Attaches a `correction()` function that computes nodal corrections (f, u)
5. Registers the constituent under its canonical name and all aliases

### XDO to Doodson conversion

`xdoToCoefficients()` in [definition.ts](src/constituents/definition.ts):

- D₁ (τ coefficient) is used directly (not offset)
- D₂–D₆ are offset by −5 (IHO encodes 0 as 5)
- D₇ (90° phase) is negated (`5 - xdo[6]`) to convert from IHO to the Schureman/NOAA sign convention
- V₀ is computed as the dot product of coefficients with astronomical arguments `[τ, s, h, p, −N, p', 90°]`

### Node corrections

Both the IHO and Schureman systems compute the same two values per constituent (`f` amplitude factor, `u` phase correction in degrees) but use different math:

- [src/node-corrections/types.ts](src/node-corrections/types.ts) — `NodalCorrection` type (`f` and `u`), `CorrectionFn`, and `Fundamentals` type
- [src/node-corrections/iho.ts](src/node-corrections/iho.ts) — IHO TWCWG Annex A simplified Fourier series formulas (uses only N, p, p' from astro data). **This is the default.**
- [src/node-corrections/schureman.ts](src/node-corrections/schureman.ts) — Schureman (1940) exact spherical geometry formulas (uses I, ξ, ν, ν', ν'' from astro data). Kept for backward compatibility.
- [src/node-corrections/index.ts](src/node-corrections/index.ts) — `resolveFundamentals(name?)` selects IHO (default) or Schureman at runtime

### Nodal correction dispatch

The IHO letter codes from `data.json` are resolved at constituent definition time in `resolveMembers()` within [definition.ts](src/constituents/definition.ts). Each code maps to structural member constituents (e.g., code `m` → M2, code `x` → compound decomposition). At prediction time, `constituent.correction()` recursively computes f/u from these members.

### Compound constituent decomposition

[src/constituents/compound.ts](src/constituents/compound.ts) implements the IHO Annex B algorithm: parses compound names like "MS4" into component letters, resolves signs using a progressive right-to-left algorithm, and maps each to its fundamental constituent.

# Shout out

- @kevee for his work on the original version of this project.
- [Xtide](https://flaterco.com/xtide)
- [pytides](https://github.com/sam-cox/pytides).
