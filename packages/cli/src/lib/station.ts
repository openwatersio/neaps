import { findStation, nearestStation } from "neaps";

interface StationOptions {
  station?: string;
  near?: string;
  ip?: boolean;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Resolve coordinates from --near or --ip options.
 */
export async function resolveCoordinates(opts: {
  near?: string;
  ip?: boolean;
}): Promise<Coordinates> {
  if (opts.near) {
    const parts = opts.near.split(",").map(Number);
    if (parts.length !== 2 || parts.some(isNaN)) {
      throw new Error(
        `Invalid coordinates: "${opts.near}". Expected "lat,lon" (e.g., "37.8,-122.5")`,
      );
    }
    return { latitude: parts[0], longitude: parts[1] };
  }

  if (opts.ip) {
    const res = await fetch("https://reallyfreegeoip.org/json/");
    if (!res.ok) {
      throw new Error(`Failed to fetch IP geolocation: ${res.statusText}`);
    }
    const data = (await res.json()) as { latitude: number; longitude: number };
    return data;
  }

  throw new Error("No location specified. Use --near or --ip.");
}

export async function resolveStation(opts: StationOptions) {
  if (opts.station) {
    return findStation(opts.station);
  }

  if (!opts.near && !opts.ip) {
    throw new Error("No station specified. Use --station, --near, or --ip.");
  }

  const coords = await resolveCoordinates(opts);
  return nearestStation(coords);
}
