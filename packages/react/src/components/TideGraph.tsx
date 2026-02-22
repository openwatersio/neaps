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
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import "chartjs-adapter-date-fns";

import { useTimeline, type UseTimelineParams } from "../hooks/use-timeline.js";
import { useExtremes, type UseExtremesParams } from "../hooks/use-extremes.js";
import { useNeapsConfig } from "../provider.js";
import { formatLevel } from "../utils/format.js";
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
  start.setMinutes(0, 0, 0);
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
  className,
}: {
  timeline: TimelineEntry[];
  extremes: Extreme[];
  timezone: string;
  units: Units;
  datum?: string;
  className?: string;
}) {
  const { ref: containerRef, width: containerWidth } = useContainerWidth();
  const maxTicks = getMaxTicksLimit(containerWidth);

  const data: ChartData<"line"> = useMemo(
    () => ({
      datasets: [
        {
          label: "Water Level",
          data: timeline.map((p) => ({ x: new Date(p.time).getTime(), y: p.level })),
          borderColor: "var(--neaps-primary, #2563eb)",
          backgroundColor: "color-mix(in srgb, var(--neaps-primary, #2563eb) 15%, transparent)",
          fill: "origin",
          tension: 0.4,
          pointRadius: 0,
          pointHitRadius: 8,
          borderWidth: 2,
        },
        {
          label: "High/Low",
          data: extremes.map((e) => ({ x: new Date(e.time).getTime(), y: e.level })),
          borderColor: "transparent",
          backgroundColor: extremes.map((e) =>
            e.high ? "var(--neaps-high, #3b82f6)" : "var(--neaps-low, #f59e0b)",
          ),
          pointRadius: 5,
          pointHoverRadius: 7,
          showLine: false,
        },
      ],
    }),
    [timeline, extremes],
  );

  const options: ChartOptions<"line"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index" as const,
      },
      scales: {
        x: {
          type: "time" as const,
          time: {
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
            color: "var(--neaps-border, #e2e8f0)",
          },
          ticks: {
            color: "var(--neaps-text, #0f172a)",
            maxTicksLimit: maxTicks,
          },
        },
        y: {
          grid: {
            color: "var(--neaps-border, #e2e8f0)",
          },
          ticks: {
            color: "var(--neaps-text, #0f172a)",
            callback: (value) => formatLevel(value as number, units),
          },
          ...(datum && {
            title: {
              display: true,
              text: datum,
              color: "var(--neaps-text-muted, #64748b)",
            },
          }),
        },
      },
      plugins: {
        annotation: {
          annotations: {
            nowLine: {
              type: "line" as const,
              xMin: Date.now(),
              xMax: Date.now(),
              borderColor: "var(--neaps-text-muted, #64748b)",
              borderWidth: 1,
              borderDash: [4, 4],
              label: {
                display: true,
                content: "Now",
                position: "start" as const,
                color: "var(--neaps-text-muted, #64748b)",
                backgroundColor: "transparent",
                font: { size: 10 },
              },
            },
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              if (ctx.datasetIndex === 1) {
                const extreme = extremes[ctx.dataIndex];
                return `${extreme.label}: ${formatLevel(extreme.level, units)}`;
              }
              return `${formatLevel(ctx.parsed.y ?? 0, units)}`;
            },
          },
        },
      },
    }),
    [timezone, units, datum, extremes, maxTicks],
  );

  return (
    <div ref={containerRef} className={`relative min-h-[200px] ${className ?? ""}`}>
      <Line data={data} options={options} aria-label="Tide level graph" />
    </div>
  );
}

export function TideGraph(props: TideGraphProps) {
  const config = useNeapsConfig();
  const [activeRange, setActiveRange] = useState<TimeRange>(props.timeRange ?? "24h");

  // Data-driven mode: timeline/extremes passed directly
  if (props.timeline) {
    return (
      <TideGraphChart
        timeline={props.timeline}
        extremes={props.extremes ?? []}
        timezone={props.timezone ?? "UTC"}
        units={props.units ?? config.units}
        datum={props.datum}
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
  className,
}: {
  id: string;
  start?: Date;
  end?: Date;
  activeRange: TimeRange;
  setActiveRange: (r: TimeRange) => void;
  showTimeRangeSelector?: boolean;
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
          className={`px-3 py-1 border rounded-lg text-xs font-medium cursor-pointer transition-all ${
            r === active
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
