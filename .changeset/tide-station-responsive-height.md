---
"@neaps/react": patch
---

`<TideStation>` no longer collapses into the tabbed layout based on width alone. Narrow content-sized containers (like phones in portrait) now keep the stacked continuous-scroll view; tabs only appear when an ancestor constrains the height below 500px and the stacked content overflows (e.g. a fixed-size dashboard widget). The tab bar collapses into a dropdown based on height (below 260px) instead of width.
