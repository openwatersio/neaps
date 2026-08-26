import Foundation
import Testing
import TideEngine
@testable import TideEngineCatalog

@Test func decodesHarmonicRecordAndPredictsEvents() throws {
    let json = """
    { "stations": [
      { "id": "test", "name": "Test", "type": "harmonic",
        "floodDirection": 90, "ebbDirection": 270, "offset": 0,
        "constituents": [{"name":"M2","amplitude":2,"phase":40}] }
    ] }
    """
    let catalog = try CurrentCatalog(data: Data(json.utf8))
    let station = try #require(catalog.station("test"))
    guard case .harmonic = station else {
        Issue.record("test should decode as harmonic")
        return
    }

    let start = Date(timeIntervalSince1970: 1_767_225_600)
    #expect(!station.events(from: start, to: start.addingTimeInterval(86_400)).isEmpty)
}

@Test func currentCatalogLoadsAndPredicts() throws {
    let cat = CurrentCatalog.shared
    #expect(!cat.ids().isEmpty, "bundled currents.json should have stations")
    let station = try #require(cat.station("PUG1701"), "Deception Pass should be bundled")
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

@Test func catalogDecodesDerivedSlackAndReferenceTide() throws {
    let json = """
    { "note": "test", "stations": [
      { "id": "chs-point-atkinson", "name": "Point Atkinson", "type": "tide-harmonic",
        "source": "chs-derived", "offset": 3.0, "constituents": [
          {"name":"M2","amplitude":0.95,"phase":40}, {"name":"S2","amplitude":0.26,"phase":70},
          {"name":"K1","amplitude":0.85,"phase":250}, {"name":"O1","amplitude":0.48,"phase":230} ] },
      { "id": "chs-malibu-rapids", "name": "Malibu Rapids", "type": "derived-slack",
        "source": "tide-derived", "reference": "chs-point-atkinson", "hwLagMinutes": 25, "lwLagMinutes": 35 }
    ] }
    """
    let cat = try CurrentCatalog(data: Data(json.utf8))
    #expect(cat.station("chs-point-atkinson") == nil)

    let gate = try #require(cat.station("chs-malibu-rapids"))
    guard case .derivedSlack(let d) = gate else {
        Issue.record("Malibu should decode as a derived-slack station")
        return
    }
    let from = parseISO("2026-03-11T00:00:00Z")
    #expect(!d.slacks(from: from, to: from.addingTimeInterval(86400)).isEmpty)
    let events = gate.events(from: from, to: from.addingTimeInterval(86400))
    #expect(!events.isEmpty)
    #expect(events.allSatisfy { $0.kind == .slack && $0.speed == 0 })
}

@Test func mergingAddsChsFragmentWithoutClobberingNoaa() throws {
    let noaa = """
    { "note": "noaa", "stations": [
      { "id": "PUG1701", "name": "Deception Pass", "type": "harmonic", "floodDirection": 90,
        "ebbDirection": 270, "offset": 0, "constituents": [{"name":"M2","amplitude":2.0,"phase":40}] }
    ] }
    """
    let chs = """
    { "note": "chs", "stations": [
      { "id": "chs-point-atkinson", "name": "Point Atkinson", "type": "tide-harmonic", "offset": 3.0,
        "constituents": [{"name":"M2","amplitude":0.95,"phase":40}, {"name":"K1","amplitude":0.85,"phase":250}, {"name":"O1","amplitude":0.48,"phase":230}] },
      { "id": "chs-malibu-rapids", "name": "Malibu Rapids", "type": "derived-slack", "reference": "chs-point-atkinson", "hwLagMinutes": 25, "lwLagMinutes": 35 }
    ] }
    """
    let merged = try CurrentCatalog(data: Data(noaa.utf8)).merging(Data(chs.utf8))
    #expect(merged.station("PUG1701") != nil)
    let gate = try #require(merged.station("chs-malibu-rapids"))
    guard case .derivedSlack = gate else { Issue.record("Malibu should be a derived-slack station"); return }
    let from = parseISO("2026-03-11T00:00:00Z")
    #expect(!gate.events(from: from, to: from.addingTimeInterval(86400)).isEmpty)
}
