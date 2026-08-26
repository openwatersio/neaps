import Foundation
import Testing
import TideEngine
@testable import TideEngineCatalog

private struct SubBatch: Decodable {
    let stations: [Station]

    struct Station: Decodable {
        let id: String
        let events: [Event]
    }

    struct Event: Decodable {
        let time: String
        let speed: Double
        let kind: String
    }
}

private func nearestSameKind(_ events: [CurrentEvent], _ kind: CurrentEventKind, to time: Date) -> CurrentEvent? {
    events.filter { $0.kind == kind }.min {
        abs($0.time.timeIntervalSince1970 - time.timeIntervalSince1970) < abs($1.time.timeIntervalSince1970 - time.timeIntervalSince1970)
    }
}

@Test func subordinateBatchMatchesNOAA() throws {
    let batch: SubBatch = try loadFixture("currents-golden-sub-batch", as: SubBatch.self)
    let catalog = CurrentCatalog.shared

    var worstTime = 0.0, worstSpeed = 0.0, stationsChecked = 0
    for station in batch.stations {
        guard !station.events.isEmpty, let current = catalog.station(station.id) else { continue }
        if case .harmonic = current { Issue.record("\(station.id) is not subordinate"); continue }
        let times = station.events.map { parseISO($0.time) }
        let computed = current.events(from: times.min()!.addingTimeInterval(-3600), to: times.max()!.addingTimeInterval(3600))
        var maxTime = 0.0, maxSpeed = 0.0, checked = 0
        for event in station.events where event.kind != "slack" {
            let time = parseISO(event.time)
            let kind: CurrentEventKind = event.kind == "maxFlood" ? .maxFlood : .maxEbb
            let matched = try #require(nearestSameKind(computed, kind, to: time), "\(station.id): no computed \(event.kind) near \(event.time)")
            let timeError = abs(matched.time.timeIntervalSince1970 - time.timeIntervalSince1970) / 60
            let speedError = abs(abs(matched.speed) - abs(event.speed))
            maxTime = max(maxTime, timeError); maxSpeed = max(maxSpeed, speedError); checked += 1
            #expect(timeError < 30, "\(station.id) \(event.kind) at \(event.time): time off \(timeError) min")
            #expect(speedError < 0.4, "\(station.id) \(event.kind) at \(event.time): speed \(matched.speed) vs \(event.speed)")
        }
        #expect(checked > 0)
        worstTime = max(worstTime, maxTime); worstSpeed = max(worstSpeed, maxSpeed); stationsChecked += 1
        print("  \(station.id): \(checked) max events, \(String(format: "%.1f", maxTime)) min / \(String(format: "%.3f", maxSpeed)) kn")
    }
    #expect(stationsChecked >= 8, "expected the full batch; checked \(stationsChecked)")
    print("Subordinate batch vs NOAA — \(stationsChecked) stations, worst \(String(format: "%.1f", worstTime)) min / \(String(format: "%.3f", worstSpeed)) kn")
}
