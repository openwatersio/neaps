// TideEngine — MIT. Bundled US current-station catalog (from NOAA CO-OPS mdapi).
import Foundation
import TideEngine

public enum AnyCurrentStation: Sendable {
    case harmonic(CurrentStation)
    case subordinate(SubordinateStation)
    case derivedSlack(DerivedSlackStation)
    public func events(from: Date, to: Date) -> [CurrentEvent] {
        switch self {
        case .harmonic(let s): return s.events(from: from, to: to)
        case .subordinate(let s): return s.events(from: from, to: to)
        // A derived gate has only slacks and no speed — CHS predicts no current
        // there. Fold them into the merged list as zero-speed slacks; the
        // schematic curve and phase live on the concrete DerivedSlackStation.
        case .derivedSlack(let s):
            return s.slacks(from: from, to: to).map { CurrentEvent(time: $0.time, speed: 0, kind: .slack) }
        }
    }
}

public struct CurrentCatalog: Sendable {
    private let stations: [String: StationRecord]

    public static let shared = CurrentCatalog()

    private struct StationRecord: Decodable, Sendable {
        let id: String; let name: String; let type: String
        let floodDirection: Double?; let ebbDirection: Double?
        let offset: Double?
        let constituents: [Con]?
        let reference: String?
        let slackBeforeFloodOffset: Double?; let slackBeforeEbbOffset: Double?
        let floodTimeOffset: Double?; let ebbTimeOffset: Double?
        let floodSpeedRatio: Double?; let ebbSpeedRatio: Double?
        let hwLagMinutes: Double?; let lwLagMinutes: Double?
        struct Con: Decodable, Sendable { let name: String; let amplitude: Double; let phase: Double }
    }
    private struct File: Decodable { let stations: [StationRecord] }

    private init() {
        guard let url = Bundle.module.url(forResource: "currents", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let cat = try? CurrentCatalog(data: data) else {
            // ponytail: empty catalog if the bundle isn't generated yet — never crash.
            stations = [:]
            return
        }
        stations = cat.stations
    }

    /// Decode a bundle from raw JSON. Internal so tests can exercise the
    /// derived-slack / tide-harmonic decode paths without a bundled resource.
    init(data: Data) throws {
        let decoded = try JSONDecoder().decode(File.self, from: data)
        stations = Dictionary(decoded.stations.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
    }

    private init(records: [String: StationRecord]) { stations = records }

    /// A new catalog with `data`'s records merged in (fragment wins on id clash).
    ///
    /// The committed bundle stays NOAA-only; the CHS reference-tide fit (Point
    /// Atkinson) and the derived gate (Malibu) arrive as a separate on-device
    /// fragment the app generates under its own CHS licence and hands here — so no
    /// CHS-derived data is ever redistributed in the engine's public bundle.
    public func merging(_ data: Data) throws -> CurrentCatalog {
        let decoded = try JSONDecoder().decode(File.self, from: data)
        var merged = stations
        for r in decoded.stations { merged[r.id] = r }
        return CurrentCatalog(records: merged)
    }

    public func ids() -> [String] { Array(stations.keys) }

    private func tideStation(_ r: StationRecord) -> Station {
        Station(constituents: (r.constituents ?? []).map {
            HarmonicConstituent(name: $0.name, amplitude: $0.amplitude, phase: $0.phase)
        }, offset: r.offset ?? 0)
    }

    public func station(_ id: String) -> AnyCurrentStation? {
        guard let r = stations[id] else { return nil }
        // A tide-harmonic record is a reference water-level fit, consumed only by a
        // derived-slack gate — it predicts no current, so it is not queryable here.
        if r.type == "tide-harmonic" { return nil }
        if r.type == "derived-slack" {
            guard let refId = r.reference, let ref = stations[refId] else { return nil }
            return .derivedSlack(DerivedSlackStation(
                reference: tideStation(ref),
                hwLagMinutes: r.hwLagMinutes ?? 0, lwLagMinutes: r.lwLagMinutes ?? 0))
        }
        if r.type == "harmonic" {
            return .harmonic(CurrentStation(
                constituents: (r.constituents ?? []).map { HarmonicConstituent(name: $0.name, amplitude: $0.amplitude, phase: $0.phase) },
                floodDirection: r.floodDirection ?? 0, ebbDirection: r.ebbDirection ?? 0, offset: r.offset ?? 0))
        }
        guard let refId = r.reference, let ref = stations[refId], ref.type == "harmonic" else { return nil }
        let reference = CurrentStation(
            constituents: (ref.constituents ?? []).map { HarmonicConstituent(name: $0.name, amplitude: $0.amplitude, phase: $0.phase) },
            floodDirection: ref.floodDirection ?? 0, ebbDirection: ref.ebbDirection ?? 0, offset: ref.offset ?? 0)
        return .subordinate(SubordinateStation(
            reference: reference,
            slackBeforeFloodOffset: r.slackBeforeFloodOffset ?? 0, slackBeforeEbbOffset: r.slackBeforeEbbOffset ?? 0,
            floodTimeOffset: r.floodTimeOffset ?? 0, ebbTimeOffset: r.ebbTimeOffset ?? 0,
            floodSpeedRatio: r.floodSpeedRatio ?? 1, ebbSpeedRatio: r.ebbSpeedRatio ?? 1,
            floodDirection: r.floodDirection ?? 0, ebbDirection: r.ebbDirection ?? 0))
    }
}
