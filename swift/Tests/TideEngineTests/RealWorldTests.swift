import Foundation
import Testing
@testable import TideEngine

private struct RealWorldFixture: Decodable {
    let station: String
    let offset: Double
    let start: String
    let end: String
    let constituents: [C]
    let official: [E]
    struct C: Decodable { let name: String; let amplitude: Double; let phase: Double }
    struct E: Decodable { let time: String; let height: Double; let kind: String }
}

/// Prove the engine reproduces the tide authority's OWN published hi/lo — the Phase 0
/// accuracy gate. Tolerances are real-world (datum rounding, epoch, engine differences),
/// looser than the Neaps-oracle tests: ±15 min, ±0.15 m.
@Test func fridayHarborMatchesNOAA() throws {
    let fx = try loadFixture("realworld-friday-harbor", as: RealWorldFixture.self)
    let station = Station(
        constituents: fx.constituents.map { HarmonicConstituent(name: $0.name, amplitude: $0.amplitude, phase: $0.phase) },
        offset: fx.offset
    )
    // Widen a little so extremes near the window edges are found for matching.
    let computed = station.extremes(from: parseISO(fx.start).addingTimeInterval(-3600),
                                    to: parseISO(fx.end).addingTimeInterval(3600))
    #expect(!computed.isEmpty)

    var maxTimeErr = 0.0, maxHeightErr = 0.0
    for off in fx.official {
        let t = parseISO(off.time)
        let kind: ExtremeKind = off.kind == "high" ? .high : .low
        // Nearest computed extreme of the same kind.
        let match = computed
            .filter { $0.kind == kind }
            .min { abs($0.time.timeIntervalSince1970 - t.timeIntervalSince1970) < abs($1.time.timeIntervalSince1970 - t.timeIntervalSince1970) }
        let m = try #require(match, "no computed \(off.kind) near \(off.time)")
        let timeErr = abs(m.time.timeIntervalSince1970 - t.timeIntervalSince1970) / 60  // minutes
        let heightErr = abs(m.height - off.height)
        maxTimeErr = max(maxTimeErr, timeErr)
        maxHeightErr = max(maxHeightErr, heightErr)
        #expect(timeErr < 15, "\(off.kind) at \(off.time): time off by \(timeErr) min")
        #expect(heightErr < 0.15, "\(off.kind) at \(off.time): height \(m.height) vs official \(off.height), off \(heightErr) m")
    }
    print("Friday Harbor vs NOAA — max time error \(String(format: "%.1f", maxTimeErr)) min, max height error \(String(format: "%.3f", maxHeightErr)) m")
}
