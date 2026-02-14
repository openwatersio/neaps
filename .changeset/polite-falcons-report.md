---
"@neaps/tide-predictor": minor
---

Export constituents, deprecate default export

```diff
-import tidePredictor from "@neaps/tide-predictor";
+import { createTidePredictor } from "@neaps/tide-predictor";
```
