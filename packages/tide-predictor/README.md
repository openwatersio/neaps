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
import TidePredictor from "@neaps/tide-predictor";

const constituents = [
  {
    phase: 98.7,
    amplitude: 2.687,
    name: "M2",
    speed: 28.984104,
  },
  //....there are usually many, read the docs
];

const highLowTides = TidePredictor(constituents).getExtremesPrediction({
  start: new Date("2019-01-01"),
  end: new Date("2019-01-10"),
});
```

Note that all times internally are evaluated as UTC, so be sure to specify a timezone offset when constructing dates if you want to work in a local time. For example, to get tides for January 1st, 2019 in New York (UTC-5), create a date `new Date('2019-01-01T00:00:00-05:00')`

## Tide prediction object

Calling `tidePredictor` will generate a new tide prediction object. It accepts the following arguments:

- `constituents` - An array of [constituent objects](#constituent-object)
- `options` - An object with one of:
  - `offset` - A value to add to **all** values predicted. This is useful if you want to, for example, offset tides by mean high water, etc.

### Tide prediction methods

The returned tide prediction object has various methods. All of these return regular JavaScript objects.

#### High and low tide - `getExtremesPrediction`

Returns the predicted high and low tides between a start and end date.

```typescript
const startDate = new Date();
const endDate = new Date(startDate + 3 * 24 * 60 * 60 * 1000);
const tides = TidePredictor(constituents).getExtremesPrediction({
  start: startDate,
  end: endDate,
  labels: {
    //optional human-readable labels
    high: "High tide",
    low: "Low tide",
  },
});
```

If you want predictions for a subservient station, first set the reference station in the prediction, and pass the [subservient station offests](#subservient-station) to the `getExtremesPrediction` method:

```typescript
const tides = TidePredictor(constituents).getExtremesPrediction({
  start: startDate,
  end: endDate,
  offset: {
    height_offset: {
      high: 1,
      low: 2,
    },
    time_offset: {
      high: 1,
      low: 2,
    },
  },
});
```

##### Options

The `getExtremesPrediction` accepts a single object with options:

- `start` - **Required ** - The date & time to start looking for high and low tides
- `end` - **Required ** - The date & time to stop looking for high and low tides
- `timeFidelity` - Number of seconds accurate the time should be, defaults to 10 minutes.
- `labels` - An object to define the human-readable labels for the tides
  - `high` - The human-readable label for high tides
  - `low` - The human-readable label for low tides
- `offset` - The offset values if these predictions are for a [subservient station](#subservient-station)

##### Return values

High and low tides are returned as arrays of objects:

- `time` - A Javascript Date object of the time
- `level` - The water level
- `high` - **true** if this is a high tide, **false** if not
- `low` - **true** if this is a low tide, **false** if not
- `label` - The human-readable label (by default, 'High' or 'Low')

#### Water level at time - `getWaterLevelAtTime`

Gives you the predicted water level at a specific time.

```typescript
const waterLevel = TidePredictor(constituents).getWaterLevelAtTime({
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

### <a name="subservient-station"></a>Subservient station definitions

Some stations do not have defined harmonic data, but do have published offsets and a reference station. These include the offsets in time or amplitude of the high and low tides. Subservient station definitions are objects that include:

- `height` - **object** - An object of height offsets, in the same units as the reference station.
  - `high` - **float** - The offset to be added to high tide (can be negative)
  - `low` - **float** - The offset to be added to low tide (can be negative)
- `time` - **object** - An object of time offsets, in number of minutes
  - `high` - **float** - The number of minutes to add to high tide times (can be negative)
  - `low` - **float** - The number of minutes to add to low tide times (can be negative)

```
{
  height: {
    high: 1,
    low: 2
  },
  time: {
    high: 1,
    low: 2
  }
}
```

# Shout out

All the really hard math is based on the excellent [Xtide](https://flaterco.com/xtide) and [pytides](https://github.com/sam-cox/pytides).
