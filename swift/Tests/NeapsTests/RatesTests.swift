import Foundation
import Testing
@testable import Neaps

// Public dh/dt series (slackwater-ios #95: the tide track's rate-of-rise ramp
// and the detail readout). Analytic — evalHPrime, not sample differencing.

private func victoria() throws -> Station {
    let pred = try loadFixture("prediction-victoria", as: PredictionFixtureRef.self)
    return Station(constituents: pred.constituents.map {
        HarmonicConstituent(name: $0.name, amplitude: $0.amplitude, phase: $0.phase)
    })
}

@Test func ratesAlignWithHeightsTimeline() throws {
    let station = try victoria()
    let from = parseISO("2025-06-01T00:00:00Z"), to = parseISO("2025-06-02T00:00:00Z")
    let rates = station.rates(from: from, to: to)
    let heights = station.heights(from: from, to: to)
    #expect(rates.count == heights.count)
    #expect(zip(rates, heights).allSatisfy { $0.time == $1.time },
            "rates and heights must share one timeline for strip alignment")
}

@Test func ratesMatchCenteredDifferenceOfHeights() throws {
    // Independent numerical check: h'(t) ≈ (h(t+60s) − h(t−60s)) / 120s, in m/hr.
    let station = try victoria()
    let from = parseISO("2025-06-01T00:00:00Z"), to = parseISO("2025-06-01T12:00:00Z")
    for p in station.rates(from: from, to: to) {
        let before = station.heights(from: p.time.addingTimeInterval(-60),
                                     to: p.time.addingTimeInterval(-59), step: 1).first!.height
        let after = station.heights(from: p.time.addingTimeInterval(60),
                                    to: p.time.addingTimeInterval(61), step: 1).first!.height
        let numeric = (after - before) / 120 * 3600
        #expect(abs(p.rate - numeric) < 0.005, "at \(p.time): analytic \(p.rate), numeric \(numeric)")
    }
}

@Test func rateVanishesAtExtremes() throws {
    // Extremes are bisected roots of the same derivative — rates at those
    // instants are zero to the bisection tolerance.
    let station = try victoria()
    let from = parseISO("2025-06-01T00:00:00Z"), to = parseISO("2025-06-03T00:00:00Z")
    for e in station.extremes(from: from, to: to) {
        let r = station.rates(from: e.time, to: e.time.addingTimeInterval(1), step: 1).first!.rate
        #expect(abs(r) < 0.01, "dh/dt at \(e.kind) \(e.time) is \(r) m/hr")
    }
}

@Test func pureM2RatePeaksAtAmplitudeTimesOmega() {
    // Unit guard: A = 1 m ⇒ peak |dh/dt| = A·ω = 2π/12.4206h ≈ 0.506 m/hr
    // (node factor keeps it within a few percent). A per-second slip reads 1e-4.
    let m2 = Station(constituents: [HarmonicConstituent(name: "M2", amplitude: 1, phase: 0)])
    let from = Date(timeIntervalSince1970: 1_770_000_000)
    let peak = m2.rates(from: from, to: from.addingTimeInterval(24 * 3600), step: 60)
        .map { abs($0.rate) }.max()!
    #expect(abs(peak - 0.506) < 0.03)
}
