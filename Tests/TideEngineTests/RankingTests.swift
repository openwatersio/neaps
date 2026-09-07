import Foundation
import Testing
@testable import TideEngine

private struct RankingFixture: Decodable {
    let offset: Double
    let constituents: [C]
    struct C: Decodable { let name: String; let amplitude: Double; let phase: Double }
}

private func extreme(_ hour: Double, _ height: Double, _ kind: ExtremeKind) -> TideExtreme {
    TideExtreme(time: Date(timeIntervalSince1970: hour * 3600), height: height, kind: kind)
}

@Test func rangesPairEveryRiseAndFall() {
    let got = [extreme(0, -1, .low), extreme(6, 3, .high),
               extreme(12, -0.5, .low), extreme(18, 2, .high)].ranges()

    #expect(got.count == 3, "four extremes bracket three ranges, got \(got.count)")
    #expect(got.map(\.isRising) == [true, false, true])
    #expect(got.map(\.height) == [4, 3.5, 2.5])
    // The range is "at" its later turn, whichever kind that is.
    #expect(got.map { $0.time.timeIntervalSince1970 / 3600 } == [6, 12, 18])
}

@Test func rangesNeedTwoExtremesOfOppositeKind() {
    #expect([TideExtreme]().ranges().isEmpty)
    #expect([extreme(0, -1, .low)].ranges().isEmpty)
    // A double low is not a range: the water between two lows never turned.
    #expect([extreme(0, -1, .low), extreme(2, -0.9, .low)].ranges().isEmpty)
    // ...and the surrounding pairs still resolve around it.
    #expect([extreme(0, -1, .low), extreme(2, -0.9, .low), extreme(8, 3, .high)].ranges().count == 1)
}

@Test func percentileRankCountsTiesAsBelow() {
    let values = [1.0, 2, 3, 4]
    #expect(values.percentileRank(of: 0) == 0)      // nothing at or below
    #expect(values.percentileRank(of: 1) == 0.25)   // the minimum still ranks above nothing
    #expect(values.percentileRank(of: 2.5) == 0.5)
    #expect(values.percentileRank(of: 4) == 1)
    #expect(values.percentileRank(of: 99) == 1)
    #expect([Double]().percentileRank(of: 1) == nil)
    // Ties count as below, so a repeated value carries all of its copies.
    #expect([1.0, 1, 1, 4].percentileRank(of: 1) == 0.75)
}

@Test func percentileRoundTripsAtTheBounds() {
    let values = [4.0, 1, 3, 2]  // deliberately unsorted
    #expect(values.percentile(0) == 1)
    #expect(values.percentile(1) == 4)
    #expect(values.percentile(0.5) == 3, "nearest-rank, no interpolation between 2 and 3")
    #expect(values.percentile(-1) == 1, "p clamps low")
    #expect(values.percentile(2) == 4, "p clamps high")
    #expect([Double]().percentile(0.5) == nil)
}

@Test func aYearOfFridayHarborRanksItsOwnLowestLow() throws {
    let fx = try loadFixture("realworld-friday-harbor", as: RankingFixture.self)
    let station = Station(constituents: fx.constituents.map {
        HarmonicConstituent(name: $0.name, amplitude: $0.amplitude, phase: $0.phase)
    }, offset: fx.offset)

    let start = Date(timeIntervalSince1970: 1_767_225_600)  // 2026-01-01Z
    let extremes = station.extremes(from: start, to: start.addingTimeInterval(365 * 86400))
    let lows = extremes.filter { $0.kind == .low }.map(\.height)
    let lowest = try #require(lows.min())

    // The year's lowest low is the only thing at or below itself.
    #expect(lows.percentileRank(of: lowest) == 1 / Double(lows.count))
    // The value I measured off this fixture when the feature was scoped.
    #expect(abs(lowest - -1.132) < 0.01, "lowest low of 2026: \(lowest)")

    // Ranking is monotonic: a lower low never ranks above a higher one.
    let sorted = lows.sorted()
    for (a, b) in zip(sorted, sorted.dropFirst()) {
        #expect(lows.percentileRank(of: a)! <= lows.percentileRank(of: b)!)
    }

    // Every extreme but the last opens a range, minus the same-kind neighbours
    // the double-tide filter leaves behind (16 of them across this year).
    let ranges = extremes.ranges()
    let sameKind = zip(extremes, extremes.dropFirst()).filter { $0.kind == $1.kind }.count
    #expect(ranges.count == extremes.count - 1 - sameKind)
    #expect(ranges.allSatisfy { $0.height > 0 }, "a range is always positive water")

    // The biggest swing of the year is a spring range, well above the median.
    let heights = ranges.map(\.height)
    let biggest = try #require(heights.max())
    #expect(biggest > heights.percentile(0.5)!)
    #expect(heights.percentileRank(of: biggest) == 1)
}
