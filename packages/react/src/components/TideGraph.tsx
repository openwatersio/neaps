import { useEffect, useMemo, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Filler,
  Tooltip,
  type ChartOptions,
  type ChartData,
  type Plugin,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import ChartDataLabels from "chartjs-plugin-datalabels";
import "chartjs-adapter-date-fns";

import { useTimeline, type UseTimelineParams } from "../hooks/use-timeline.js";
import { useExtremes, type UseExtremesParams } from "../hooks/use-extremes.js";
import { useNeapsConfig } from "../provider.js";
import { useThemeColors, withAlpha, type ThemeColors } from "../hooks/use-theme-colors.js";
import { formatLevel, formatTime } from "../utils/format.js";
import type { TimelineEntry, Extreme, Units } from "../types.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Filler,
  Tooltip,
  annotationPlugin,
  ChartDataLabels,
);

export type TimeRange = "24h" | "3d" | "7d";

export interface TideGraphDataProps {
  timeline: TimelineEntry[];
  extremes?: Extreme[];
  timezone?: string;
  units?: Units;
  datum?: string;
}

export interface TideGraphFetchProps {
  id: string;
  start?: Date;
  end?: Date;
  timeline?: undefined;
}

export type TideGraphProps = (TideGraphDataProps | TideGraphFetchProps) & {
  timeRange?: TimeRange;
  showTimeRangeSelector?: boolean;
  className?: string;
};

function getTimeRangeDates(range: TimeRange, base: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  const days = range === "24h" ? 1 : range === "3d" ? 3 : 7;
  end.setDate(end.getDate() + days);
  return { start, end };
}

function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

function getMaxTicksLimit(width: number): number {
  if (width < 300) return 4;
  if (width < 500) return 6;
  if (width < 700) return 8;
  return 12;
}

function TideGraphChart({
  timeline,
  extremes,
  timezone,
  units,
  datum,
  colors,
  className,
}: {
  timeline: TimelineEntry[];
  extremes: Extreme[];
  timezone: string;
  units: Units;
  datum?: string;
  colors: ThemeColors;
  className?: string;
}) {
  const { ref: containerRef, width: containerWidth } = useContainerWidth();
  const maxTicks = getMaxTicksLimit(containerWidth);

  // Inline plugin: applies a vertical gradient fill to the Water Level dataset.
  // Sets the gradient on the resolved element options so the Filler plugin picks it up.
  const gradientFillPlugin: Plugin<"line"> = useMemo(
    () => ({
      id: "gradientFill",
      beforeDraw(chart) {
        const { ctx, chartArea } = chart;
        if (!chartArea) return;
        const meta = chart.getDatasetMeta(1); // Water Level
        if (!meta?.dataset || !meta.data.length) return;
        const yScale = chart.scales.y;
        if (!yScale) return;
        // Gradient spans from y=0 (origin, transparent) to the peak data point (opaque)
        const originPixel = yScale.getPixelForValue(0);
        let topPixel = originPixel;
        for (const pt of meta.data) {
          if (pt.y < topPixel) topPixel = pt.y;
        }
        const gradient = ctx.createLinearGradient(0, originPixel, 0, topPixel);
        gradient.addColorStop(0, withAlpha(colors.primary, 0.05));
        gradient.addColorStop(1, withAlpha(colors.primary, 0.5));
        meta.dataset.options.backgroundColor = gradient;
      },
    }),
    [colors.primary],
  );

  const data: ChartData<"line"> = useMemo(
    () => ({
      datasets: [
        {
          data: extremes.map((e) => ({ x: new Date(e.time).getTime(), y: e.level })),
          backgroundColor: extremes.map((e) => (e.high ? colors.high : colors.low)),
          pointRadius: 5,
          pointHoverRadius: 7,
          showLine: false,
          clip: false,
          datalabels: {
            display: true,
            align: (ctx) => (extremes[ctx.dataIndex]?.high ? "top" : "bottom") as "top" | "bottom",
            anchor: (ctx) => (extremes[ctx.dataIndex]?.high ? "end" : "start"),
            formatter: (_value, ctx) => {
              const e = extremes[ctx.dataIndex];
              if (!e) return "";
              return [formatTime(e.time, timezone), formatLevel(e.level, units)];
            },
            color: (ctx) => (extremes[ctx.dataIndex]?.high ? colors.high : colors.low),
            font: { size: 10, weight: "bold" },
            textAlign: "center",
            clamp: true,
          },
        },
        {
          label: "Water Level",
          data: timeline.map((p) => ({ x: new Date(p.time).getTime(), y: p.level })),
          borderColor: colors.primary,
          backgroundColor: withAlpha(colors.primary, 0.15),
          fill: "origin",
          tension: 0.4,
          pointRadius: 0,
          pointHitRadius: 8,
          borderWidth: 2,
          datalabels: { display: false },
        },
      ],
    }),
    [timeline, extremes, colors, timezone, units],
  );

  const options: ChartOptions<"line"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index",
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "day",
            tooltipFormat: "PPp",
            displayFormats: {
              hour: "ha",
              day: "MMM d",
            },
          },
          adapters: {
            date: { timeZone: timezone },
          },
          grid: {
            color: colors.border,
          },
          ticks: {
            color: colors.text,
            maxTicksLimit: maxTicks,
          },
        },
        y: {
          grace: "70%",
          grid: {
            color: colors.border,
          },
          ticks: {
            color: colors.text,
            callback: (value) => formatLevel(value as number, units),
          },
          ...(datum && {
            title: {
              display: true,
              text: datum,
              color: colors.textMuted,
            },
          }),
        },
      },
      plugins: {
        annotation: {
          annotations: {
            nowLine: {
              type: "line",
              xMin: Date.now(),
              xMax: Date.now(),
              borderColor: colors.primary,
              borderWidth: 2,
              borderDash: [2, 4],
              label: {
                display: true,
                content: "Now",
                position: "start",
                color: colors.textMuted,
                backgroundColor: "transparent",
                font: { size: 12 },
              },
            },
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              if (ctx.datasetIndex === 0) {
                const extreme = extremes[ctx.dataIndex];
                if (extreme) return `${extreme.label}: ${formatLevel(extreme.level, units)}`;
              }
              return formatLevel(ctx.parsed.y ?? 0, units);
            },
          },
        },
      },
    }),
    [timezone, units, datum, extremes, maxTicks, colors],
  );

  return (
    <div ref={containerRef} className={`relative min-h-50 ${className ?? ""}`}>
      <Line data={data} options={options} plugins={[gradientFillPlugin]} aria-label="Tide level graph" />
    </div>
  );
}

