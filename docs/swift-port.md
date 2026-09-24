# Adding a Swift port

Slackwater gains a second implementation. The Swift tide and current engine that powers the [Slackwater](https://slackwater.xyz) iOS app moves into this repository as `swift/`, alongside the TypeScript packages, sharing one fixture corpus and one behavioural contract.

This document tracks the move and describes how the two ports relate.

## Why here

The Swift engine already treats Slackwater as its oracle. Its test suite generates golden fixtures by importing `@slackwater/engine`, and its accuracy contract is written as agreement with this engine to floating point — `1e-6` on astronomy, node corrections and constituent values, with a `maxErr < 1e-6` gate on a 48-hour prediction that fails with the message "engines diverging".

That relationship works, but it runs one direction through a published npm version. The port validates against a release, so a change here is invisible to Swift until someone bumps a pin, and a Swift-side finding has no path back into this suite. Bringing the port in closes the loop: the fixtures generate from workspace source, both suites run in the same CI, and a divergence surfaces in the pull request that causes it.

The engines also cover different ground, and the split is the useful part. Swift has currents — signed major-axis velocity, slack, max flood and max ebb, subordinate reduction against NOAA offsets — validated against NOAA CO-OPS to 9.7 min / 0.055 kn on harmonic stations and 6.1 min / 0.050 kn on subordinates. TypeScript has none of that yet, and #221 is where it gets designed. A validated implementation and its NOAA goldens are a better starting point for that work than a blank file.

## Structure

[Almanac](https://github.com/openwatersio/almanac) already runs this pattern in production, and the layout follows it:

```
Package.swift            root manifest, reaching into swift/ with explicit paths
swift/Sources/SlackwaterKit/     the engine
swift/Tests/SlackwaterKitTests/
fixtures/                one corpus, both suites
fixtures/generate/       generators, each with a --check mode
packages/                unchanged
docs/CONTRACT.md         the shared behavioural contract
```

`Package.swift` sits at the repository root because SwiftPM resolves only a root manifest — it has no subdirectory-package support. The targets carry explicit paths:

```swift
.target(name: "SlackwaterKit", path: "swift/Sources/SlackwaterKit"),
.testTarget(name: "SlackwaterKitTests", dependencies: ["SlackwaterKit"], path: "swift/Tests/SlackwaterKitTests"),
```

Both suites read `fixtures/` directly, with no copying and no test resources: TypeScript resolves it relative to `import.meta.url`, Swift relative to `#filePath`. That one trick is what makes a single corpus serve two languages.

The Swift module is named `SlackwaterKit` — not `Slackwater`, because the iOS app's own module already owns that name and two modules with one name cannot coexist in the same build. The engine arrives from a repository where it was called `TideEngine`, which named nothing in particular; the point of the move is that it carries this project's identity.

## Versions and tags

The ports version independently, and the fixtures are what hold them together.

Changesets owns the npm tags in this repository — `@slackwater/engine@0.11.0`, `slackwater@0.8.0` — and SwiftPM ignores every one of them, because it recognises only bare `X.Y.Z` and `vX.Y.Z`. So the Swift line takes the `vX.Y.Z` namespace, which nothing else uses, starting at **`v1.0.0`**. That sits above the four legacy tags SwiftPM would otherwise see (`0.0.2`, `0.0.3`, `v0.1.0`, `v0.1.1`), none of which carry a manifest.

Almanac asserts that its git tag matches its npm version, because it ships one package. This repository ships five on independent changesets versions, so that assertion has nothing to bind to. Parity is enforced by the fixtures and the contract, not by matching numbers.

A `smoke-swiftpm` job on tag push proves resolution the way Almanac does it: build a scratch consumer package against the public URL at the exact tag. That runs before any consumer cuts over.

Both namespaces are release surfaces, so the `protect-release-tags` ruleset covers `refs/tags/v*` and `refs/tags/*@*` together, blocking deletion and non-fast-forward while leaving tag creation open for changesets and for Swift releases alike.

## What the repository needs first

Four pieces of tooling assume the tree is JavaScript all the way down, and each one fights a `swift/` directory or a JSON corpus:

- **Prettier.** `npm run lint` runs `prettier --check .` over everything but four directories. `.swift` has no parser and is skipped, but a fixture corpus is fully reflowed at `printWidth: 100`, and anything else under `swift/` gets checked. `.prettierignore` needs `swift/` and `fixtures/` before the first commit lands.
- **The root `tsconfig.json`** has neither `include` nor `exclude`, so a bare `tsc` type-checks every `.ts` under the root with `strict` on and no `@types/node` in scope. A generator at `fixtures/generate/` would be pulled in and fail on `fs` and `process`. Excluding `fixtures/` and `swift/` fixes that without constraining package builds that extend the root config.
- **`.gitignore`** is JavaScript-only: no `.build/`, no `.swiftpm/`, no `DerivedData/`. Its `dist` entry is unanchored and matches at any depth, so a generator writing to a `dist` subdirectory would vanish silently.
- **CI.** `ci.yml` is `on: push` with no filters, so a Swift-only commit runs lint, the browser test suite, the NOAA and CHS benchmarks, the examples and a `pkg-pr-new` publish. Adding a Swift job on top of that makes every commit pay for another runner.

On that last point, Almanac's hard-won lesson is worth importing verbatim: skip at the **job** level, never with `on.paths`. A workflow skipped by a path filter never reports its required status checks at all, so the pull request waits forever on a status that can never arrive. A job skipped by an `if` reports `skipped`, which satisfies a required check.

## The contract

`docs/CONTRACT.md` states what both ports owe each other: the time model, the coordinate and datum conventions, a public API table, the cross-port edge cases, and two tolerance tables — physical accuracy against external oracles, and parity between the ports.

It also has to be honest about asymmetry, because there is real asymmetry:

| Area                                                             | TypeScript | Swift |
| ---------------------------------------------------------------- | ---------- | ----- |
| Harmonic prediction, extremes, node corrections                  | yes        | yes   |
| Subordinate tide stations                                        | yes        | yes   |
| Currents (velocity, slack, max flood/ebb, subordinate reduction) | #221       | yes   |
| Extreme ranking against a station's own history                  | —          | yes   |
| Slack derived from a tide reference's lag                        | —          | yes   |

Documented asymmetry beats a contract that claims a parity neither port has. Each row is either a porting task or a deliberate single-port feature, and the table says which.

One datum note that matters more than it looks: the Swift `Station.offset` is a bare additive `Double` supplied by the caller, with no datum machinery in the engine. `@slackwater/engine` has the same shape. The contract should state that rather than leave two implementations quietly agreeing by accident.

## Sequence

- [x] Land the tooling changes above, with no Swift in the tree yet
- [x] Move the engine with `git subtree add --prefix=swift`, so blame survives
- [x] Add the root `Package.swift` and the `swift` CI job
- [x] Hoist the fixture corpus to `fixtures/`, rewire both suites to read it, and point the generators at workspace source instead of published npm
- [x] Write `docs/CONTRACT.md` from the two existing validation reports
- [x] Add `--check` drift gates and the `fixtures` CI job
- [x] Add the `smoke-swiftpm` workflow
- [x] Tag `v1.0.0` and protect `v*`
- [x] Cut the Slackwater app and its `FitValidation` tool over to the new package identity
- [x] Retire the old repository behind a pointer

Porting currents to TypeScript is deliberately not on that list. It is #221's work, it has a design from @joeberkovitz and a phased plan from @bkeepers, and it should start from the Swift implementation's NOAA goldens once those are shared infrastructure. Consolidating the station database is a separate track again.

## What this asks of the repository

Being direct about the cost, since it lands on whoever maintains this:

- A Linux Swift job enters CI, for a language the repository does not currently build.
- `CONTRIBUTING.md` requires 100% coverage. Swift files fall outside the codecov `include` glob, but any TypeScript glue added inside a package to read the corpus is held to it.
- Changesets has no story for a package it cannot publish. The Swift release path is parallel to it, not inside it.
- Every SwiftPM consumer clones the whole monorepo, including the fixture corpus. The Swift engine is 1,223 lines with zero external dependencies, and its fixtures are about 200 KB today, so the weight is small — but it only grows.

The counterweight is that this repository stops being the upstream that a downstream port tracks by hand, and becomes the place where both implementations are proved against the same evidence.
