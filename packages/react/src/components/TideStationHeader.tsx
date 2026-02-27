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
    <div className={className}>
      <h1 className="m-0 text-3xl font-semibold text-(--neaps-text)">{station.name}</h1>
      <span className="block mt-0.5 text-sm text-(--neaps-text-muted)">
        {[station.region, station.country].filter(Boolean).join(" · ")}
        {" · "}
        <span className="tabular-nums text-xs">{coords}</span>
      </span>
    </div>
  );
}
