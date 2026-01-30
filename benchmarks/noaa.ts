import { expect } from "vitest";
import { mkdir, readFile, writeFile } from "fs/promises";
import { createWriteStream } from "fs";
import { join } from "path";
import { findStation } from "neaps";
import { stations as db } from "@neaps/tide-database";
import createFetch from "make-fetch-happen";

const __dirname = new URL(".", import.meta.url).pathname;
const fetch = createFetch.defaults({
  cachePath: join(__dirname, ".cache"),
  cache: "force-cache",
  retry: 10,
});

const stations = db
  .filter((station) => station.source.url.includes("noaa.gov"))
  .map((station) => station.source.id);

// Create a directory for test cache
await mkdir(".test-cache", { recursive: true });

interface Stat {
  station: string;
  type: string;
  start_utc: string;
  end_utc: string;
  events_noaa: number;
  events_model: number;
  matched: number;
  missed: number;
  extra: number;
  med_abs_dt_min: number;
  p95_abs_dt_min: number;
  mean_dt_min: number;
  mae_dh_m: number;
  mean_dh_m: number;
  rmse_dh_m: number;
  bias_dh_m: number;
  p95_abs_dh_m: number;
}

const stats: Stat[] = [];
const MATCH_WINDOW = 3 * 60 * 60 * 1000; // 3 hours

console.log(`Testing tide predictions against ${stations.length} NOAA stations`);

type Extreme = {
  time: number;
  level: number;
  type: "H" | "L";
};

for (const id of stations) {
  const station = findStation(id);
  const datum = station.defaultDatum ?? "MTL";

  const noaaEvents: Extreme[] | undefined = (await fetchNOAAdata(id, datum)).predictions?.map(
    (e: { t: string; v: string; type: "H" | "L" }) => ({
      time: new Date(e.t + " GMT").getTime(),
      level: parseFloat(e.v),
      type: e.type,
    }),
  );

  // No predictions available
  if (!noaaEvents) continue;

  // Get start/end dates to match NOAA data
  const start = new Date(noaaEvents[0].time - MATCH_WINDOW);
  const end = new Date(noaaEvents[noaaEvents.length - 1].time + MATCH_WINDOW);

  const neapsEvents: Extreme[] = station
    .getExtremesPrediction({
      start,
      end,
    })
    .extremes.map((e) => ({
      time: e.time.epochMilliseconds,
      level: e.level,
      type: e.high ? "H" : "L",
    }));

  let matched = 0;
  let missed = 0;
  let extra = 0;

  const dtMinutes: number[] = [];
  const dhMeters: number[] = [];

  const noaa = Object.groupBy(noaaEvents, (e) => e.type) as Record<
    "H" | "L",
    Extreme[] | undefined
  >;
  const neaps = Object.groupBy(neapsEvents, (e) => e.type) as Record<
    "H" | "L",
    Extreme[] | undefined
  >;

  const matchAndCollect = (noaaList: Extreme[], neapsList: Extreme[]) => {
    let j = 0;

    for (let i = 0; i < noaaList.length; i++) {
      const noaa = noaaList[i];

      // Count model events that are too early to ever match this NOAA event as "extra"
      while (j < neapsList.length && neapsList[j].time < noaa.time - MATCH_WINDOW) {
        extra += 1;
        j += 1;
      }

      if (j >= neapsList.length) {
        missed += 1;
        continue;
      }

      // Consider the closest of current or next model event
      let bestIndex = j;
      let bestAbsDt = Math.abs(neapsList[j].time - noaa.time);

      if (j + 1 < neapsList.length) {
        const nextAbsDt = Math.abs(neapsList[j + 1].time - noaa.time);
        if (nextAbsDt < bestAbsDt) {
          bestIndex = j + 1;
          bestAbsDt = nextAbsDt;
        }
      }

      // If closest is outside the matching window, treat NOAA event as missed
      if (bestAbsDt > MATCH_WINDOW) {
        missed += 1;
        continue;
      }

      const match = neapsList[bestIndex];

      // Advance pointer past the matched event (one-to-one matching)
      j = bestIndex + 1;

      matched += 1;

      const dtMin = (match.time - noaa.time) / 60000;
      const dh = match.level - noaa.level;

      dtMinutes.push(dtMin);
      dhMeters.push(dh);
    }

    // Any remaining model events are "extra"
    extra += Math.max(0, neapsList.length - j);
  };

  matchAndCollect(noaa.H ?? [], neaps.H ?? []);
  matchAndCollect(noaa.L ?? [], neaps.L ?? []);

  const events_noaa = (noaa.H?.length ?? 0) + (noaa.L?.length ?? 0);
  const events_model = (neaps.H?.length ?? 0) + (neaps.L?.length ?? 0);

  // Timing metrics (minutes)
  const absDt = sort(dtMinutes.map((v) => Math.abs(v)));
  const med_abs_dt_min = ntile(absDt, 0.5);
  const p95_abs_dt_min = ntile(absDt, 0.95);
  const mean_dt_min = mean(dtMinutes);

  // Height metrics (meters) at matched events
  const absDh = dhMeters.map((v) => Math.abs(v));
  const mae_dh_m = mean(absDh);
  const mean_dh_m = mean(dhMeters);
  const rmse_dh_m = Math.sqrt(dhMeters.reduce((a, b) => a + b * b, 0) / dhMeters.length);
  const bias_dh_m = mean(dhMeters);
  const p95_abs_dh_m = ntile(sort(absDh), 0.95);

  stats.push({
    station: station.source.id,
    type: station.type,
    start_utc: start.toISOString(),
    end_utc: end.toISOString(),
    events_noaa,
    events_model,
    matched,
    missed,
    extra,
    med_abs_dt_min,
    p95_abs_dt_min,
    mean_dt_min,
    mae_dh_m,
    mean_dh_m,
    rmse_dh_m,
    bias_dh_m,
    p95_abs_dh_m,
  });
  process.stdout.write(".");
}

