# NOAA CO-OPS currents API — moved

The findings in this document have been corrected, expanded, and published as the
reference documentation for
[**sailingnaturali/current-stations**](https://github.com/sailingnaturali/current-stations):

- **[docs/noaa-api.md](https://github.com/sailingnaturali/current-stations/blob/main/docs/noaa-api.md)**
  — the API's undocumented behaviour: `currbin`, units, `majorPhaseGMT`, Z₀, subordinate
  offsets, the per-bin reference trap, type-S own-harcon, dead ends.
- **[docs/validation.md](https://github.com/sailingnaturali/current-stations/blob/main/docs/validation.md)**
  — how any of it gets trusted, and the measured numbers.

The extractors that lived here (`tools/gen-currents.mjs`, `tools/gen-currents-golden.mjs`)
moved with it, and so does the station data — this engine holds only a test sample.

## One claim here was wrong

Recorded because it was acted on downstream before being retested:

- **"NOAA 404s the default fetch/curl User-Agent."** Does not reproduce, on any endpoint
  (2026-07-19, Node 24 `fetch`, byte-identical responses with and without a browser UA).
  The original observation was almost certainly rate-limiting from high-volume probing,
  coinciding with a `currents_predictions` outage the same day.

What *is* real: NOAA throttles bulk callers (pace requests), and the predictions product
does go down.

Also corrected: PUG1717 was recorded here as a survey station NOAA doesn't serve
predictions for. It is served, at bin 35.

## Engine-specific: our Salish target stations

| id | currbin | station |
|---|---|---|
| PUG1701 | 18 | Deception Pass (Narrows) |
| PUG1702 | 9  | Rosario Strait |
| PUG1703 | 13 | San Juan Channel, south entrance |
| PUG1717 | 28 | Turn Point, Boundary Pass |
| PUG1616 | 6  | Admiralty Inlet (off Bush Point) |
| PUG1640 | 9  | Race Rocks, 4.5 mi. S of |
| PUG1629 | 3  | Yokeko Point, Deception Pass |
| PUG1617 | 14 | Bush Point Light, 0.5 mile NW of |

Validation results for these live in
[`docs/validation/currents-report.md`](../validation/currents-report.md).
