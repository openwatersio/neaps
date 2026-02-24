---
"@neaps/tide-predictor": minor
---

Add support for timeline predictions with offsets.

`getTimelinePrediction` now accepts an `offsets` option for subordinate stations, using proportional domain-mapping to interpolate between reference station extremes with time and height adjustments.
