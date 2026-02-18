import { Command, Option } from "commander";
import { search, stations as allStations, near } from "@neaps/tide-database";
import type { Station } from "@neaps/tide-database";
import getFormat, { type Formats, type StationResult } from "../formatters/index.js";

export const stations = new Command("stations")
  .description("Search for tide prediction stations")
  .argument("[query]", "search by name, region, country, or ID")
  .option("-n, --near <lat,lon>", "find stations near coordinates")
  .option("-l, --limit <n>", "maximum number of results", "10")
  .option("--all", "show all matching stations (no limit)")
  .addOption(
    new Option("-f, --format <format>", "output format").choices(["text", "json"]).default("text"),
  )
  .action(async (query: string | undefined, opts) => {
    const limit = opts.all ? Infinity : parseInt(opts.limit, 10);
    let results: StationResult[];

    if (opts.near && query) {
      // Combine proximity with text search
      const [lat, lon] = opts.near.split(",").map(Number);
      const q = query.toLowerCase();
      const nearby = near({
        latitude: lat,
        longitude: lon,
        maxResults: limit === Infinity ? undefined : limit,
        filter: (s: Station) =>
          s.name.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          (s.region ?? "").toLowerCase().includes(q) ||
          s.country.toLowerCase().includes(q),
      });
      results = nearby.map(([station, distance]) => ({ ...station, distance }));
    } else if (opts.near) {
      // Proximity only
      const [lat, lon] = opts.near.split(",").map(Number);
      const nearby = near({
        latitude: lat,
        longitude: lon,
        maxResults: limit === Infinity ? undefined : limit,
      });
      results = nearby.map(([station, distance]) => ({ ...station, distance }));
    } else if (query) {
      // Text search using tide-database's fuzzy search
      results = search(query, { maxResults: limit === Infinity ? undefined : limit });
    } else {
      // List all stations (with limit)
      results = limit === Infinity ? allStations : allStations.slice(0, limit);
    }

    if (!results.length) {
      throw new Error("No stations found");
    }

    const formatter = getFormat(opts.format as Formats);
    formatter.listStations(results);
  });
