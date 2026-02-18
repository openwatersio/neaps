import { Command, Option } from "commander";
import { spinner } from "@clack/prompts";
import { resolveStation } from "../lib/station.js";
import getFormat, { type Formats } from "../formatters/index.js";

export const timeline = new Command("timeline")
  .description("Get a tide level timeline for a station")
  .option("-s, --station <id>", "station ID")
  .option("-n, --near <lat,lon>", "find nearest station to coordinates")
  .option("--ip", "use IP geolocation to find nearest station")
  .option("--start <date>", "start date (ISO format, default: now)")
  .option("--end <date>", "end date (default: 24h from start)")
  .addOption(
    new Option("-u, --units <units>", "units for water levels")
      .choices(["meters", "feet"])
      .default("meters"),
  )
  .option("--interval <minutes>", "minutes between data points", "60")
  .addOption(
    new Option("-f, --format <format>", "output format").choices(["text", "json"]).default("text"),
  )
  .action(async (opts) => {
    const isJson = opts.format === "json";
    const station = await resolveStation(opts);

    const start = opts.start ? new Date(opts.start) : new Date();
    const end = opts.end ? new Date(opts.end) : new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const timeFidelity = parseInt(opts.interval, 10) * 60;

    const s = isJson ? null : spinner();
    s?.start("Calculating tide timeline...");

    try {
      const prediction = station.getTimelinePrediction({
        start,
        end,
        units: opts.units,
        timeFidelity,
      });

      s?.stop("Done");

      const formatter = getFormat(opts.format as Formats);
      formatter.timeline(prediction);
    } catch (err) {
      s?.stop("Failed");
      if (err instanceof Error && err.message.includes("subordinate")) {
        throw new Error(
          `Timeline predictions are not supported for subordinate stations. Try using the reference station instead.`,
          { cause: err },
        );
      }
      throw err;
    }
  });
