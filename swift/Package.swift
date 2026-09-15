// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "TideEngine",
    platforms: [.macOS(.v13), .iOS(.v16)],
    products: [
        .library(name: "TideEngine", targets: ["TideEngine"])
    ],
    targets: [
        .target(
            name: "TideEngine",
            resources: [.process("Resources/catalog.json")]
        ),
        .testTarget(
            name: "TideEngineTests",
            dependencies: ["TideEngine"],
            resources: [.process("Fixtures")]
        )
    ]
)
