# neaps

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
