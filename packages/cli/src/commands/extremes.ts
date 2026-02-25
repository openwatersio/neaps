import { Command, Option } from "commander";
import { resolveStation } from "../lib/station.js";
import getFormat, { type Formats } from "../formatters/index.js";

export default new Command("extremes")
  .description("Get tide extremes (high/low tides) for a station")
  .option("-s, --station <id>", "station ID")
  .option("-n, --near <lat,lon>", "find nearest station to coordinates")
  .option("--ip", "use IP geolocation to find nearest station")
  .option("--start <date>", "start date (ISO format, default: now)")
  .option("--end <date>", "end date (ISO format, default: 72h from start)")
  .addOption(
    new Option("-u, --units <units>", "units for water levels")
      .choices(["meters", "feet"])
      .default("meters"),
  )
  .addOption(
    new Option("-f, --format <format>", "output format").choices(["text", "json"]).default("text"),
  )
  .action(async (opts) => {
    const station = await resolveStation(opts);

    const start = opts.start ? new Date(opts.start) : new Date();
    const end = opts.end ? new Date(opts.end) : new Date(start.getTime() + 72 * 60 * 60 * 1000);

    const prediction = station.getExtremesPrediction({
      start,
      end,
      units: opts.units,
    });

    const formatter = getFormat(opts.format as Formats);
    formatter.extremes(prediction);
  });
