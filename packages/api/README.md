# @neaps/api

HTTP JSON API for tide predictions using NOAA harmonic constituents.

## Installation

```bash
npm install @neaps/api express
```

## Usage

### As an Express middleware

```typescript
import { createApp } from "@neaps/api";
import express from "express";

const app = express();
app.use("/api", createApp());

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
```

### As a standalone server

```typescript
import { startServer } from "@neaps/api";

startServer(3000);
```

## API Endpoints

### GET /extremes

Get high and low tide predictions for the nearest station to given coordinates.

**Query Parameters:**

- `lat` or `latitude` (required): Latitude (-90 to 90)
- `lon`, `lng`, or `longitude` (required): Longitude (-180 to 180)
- `start` (required): Start date/time in ISO 8601 format
- `end` (required): End date/time in ISO 8601 format
- `datum` (optional): Vertical datum (MLLW, MLW, MTL, MSL, MHW, MHHW)
- `units` (optional): Units for water levels (meters or feet, defaults to meters)

**Example:**

```bash
curl "http://localhost:3000/extremes?lat=26.772&lon=-80.05&start=2025-12-17T00:00:00Z&end=2025-12-18T00:00:00Z&datum=MLLW&units=feet"
```

### GET /timeline

Get water level predictions at regular intervals for the nearest station.

**Query Parameters:** Same as `/extremes`

**Example:**

```bash
curl "http://localhost:3000/timeline?lat=26.772&lon=-80.05&start=2025-12-17T00:00:00Z&end=2025-12-18T00:00:00Z"
```

### GET /stations

Find stations by ID or near a location.

**Query Parameters:**

- `id` (optional): Station ID or source ID
- `lat` or `latitude` (optional): Latitude for proximity search
- `lon`, `lng`, or `longitude` (optional): Longitude for proximity search
- `limit` (optional): Maximum number of stations to return (1-100, defaults to 10)

**Examples:**

```bash
# Find a specific station
curl "http://localhost:3000/stations?id=noaa/8722588"

# Find stations near coordinates
curl "http://localhost:3000/stations?lat=26.772&lon=-80.05&limit=5"
```

### GET /stations/:id/extremes

Get extremes prediction for a specific station.

**Path Parameters:**

- `id` (required): Station ID (URL-encoded if contains special characters)

**Query Parameters:**

- `start` (required): Start date/time in ISO 8601 format
- `end` (required): End date/time in ISO 8601 format
- `datum` (optional): Vertical datum
- `units` (optional): Units for water levels

**Example:**

```bash
curl "http://localhost:3000/stations/noaa%2F8722588/extremes?start=2025-12-17T00:00:00Z&end=2025-12-18T00:00:00Z"
```

### GET /stations/:id/timeline

Get timeline prediction for a specific station.

**Parameters:** Same as `/stations/:id/extremes`

**Note:** Timeline predictions are not supported for subordinate stations.

### GET /openapi.json

Get the OpenAPI 3.0 specification for this API.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npx vitest

# Run tests with coverage
npx vitest run --coverage
```

## License

MIT
