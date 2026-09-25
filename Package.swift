// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "slackwater",
    platforms: [.macOS(.v13), .iOS(.v16), .watchOS(.v9)],
    products: [
        .library(name: "SlackwaterKit", targets: ["SlackwaterKit"])
    ],
    targets: [
        .target(
            name: "SlackwaterKit",
            path: "swift/Sources/SlackwaterKit",
            resources: [.process("Resources/catalog.json")]
        ),
        .testTarget(
            name: "SlackwaterKitTests",
            dependencies: ["SlackwaterKit"],
            path: "swift/Tests/SlackwaterKitTests"
        )
    ]
)
