// TideEngine — MIT. Tidal extremes (high/low) finder.
// Faithful port of @neaps/tide-predictor src/harmonics/extremes.ts findExtremes:
// bracket zeros of h'(t), bisect to sub-second, classify via h''(t), then filter
// spurious extremes by prominence + minimum temporal gap (Hatyan / NOAA practice).
import Foundation

private let toleranceHours = 1.0 / 3600  // 1 second

struct RawExtreme { let hour: Double; let time: Date; let level: Double; let high: Bool }

/// Root of h'(t) in [a, b] where h'(a), h'(b) have opposite signs. Bisection.
private func bisect(_ a0: Double, _ b0: Double, _ fa0: Double, _ params: [PreparedParam]) -> Double {
    var a = a0, b = b0, fa = fa0
    while true {
        let mid = (a + b) / 2
        if b - a < toleranceHours { return mid }
        let fMid = evalHPrime(mid, params)
        if fMid == 0 { return mid }
        if fa > 0 ? fMid > 0 : fMid < 0 { a = mid; fa = fMid } else { b = mid }
    }
}

func findExtremes(fromHour: Double, toHour: Double, provider: ParamProvider,
                  isDoubleTide: Bool, prominenceThreshold: Double) -> [RawExtreme] {
    var params = provider(max(0, fromHour))
    var lastGen = provider.generation
    if params.isEmpty { return [] }

    var maxSpeed = 0.0
    for p in params where p.w > maxSpeed { maxSpeed = p.w }
    if maxSpeed == 0 { return [] }

    let tidalMinW = Double.pi / 15, tidalMaxW = 2 * Double.pi
    var dominantA = 0.0, dominantW = 0.0
    for p in params where p.w >= tidalMinW && p.w <= tidalMaxW && p.A > dominantA { dominantA = p.A; dominantW = p.w }
    if dominantW == 0 { dominantW = maxSpeed }
    let minGapH = isDoubleTide ? 0 : Double.pi / (1.85 * dominantW)
    let bracket = Double.pi / (2 * maxSpeed)

    var results: [RawExtreme] = []
    var tPrev = fromHour
    var dPrev = evalHPrime(tPrev, params)
    var tNext = tPrev + bracket
    while tNext <= toHour + bracket {
        let newParams = provider(tPrev)
        if provider.generation != lastGen { params = newParams; lastGen = provider.generation; dPrev = evalHPrime(tPrev, params) }
        let tBound = min(tNext, toHour)
        let dNext = evalHPrime(tBound, params)
        if dPrev != 0 && dNext != 0 && (dPrev > 0 ? dNext < 0 : dNext > 0) {
            let tRoot = bisect(tPrev, tBound, dPrev, params)
            if tRoot >= fromHour && tRoot <= toHour {
                let isHigh = evalHDoublePrime(tRoot, params) < 0
                results.append(RawExtreme(hour: tRoot,
                                          time: Date(timeIntervalSince1970: provider.startMs / 1000 + tRoot * 3600),
                                          level: evalH(tRoot, params), high: isHigh))
            }
        }
        if tBound >= toHour { break }
        tPrev = tBound
        dPrev = dNext
        tNext += bracket
    }

    return filterExtremes(results, minGapH: minGapH, prominenceThreshold: prominenceThreshold)
}

/// Greedy least-prominent-first removal of spurious extremes (prominence + gap).
private func filterExtremes(_ results: [RawExtreme], minGapH: Double, prominenceThreshold: Double) -> [RawExtreme] {
    let n = results.count
    guard n > 2 else { return results }
    var prv = Array(0..<n).map { $0 - 1 }
    var nxt = Array(0..<n).map { $0 + 1 }

    func evalProm(_ i: Int) -> (prom: Double, offending: Bool) {
        let p = prv[i], nx = nxt[i]
        if p < 0 || nx >= n { return (.infinity, false) }
        let left = abs(results[i].level - results[p].level)
        let right = abs(results[nx].level - results[i].level)
        let prom = min(left, right)
        let prevGapH = (results[i].time.timeIntervalSince1970 - results[p].time.timeIntervalSince1970) / 3600
        let nextGapH = (results[nx].time.timeIntervalSince1970 - results[i].time.timeIntervalSince1970) / 3600
        let tooClose = minGapH > 0 && ((prevGapH < minGapH && results[i].high == results[p].high)
                                    || (nextGapH < minGapH && results[i].high == results[nx].high))
        return (prom, prom < prominenceThreshold || tooClose)
    }
    func findWorst() -> Int {
        var worstIdx = -1, worstProm = Double.infinity
        var i = nxt[0]
        while nxt[i] < n {
            let (prom, offending) = evalProm(i)
            if offending && prom < worstProm { worstProm = prom; worstIdx = i }
            i = nxt[i]
        }
        return worstIdx
    }
    var worst = findWorst()
    while worst != -1 {
        let p = prv[worst], nx = nxt[worst]
        nxt[p] = nx; prv[nx] = p
        worst = findWorst()
    }
    var filtered: [RawExtreme] = []
    var i = 0
    while i < n { filtered.append(results[i]); i = nxt[i] }
    return filtered
}

extension Station {
    /// High/low extremes between `from` and `to`, fully offline.
    public func extremes(from: Date, to: Date) -> [TideExtreme] {
        let raw = computeExtremes(from: from, to: to)
        return raw.map { TideExtreme(time: $0.time, height: $0.level, kind: $0.high ? .high : .low) }
    }

    private func computeExtremes(from: Date, to: Date) -> [RawExtreme] {
        // Same floor/ceil-to-step bounds as makeTimeline, without materializing the samples.
        let step = 600.0
        let startSec = (from.timeIntervalSince1970 / step).rounded(.down) * step
        let endSec = (to.timeIntervalSince1970 / step).rounded(.up) * step
        guard endSec >= startSec else { return [] }
        let endHour = (endSec - startSec) / 3600
        let base = astro(Date(timeIntervalSince1970: startSec))
        let provider = ParamProvider(constituents: constituents, baseAstro: base, catalog: catalog,
                                     startMs: startSec * 1000, endHour: endHour)
        return findExtremes(fromHour: 0, toHour: endHour, provider: provider,
                            isDoubleTide: isDoubleTide, prominenceThreshold: 0.01)
    }
}
