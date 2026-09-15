import Foundation

func loadFixture<T: Decodable>(_ name: String, as: T.Type) throws -> T {
    let url = Bundle.module.url(forResource: name, withExtension: "json")!
    return try JSONDecoder().decode(T.self, from: Data(contentsOf: url))
}

func parseISO(_ s: String) -> Date {
    let withFrac = ISO8601DateFormatter()
    withFrac.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let d = withFrac.date(from: s) { return d }
    let plain = ISO8601DateFormatter()
    plain.formatOptions = [.withInternetDateTime]
    return plain.date(from: s)!
}

/// Circular degree difference — avoids false failures at the 0/360 wrap.
func angularDiff(_ a: Double, _ b: Double) -> Double {
    let d = abs(a - b).truncatingRemainder(dividingBy: 360)
    return min(d, 360 - d)
}
