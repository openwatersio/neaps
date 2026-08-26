# Optional Current Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make TideEngine's 1.6 MB NOAA current catalog opt-in so prediction-only clients do not ship it.

**Architecture:** Keep prediction types in `TideEngine`. Move `CurrentCatalog` and its JSON resource into a new `TideEngineCatalog` library target that depends on `TideEngine`; catalog clients import both modules.

**Tech Stack:** Swift 6, Swift Package Manager, Swift Testing

**Spec:** `docs/superpowers/specs/2026-08-25-optional-current-catalog-design.md`

## Global Constraints

- Preserve the existing `TideEngine` product name and prediction API.
- Preserve `CurrentCatalog.shared`, `ids()`, `station(_:)`, and `merging(_:)` behavior in the opt-in module.
- Do not copy `currents.json` or leave a compatibility wrapper in `TideEngine`.
- `catalog.json` remains a `TideEngine` resource.

---

### Task 1: Split the catalog product

**Files:**
- Modify: `Package.swift`
- Move: `Sources/TideEngine/CurrentCatalog.swift` → `Sources/TideEngineCatalog/CurrentCatalog.swift`
- Move: `Sources/TideEngine/Resources/currents.json` → `Sources/TideEngineCatalog/Resources/currents.json`
- Create: `Tests/TideEngineCatalogTests/CurrentCatalogTests.swift`
- Modify: `Tests/TideEngineTests/CurrentsTests.swift`
- Modify: `Tests/TideEngineTests/CurrentsRealWorldTests.swift`
- Modify: `Tests/TideEngineTests/DerivedSlackTests.swift`
- Move: `Tests/TideEngineTests/Fixtures/currents-golden-sub-batch.json` → `Tests/TideEngineCatalogTests/Fixtures/currents-golden-sub-batch.json`

**Interfaces:**
- Consumes: public prediction types from `TideEngine` (`CurrentStation`, `SubordinateStation`, `DerivedSlackStation`, `CurrentEvent`).
- Produces: library product/module `TideEngineCatalog`; unchanged public `CurrentCatalog` API under that module.

- [ ] **Step 1: Add a failing catalog-module test**

Create `Tests/TideEngineCatalogTests/CurrentCatalogTests.swift` with imports for `Foundation`, `Testing`, `TideEngine`, and `@testable import TideEngineCatalog`. Add one test that builds literal JSON containing a harmonic record, constructs `CurrentCatalog(data:)`, and asserts `station("test")` returns `.harmonic` with non-empty events for a fixed one-day interval. The production mutation this catches is removing the catalog decoder or its bridge to TideEngine prediction types.

- [ ] **Step 2: Verify RED**

Run: `swift test`

Expected: FAIL because `TideEngineCatalog` is not a declared module/test target.

- [ ] **Step 3: Add the product and move the implementation**

In `Package.swift`, add `.library(name: "TideEngineCatalog", targets: ["TideEngineCatalog"])`; restrict `TideEngine` resources to `.process("Resources/catalog.json")`; add target `TideEngineCatalog` with dependency `"TideEngine"` and `.process("Resources")`; add test target `TideEngineCatalogTests` depending on both products and processing its own `Fixtures`. Move the two catalog files to that target and add `import TideEngine` to `CurrentCatalog.swift`.

- [ ] **Step 4: Move catalog-only coverage**

Move `currentCatalogLoadsAndPredicts` from `CurrentsTests.swift`, `subordinateBatchMatchesNOAA` plus its private `SubBatch` helper from `CurrentsRealWorldTests.swift`, and `catalogDecodesDerivedSlackAndReferenceTide` plus `mergingAddsChsFragmentWithoutClobberingNoaa` from `DerivedSlackTests.swift` into files under `Tests/TideEngineCatalogTests`. Move `currents-golden-sub-batch.json` with them and copy only the private fixture helpers directly required by `subordinateBatchMatchesNOAA`; keep all prediction-only tests in `TideEngineTests`.

- [ ] **Step 5: Verify GREEN**

Run: `swift test`

Expected: PASS for both `TideEngineTests` and `TideEngineCatalogTests`.

- [ ] **Step 6: Verify resource isolation**

Run: `swift package describe --type json`

Expected: `currents.json` appears only under target `TideEngineCatalog`; `catalog.json` appears only under target `TideEngine`.

Run: `find .build -path '*TideEngine_TideEngine.bundle/currents.json' -o -path '*TideEngineCatalog_TideEngineCatalog.bundle/currents.json'`

Expected: only the `TideEngineCatalog_TideEngineCatalog.bundle/currents.json` path is printed.

- [ ] **Step 7: Commit**

Run: `git add Package.swift Sources/TideEngine Sources/TideEngineCatalog Tests/TideEngineTests Tests/TideEngineCatalogTests && git commit -m "feat: make current catalog opt-in"`

---

### Task 2: Update package documentation and data tooling

**Files:**
- Modify: `README.md`
- Modify: `tools/vendor-currents.sh`
- Modify: `docs/validation/currents-report.md`

**Interfaces:**
- Consumes: `TideEngineCatalog` product from Task 1.
- Produces: correct install/import example and canonical vendoring path `Sources/TideEngineCatalog/Resources/currents.json`.

- [ ] **Step 1: Update the public example**

Document that direct current prediction remains in `TideEngine`, while bundled lookup requires adding/importing `TideEngineCatalog`. Change the catalog example to include `import TideEngineCatalog`; keep direct `CurrentStation` construction under `import TideEngine`.

- [ ] **Step 2: Update canonical paths**

Change `tools/vendor-currents.sh` destination and the validation report's resource path to `Sources/TideEngineCatalog/Resources/currents.json`.

- [ ] **Step 3: Verify docs and tooling**

Run: `swift test`

Expected: PASS.

Run: `rg 'Sources/TideEngine/Resources/currents.json|Resources/currents.json' README.md tools docs/validation`

Expected: no stale TideEngine-target path; README may use the unqualified filename only when describing the data artifact.

- [ ] **Step 4: Commit**

Run: `git add README.md tools/vendor-currents.sh docs/validation/currents-report.md && git commit -m "docs: explain optional current catalog"`

---

### Task 3: Prepare integration without publishing

**Files:**
- No source changes before the engine PR merges and a release is approved.

**Interfaces:**
- Consumes: reviewed engine commits from Tasks 1–2.
- Produces: a clean branch ready for an engine PR; later, a released version for `slackwater-ios`.

- [ ] **Step 1: Verify branch ancestry and full diff**

Run: `git log --oneline origin/main..HEAD && git diff --check origin/main...HEAD`

Expected: only this plan/design and the two implementation commits; no whitespace errors.

- [ ] **Step 2: Run final package verification**

Run: `swift test`

Expected: PASS.

- [ ] **Step 3: Stop before release**

Draft the engine PR title/body and release note for review. Do not publish a release or update `slackwater-ios` until the engine change is merged and the release action is explicitly approved.
