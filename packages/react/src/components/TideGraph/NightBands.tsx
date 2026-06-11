import { useMemo } from "react";
import type { TideXScale } from "../../hooks/use-tide-scales.js";
import { getNightIntervals } from "../../utils/sun.js";
import { HEIGHT, MARGIN } from "./constants.js";

export function NightBands({
  xScale,
  latitude,
  longitude,
}: {
  xScale: TideXScale;
  latitude?: number;
  longitude?: number;
}) {
  const intervals = useMemo(() => {
    if (latitude == null || longitude == null) return [];
    const [start, end] = xScale.domain();
    return getNightIntervals(latitude, longitude, start.getTime(), end.getTime());
  }, [latitude, longitude, xScale]);

  return (
    <>
      {intervals.map(({ start, end }, i) => {
        const x1 = xScale(start);
        const x2 = xScale(end);
        return (
          <rect
            key={i}
            x={x1}
            y={-MARGIN.top}
            width={x2 - x1}
            height={HEIGHT}
            fill="var(--neaps-night)"
          />
        );
      })}
    </>
  );
}
