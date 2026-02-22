import { useMemo } from "react";

import { useStation } from "../hooks/use-station.js";
import { useExtremes } from "../hooks/use-extremes.js";
import { useTimeline } from "../hooks/use-timeline.js";
import { useNeapsConfig } from "../provider.js";
import { formatLevel } from "../utils/format.js";
import { TideGraph, type TimeRange } from "./TideGraph.js";
import { TideTable } from "./TideTable.js";
import type { Extreme, TimelineEntry, Units } from "../types.js";

export interface TideStationProps {
  id: string;
  showGraph?: boolean;
  showTable?: boolean;
  timeRange?: TimeRange | { start: Date; end: Date };
  className?: string;
}

function getDateRange(timeRange: TimeRange | { start: Date; end: Date }): {
  start: Date;
  end: Date;
} {
  if (typeof timeRange === "object") return timeRange;
  const start = new Date();
  start.setMinutes(0, 0, 0);
  const end = new Date(start);
  const days = timeRange === "24h" ? 1 : timeRange === "3d" ? 3 : 7;
  end.setDate(end.getDate() + days);
  return { start, end };
}

function getCurrentLevel(timeline: TimelineEntry[]): number | null {
  const now = Date.now();
  for (let i = 1; i < timeline.length; i++) {
    const t1 = new Date(timeline[i - 1].time).getTime();
    const t2 = new Date(timeline[i].time).getTime();
    if (now >= t1 && now <= t2) {
      const ratio = (now - t1) / (t2 - t1);
      return timeline[i - 1].level + ratio * (timeline[i].level - timeline[i - 1].level);
    }
  }
  return null;
}

function getNextExtreme(extremes: Extreme[]): Extreme | null {
  const now = new Date();
  return extremes.find((e) => new Date(e.time) > now) ?? null;
}

function isTideRising(extremes: Extreme[]): boolean | null {
  const next = getNextExtreme(extremes);
  if (!next) return null;
  return next.high;
}

function formatTimeUntil(isoTime: string): string {
  const diff = new Date(isoTime).getTime() - Date.now();
  if (diff <= 0) return "now";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function TideStation({
  id,
  showGraph = true,
  showTable = false,
  timeRange = "24h",
  className,
}: TideStationProps) {
  const config = useNeapsConfig();
  const { start, end } = useMemo(() => getDateRange(timeRange), [timeRange]);

  const station = useStation(id);
  const timeline = useTimeline({ id, start: start.toISOString(), end: end.toISOString() });
  const extremes = useExtremes({ id, start: start.toISOString(), end: end.toISOString() });

  if (station.isLoading || timeline.isLoading || extremes.isLoading) {
    return (
      <div
        className={`bg-(--neaps-bg) border border-(--neaps-border) rounded-lg overflow-hidden p-4 text-center text-sm text-(--neaps-text-muted) ${className ?? ""}`}
      >
        Loading...
      </div>
    );
  }

  if (station.error || timeline.error || extremes.error) {
    const err = station.error ?? timeline.error ?? extremes.error;
    return (
      <div
        className={`bg-(--neaps-bg) border border-(--neaps-border) rounded-lg overflow-hidden p-4 text-center text-sm text-red-500 ${className ?? ""}`}
      >
        {err!.message}
      </div>
    );
  }

  const s = station.data!;
  const units: Units = timeline.data?.units ?? config.units;
  const timelineData = timeline.data?.timeline ?? [];
  const extremesData = extremes.data?.extremes ?? [];
  const currentLevel = getCurrentLevel(timelineData);
  const nextExtreme = getNextExtreme(extremesData);
  const rising = isTideRising(extremesData);

  return (
    <div
      className={`@container bg-(--neaps-bg) border border-(--neaps-border) rounded-lg overflow-hidden ${className ?? ""}`}
    >
      <div className="p-4 border-b border-(--neaps-border)">
        <div className="flex items-center gap-2">
          <h3 className="m-0 text-lg font-semibold text-(--neaps-text)">{s.name}</h3>
        </div>
        <span className="block mt-0.5 text-sm text-(--neaps-text-muted)">
          {[s.region, s.country].filter(Boolean).join(", ")}
        </span>
      </div>

      <div className="flex items-center gap-6 p-4">
        {currentLevel !== null && (
          <div>
            <span className="text-2xl font-bold text-(--neaps-text)">
              {formatLevel(currentLevel, units)}
            </span>
            {rising !== null && (
              <span
                className={`ml-1 text-xl ${rising ? "text-(--neaps-high)" : "text-(--neaps-low)"}`}
                aria-label={rising ? "Rising" : "Falling"}
              >
                {rising ? "\u2191" : "\u2193"}
              </span>
            )}
          </div>
        )}
        {nextExtreme && (
          <div className="flex flex-col text-sm">
            <span className="text-(--neaps-text-muted)">
              {nextExtreme.high ? "High" : "Low"} in {formatTimeUntil(nextExtreme.time)}
            </span>
            <span className="font-semibold text-(--neaps-text)">
              {formatLevel(nextExtreme.level, units)}
            </span>
          </div>
        )}
      </div>

      {(showGraph || showTable) && (
        <div className="hidden @xs:flex flex-col @sm:flex-row @sm:gap-4">
          {showGraph && (
            <div className="flex-1 min-w-0">
              <TideGraph
                timeline={timelineData}
                extremes={extremesData}
                timezone={s.timezone}
                units={units}
                showTimeRangeSelector={false}
                className="px-4 pb-4"
              />
            </div>
          )}
          {showTable && (
            <div className="flex-1 min-w-0">
              <TideTable extremes={extremesData} timezone={s.timezone} units={units} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