export function TideGraph(props: TideGraphProps) {
  const config = useNeapsConfig();
  const colors = useThemeColors();
  const [activeRange, setActiveRange] = useState<TimeRange>(props.timeRange ?? "3d");

  // Data-driven mode: timeline/extremes passed directly
  if (props.timeline) {
    return (
      <TideGraphChart
        timeline={props.timeline}
        extremes={props.extremes ?? []}
        timezone={props.timezone ?? "UTC"}
        units={props.units ?? config.units}
        datum={props.datum}
        colors={colors}
        className={props.className}
      />
    );
  }

  // Fetch mode: id provided
  return (
    <TideGraphFetcher
      id={props.id}
      start={props.start}
      end={props.end}
      activeRange={activeRange}
      setActiveRange={setActiveRange}
      showTimeRangeSelector={props.showTimeRangeSelector}
      colors={colors}
      className={props.className}
    />
  );
}

function TideGraphFetcher({
  id,
  start,
  end,
  activeRange,
  setActiveRange,
  showTimeRangeSelector,
  colors,
  className,
}: {
  id: string;
  start?: Date;
  end?: Date;
  activeRange: TimeRange;
  setActiveRange: (r: TimeRange) => void;
  showTimeRangeSelector?: boolean;
  colors: ThemeColors;
  className?: string;
}) {
  const config = useNeapsConfig();
  const rangeDates = useMemo(() => getTimeRangeDates(activeRange), [activeRange]);
  const effectiveStart = start ?? rangeDates.start;
  const effectiveEnd = end ?? rangeDates.end;

  const timelineParams: UseTimelineParams = {
    id,
    start: effectiveStart.toISOString(),
    end: effectiveEnd.toISOString(),
  };
  const extremesParams: UseExtremesParams = {
    id,
    start: effectiveStart.toISOString(),
    end: effectiveEnd.toISOString(),
  };

  const timeline = useTimeline(timelineParams);
  const extremes = useExtremes(extremesParams);

  if (timeline.isLoading || extremes.isLoading) {
    return (
      <div className={`p-4 text-center text-sm text-(--neaps-text-muted) ${className ?? ""}`}>
        Loading tide data...
      </div>
    );
  }

  if (timeline.error || extremes.error) {
    return (
      <div className={`p-4 text-center text-sm text-red-500 ${className ?? ""}`}>
        {(timeline.error ?? extremes.error)?.message}
      </div>
    );
  }

  const station = timeline.data?.station ?? extremes.data?.station;
  const timezone = station?.timezone ?? "UTC";

  return (
    <div className={className}>
      {showTimeRangeSelector !== false && (
        <TimeRangeSelector active={activeRange} onChange={setActiveRange} />
      )}
      <TideGraphChart
        timeline={timeline.data?.timeline ?? []}
        extremes={extremes.data?.extremes ?? []}
        timezone={timezone}
        units={timeline.data?.units ?? config.units}
        datum={timeline.data?.datum ?? extremes.data?.datum}
        colors={colors}
      />
    </div>
  );
}

function TimeRangeSelector({
  active,
  onChange,
}: {
  active: TimeRange;
  onChange: (r: TimeRange) => void;
}) {
  const ranges: TimeRange[] = ["24h", "3d", "7d"];
  return (
    <div className="flex gap-1 mb-3" role="group" aria-label="Time range">
      {ranges.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={`px-3 py-1 border rounded-lg text-xs font-medium cursor-pointer transition-all ${r === active
            ? "bg-(--neaps-primary) border-(--neaps-primary) text-white"
            : "border-(--neaps-border) bg-(--neaps-bg) text-(--neaps-text-muted) hover:border-(--neaps-primary) hover:text-(--neaps-primary)"
            }`}
          aria-pressed={r === active}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
