# neaps

## 0.6.1

### Patch Changes

- [`1af0c22`](https://github.com/openwatersio/neaps/commit/1af0c22bb2181915d879821c17ed909731d2f1d2) Thanks [@bkeepers](https://github.com/bkeepers)! - Add `bbox` query parameter to `GET /stations` for filtering stations by bounding box. Pass a comma-separated string `minLon,minLat,maxLon,maxLat` to return only stations within that geographic area.

  Also allows reserved characters (e.g. commas) in the `query` parameter, enabling searches like `"San Francisco, CA"`.

  Bump `@neaps/tide-database` dependency to `0.7`.

- Updated dependencies [[`6feeca0`](https://github.com/openwatersio/neaps/commit/6feeca09bed1be0dde7b529965427655db004fbe), [`ccb662f`](https://github.com/openwatersio/neaps/commit/ccb662ff1742fcd504b8dcbdf876781a96ca4e71), [`c1f0144`](https://github.com/openwatersio/neaps/commit/c1f014473b63d0720f0f313b4c9d6b1b50d00a72), [`764b8c0`](https://github.com/openwatersio/neaps/commit/764b8c0dd0fb07bad272fcc4a39f6bd1af97814a)]:
  - @neaps/tide-predictor@0.9.0

## 0.6.0

### Minor Changes

- [#227](https://github.com/openwatersio/neaps/pull/227) [`b3efa7c`](https://github.com/openwatersio/neaps/commit/b3efa7cf2460f5f21e490b42f81782878f65d7ed) Thanks [@bkeepers](https://github.com/bkeepers)! - Add support for subordinate station predictions in the core library.

  `getTimelinePrediction` now supports subordinate stations, producing a continuous timeline by interpolating between offset-adjusted reference station extremes.

### Patch Changes

- Updated dependencies [[`b3efa7c`](https://github.com/openwatersio/neaps/commit/b3efa7cf2460f5f21e490b42f81782878f65d7ed)]:
  - @neaps/tide-predictor@0.8.0

## 0.5.1

### Patch Changes

- [#215](https://github.com/openwatersio/neaps/pull/215) [`df11392`](https://github.com/openwatersio/neaps/commit/df11392748559d477f0dc70ca910147fcc3414f3) Thanks [@bkeepers](https://github.com/bkeepers)! - Default to station's chart datum (usually LAT or MLLW)

## 0.5.0

### Minor Changes

- [#213](https://github.com/openwatersio/neaps/pull/213) [`9f3fdf6`](https://github.com/openwatersio/neaps/commit/9f3fdf6785492a97dae717a6257c5358fc661e07) Thanks [@bkeepers](https://github.com/bkeepers)! - Speed up extremes detection by ~100x, deprecate `timeFidelity` option on `getExtremesPrediction`, which will always be <1s now.

### Patch Changes

- Updated dependencies [[`9f3fdf6`](https://github.com/openwatersio/neaps/commit/9f3fdf6785492a97dae717a6257c5358fc661e07)]:
  - @neaps/tide-predictor@0.7.0

## 0.4.0

### Minor Changes

- [#208](https://github.com/openwatersio/neaps/pull/208) [`355f696`](https://github.com/openwatersio/neaps/commit/355f6960af6fc6cd9a5c3d592b5303bb0e4485e9) Thanks [@bkeepers](https://github.com/bkeepers)! - Replace constituent definitions with the [IHO TWCWG (International Hydrographic Organization Tidal and Water Level Working Group) constituent list](https://github.com/openwatersio/neaps/blob/main/docs/TWCWG_Constituent_list.md).

  There are lot of implementation details that changed, but the highlights are:
  1. Switched from ~60 hand-coded constituents to 395 IHO standard constituents (6.6x increase).
  2. Switched to IHO standard nodal correction formulas described in Annex A, which use simplified Fourier series formulas and are the International standard used by hydrographic offices worldwide.
  3. Implemented the IHO Annex B rules for resolving compound constituent members. This allows for much more comprehensive tidal predictions that include minor constituents that can have significant local effects.

  ## Benchmark Results

  Most importantly, the new implementation delivers significantly improved accuracy when comparing predictions to NOAA, with a 60% reduction in median height error (22.3mm to 8.7mm) and a 60% reduction in timing error (15 min to 6 min) at the 95th percentile.

  | Metric                                     | Before  | After       | Improvement |
  | ------------------------------------------ | ------- | ----------- | ----------- |
  | **Median height error (MAE p50)**          | 22.3 mm | **8.7 mm**  | **↓ 60.9%** |
  | **95th percentile height error (MAE p95)** | 45.4 mm | **23.9 mm** | **↓ 47.4%** |
  | **RMSE (median)**                          | 25.4 mm | **10.3 mm** | **↓ 59.6%** |
  | **Median timing error (p95)**              | 15 min  | **6 min**   | **↓ 60.0%** |

### Patch Changes

- Updated dependencies [[`355f696`](https://github.com/openwatersio/neaps/commit/355f6960af6fc6cd9a5c3d592b5303bb0e4485e9), [`ebb5dc0`](https://github.com/openwatersio/neaps/commit/ebb5dc02c9e4123bf6bd0ed4fd70531a5aa7eb79)]:
  - @neaps/tide-predictor@0.6.0

## 0.3.1

### Patch Changes

- [`c885cce`](https://github.com/openwatersio/neaps/commit/c885cceb9f1632bc2bdb087fccde3f43928c2c5e) Thanks [@bkeepers](https://github.com/bkeepers)! - Bump @neaps/tide-database to 0.4 for search support

## 0.3.0

### Minor Changes

- Use more efficient goespatial search #191

### Patch Changes

- Updated dependencies
  - @neaps/tide-predictor@0.5.0
