import Foundation
import Testing
@testable import TideEngine

private struct NodeCorrFixture: Decodable {
    let entries: [Entry]
    struct Entry: Decodable { let time: String; let corrections: [String: FU] }
    struct FU: Decodable { let f: Double; let u: Double }
}

@Test func nodeCorrectionsMatchNeaps() throws {
    let fixture = try loadFixture("node-corrections", as: NodeCorrFixture.self)
    for entry in fixture.entries {
        let a = astro(parseISO(entry.time))
        for (name, expected) in entry.corrections {
            let got = try #require(ihoCorrection(name, a), "\(name): no IHO correction implemented")
            #expect(abs(got.f - expected.f) < 1e-6, "\(name) f at \(entry.time): got \(got.f), want \(expected.f)")
            #expect(angularDiff(got.u, expected.u) < 1e-6, "\(name) u at \(entry.time): got \(got.u), want \(expected.u)")
        }
    }
}
