import { mkdir, readFile, writeFile } from "fs/promises";
import { createWriteStream } from "fs";
import { join } from "path";
import { findStation } from "neaps";
import { stations as db } from "@neaps/tide-database";
import createFetch from "make-fetch-happen";

const __dirname = new URL(".", import.meta.url).pathname;
const fetch = createFetch.defaults({
  cachePath: join(__dirname, "..", "node_modules", ".cache"),
  cache: "force-cache",
  retry: 10,
});

await mkdir(".test-cache", { recursive: true });

interface Stat {
  station: string;
  scheme: string;
  type: string;
  datum: string;
  start_utc: string;
  end_utc: string;
  n_obs: number;
  mae_m: number;
  rmse_m: number;
  bias_m: number;
  p95_abs_m: number;
  max_abs_m: number;
}

const stats: Stat[] = [];
const scheme = (process.env.SCHEME ?? "iho") as "iho" | "schureman";
const FAST = !!process.env.FAST;
const RANGE_DAYS = FAST ? 3 : 365;

// For active stations, verified hourly data has a processing lag of weeks to months.
// Use a fixed date as the upper bound for active stations.
const ACTIVE_END_DATE = new Date("2025-07-01T00:00:00Z");

// Fetch the list of stations that have water level gauges from NOAA's metadata API
// (with details expanded to get established/removed dates for historic stations),
// then intersect with our tide-database to get stations we can predict for.
interface GaugeInfo {
  established: Date | null;
  removed: Date | null;
}

const gaugeStations = await fetchGaugeStations();
const neapsStationIndex = new Map(
  db.filter((s) => s.source.url.includes("noaa.gov")).map((s) => [s.source.id, s]),
);
// Subordinate stations never had physical gauges — NOAA only provides predicted
// hi/lo for them (compared in benchmarks/noaa.ts). Filter to reference stations only.
const stations = [...gaugeStations.keys()].filter(
  (id) => neapsStationIndex.has(id) && neapsStationIndex.get(id)!.type === "reference",
);

const byTypeCount = Object.groupBy(
  stations.map((id) => neapsStationIndex.get(id)!),
  (s) => s.type,
);
console.log(
  `Found ${stations.length} stations with water level gauges in tide-database ` +
    `(${byTypeCount.reference?.length ?? 0} reference, ${byTypeCount.subordinate?.length ?? 0} subordinate)`,
);
console.log(
  `Comparing predictions against NOAA verified water levels (scheme=${scheme}, days=${RANGE_DAYS})`,
);

let skipped = 0;

for (const id of stations) {
  const station = findStation(id);
  const gauge = gaugeStations.get(id)!;

  // Determine date range for this station based on its data availability.
  // Historic stations have a `removed` date; active stations use a fixed recent date.
  const endDate = gauge.removed ?? ACTIVE_END_DATE;
  let beginDate = new Date(endDate.getTime() - RANGE_DAYS * 24 * 3600000);
  if (gauge.established && beginDate < gauge.established) {
    beginDate = gauge.established;
  }

  // Skip if range is too small (less than 1 day)
  if (endDate.getTime() - beginDate.getTime() < 24 * 3600000) {
    skipped++;
    process.stdout.write("-");
    continue;
  }

  const beginStr = fmtDate(beginDate);
  const endStr = fmtDate(endDate);

  // Use STND (station datum) — it's universally available for any station with data.
  const usedDatum = "STND";
  const noaaData = await fetchHourlyHeights(id, usedDatum, beginStr, endStr);

  // Skip stations without data for this period
  if (!noaaData?.data?.length) {
    skipped++;
    process.stdout.write("-");
    continue;
  }

  // Parse NOAA observations into a Map keyed by timestamp (ms)
  const noaaObs = new Map<number, number>();
  for (const obs of noaaData.data) {
    const level = parseFloat(obs.v);
    if (isNaN(level)) continue;
    const time = new Date(obs.t + " GMT").getTime();
    noaaObs.set(time, level);
  }

  if (noaaObs.size === 0) {
    skipped++;
    process.stdout.write("-");
    continue;
  }

  // Determine date range from NOAA data
  const times = [...noaaObs.keys()];
  const start = new Date(times[0]);
  const end = new Date(times[times.length - 1]);

  // Generate neaps timeline prediction (default 10-min resolution includes hourly points)
  let neapsMap: Map<number, number>;
  try {
    const result = station.getTimelinePrediction({
      start,
      end,
      nodeCorrections: scheme,
      datum: usedDatum,
    });

    // Build lookup from timestamp → level
    neapsMap = new Map<number, number>();
    for (const point of result.timeline) {
      neapsMap.set(point.time.getTime(), point.level);
    }
  } catch {
    skipped++;
    process.stdout.write("x");
    continue;
  }

  // Match NOAA observations to neaps predictions at the same timestamps
  const errors: number[] = [];

  for (const [time, observed] of noaaObs) {
    const predicted = neapsMap.get(time);
    if (predicted === undefined) continue;
    errors.push(predicted - observed);
  }

  if (errors.length === 0) {
    skipped++;
    process.stdout.write("?");
    continue;
  }

  const absErrors = errors.map((e) => Math.abs(e));

  stats.push({
    station: station.source.id,
    scheme,
    type: station.type,
    datum: usedDatum,
    start_utc: start.toISOString(),
    end_utc: end.toISOString(),
    n_obs: errors.length,
    mae_m: mean(absErrors),
    rmse_m: Math.sqrt(errors.reduce((a, b) => a + b * b, 0) / errors.length),
    bias_m: mean(errors),
    p95_abs_m: ntile(sort([...absErrors]), 0.95),
    max_abs_m: Math.max(...absErrors),
  });
  process.stdout.write(".");
}

