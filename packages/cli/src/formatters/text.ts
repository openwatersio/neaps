import chalk from "chalk";
import Table from "cli-table3";
import type { Formatter, StationResult } from "./index.js";

export default function text(): Formatter {
  return {
    extremes(prediction) {
      const { station, datum, units, extremes } = prediction;
      const unit = units === "meters" ? "m" : "ft";
      const tz = station.timezone;

      console.log(chalk.bold(station.name));
      console.log(chalk.dim(`${datum}  ·  ${units}`));
      console.log();

      const table = new Table({
        head: ["Date", "Time", "Type", "Level"],
        style: { head: [], border: [] },
      });

      let lastDate = "";
      for (const e of extremes) {
        const date = formatDate(e.time, tz);
        const tag = e.high ? chalk.green("High") : chalk.blue("Low");
        table.push([
          date !== lastDate ? date : "",
          formatTime(e.time, tz),
          tag,
          { content: `${e.level.toFixed(2)} ${unit}`, hAlign: "right" },
        ]);
        lastDate = date;
      }

      console.log(table.toString());
    },

    timeline(prediction) {
      const { station, datum, units, timeline } = prediction;
      const unit = units === "meters" ? "m" : "ft";
      const tz = station.timezone;

      console.log(chalk.bold(station.name));
      console.log(chalk.dim(`${datum}  ·  ${units}`));
      console.log();

      const table = new Table({
        head: ["Date", "Time", "Level"],
        style: { head: [], border: [] },
      });

      let lastDate = "";
      for (const point of timeline) {
        const date = formatDate(point.time, tz);
        table.push([
          date !== lastDate ? date : "",
          formatTime(point.time, tz),
          { content: `${point.level.toFixed(2)} ${unit}`, hAlign: "right" },
        ]);
        lastDate = date;
      }

      console.log(table.toString());
    },

    listStations(stations: StationResult[]) {
      const hasDistance = stations.some((s) => s.distance != null);

      const head = hasDistance
        ? ["ID", "Name", "Region", "Distance"]
        : ["ID", "Name", "Region", "Country"];

      const table = new Table({
        head,
        style: { head: [], border: [] },
      });

      for (const s of stations) {
        const lastCol =
          hasDistance && s.distance != null ? `${s.distance.toFixed(1)} km` : s.country;
        table.push([s.id, s.name, s.region ?? "", lastCol]);
      }

      console.log(table.toString());
      console.log();
      console.log(chalk.dim(`${stations.length} station${stations.length === 1 ? "" : "s"} found`));
    },
  };
}

function formatDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}
