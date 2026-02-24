---
"@neaps/api": minor
---

Add configurable route prefix support to `createApp()`.

Routes are now defined without a prefix (e.g. `/extremes`, `/stations`) and mounted at a configurable `prefix` option (defaults to `/tides` for backward compatibility). Also adds a root `/` endpoint returning API info, and the OpenAPI spec now includes a `servers` field reflecting the configured prefix.