// Write per-station CSV
const summary = createWriteStream(join(__dirname, "noaa-waterlevels.csv"));
summary.write(
  "station,scheme,type,datum,start_utc,end_utc,n_obs,mae_m,rmse_m,bias_m,p95_abs_m,max_abs_m\n",
);

stats.forEach((s) => {
  summary.write(
    [
      s.station,
      s.scheme,
      s.type,
      s.datum,
      s.start_utc,
      s.end_utc,
      s.n_obs,
      s.mae_m.toFixed(4),
      s.rmse_m.toFixed(4),
      s.bias_m.toFixed(4),
      s.p95_abs_m.toFixed(4),
      s.max_abs_m.toFixed(4),
    ].join(",") + "\n",
  );
});
summary.end();

// Aggregate stats by station type
const byType = Object.groupBy(stats, (s) => s.type) as Record<string, Stat[] | undefined>;

console.log(
  `\n\nResults: ${stats.length} stations with data, ${skipped} skipped (no data for period)`,
);

for (const [type, group] of Object.entries(byType)) {
  if (!group?.length) continue;

  const maeValues = sort(group.map((s) => s.mae_m));
  const p50_mae = ntile(maeValues, 0.5);
  const p90_mae = ntile(maeValues, 0.9);
  const p95_mae = ntile(maeValues, 0.95);

  const rmseValues = sort(group.map((s) => s.rmse_m));
  const p50_rmse = ntile(rmseValues, 0.5);

  const biasValues = sort(group.map((s) => s.bias_m));
  const p50_bias = ntile(biasValues, 0.5);

  console.log(`${type} (N=${group.length}):`, {
    p50_mae: p50_mae.toFixed(4),
    p90_mae: p90_mae.toFixed(4),
    p95_mae: p95_mae.toFixed(4),
    p50_rmse: p50_rmse.toFixed(4),
    p50_bias: p50_bias.toFixed(4),
  });
}

/**
 * Fetch active + historic water level stations from NOAA metadata API,
 * with details expanded to get established/removed dates.
 */
async function fetchGaugeStations(): Promise<Map<string, GaugeInfo>> {
  const result = new Map<string, GaugeInfo>();

  for (const type of ["waterlevels", "historicwl"]) {
    const filePath = `./.test-cache/noaa-stations-${type}-details.json`;
    let data: {
      stations?: { id: string; details?: { established?: string; removed?: string } }[];
    };

    try {
      data = await readFile(filePath, "utf-8").then((d) => JSON.parse(d));
    } catch {
      const url = `https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=${type}&units=metric&expand=details`;
      const res = await fetch(url);
      data = (await res.json()) as typeof data;
      await writeFile(filePath, JSON.stringify(data));
    }

    for (const s of data.stations ?? []) {
      if (result.has(s.id)) continue;
      result.set(s.id, {
        established: s.details?.established ? new Date(s.details.established) : null,
        removed: s.details?.removed ? new Date(s.details.removed) : null,
      });
    }
  }

  return result;
}

async function fetchHourlyHeights(
  station: string,
  datum: string,
  beginStr: string,
  endStr: string,
) {
  const filePath = `./.test-cache/${station}-${datum}-${beginStr}-${endStr}-hourly.json`;

  try {
    return await readFile(filePath, "utf-8").then((data) => JSON.parse(data));
  } catch {
    const url = new URL("https://api.tidesandcurrents.noaa.gov/api/prod/datagetter");
    url.search = new URLSearchParams({
      datum,
      station,
      begin_date: beginStr,
      end_date: endStr,
      product: "hourly_height",
      time_zone: "gmt",
      units: "metric",
      format: "json",
      application: "neaps",
    }).toString();

    const res = await fetch(url.toString());
    const data = await res.json();
    await writeFile(filePath, JSON.stringify(data));
    return data;
  }
}

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
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
