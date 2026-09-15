import Foundation
import Testing
@testable import TideEngine

private struct ExtremesFixture: Decodable {
    let start: String
    let end: String
    let extremes: [E]
    struct E: Decodable { let time: String; let height: Double; let kind: String }
}

@Test func extremesMatchNeaps() throws {
    // Reuse the prediction fixture's constituent set (same station/window).
    let pred = try loadFixture("prediction-victoria", as: PredictionFixtureRef.self)
    let fixture = try loadFixture("extremes-victoria", as: ExtremesFixture.self)
    let station = Station(constituents: pred.constituents.map {
        HarmonicConstituent(name: $0.name, amplitude: $0.amplitude, phase: $0.phase)
    })
    let got = station.extremes(from: parseISO(fixture.start), to: parseISO(fixture.end))

    #expect(got.count == fixture.extremes.count, "extreme count: got \(got.count), want \(fixture.extremes.count)")
    for (g, e) in zip(got, fixture.extremes) {
        #expect((g.kind == .high ? "high" : "low") == e.kind, "kind at \(e.time): got \(g.kind), want \(e.kind)")
        let dt = abs(g.time.timeIntervalSince1970 - parseISO(e.time).timeIntervalSince1970)
        #expect(dt < 60, "time at \(e.time): off by \(dt)s")
        #expect(abs(g.height - e.height) < 0.02, "height at \(e.time): got \(g.height), want \(e.height)")
    }
}

// Minimal decode of the prediction fixture's constituent list, reused here.
struct PredictionFixtureRef: Decodable {
    let constituents: [C]
    struct C: Decodable { let name: String; let amplitude: Double; let phase: Double }
}
