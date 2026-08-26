# Final Fix Report — Optional Current Catalog

Base reviewed: `50f8fab`.

## Fixes applied

1. README currents guidance now explicitly tells consumers to add the opt-in `TideEngineCatalog` product to their package target and import it with `TideEngine`.
2. The plan's resource-isolation check now uses the actual SwiftPM resource bundle path: `TideEngine_TideEngineCatalog.bundle/currents.json`.
3. `subordinateBatchMatchesNOAA` now propagates fixture-loading failures rather than silently returning, so a missing or invalid fixture fails the test.

## Verification

Static checks only, per coordinator direction: `git diff --check` passed; targeted searches confirmed the corrected README wording, actual bundle path, and throwing fixture assignment, with no stale `TideEngineCatalog_TideEngineCatalog.bundle` reference. Swift tests were intentionally not run in this worker because this environment can sandbox or hang Swift commands; the coordinator will run them.
