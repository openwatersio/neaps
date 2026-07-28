---
"neaps": minor
"@neaps/tide-predictor": minor
"@neaps/react": minor
---

Drop the CommonJS builds; all neaps packages are now ESM-only. The CJS entries
can't survive their dependencies going ESM-only, since they load them with
`require()`. CommonJS consumers on Node 20.19+ / 22.12+ can still `require()`
these packages via Node's `require(esm)` support.
