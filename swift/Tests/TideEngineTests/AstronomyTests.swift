import Foundation
import Testing
@testable import TideEngine

private struct AstronomyFixture: Decodable {
    let values: [Entry]
    struct Entry: Decodable { let time: String; let astro: [String: Double] }
}

@Test func astronomyMatchesNeaps() throws {
    let fixture = try loadFixture("astronomy", as: AstronomyFixture.self)
    #expect(fixture.values.count >= 8)
    for entry in fixture.values {
        let got = astro(parseISO(entry.time)).all
        for (key, expected) in entry.astro {
            let diff = angularDiff(got[key]!, expected)
            #expect(diff < 1e-6, "\(key) at \(entry.time): got \(got[key]!), expected \(expected), diff \(diff)")
        }
    }
}
