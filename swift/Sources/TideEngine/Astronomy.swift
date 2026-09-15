// TideEngine — MIT. Astronomical fundamentals.
// Faithful port of @neaps/tide-predictor astronomy (src/astronomy/*).
// Mean longitudes and derived node angles in degrees; Neaps is the golden oracle.
import Foundation

private let d2r = Double.pi / 180
private let r2d = 180 / Double.pi

private func sexagesimal(_ deg: Double, _ arcmin: Double = 0, _ arcsec: Double = 0) -> Double {
    deg + arcmin / 60 + arcsec / 3600
}

private enum Coeff {
    // Obliquity coefficients are each scaled by 0.01^index (Neaps coefficients.ts).
    static let terrestrialObliquity: [Double] = [
        sexagesimal(23, 26, 21.448), -sexagesimal(0, 0, 4680.93), -sexagesimal(0, 0, 1.55),
        sexagesimal(0, 0, 1999.25), -sexagesimal(0, 0, 51.38), -sexagesimal(0, 0, 249.67),
        -sexagesimal(0, 0, 39.05), sexagesimal(0, 0, 7.12), sexagesimal(0, 0, 27.87),
        sexagesimal(0, 0, 5.79), sexagesimal(0, 0, 2.45),
    ].enumerated().map { $0.element * pow(0.01, Double($0.offset)) }
    static let solarPerigee: [Double] = [-77.06265000000002, 1.7190199999968172, 4591e-7, 48e-8]
    static let solarLongitude: [Double] = [280.46645, 36000.76983, 3032e-7]
    static let lunarInclination: [Double] = [5.145]
    static let lunarLongitude: [Double] = [218.3164591, 481267.88134236, -0.0013268, 1.0 / 538841 - 1.0 / 65194e3]
    static let lunarNode: [Double] = [125.044555, -1934.1361849, 0.0020762, 1.0 / 467410, -1.0 / 60616e3]
    static let lunarPerigee: [Double] = [83.353243, 4069.0137111, -0.0103238, -1.0 / 80053, 1.0 / 18999e3]
}

private func polynomial(_ c: [Double], _ x: Double) -> Double {
    c.enumerated().reduce(0) { $0 + $1.element * pow(x, Double($1.offset)) }
}
private func modulus(_ a: Double, _ b: Double) -> Double { (a.truncatingRemainder(dividingBy: b) + b).truncatingRemainder(dividingBy: b) }

/// Julian Date from a UTC instant (Neaps JD()).
private func julianDate(_ date: Date) -> Double {
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = TimeZone(identifier: "UTC")!
    let c = cal.dateComponents([.year, .month, .day, .hour, .minute, .second, .nanosecond], from: date)
    var Y = Double(c.year!)
    var M = Double(c.month!)
    let D = Double(c.day!) + Double(c.hour!) / 24 + Double(c.minute!) / 1440
        + Double(c.second!) / (1440 * 60) + Double(c.nanosecond!) / 1e9 / (1440 * 60)
    if M <= 2 { Y -= 1; M += 12 }
    let A = (Y / 100).rounded(.down)
    let B = 2 - A + (A / 4).rounded(.down)
    return (365.25 * (Y + 4716)).rounded(.down) + (30.6001 * (M + 1)).rounded(.down) + D + B - 1524.5
}
private func T(_ date: Date) -> Double { (julianDate(date) - 2451545) / 36525 }

private func _I(_ N: Double, _ i: Double, _ omega: Double) -> Double {
    let n = d2r * N, ii = d2r * i, om = d2r * omega
    let cosI = cos(ii) * cos(om) - sin(ii) * sin(om) * cos(n)
    return r2d * acos(cosI)
}
private func eterms(_ N: Double, _ i: Double, _ omega: Double) -> (Double, Double) {
    let n = d2r * N, ii = d2r * i, om = d2r * omega
    var e1 = cos(0.5 * (om - ii)) / cos(0.5 * (om + ii)) * tan(0.5 * n)
    var e2 = sin(0.5 * (om - ii)) / sin(0.5 * (om + ii)) * tan(0.5 * n)
    e1 = atan(e1) - 0.5 * n
    e2 = atan(e2) - 0.5 * n
    return (e1, e2)
}
private func _xi(_ N: Double, _ i: Double, _ omega: Double) -> Double { let (e1, e2) = eterms(N, i, omega); return -(e1 + e2) * r2d }
private func _nu(_ N: Double, _ i: Double, _ omega: Double) -> Double { let (e1, e2) = eterms(N, i, omega); return (e1 - e2) * r2d }
private func _nup(_ N: Double, _ i: Double, _ omega: Double) -> Double {
    let I = d2r * _I(N, i, omega), nu = d2r * _nu(N, i, omega)
    return r2d * atan(sin(2 * I) * sin(nu) / (sin(2 * I) * cos(nu) + 0.3347))
}
private func _nupp(_ N: Double, _ i: Double, _ omega: Double) -> Double {
    let I = d2r * _I(N, i, omega), nu = d2r * _nu(N, i, omega)
    let tan2 = pow(sin(I), 2) * sin(2 * nu) / (pow(sin(I), 2) * cos(2 * nu) + 0.0727)
    return r2d * 0.5 * atan(tan2)
}

/// Astronomical state at an instant. Fields match Neaps `astro()` keys (degrees).
struct Astro {
    let s, h, p, N, pp, ninety, omega, i: Double
    let I, xi, nu, nup, nupp: Double
    let ThMinusS, P: Double

    /// Neaps-key → value map (for golden comparison against the reference).
    var all: [String: Double] {
        ["s": s, "h": h, "p": p, "N": N, "pp": pp, "90": ninety, "omega": omega, "i": i,
         "I": I, "xi": xi, "nu": nu, "nup": nup, "nupp": nupp, "T+h-s": ThMinusS, "P": P]
    }
}

/// Compute the astronomical state at a UTC instant (Neaps `astro()`).
func astro(_ date: Date) -> Astro {
    let t = T(date)
    let polys: [(String, [Double])] = [
        ("s", Coeff.lunarLongitude), ("h", Coeff.solarLongitude), ("p", Coeff.lunarPerigee),
        ("N", Coeff.lunarNode), ("pp", Coeff.solarPerigee), ("90", [90]),
        ("omega", Coeff.terrestrialObliquity), ("i", Coeff.lunarInclination),
    ]
    var value: [String: Double] = [:]
    for (name, c) in polys {
        value[name] = modulus(polynomial(c, t), 360)
    }
    let N = value["N"]!, i = value["i"]!, omega = value["omega"]!
    let Ival = modulus(_I(N, i, omega), 360)
    let xi = modulus(_xi(N, i, omega), 360)
    let nu = modulus(_nu(N, i, omega), 360)
    let nup = modulus(_nup(N, i, omega), 360)
    let nupp = modulus(_nupp(N, i, omega), 360)
    let jd = julianDate(date)
    let hourValue = (jd - jd.rounded(.down)) * 360
    let ThMinusS = hourValue + value["h"]! - value["s"]!
    let P = value["p"]! - xi.truncatingRemainder(dividingBy: 360)

    return Astro(
        s: value["s"]!, h: value["h"]!, p: value["p"]!, N: N, pp: value["pp"]!,
        ninety: value["90"]!, omega: omega, i: i,
        I: Ival, xi: xi, nu: nu, nup: nup, nupp: nupp,
        ThMinusS: ThMinusS, P: P
    )
}
