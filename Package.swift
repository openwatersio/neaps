// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "TideEngine",
    platforms: [.macOS(.v13), .iOS(.v16)],
    products: [
        .library(name: "TideEngine", targets: ["TideEngine"]),
        .library(name: "TideEngineCatalog", targets: ["TideEngineCatalog"])
    ],
    targets: [
        .target(
            name: "TideEngine",
            resources: [.process("Resources/catalog.json")]
        ),
        .target(
            name: "TideEngineCatalog",
            dependencies: ["TideEngine"],
            resources: [.process("Resources")]
        ),
        .testTarget(
            name: "TideEngineTests",
            dependencies: ["TideEngine"],
            resources: [.process("Fixtures")]
        ),
        .testTarget(
            name: "TideEngineCatalogTests",
            dependencies: ["TideEngine", "TideEngineCatalog"],
            resources: [.process("Fixtures")]
        )
    ]
)
