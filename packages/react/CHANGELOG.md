# @neaps/react

## 0.1.1

### Patch Changes

- [#286](https://github.com/openwatersio/neaps/pull/286) [`949d7c3`](https://github.com/openwatersio/neaps/commit/949d7c39f1b78dc84c8c049f030359ea2df5d0f4) Thanks [@bkeepers](https://github.com/bkeepers)! - `<TideStation>` no longer collapses into the tabbed layout based on width alone. Narrow content-sized containers (like phones in portrait) now keep the stacked continuous-scroll view; tabs only appear when an ancestor constrains the height below 500px and the stacked content overflows (e.g. a fixed-size dashboard widget). The tab bar collapses into a dropdown based on height (below 260px) instead of width.

## 0.1.0

### Minor Changes

- [#249](https://github.com/openwatersio/neaps/pull/249) [`4eed5db`](https://github.com/openwatersio/neaps/commit/4eed5dbde3e130d517224b9ede11f2475eb0ada3) Thanks [@bkeepers](https://github.com/bkeepers)! - Initial release of `@neaps/react` — React components and hooks for tide predictions powered by `@neaps/api`, including `<TideStation>`, `<TideGraph>`, `<TideTable>`, `<TideConditions>`, `<StationSearch>`, `<NearbyStations>`, and `<StationsMap>`.
