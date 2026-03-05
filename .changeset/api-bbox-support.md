---
"@neaps/api": minor
"neaps": patch
---

Add `bbox` query parameter to `GET /stations` for filtering stations by bounding box. Pass a comma-separated string `minLon,minLat,maxLon,maxLat` to return only stations within that geographic area.

Also allows reserved characters (e.g. commas) in the `query` parameter, enabling searches like `"San Francisco, CA"`.

Bump `@neaps/tide-database` dependency to `0.7`.
