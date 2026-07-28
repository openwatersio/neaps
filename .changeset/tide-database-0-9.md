---
"neaps": minor
"@neaps/cli": minor
---

Update @neaps/tide-database to 0.9. Station prediction data now lives in an
off-heap pack file read per station instead of being parsed into the JS heap
at import, dropping baseline heap usage from ~118 MB to ~36 MB.
