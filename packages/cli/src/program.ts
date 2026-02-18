import { Command } from "commander";
import { extremes } from "./commands/extremes.js";
import { timeline } from "./commands/timeline.js";
import { stations } from "./commands/stations.js";

export function createProgram() {
  const program = new Command();

  program.name("neaps").description("Tide prediction command line interface").version("0.1.0");

  program.addCommand(extremes);
  program.addCommand(timeline);
  program.addCommand(stations);

  return program;
}
