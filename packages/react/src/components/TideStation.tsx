import { useMemo } from "react";

import { useStation } from "../hooks/use-station.js";
import { useExtremes } from "../hooks/use-extremes.js";
import { useTimeline } from "../hooks/use-timeline.js";
import { useNeapsConfig } from "../provider.js";
import { TideConditions } from "./TideConditions.js";
import { TideGraph } from "./TideGraph.js";
import { TideTable } from "./TideTable.js";
import type { Units } from "../types.js";
import { TideStationHeader } from "./TideStationHeader.js";
import { StationDisclaimers } from "./StationDisclaimers.js";
import { TideSettings } from "./TideSettings.js";

export interface TideStationProps {
  id: string;
  showGraph?: boolean;
  showTable?: boolean;
  className?: string;
}

function getDefaultRange(): { start: string; end: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function TideStation({
  id,
  showGraph = true,
  showTable = true,
  className,
}: TideStationProps) {
  const config = useNeapsConfig();
  const range = useMemo(getDefaultRange, []);

  const station = useStation(id);
  const timeline = useTimeline({ id, start: range.start, end: range.end });
  const extremes = useExtremes({ id, start: range.start, end: range.end });

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
  const timezone = config.timezone ?? s.timezone;
  const timelineData = timeline.data?.timeline ?? [];
  const extremesData = extremes.data?.extremes ?? [];

  return (
    <div className={`@container/station bg-(--neaps-bg) space-y-4 ${className ?? ""}`}>
      <TideStationHeader station={s} />

      <StationDisclaimers disclaimers={s.disclaimers} />

      <TideConditions
        timeline={timelineData}
        extremes={extremesData}
        units={units}
        timezone={timezone}
      />

      {showGraph && <TideGraph id={id} />}

      {showTable && (
        <TideTable extremes={extremesData} timezone={timezone} units={units} datum={datum} />
      )}

      <TideSettings station={s} />
    </div>
  );
}
