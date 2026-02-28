# @neaps/tide-predictor

## 0.8.1

### Patch Changes

- [#234](https://github.com/openwatersio/neaps/pull/234) [`6feeca0`](https://github.com/openwatersio/neaps/commit/6feeca09bed1be0dde7b529965427655db004fbe) Thanks [@bkeepers](https://github.com/bkeepers)! - Align timeline predictions to clock boundaries based on `timeFidelity`. For example, with the default timeFidelity of 600 seconds, predictions now fall on :00, :10, :20, :30, :40, :50 past the hour regardless of the requested start time. The start time will always snap to the previous clock boundary, and the end time will snap to the next clock boundary.

## 0.8.0

### Minor Changes

- [#227](https://github.com/openwatersio/neaps/pull/227) [`b3efa7c`](https://github.com/openwatersio/neaps/commit/b3efa7cf2460f5f21e490b42f81782878f65d7ed) Thanks [@bkeepers](https://github.com/bkeepers)! - Add support for timeline predictions with offsets.

  `getTimelinePrediction` now accepts an `offsets` option for subordinate stations, using proportional domain-mapping to interpolate between reference station extremes with time and height adjustments.

## 0.7.0

### Minor Changes

- [#213](https://github.com/openwatersio/neaps/pull/213) [`9f3fdf6`](https://github.com/openwatersio/neaps/commit/9f3fdf6785492a97dae717a6257c5358fc661e07) Thanks [@bkeepers](https://github.com/bkeepers)! - Speed up extremes detection by ~100x, deprecate `timeFidelity` option on `getExtremesPrediction`, which will always be <1s now.

## 0.6.0

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

- [#212](https://github.com/openwatersio/neaps/pull/212) [`ebb5dc0`](https://github.com/openwatersio/neaps/commit/ebb5dc02c9e4123bf6bd0ed4fd70531a5aa7eb79) Thanks [@bkeepers](https://github.com/bkeepers)! - Export constituents, deprecate default export

  ```diff
  -import tidePredictor from "@neaps/tide-predictor";
  +import { createTidePredictor } from "@neaps/tide-predictor";
  ```

## 0.5.0

### Minor Changes

- Add constituents to support TICON data #186

### Patch Changes

- Add MP1 constituent
