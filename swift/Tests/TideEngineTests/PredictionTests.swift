import Foundation
import Testing
@testable import TideEngine

private struct PredictionFixture: Decodable {
    let constituents: [Constituent]
    let start: String
    let end: String
    let step: Double
    let points: [Point]
    struct Constituent: Decodable { let name: String; let amplitude: Double; let phase: Double }
    struct Point: Decodable { let time: String; let height: Double }
}

@Test func timelinePredictionMatchesNeaps() throws {
    let fixture = try loadFixture("prediction-victoria", as: PredictionFixture.self)
    let station = Station(constituents: fixture.constituents.map {
        HarmonicConstituent(name: $0.name, amplitude: $0.amplitude, phase: $0.phase)
    })
    let points = station.heights(from: parseISO(fixture.start), to: parseISO(fixture.end), step: fixture.step)
    #expect(points.count == fixture.points.count, "point count: got \(points.count), want \(fixture.points.count)")

    var maxErr = 0.0
    for (got, expected) in zip(points, fixture.points) {
        #expect(abs(got.time.timeIntervalSince1970 - parseISO(expected.time).timeIntervalSince1970) < 0.5)
        let err = abs(got.height - expected.height)
        maxErr = max(maxErr, err)
        #expect(err < 0.02, "height at \(expected.time): got \(got.height), want \(expected.height), err \(err)")
    }
    // The engines share the algorithm, so agreement should be far tighter than 2cm.
    #expect(maxErr < 1e-6, "max height error \(maxErr) exceeds 1e-6 — engines diverging")
}
