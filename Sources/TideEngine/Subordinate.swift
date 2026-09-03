// TideEngine — MIT. Subordinate tide stations.
import Foundation

/// A subordinate tide station: no constituents of its own. NOAA publishes time
/// corrections and a height correction against a reference station's highs and
/// lows; the curve between two corrected extremes is a half-cosine, which is how
/// NOAA draws it too. Accuracy is a different class from a harmonic station's.
public struct SubordinateTideStation: Sendable {
    public enum HeightOffset: Sendable {
        /// Multiply the reference height above chart datum.
        case ratio(high: Double, low: Double)
        /// Add metres to the reference height.
        case fixed(high: Double, low: Double)
    }

    let reference: Station
    public let highTimeOffset: TimeInterval
    public let lowTimeOffset: TimeInterval
    public let height: HeightOffset

    public init(reference: Station, highTimeOffset: TimeInterval, lowTimeOffset: TimeInterval, height: HeightOffset) {
        self.reference = reference
        self.highTimeOffset = highTimeOffset
        self.lowTimeOffset = lowTimeOffset
        self.height = height
    }

    /// The reference's extremes, time-shifted and height-corrected. Sorted, because
    /// unequal high/low offsets can reorder neighbours.
    public func extremes(from: Date, to: Date) -> [TideExtreme] {
        let pad = max(abs(highTimeOffset), abs(lowTimeOffset)) + 3600
        return reference.extremes(from: from.addingTimeInterval(-pad), to: to.addingTimeInterval(pad))
            .map(correct)
            .filter { $0.time >= from && $0.time <= to }
            .sorted { $0.time < $1.time }
    }

    private func correct(_ e: TideExtreme) -> TideExtreme {
        let isHigh = e.kind == .high
        let time = e.time.addingTimeInterval(isHigh ? highTimeOffset : lowTimeOffset)
        let h: Double
        switch height {
        case .ratio(let high, let low): h = e.height * (isHigh ? high : low)
        case .fixed(let high, let low): h = e.height + (isHigh ? high : low)
        }
        return TideExtreme(time: time, height: h, kind: e.kind)
    }

    /// Height series (metres) on the same floored/ceiled timeline as `Station.heights`.
    public func heights(from: Date, to: Date, step: TimeInterval = 600) -> [TidePoint] {
        curve(from: from, to: to, step: step).map { TidePoint(time: $0.time, height: $0.height) }
    }

    /// dh/dt (metres/hour) on the same timeline as `heights`.
    public func rates(from: Date, to: Date, step: TimeInterval = 600) -> [TideRatePoint] {
        curve(from: from, to: to, step: step).map { TideRatePoint(time: $0.time, rate: $0.rate) }
    }

    /// Half-cosine between each pair of neighbouring corrected extremes:
    /// h(t) = mid + half·cos(π·u), u = (t − t₁)/(t₂ − t₁). Outside the bracketed span
    /// (only if the pad is ever too short) the nearest extreme's height holds flat.
    private func curve(from: Date, to: Date, step: TimeInterval) -> [(time: Date, height: Double, rate: Double)] {
        let pad = 15.0 * 3600  // longer than any gap between neighbouring extremes
        let ex = extremes(from: from.addingTimeInterval(-pad), to: to.addingTimeInterval(pad))
        let items = makeTimeline(from: from, to: to, step: step).items
        guard ex.count >= 2 else { return items.map { ($0, ex.first?.height ?? 0, 0) } }
        var i = 0
        return items.map { t in
            let s = t.timeIntervalSince1970
            while i + 2 < ex.count && ex[i + 1].time.timeIntervalSince1970 <= s { i += 1 }
            let t1 = ex[i].time.timeIntervalSince1970, t2 = ex[i + 1].time.timeIntervalSince1970
            let h1 = ex[i].height, h2 = ex[i + 1].height
            let u = min(1, max(0, (s - t1) / (t2 - t1)))
            let mid = (h1 + h2) / 2, half = (h1 - h2) / 2
            let clamped = s < t1 || s > t2
            return (t, mid + half * cos(.pi * u),
                    clamped ? 0 : -half * .pi / (t2 - t1) * sin(.pi * u) * 3600)
        }
    }
}
