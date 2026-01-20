![example workflow](https://github.com/neaps/neaps/actions/workflows/test.yml/badge.svg) [![codecov](https://codecov.io/gh/neaps/neaps/branch/main/graph/badge.svg?token=KEJK5NQR5H)](https://codecov.io/gh/neaps/neaps)

# Neaps

A tide prediction engine written in TypeScript.

> [!WARNING]
> **Not for navigational use**
>
> Do not use calculations from this project for navigation, or depend on them in any situation where inaccuracies could result in harm to a person or property. Tide predictions are only as good as the harmonics data available, and these can be inconsistent and vary widely based on the accuracy of the source data and local conditions. The tide predictions do not factor events such as storm surge, wind waves, uplift, tsunamis, or sadly, climate change. 😢

## Installation

```sh
npm install neaps
```

For the HTTP API:

```sh
npm install @neaps/api express
```

## Packages

This monorepo contains:

- **[neaps](packages/neaps)** - Main tide prediction library with station finding
- **[@neaps/api](packages/api)** - HTTP JSON API for tide predictions with OpenAPI specification
- **[@neaps/tide-predictor](packages/tide-predictor)** - Core harmonic tide prediction engine

## Usage

### HTTP API

The `@neaps/api` package provides a REST API for tide predictions:

```typescript
import { startServer } from "@neaps/api";

// Start standalone server
startServer(3000);

// Or use as Express middleware
import { createApp } from "@neaps/api";
import express from "express";

const app = express();
app.use("/api", createApp());
app.listen(3000);
```

API endpoints:

- `GET /extremes` - Get high/low tide predictions for a location
- `GET /timeline` - Get water level predictions at intervals
- `GET /stations` - Find stations by ID or near coordinates
- `GET /stations/:id/extremes` - Get extremes for a specific station
- `GET /stations/:id/timeline` - Get timeline for a specific station
- `GET /openapi.json` - OpenAPI 3.0 specification

See the [@neaps/api README](packages/api/README.md) for full documentation.

### JavaScript/TypeScript Library

### Tide Extremes Prediction

```typescript
import { getExtremesPrediction } from "neaps";

const prediction = getExtremesPrediction({
  latitude: 26.7, // or `lat`
  longitude: -80.05, // or `lng` or `lon`
  start: new Date("2025-12-17"),
  end: new Date("2025-12-18"),
  datum: "MLLW", // optional, defaults to MLLW if available
  units: "meters", // optional, defaults to 'meters', can also be 'feet'
});

console.log(prediction);
// {
//   datum: 'MLLW',
//   units: 'meters',
//   station: {
//     id: '8723214',
//     name: 'Fort Lauderdale, FL',
//     // ...
//   },
//   distance: 12.3,
//   extremes: [
//     { time: 2019-01-01T03:12:00.000Z, level: 3.2, high: true, low: false, label: 'High' },
//     { time: 2019-01-01T09:45:00.000Z, level: 0.5, high: false, low: true, label: 'Low' },
//   ]
// }
```

### Get Timeline Prediction

```typescript
import { getTimelinePrediction } from "neaps";

const timeline = getTimelinePrediction({
  lat: 26.77,
  lon: -80.05,
  start: new Date("2025-12-19T00:00:00-05:00"),
  end: new Date("2025-12-19T01:00:00-05:00"),
  timeFidelity: 5 * 60, // seconds, defaults to `10 * 60`
  units: "meters", // optional, defaults to 'meters', can also be 'feet'
});

console.log(timeline);
// {
//   datum: 'MLLW',
//   units: 'meters',
//   station: {
//     id: 'noaa/8722588',
//     name: 'Port of Palm Beach',
//     // ...
//   },
//   timeline: [
//     { time: 2025-12-19T05:00:00.000Z, hour: 0, level: 0.7232836255650095 },
//     { time: 2025-12-19T05:06:00.000Z, hour: 0.1, level: 0.7231644154595303 },
//     { time: 2025-12-19T05:12:00.000Z, hour: 0.2, level: 0.7221097788490487 },
//     { time: 2025-12-19T05:18:00.000Z, hour: 0.3, level: 0.7201242512580206 },
//     // ...
//   ]
// }
```

### Get Water Level at Specific Time

```typescript
import { getWaterLevelAtTime } from "neaps";

const prediction = getWaterLevelAtTime({
  lat: 26.77,
  lon: -80.05,
  time: new Date("2025-12-19T00:30:00-05:00"),
  datum: "MSL",
  units: "meters", // optional, defaults to 'meters', can also be 'feet'
});

console.log(prediction);
// {
//   datum: 'MSL',
//   units: 'meters',
//   station: {
//     id: 'noaa/8722588',
//     name: 'Port of Palm Beach',
//     // ...
//   },
//   time: 2025-12-19T05:30:00.000Z,
//   hour: 0,
//   level: -0.43840585181640557
// }
```

### Finding stations

Neaps uses [@neaps/tide-database](https://github.com/neaps/tide-database) to find station data. You can find stations by location or ID.

#### Nearest Station

```typescript
import { nearestStation } from "neaps";

const station = nearestStation({ lat: 26.7, lon: -80.05 });
console.log(`${station.name} (${station.source.id})`); // Fort Lauderdale, FL (8722588)
```

Once you've found a station, you can get predictions, timeline, or water level at a specific time for that station:

```typescript
// Get extremes prediction for the nearest station
station.getExtremesPrediction({
  start: new Date("2025-12-17"),
  end: new Date("2025-12-18"),
});

// Get timeline prediction for the nearest station
station.getTimelinePrediction({
  start: new Date("2025-12-19"),
  end: new Date("2025-12-20"),
});

// Get timeline prediction for the nearest station
station.getWaterLevelAt({ time: new Date("2025-12-19T00:30:00-00:00") });
```

#### List Nearby Stations

```typescript
import { stationsNear } from "neaps";

stationsNear({ latitude: 45.6, longitude: -122.7 }, 5).forEach((s) => {
  console.log(`${s.name} (${s.source.id}) - ${(s.distance / 1000).toFixed(2)} km away`);
});
// Vancouver (9440083) - 3.49 km away
// Portland Morrison Street Bridge (9439221) - 10.24 km away
// KNAPP(THORNES)LNDG, WILLOW BAR (9440171) - 16.34 km away
// Rocky Point (9439189) - 16.93 km away
// WASHOUGAL, COLUMBIA RIVER (9440047) - 24.89 km away
```

#### Find station by ID

```typescript
import { findStation } from "neaps";

// Find station by Neaps ID
findStation("noaa/8443970"); // Boston

// Find station by source ID (e.g. NOAA)
findStation("9440083"); // Vancouver
```

## Accuracy & Validation

Neaps is continuously validated against NOAA tidal predictions, comparing the **time** and **height** of predicted high and low tides for all NOAA tide stations.

### Methodology

- Recent High/low predictions extracted from both NOAA and Neaps for 3300+ NOAA reference and subordinate stations
- One-to-one event matching using a ±180-minute window
- Metrics computed per station and aggregated across all stations
- Evaluated automatically in CI on every change

### Results

As of Dec 2025:

- **Stations evaluated:** 3,363
- **High/low events compared:** 36,990
- **Median |Δt|:** 3.5 minutes
- **95% of stations** have median |Δt| < **13.5 minutes**
- **Median MAE:** 1.1 cm
- **95% of stations** have MAE < 4.5 cm

### Summary

Neaps reproduces high and low tide timing with **minute-level accuracy** and tide heights with **centimeter-level accuracy** compared to NOAA's tide predictions. Validation is automated and enforced in CI to prevent regressions as the model evolves.
