import { useMemo } from "react";
import { CoordinateFormat } from "coordinate-format";
import type { StationSummary } from "../types.js";

const coordFormatter = new CoordinateFormat("minutes", { precision: 2 });

export interface TideStationHeaderProps {
  station: Pick<StationSummary, "name" | "region" | "country" | "latitude" | "longitude">;
  className?: string;
}

export function TideStationHeader({ station, className }: TideStationHeaderProps) {
  const coords = useMemo(
    () => coordFormatter.format(station.longitude, station.latitude).join(", "),
    [station.latitude, station.longitude],
  );

  return (
    <div className={`@container ${className ?? ""}`}>
      <h1 className="m-0 text-xl @lg:text-3xl font-semibold text-(--neaps-text) @max-sm:truncate">
        {station.name}
      </h1>
      <span className="block mt-0.5 text-xs @sm:text-sm text-(--neaps-text-muted) @max-sm:truncate">
        {[station.region, station.country].filter(Boolean).join(" · ")}
        <span className="hidden @md:inline">
          {" · "}
          <span className="tabular-nums text-xs">{coords}</span>
        </span>
      </span>
    </div>
  );
}
