#!/usr/bin/env node
/**
 * Example demonstrating Temporal.Instant support in Neaps
 * Run with: node examples/temporal-example.mjs
 */

import { Temporal } from "@js-temporal/polyfill";
import { getExtremesPrediction } from "neaps";

// Example 1: Using JavaScript Date (backward compatible)
console.log("=== Using JavaScript Date ===");
const predictionWithDate = getExtremesPrediction({
  lat: 26.772,
  lon: -80.05,
  start: new Date("2025-12-18T00:00:00Z"),
  end: new Date("2025-12-19T00:00:00Z"),
  datum: "MLLW",
});

console.log("Extremes found:", predictionWithDate.extremes.length);
console.log("First extreme:", {
  time: predictionWithDate.extremes[0].time.toString(),
  level: predictionWithDate.extremes[0].level.toFixed(2),
  type: predictionWithDate.extremes[0].high ? "High" : "Low",
});

// Example 2: Using Temporal.Instant (native Temporal support)
console.log("\n=== Using Temporal.Instant ===");
const startInstant = Temporal.Instant.from("2025-12-18T00:00:00Z");
const endInstant = Temporal.Instant.from("2025-12-19T00:00:00Z");

const predictionWithTemporal = getExtremesPrediction({
  lat: 26.772,
  lon: -80.05,
  start: startInstant,
  end: endInstant,
  datum: "MLLW",
});

console.log("Extremes found:", predictionWithTemporal.extremes.length);
console.log("First extreme:", {
  time: predictionWithTemporal.extremes[0].time.toString(),
  level: predictionWithTemporal.extremes[0].level.toFixed(2),
  type: predictionWithTemporal.extremes[0].high ? "High" : "Low",
});

// Example 3: Converting returned Temporal.Instant to Date
console.log("\n=== Converting Temporal.Instant back to Date ===");
const instant = predictionWithTemporal.extremes[0].time;
const date = new Date(instant.epochMilliseconds);
console.log("As Date object:", date.toISOString());
console.log("As Date string:", date.toString());

// Example 4: Using Temporal for manipulation
console.log("\n=== Temporal API benefits ===");
const timeOfExtreme = predictionWithTemporal.extremes[0].time;
const oneHourLater = timeOfExtreme.add({ hours: 1 });
const oneHourEarlier = timeOfExtreme.subtract({ hours: 1 });

console.log("One hour earlier:", oneHourEarlier.toString());
console.log("Extreme time:", timeOfExtreme.toString());
console.log("One hour later:", oneHourLater.toString());
