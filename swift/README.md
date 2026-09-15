# Neaps for Swift

The open, offline tide & current engine behind **Slackwater** — *Offline Tides & Currents*.

Tide prediction is deterministic astronomy, not a live feed. Given a station's harmonic
constituents you can compute heights and the high/low turns for any minute, years ahead,
with **zero network**. This package is a pure-Swift harmonic engine that does exactly that.

**It's all open — the engine MIT, the app GPL v3.** If you sail somewhere our numbers are
off, read the code, check it against your home waters, and send a fix.

## Status

- **Tides** — validated against the Neaps reference (floating-point agreement across every
  layer) and NOAA's own published predictions (**Friday Harbor: max 7.9 min / 3.5 cm**).
  Subordinate stations reduce from their reference within **2.8 min / 0.8 cm** of NOAA
  (Nurse Channel, ratio; Kamalo Harbor, fixed). See [`docs/validation/phase0-report.md`](docs/validation/phase0-report.md).
- **Currents** — US NOAA current stations (harmonic + subordinate), constituents sourced
  straight from NOAA CO-OPS, computed offline. Validated against NOAA's own current
  predictions: **PUG1741 (Bellingham Channel) 9.7 min / 0.055 kn**, subordinate reduction
  **6.1 min / 0.05 kn**, and the Salish Sea passes (Deception Pass, Rosario, San Juan
  Channel, Turn Point, Admiralty, Race Rocks) directly. See
  [`docs/validation/currents-report.md`](docs/validation/currents-report.md).

## Use

### Tides

```swift
import Neaps

let station = Station(
    constituents: [HarmonicConstituent(name: "M2", amplitude: 0.96, phase: 128) /* … */],
    offset: 1.387  // datum offset (e.g. MSL → MLLW), optional
)
let heights  = station.heights(from: start, to: end, step: 600)   // [TidePoint]
let extremes = station.extremes(from: start, to: end)             // [TideExtreme] high/low

// A subordinate station has no constituents: NOAA time and height corrections
// against a reference's highs and lows, with a half-cosine curve between.
let sub = SubordinateTideStation(
    reference: station,
    highTimeOffset: 0, lowTimeOffset: 10 * 60,       // seconds
    height: .ratio(high: 0.79, low: 1.11)            // or .fixed(high:low:) in metres
)
sub.heights(from: start, to: end); sub.extremes(from: start, to: end); sub.rates(from: start, to: end)
```

Harmonic constants come from public sources — NOAA (public domain, bundled) and, online,
CHS/IWLS for Canadian waters.

### Currents

Signed major-axis velocity (knots), plus slack / max-flood / max-ebb events. The engine
carries no station catalog — supply the constants and build a station:

```swift
import Neaps

let dp = CurrentStation(
    constituents: [HarmonicConstituent(name: "M2", amplitude: 5.21, phase: 241.2) /* … */],
    floodDirection: 92.9,   // NOAA `azi`
    ebbDirection: 272.9,
    offset: -0.62           // NOAA `majorMeanSpeed` (mean flow), optional
)
let speeds = dp.speeds(from: start, to: end)   // [CurrentPoint], signed knots (+flood / -ebb)
let slacks = dp.slacks(from: start, to: end)   // slack water (velocity value-zeros)
let maxima = dp.maxima(from: start, to: end)   // max flood / max ebb, labeled by velocity sign
```

Subordinate stations (`SubordinateStation`) warp a reference station's events by NOAA's
two-slack / speed-ratio offsets. `speeds(from:to:step:)` draws a half-cosine through those
events, on the same timeline as a harmonic station's — NOAA publishes no curve for a
subordinate, so it is a drawing of the table, not a prediction between its rows.

## Develop

```sh
swift test                                  # golden + NOAA-oracle validation
npm run fixtures:check                      # regenerate in memory and fail on drift
node fixtures/generate/gen-golden.mjs       # regenerate tide golden fixtures from workspace source
node fixtures/generate/gen-catalog.mjs      # regenerate the bundled tide constituent catalog
node fixtures/generate/gen-realworld.mjs    # refresh the NOAA tide real-world fixture
```

> **Current-station data is not extracted here.** The extractor, the schema, and the
> NOAA API's undocumented behaviour live in
> [noaa-current-stations](https://github.com/openwatersio/noaa-current-stations) — shared with
> the SignalK plugin so the `currbin` / per-bin-reference / type-S traps stay solved in
> one place. This engine consumes station constants a caller supplies and stays offline.
>
> ```sh
> npx --package=@openwaters/noaa-current-stations@0.4.0 noaa-current-stations golden <out.json> --station ID --bin N --start ISO --end ISO
> ```
> regenerates a NOAA currents oracle fixture.

## Credit & licence

The harmonic algorithm is a faithful Swift port of
[openwatersio/neaps](https://github.com/openwatersio/neaps), and station data
comes from [`@neaps/tide-database`](https://github.com/openwatersio/tide-database). Huge
thanks to that project.

MIT — see [LICENSE](../LICENSE).

> **Not for navigation.** Predictions are astronomical estimates and do not account for
> weather, surge, or local effects. Carry official tables and charts.
