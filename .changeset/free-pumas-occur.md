---
"@neaps/tide-predictor": minor
"neaps": minor
---

Moved `useStation` into @neaps/tide-predictor so it can be used without the heavy dependency of @neaps/tide-database.

Subordinate stations now use the `datums` and `harmonic_constituents` included in @neaps/tide-database 0.8 instead of resolving them from the reference station at prediction time.
