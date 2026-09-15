// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "Neaps",
    platforms: [.macOS(.v13), .iOS(.v16)],
    products: [
        .library(name: "Neaps", targets: ["Neaps"])
    ],
    targets: [
        .target(
            name: "Neaps",
            path: "swift/Sources/Neaps",
            resources: [.process("Resources/catalog.json")]
        ),
        .testTarget(
            name: "NeapsTests",
            dependencies: ["Neaps"],
            path: "swift/Tests/NeapsTests"
        )
    ]
)
