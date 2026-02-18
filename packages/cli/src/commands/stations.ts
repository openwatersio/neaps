import { Command, Option } from "commander";
import { search, stations as allStations, near, type Station } from "@neaps/tide-database";
import getFormat, { type Formats, type StationResult } from "../formatters/index.js";
import { resolveCoordinates } from "../lib/station.js";

export const stations = new Command("stations")
  .description("Search for tide prediction stations")
  .argument("[query]", "search by name, region, country, or ID")
  .option("-n, --near <lat,lon>", "find stations near coordinates")
  .option("--ip", "use IP geolocation to find nearest stations")
  .option("-l, --limit <n>", "maximum number of results", "10")
  .option("-a, --all", "show all matching stations (no limit)")
  .addOption(
    new Option("-f, --format <format>", "output format").choices(["text", "json"]).default("text"),
  )
  .action(async (query: string | undefined, opts) => {
    const limit = opts.all ? Infinity : parseInt(opts.limit, 10);
    let results: StationResult[];

    if (opts.near || opts.ip) {
      const coords = await resolveCoordinates(opts);
      let filter: (s: Station) => boolean = () => true;
      if (query) {
        const matches = new Set(search(query).map((s) => s.id));
        filter = (s) => matches.has(s.id);
      }
      const nearby = near({
        ...coords,
        maxResults: limit === Infinity ? undefined : limit,
        filter,
      });
      results = nearby.map(([station, distance]) => ({ ...station, distance }));
    } else if (query) {
      results = search(query, { maxResults: limit === Infinity ? undefined : limit });
    } else {
      results = limit === Infinity ? allStations : allStations.slice(0, limit);
    }

    if (!results.length) {
      throw new Error("No stations found");
    }

    const formatter = getFormat(opts.format as Formats);
    formatter.listStations(results);
  });
