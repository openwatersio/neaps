interface ChartPoint {
  time: Date;
  level: number;
}

interface ChartOptions {
  width?: number;
  height?: number;
  units: string;
}

export function renderChart(points: ChartPoint[], options: ChartOptions): string {
  const { units, height = 15 } = options;
  const width = Math.min(options.width ?? process.stdout.columns ?? 80, 120);

  if (points.length === 0) return "No data points.";

  const levels = points.map((p) => p.level);
  const min = Math.min(...levels);
  const max = Math.max(...levels);
  const range = max - min || 1;

  const unitLabel = units === "meters" ? "m" : "ft";
  const yLabelWidth = 7;
  const chartWidth = Math.max(1, width - yLabelWidth - 1);

  const sampled = samplePoints(points, chartWidth);

  const rows: string[] = [];

  for (let row = 0; row < height; row++) {
    const levelAtRow = max - (row / (height - 1)) * range;
    const label = formatLevel(levelAtRow, unitLabel).padStart(yLabelWidth);

    let line = "";
    for (let col = 0; col < sampled.length; col++) {
      const normalizedLevel = (sampled[col].level - min) / range;
      const chartRow = Math.round((1 - normalizedLevel) * (height - 1));

      if (chartRow === row) {
        line += "\u2022";
      } else if (col > 0) {
        const prevNormalized = (sampled[col - 1].level - min) / range;
        const prevRow = Math.round((1 - prevNormalized) * (height - 1));

        const minRow = Math.min(prevRow, chartRow);
        const maxRow = Math.max(prevRow, chartRow);
        if (row > minRow && row < maxRow) {
          line += "\u2502";
        } else {
          line += " ";
        }
      } else {
        line += " ";
      }
    }

    rows.push(`${label} \u2524${line}`);
  }

  // X-axis
  const labelPositions = getTimeLabelPositions(sampled);
  const axisOffset = yLabelWidth + 1;

  let axisLine = " ".repeat(axisOffset);
  for (let i = 0; i < sampled.length; i++) {
    axisLine += labelPositions.some((l) => l.index === i) ? "\u2534" : "\u2500";
  }
  rows.push(axisLine);

  // Time labels - evenly space them under tick marks
  let labelLine = "";
  let cursor = 0;
  for (const { index, label } of labelPositions) {
    const pos = axisOffset + index - Math.floor(label.length / 2);
    if (pos > cursor) {
      labelLine += " ".repeat(pos - cursor);
      labelLine += label;
      cursor = pos + label.length;
    }
  }
  rows.push(labelLine);

  return rows.join("\n");
}

function samplePoints(points: ChartPoint[], targetCount: number): ChartPoint[] {
  if (targetCount <= 0) return [];
  if (targetCount === 1) return [points[0]];
  if (points.length <= targetCount) return points;
  const step = (points.length - 1) / (targetCount - 1);
  const result: ChartPoint[] = [];
  for (let i = 0; i < targetCount; i++) {
    result.push(points[Math.round(i * step)]);
  }
  return result;
}

function formatLevel(level: number, unit: string): string {
  return `${level >= 0 ? " " : ""}${level.toFixed(2)}${unit}`;
}

function getTimeLabelPositions(points: ChartPoint[]): { index: number; label: string }[] {
  const results: { index: number; label: string }[] = [];
  let lastHour = -1;

  const totalHours =
    (points[points.length - 1].time.getTime() - points[0].time.getTime()) / (1000 * 60 * 60);
  const labelInterval = totalHours <= 6 ? 1 : totalHours <= 24 ? 3 : 6;

  for (let i = 0; i < points.length; i++) {
    const hour = points[i].time.getUTCHours();
    if (hour % labelInterval === 0 && hour !== lastHour) {
      lastHour = hour;
      const h = hour.toString().padStart(2, "0");
      results.push({ index: i, label: `${h}:00` });
    }
  }

  return results;
}
