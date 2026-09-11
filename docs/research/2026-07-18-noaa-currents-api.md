# NOAA current-station data

The [noaa-current-stations](https://github.com/openwatersio/noaa-current-stations) project owns NOAA CO-OPS current-station extraction and its reference documentation:

- [NOAA API behavior](https://github.com/openwatersio/noaa-current-stations/blob/main/docs/noaa-api.md) covers `currbin`, units, `majorPhaseGMT`, Z₀, subordinate offsets, per-bin references, type-S stations with their own harmonics, and known dead ends.
- [Schema](https://github.com/openwatersio/noaa-current-stations/blob/main/docs/schema.md) defines the station data consumed by applications.
- [Validation](https://github.com/openwatersio/noaa-current-stations/blob/main/docs/validation.md) describes the source checks and measured results.

This engine carries only the sample required by its tests. Callers supply station constants at runtime.

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

Validation results for these stations live in [`docs/validation/currents-report.md`](../validation/currents-report.md).