// Write stats to file for later analysis
const summary = createWriteStream(join(__dirname, "noaa.csv"));
summary.write(
  "station,type,start_utc,end_utc,events_noaa,events_model,matched,missed,extra,med_abs_dt_min,p95_abs_dt_min,mean_dt_min,mae_dh_m,mean_dh_m,rmse_dh_m,bias_dh_m,p95_abs_dh_m\n",
);

stats.forEach((s) => {
  summary.write(
    [
      s.station,
      s.type,
      s.start_utc,
      s.end_utc,
      s.events_noaa,
      s.events_model,
      s.matched,
      s.missed,
      s.extra,
      s.med_abs_dt_min.toFixed(2),
      s.p95_abs_dt_min.toFixed(2),
      s.mean_dt_min.toFixed(2),
      s.mae_dh_m.toFixed(4),
      s.mean_dh_m.toFixed(4),
      s.rmse_dh_m.toFixed(4),
      s.bias_dh_m.toFixed(4),
      s.p95_abs_dh_m.toFixed(4),
    ].join(",") + "\n",
  );
});
summary.end();

// Baseline expectations based on current performance. The goal should be to move these toward zero over time.
const maeValues = sort(stats.map((s) => s.mae_dh_m));
const p50MAE = ntile(maeValues, 0.5);
const p90MAE = ntile(maeValues, 0.9);
const p95MAE = ntile(maeValues, 0.95);

const medAbsDtValues = sort(stats.map((s) => s.med_abs_dt_min));
const p95MedAbsDt = ntile(medAbsDtValues, 0.95);

console.log("\n", { count: stats.length, p50MAE, p90MAE, p95MAE, p95MedAbsDt });

expect(p50MAE, "MAE p50").toBeLessThan(0.03); // 3 cm
expect(p90MAE, "MAE p90").toBeLessThan(0.06); // 6 cm
expect(p95MAE, "MAE p95").toBeLessThan(0.08); // 8 cm
expect(p95MedAbsDt, "Median |dt| p95 across stations").toBeLessThan(21);

async function fetchNOAAdata(station: string, datum = "MLLW") {
  const filePath = `./.test-cache/${station}-${datum}.json`;

  try {
    return await readFile(filePath, "utf-8").then((data) => JSON.parse(data));
  } catch {
    const url = new URL("https://api.tidesandcurrents.noaa.gov/api/prod/datagetter");
    url.search = new URLSearchParams({
      datum,
      station,
      date: "recent",
      // TOOD: switch to range to get more data points
      // range: (24 * 7).toString(), // 7 days
      product: "predictions",
      time_zone: "gmt",
      units: "metric",
      format: "json",
      interval: "hilo",
    }).toString();

    const res = await fetch(url.toString());
    const data = await res.json();
    await writeFile(filePath, JSON.stringify(data));
    return data;
  }
}

function sort(data: number[]) {
  return data.sort((a, b) => a - b);
}

function ntile(data: number[], percent: number) {
  return data[Math.floor(data.length * percent)] ?? NaN;
}

function mean(data: number[]) {
  return data.reduce((a, b) => a + b, 0) / data.length;
}
