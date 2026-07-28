---
"neaps": minor
---

Drop the CommonJS build; neaps is now ESM-only. The CJS entry can't survive
its dependencies going ESM-only, since it loads them with `require()`. CommonJS
consumers on Node 20.19+ / 22.12+ can still `require("neaps")` via Node's
`require(esm)` support.
