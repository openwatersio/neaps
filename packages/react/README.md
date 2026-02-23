# @neaps/react

React components for tide predictions powered by [Neaps](https://openwaters.io/tides/neaps).

## Installation

```sh
npm install @neaps/react
```

Peer dependencies:

```sh
npm install react react-dom
# Optional — needed for <StationsMap>
npm install maplibre-gl react-map-gl
```

## Quick Start

Wrap your app with `<NeapsProvider>` and point it at a running [`@neaps/api`](../api) instance:

```tsx
import { NeapsProvider, TideStation } from "@neaps/react";
import "@neaps/react/styles.css";

function App() {
  return (
    <NeapsProvider baseUrl="https://api.example.com">
      <TideStation id="noaa/8443970" />
    </NeapsProvider>
  );
}
```

## Components

## Provider

`<NeapsProvider>` configures the API base URL, default units, and datum for all child components.

```tsx
<NeapsProvider baseUrl="https://api.example.com" units="feet" datum="MLLW">
  {children}
</NeapsProvider>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `baseUrl` | `string` | — | API server URL |
| `units` | `"meters" \| "feet"` | `"meters"` | Display units |
| `datum` | `string` | chart datum | Vertical datum (e.g. `"MLLW"`) |
| `queryClient` | `QueryClient` | auto-created | Custom TanStack Query client |

### `<TideStation>`

All-in-one display for a single station — name, graph, and table.

```tsx
<TideStation id="noaa/8443970" />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | — | Station ID (e.g. `"noaa/8443970"`) |
| `showGraph` | `boolean` | `true` | Show tide graph |
| `showTable` | `boolean` | `true` | Show extremes table |
| `timeRange` | `TimeRange \| { start, end }` | `"24h"` | Time window |

### `<TideConditions>`

Current water level, rising/falling indicator, and next extreme. Used internally by `<TideStation>` but also available standalone.

```tsx
<TideConditions timeline={timeline} extremes={extremes} units="meters" />
```

### `<TideGraph>`

Tide level chart. Pass data directly or fetch by station ID.

```tsx
// Fetch mode
<TideGraph id="noaa/8443970" />

// Data mode
<TideGraph timeline={data} timezone="America/New_York" units="feet" />
```

### `<TideTable>`

High/low tide extremes in a table. Pass data directly or fetch by station ID.

```tsx
<TideTable id="noaa/8443970" days={3} />
```

### `<StationSearch>`

Autocomplete search input for finding stations.

```tsx
<StationSearch onSelect={(station) => console.log(station)} />
```

### `<NearbyStations>`

List of stations near a given station or coordinates.

```tsx
<NearbyStations stationId="noaa/8443970" maxResults={5} />
<NearbyStations latitude={42.35} longitude={-71.05} />
```

### `<StationsMap>`

Interactive map showing tide stations within the visible viewport. Requires `maplibre-gl` and `react-map-gl`. Stations are fetched by bounding box as the user pans and zooms.

```tsx
<StationsMap
  mapStyle="https://tiles.example.com/style.json"
  onStationSelect={(station) => console.log(station)}
/>
```

## Hooks

All hooks must be used within a `<NeapsProvider>`.

- `useStation(id)` — fetch a single station
- `useStations({ query?, bbox?, latitude?, longitude? })` — search/list stations (supports bounding box as `[[minLon, minLat], [maxLon, maxLat]]`)
- `useExtremes({ id, start?, end?, days? })` — fetch high/low extremes
- `useTimeline({ id, start?, end? })` — fetch tide level timeline
- `useNearbyStations({ stationId } | { latitude, longitude })` — fetch nearby stations

## Styling

Components are styled with [Tailwind CSS v4](https://tailwindcss.com) and CSS custom properties for theming.

### With Tailwind

Add `@neaps/react` to your Tailwind content paths so its classes are included in your build:

```css
/* app.css */
@import "tailwindcss";
@source "../node_modules/@neaps/react/dist";
```

Import the theme variables:

```css
@import "@neaps/react/styles.css";
```

### Without Tailwind

Import the pre-built stylesheet which includes all resolved Tailwind utilities:

```tsx
import "@neaps/react/styles.css";
```

### Theme Variables

Override CSS custom properties to match your brand:

```css
:root {
  --neaps-primary: #2563eb;
  --neaps-high: #3b82f6;    /* High tide color */
  --neaps-low: #f59e0b;     /* Low tide color */
  --neaps-bg: #ffffff;
  --neaps-bg-subtle: #f8fafc;
  --neaps-text: #0f172a;
  --neaps-text-muted: #64748b;
  --neaps-border: #e2e8f0;
}
```

### Dark Mode

Dark mode activates when a parent element has the `dark` class or the user's system preference is `prefers-color-scheme: dark`. Override dark mode colors:

```css
.dark {
  --neaps-primary: #60a5fa;
  --neaps-bg: #0f172a;
  --neaps-text: #f1f5f9;
  /* ... */
}
```

## License

MIT
