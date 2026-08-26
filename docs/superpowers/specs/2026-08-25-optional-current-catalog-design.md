# Optional Current Catalog

## Goal

Stop applications that only use TideEngine's prediction types from shipping the
1.6 MB NOAA `currents.json` catalog, while keeping the bundled offline catalog
available to consumers that want it.

## Package shape

Keep the existing `TideEngine` product and target unchanged except for removing
`CurrentCatalog.swift` and `currents.json`. Add a `TideEngineCatalog` library and
target that depends on `TideEngine` and contains those two files. Catalog users
add the new product and `import TideEngineCatalog`; prediction-only users make no
source change and no longer receive the resource.

This intentionally chooses an opt-in target over deleting `CurrentCatalog.shared`:
the latter is a smaller diff but removes the package's documented offline API.

## Repository updates

Move the catalog implementation and resource rather than copying them. Move the
catalog-specific tests to a `TideEngineCatalogTests` target; leave prediction tests
with `TideEngineTests`. Update the README example and the vendor/validation paths to
the new target. No compatibility wrapper stays in `TideEngine`, because importing
one symbol from the catalog target would pull the resource back into every client.

## Verification and release

Run `swift test`, then build a minimal client that depends only on `TideEngine` and
verify its resource bundle does not contain `currents.json`. Release a new minor
TideEngine version. In `slackwater-ios`, update the resolved dependency, build the
app, and verify `TideEngine_TideEngine.bundle/currents.json` is absent while the
app's own `Slackwater/Resources/currents.json` remains.
