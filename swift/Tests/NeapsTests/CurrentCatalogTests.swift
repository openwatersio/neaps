import Foundation
import Testing
import Neaps

@Test func sampledCatalogLoadsAndPredicts() throws {
    let cat = CurrentCatalog.shared
    #expect(!cat.ids().isEmpty, "currents-sample.json should have stations")
    let station = try #require(cat.station("PUG1701"), "Deception Pass should be sampled")
    let start = parseISO("2026-06-01T00:00:00Z")
    let events = station.events(from: start, to: start.addingTimeInterval(86400))
    #expect(!events.isEmpty, "PUG1701 produced no events")
    #expect(events.contains { $0.kind == .maxFlood } && events.contains { $0.kind == .maxEbb })

    if case .subordinate = try #require(cat.station("PCT1321")) {
        let subEvents = try #require(cat.station("PCT1321")).events(from: start, to: start.addingTimeInterval(86400))
        #expect(!subEvents.isEmpty, "subordinate PCT1321 produced no events")
    } else {
        Issue.record("PCT1321 should load as a subordinate station")
    }
    if case .harmonic = try #require(cat.station("PUG1716")) {} else {
        Issue.record("PUG1716 has own harcon and should load as harmonic, not subordinate")
    }
}
