#if canImport(Accelerate)
import Foundation
import Testing
import Neaps

private struct FitFixture: Decodable {
    let basis: [String]
    let cases: [Case]
    struct Sample: Decodable { let t: Double; let v: Double }
    struct Constituent: Decodable { let name: String; let amplitude: Double; let phase: Double }
    struct Pair: Decodable { let constituents: [String]; let requiredDays: Double }
    struct Expected: Decodable {
        let offset: Double; let rms: Double
        let constituents: [Constituent]; let unseparable: [Pair]
    }
    struct Case: Decodable { let days: Int; let samples: [Sample]; let expected: Expected }
}

@Test func harmonicFitMatchesJavaScriptGolden() throws {
    let fixture = try loadFixture("harmonic-fit", as: FitFixture.self)
    for entry in fixture.cases {
        let result = try fit(samples: entry.samples.map {
            HarmonicSample(time: Date(timeIntervalSince1970: $0.t / 1000), value: $0.v)
        }, constituents: fixture.basis)
        #expect(abs(result.offset - entry.expected.offset) < 1e-7)
        #expect(abs(result.rms - entry.expected.rms) < 1e-7)
        #expect(result.constituents.count == entry.expected.constituents.count)
        for (actual, expected) in zip(result.constituents, entry.expected.constituents) {
            #expect(actual.name == expected.name)
            #expect(abs(actual.amplitude - expected.amplitude) < 1e-6)
            #expect(angularDiff(actual.phase, expected.phase) < 1e-3)
        }
        #expect(result.unseparable.count == entry.expected.unseparable.count)
        for expected in entry.expected.unseparable {
            #expect(result.unseparable.contains {
                $0.constituents == expected.constituents && $0.requiredDays == expected.requiredDays
            })
        }
    }
}

@Test func harmonicFitRejectsInvalidAndSingularInputs() throws {
    let start = Date(timeIntervalSince1970: 1_767_225_600)
    let samples = (0..<100).map { HarmonicSample(time: start.addingTimeInterval(Double($0) * 3600), value: 2) }
    #expect(throws: HarmonicFitError.self) { try fit(samples: [], constituents: []) }
    #expect(throws: HarmonicFitError.self) { try fit(samples: Array(samples.prefix(2)), constituents: ["M2"]) }
    #expect(throws: HarmonicFitError.self) { try fit(samples: samples, constituents: ["unknown"]) }
    #expect(throws: HarmonicFitError.self) { try fit(samples: samples, constituents: ["NU2", "nu2"]) }
    #expect(throws: HarmonicFitError.self) { try fit(samples: samples, constituents: ["Z0"]) }
    #expect(throws: HarmonicFitError.self) { try fit(samples: samples.reversed(), constituents: ["M2"]) }
    #expect(throws: HarmonicFitError.self) { try fit(samples: Array(repeating: samples[0], count: 100), constituents: ["M2"]) }
    for invalid in [Double.nan, .infinity] {
        #expect(throws: HarmonicFitError.self) {
            try fit(samples: [HarmonicSample(time: start, value: invalid)] + samples.dropFirst(), constituents: [])
        }
        #expect(throws: HarmonicFitError.self) {
            try fit(samples: [HarmonicSample(time: Date(timeIntervalSince1970: invalid), value: 0)] + samples.dropFirst(), constituents: [])
        }
    }
    let mean = try fit(samples: samples, constituents: [])
    #expect(abs(mean.offset - 2) < 1e-12)
    #expect(mean.rms < 1e-12)
}
#endif
