import { useMemo } from "react";

import { useStation } from "../hooks/use-station.js";
import { useExtremes } from "../hooks/use-extremes.js";
import { useTimeline } from "../hooks/use-timeline.js";
import { useNeapsConfig } from "../provider.js";
import { TideConditions } from "./TideConditions.js";
import { TideGraph, type TimeRange } from "./TideGraph.js";
import { TideTable } from "./TideTable.js";
import type { Units } from "../types.js";

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
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  const days = timeRange === "24h" ? 1 : timeRange === "3d" ? 3 : 7;
  end.setDate(end.getDate() + days);
  return { start, end };
}


export function TideStation({
  id,
  showGraph = true,
  showTable = true,
  timeRange = "3d",
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
  const datum = timeline.data?.datum ?? extremes.data?.datum;
  const timelineData = timeline.data?.timeline ?? [];
  const extremesData = extremes.data?.extremes ?? [];
  return (
    <div
      className={`@container bg-(--neaps-bg) border border-(--neaps-border) rounded-lg overflow-hidden ${className ?? ""}`}
    >
      <div className="p-4 border-b border-(--neaps-border) flex flex-col @md:flex-row justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="m-0 text-lg font-semibold text-(--neaps-text)">{s.name}</h3>
          </div>
          <span className="block mt-0.5 text-sm text-(--neaps-text-muted)">
            {[s.region, s.country, s.timezone].filter(Boolean).join(" · ")}
          </span>
        </div>
        <TideConditions timeline={timelineData} extremes={extremesData} units={units} />
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
                datum={datum}
                showTimeRangeSelector={false}
                className="px-4 pb-4"
              />
            </div>
          )}
          {showTable && (
            <div className="flex-1 min-w-0">
              <TideTable extremes={extremesData} timezone={s.timezone} units={units} datum={datum} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
