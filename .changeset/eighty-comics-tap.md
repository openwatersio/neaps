---
"@neaps/tide-predictor": minor
"neaps": minor
---

Replace constituent definitions with the [IHO TWCWG (International Hydrographic Organization Tidal and Water Level Working Group) constituent list](https://github.com/openwatersio/neaps/blob/main/docs/TWCWG_Constituent_list.md).

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
