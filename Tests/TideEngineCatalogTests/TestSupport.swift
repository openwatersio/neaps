import Foundation

func loadFixture<T: Decodable>(_ name: String, as: T.Type) throws -> T {
    let url = Bundle.module.url(forResource: name, withExtension: "json")!
    return try JSONDecoder().decode(T.self, from: Data(contentsOf: url))
}

func parseISO(_ string: String) -> Date {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime]
    return formatter.date(from: string)!
}
