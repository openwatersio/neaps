import { findStation, nearestStation } from "neaps";
import { spinner } from "@clack/prompts";

interface StationOptions {
  station?: string;
  near?: string;
  ip?: boolean;
}

export async function resolveStation(opts: StationOptions) {
  if (opts.station) {
    return findStation(opts.station);
  }

  if (opts.near) {
    const parts = opts.near.split(",").map(Number);
    if (parts.length !== 2 || parts.some(isNaN)) {
      throw new Error(
        `Invalid coordinates: "${opts.near}". Expected "lat,lon" (e.g., "37.8,-122.5")`,
      );
    }
    const [lat, lon] = parts;
    return nearestStation({ latitude: lat, longitude: lon });
  }

  if (opts.ip) {
    const s = spinner();
    s.start("Looking up location from IP address...");
    const res = await fetch("https://reallyfreegeoip.org/json/");
    if (!res.ok) {
      s.stop("Failed");
      throw new Error(`Failed to fetch IP geolocation: ${res.statusText}`);
    }
    const data = (await res.json()) as { latitude: number; longitude: number };
    s.stop(`Location: ${data.latitude}, ${data.longitude}`);
    return nearestStation(data);
  }

  throw new Error("No station specified. Use --station, --near, or --ip.");
}
