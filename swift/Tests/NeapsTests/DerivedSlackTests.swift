import Foundation
import Testing
@testable import Neaps

// A derived-slack gate (Malibu Rapids) has NO current station of its own. Slack
// is the reference port's high/low water shifted by a fixed lag; the pass floods
// on the rising tide and ebbs on the falling one. We can state slack TIMES and a
// flood/ebb PHASE honestly, but never a speed — CHS predicts no current there.
//
// Mirrors slackwater-web/src/chs/current.ts (deriveCurrentState / schematicSignedAt
// / derivedNowFields). Oracle is the reference tide's own extremes: the derived
// slacks MUST equal those extremes shifted by the lags.

// A realistic mixed semidiurnal reference tide (Point-Atkinson-like set).
private func referenceTide() -> Station {
    Station(constituents: [
        HarmonicConstituent(name: "M2", amplitude: 0.95, phase: 40),
        HarmonicConstituent(name: "S2", amplitude: 0.26, phase: 70),
        HarmonicConstituent(name: "K1", amplitude: 0.85, phase: 250),
        HarmonicConstituent(name: "O1", amplitude: 0.48, phase: 230),
    ], offset: 3.0)
}

@Test func derivedSlacksAreReferenceExtremesShiftedByLag() throws {
    let ref = referenceTide()
    let hwLag = 25.0, lwLag = 35.0
    let gate = DerivedSlackStation(reference: ref, hwLagMinutes: hwLag, lwLagMinutes: lwLag)

    let from = parseISO("2026-03-10T00:00:00Z")
    let to = parseISO("2026-03-13T00:00:00Z")

    let slacks = gate.slacks(from: from, to: to)
    #expect(!slacks.isEmpty, "a 3-day window should hold several derived slacks")

    // Every derived slack must sit exactly one lag after a reference extreme of the
    // matching kind (HW→hwLag, LW→lwLag), and carry the right highWater flag.
    let refExtremes = ref.extremes(from: from.addingTimeInterval(-6 * 3600),
                                   to: to.addingTimeInterval(6 * 3600))
    for s in slacks {
        let lag = (s.highWater ? hwLag : lwLag) * 60
        let origin = s.time.addingTimeInterval(-lag)
        let match = try #require(refExtremes.min {
            abs($0.time.timeIntervalSince1970 - origin.timeIntervalSince1970)
                < abs($1.time.timeIntervalSince1970 - origin.timeIntervalSince1970)
        })
        #expect(abs(match.time.timeIntervalSince1970 - origin.timeIntervalSince1970) < 1,
                "derived slack does not sit exactly one lag after a reference extreme")
        #expect((match.kind == .high) == s.highWater, "highWater flag disagrees with the reference extreme kind")
    }
}

@Test func negativeLagCanShiftAnExtremeIntoTheRequestedWindow() throws {
    let ref = referenceTide()
    let lag = -120.0
    let gate = DerivedSlackStation(reference: ref, hwLagMinutes: lag, lwLagMinutes: lag)
    let origin = try #require(ref.extremes(
        from: parseISO("2026-03-10T00:00:00Z"),
        to: parseISO("2026-03-11T00:00:00Z")
    ).first)
    let expected = origin.time.addingTimeInterval(lag * 60)

    let slacks = gate.slacks(
        from: expected.addingTimeInterval(-1),
        to: expected.addingTimeInterval(1)
    )

    #expect(slacks.count == 1)
    let slack = try #require(slacks.first)
    #expect(abs(slack.time.timeIntervalSince(expected)) < 1)
}

@Test func schematicShapeIsSignedHalfSineNeverKnots() throws {
    let ref = referenceTide()
    let gate = DerivedSlackStation(reference: ref, hwLagMinutes: 25, lwLagMinutes: 35)
    let from = parseISO("2026-03-10T00:00:00Z")
    let to = parseISO("2026-03-12T00:00:00Z")
    let slacks = gate.slacks(from: from.addingTimeInterval(-6 * 3600), to: to.addingTimeInterval(6 * 3600))
    #expect(slacks.count >= 3)

    // Normalised to [-1, 1] everywhere.
    for t in stride(from: from.timeIntervalSince1970, to: to.timeIntervalSince1970, by: 600) {
        let v = gate.schematicSigned(at: Date(timeIntervalSince1970: t), slacks: slacks)
        #expect(v >= -1.0001 && v <= 1.0001, "schematic \(v) escaped [-1,1]")
    }
    // At a slack the shape is ~0.
    #expect(abs(gate.schematicSigned(at: slacks[1].time, slacks: slacks)) < 1e-6)
    // Mid-way between two slacks it peaks at ±1, positive after an LW slack (flood),
    // negative after an HW slack (ebb).
    let a = slacks[0], b = slacks[1]
    let mid = Date(timeIntervalSince1970: (a.time.timeIntervalSince1970 + b.time.timeIntervalSince1970) / 2)
    let v = gate.schematicSigned(at: mid, slacks: slacks)
    #expect(abs(abs(v) - 1) < 1e-6, "midpoint should peak at ±1, got \(v)")
    #expect(a.highWater ? v < 0 : v > 0, "sign should be ebb(−) after HW slack, flood(+) after LW slack")
    // Zero outside the covered range.
    #expect(gate.schematicSigned(at: slacks.first!.time.addingTimeInterval(-3600), slacks: slacks) == 0)
    #expect(gate.schematicSigned(at: slacks.last!.time.addingTimeInterval(3600), slacks: slacks) == 0)
}

@Test func phaseFollowsTheTideTrendWithNoSpeed() throws {
    let ref = referenceTide()
    let gate = DerivedSlackStation(reference: ref, hwLagMinutes: 25, lwLagMinutes: 35)
    let day = parseISO("2026-03-11T00:00:00Z")
    let slacks = gate.slacks(from: day.addingTimeInterval(-18 * 3600), to: day.addingTimeInterval(30 * 3600))
    #expect(slacks.count >= 3)

    // The tide moves toward the NEXT slack's water level: heading to a high water
    // ⇒ flooding, to a low water ⇒ ebbing. (Keying off the *next* slack, not the
    // previous, is what stays correct across the diurnal transitions where the
    // extremes finder yields two same-kind slacks in a row — no strict HW/LW
    // alternation. Mirrors current.ts derivedNowFields `rising = nextSlack.highWater`.)
    for i in 0..<(slacks.count - 1) {
        let a = slacks[i], b = slacks[i + 1]
        let mid = Date(timeIntervalSince1970: (a.time.timeIntervalSince1970 + b.time.timeIntervalSince1970) / 2)
        #expect(gate.phase(at: mid, slacks: slacks) == (b.highWater ? .flood : .ebb),
                "phase heading toward a \(b.highWater ? "HW" : "LW") slack should be \(b.highWater ? "flood" : "ebb")")
    }
    // Right at a slack it reads slack.
    #expect(gate.phase(at: slacks[1].time, slacks: slacks) == .slack)
}
