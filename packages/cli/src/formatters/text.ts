import { log } from "@clack/prompts";
import { renderChart } from "../lib/chart.js";
import type { Formatter, StationResult } from "./index.js";

export default function text(): Formatter {
  return {
    extremes(prediction) {
      log.info(`Station: ${prediction.station.name}`);
      log.info(`Datum: ${prediction.datum ?? "MSL"}  |  Units: ${prediction.units}`);

      console.log();
      for (const extreme of prediction.extremes) {
        const tag = extreme.high ? "High" : "Low ";
        const unit = prediction.units === "meters" ? "m" : "ft";
        const level = `${extreme.level.toFixed(2)} ${unit}`;
        console.log(`  ${formatTime(extreme.time)}  ${tag}  ${level}`);
      }
      console.log();
    },

    timeline(prediction) {
      log.info(`Station: ${prediction.station.name}`);
      log.info(`Datum: ${prediction.datum ?? "MSL"}  |  Units: ${prediction.units}`);
      console.log();

      const chart = renderChart(prediction.timeline, {
        units: prediction.units,
      });
      console.log(chart);
      console.log();
    },

    listStations(stations: StationResult[]) {
      const hasDistance = stations.some((s) => s.distance != null);

      // Header
      const header = hasDistance
        ? `  ${"ID".padEnd(22)} ${"Name".padEnd(34)} ${"Region".padEnd(8)} ${"Distance"}`
        : `  ${"ID".padEnd(22)} ${"Name".padEnd(34)} ${"Region".padEnd(8)} ${"Country"}`;
      console.log(header);
      console.log(`  ${"─".repeat(header.length - 2)}`);

      for (const s of stations) {
        const id = s.id.padEnd(22);
        const name = s.name.substring(0, 34).padEnd(34);
        const region = (s.region ?? "").padEnd(8);

        if (hasDistance && s.distance != null) {
          const dist = `${s.distance.toFixed(1)} km`;
          console.log(`  ${id} ${name} ${region} ${dist}`);
        } else {
          const country = (s.country ?? "").substring(0, 20);
          console.log(`  ${id} ${name} ${region} ${country}`);
        }
      }

      console.log();
      log.info(`${stations.length} station${stations.length === 1 ? "" : "s"} found`);
    },
  };
}

function formatTime(date: Date): string {
  return date
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d{3}Z$/, " UTC");
}
