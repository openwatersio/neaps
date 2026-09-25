// Neaps - MIT. Harmonic least squares, ported from @sailingnaturali/chs-constituents.
// Copyright (c) 2026 Bryan Clark. See swift/LICENSE.
#if canImport(Accelerate)
import Accelerate
import Foundation

public struct HarmonicSample: Sendable {
    public let time: Date
    public let value: Double
    public init(time: Date, value: Double) { self.time = time; self.value = value }
}

public struct HarmonicFit: Sendable {
    public let constituents: [HarmonicConstituent]
    public let offset: Double
    public let rms: Double
    /// Rayleigh warnings are diagnostic; noise-free predictions can resolve these pairs.
    public let unseparable: [UnseparablePair]

    public struct UnseparablePair: Sendable {
        public let constituents: [String]
        public let requiredDays: Double
    }
}

public enum HarmonicFitError: Error, Equatable {
    case invalidSamples
    case unknownConstituent(String)
    case duplicateConstituent(String)
    case rankDeficient
    case solverFailure(Int)
}

/// Fit an offset and a fixed harmonic basis to finite, strictly increasing samples.
/// Values may be heights or signed velocities; fitted amplitudes retain those units.
/// Uses prediction's astronomy with 24-hour nodal corrections at chunk midpoints.
/// No trend or automatic constituent selection is applied.
public func fit(samples: [HarmonicSample], constituents names: [String]) throws -> HarmonicFit {
    let width = 1 + 2 * names.count
    guard samples.count >= max(2, width), samples.count <= Int(Int32.max),
          samples.allSatisfy({ $0.value.isFinite && $0.time.timeIntervalSince1970.isFinite }),
          zip(samples, samples.dropFirst()).allSatisfy({ $0.time < $1.time }) else {
        throw HarmonicFitError.invalidSamples
    }
    let catalog = Catalog.shared
    var seen: Set<String> = []
    for name in names {
        guard catalog.entry(name) != nil else { throw HarmonicFitError.unknownConstituent(name) }
        guard seen.insert(catalog.canonical(name)).inserted else {
            throw HarmonicFitError.duplicateConstituent(name)
        }
    }
    let start = samples[0].time
    let base = astro(start)
    let radians = Double.pi / 180
    let speeds = names.map { catalog.speed($0)! }
    let v0 = names.map { catalog.v0($0, base) * radians }
    let count = samples.count
    let spanHours = samples[count - 1].time.timeIntervalSince(start) / 3600
    var pairs: [HarmonicFit.UnseparablePair] = []
    for i in names.indices {
        for j in names.indices where j > i {
            let hours = 360 / abs(speeds[i] - speeds[j])
            if hours > spanHours {
                pairs.append(.init(constituents: [names[i], names[j]], requiredDays: ceil(hours / 24)))
            }
        }
    }
    pairs.sort { $0.requiredDays > $1.requiredDays }

    // LAPACK consumes column-major storage. One chunk's corrections suffice
    // because samples are ordered, including when there are gaps.
    var matrix = [Double](repeating: 1, count: count * width)
    var previousChunk = -Double.infinity
    var corrections: [(f: Double, u: Double)] = []
    for (row, sample) in samples.enumerated() {
        let hour = sample.time.timeIntervalSince(start) / 3600
        let chunk = floor(hour / 24)
        if chunk != previousChunk {
            let state = astro(start.addingTimeInterval((chunk + 0.5) * 86400))
            corrections = names.map { catalog.correction($0, state) }
            previousChunk = chunk
        }
        for j in names.indices {
            let theta = speeds[j] * radians * hour + v0[j] + corrections[j].u * radians
            matrix[(1 + 2 * j) * count + row] = corrections[j].f * cos(theta)
            matrix[(2 + 2 * j) * count + row] = corrections[j].f * sin(theta)
        }
    }
    var solution = samples.map(\.value)
    var m = __CLPK_integer(count), n = __CLPK_integer(width), nrhs: __CLPK_integer = 1
    var lda = m, ldb = m, info: __CLPK_integer = 0, lwork: __CLPK_integer = -1
    var trans = Int8(78) // N: solve A*x = b.
    var query = 0.0
    dgels_(&trans, &m, &n, &nrhs, &matrix, &lda, &solution, &ldb, &query, &lwork, &info)
    guard info == 0 else { throw HarmonicFitError.solverFailure(Int(info)) }
    lwork = __CLPK_integer(query)
    var workspace = [Double](repeating: 0, count: Int(lwork))
    dgels_(&trans, &m, &n, &nrhs, &matrix, &lda, &solution, &ldb, &workspace, &lwork, &info)
    guard info == 0 else { throw HarmonicFitError.solverFailure(Int(info)) }
    // DGELS only detects exact zero pivots. Reject numerical rank loss too.
    let diagonal = (0..<width).map { abs(matrix[$0 * count + $0]) }
    let threshold = Double.ulpOfOne * Double(count) * (diagonal.max() ?? 0)
    guard diagonal.allSatisfy({ $0 > threshold }), solution.allSatisfy(\.isFinite) else {
        throw HarmonicFitError.rankDeficient
    }
    let fitted = names.indices.map { j in
        let a = solution[1 + 2 * j], b = solution[2 + 2 * j]
        let phase = (atan2(b, a) / radians + 360).truncatingRemainder(dividingBy: 360)
        return HarmonicConstituent(name: names[j], amplitude: hypot(a, b), phase: phase)
    }
    // The trailing entries of Q^T*b hold the least-squares residual norm.
    let rms = sqrt(solution.dropFirst(width).reduce(0) { $0 + $1 * $1 } / Double(count))
    return HarmonicFit(constituents: fitted, offset: solution[0], rms: rms, unseparable: pairs)
}
#endif
