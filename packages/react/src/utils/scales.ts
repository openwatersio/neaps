import { useMemo } from "react";
import { scaleTime, scaleLinear } from "@visx/scale";
import type { TimelineEntry, Extreme } from "../types.js";

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function useTideScales({
  timeline,
  extremes,
  width,
  height,
  margin,
  domainOverride,
  yDomainOverride,
}: {
  timeline: TimelineEntry[];
  extremes?: Extreme[];
  width: number;
  height: number;
  margin: Margin;
  domainOverride?: { xMin: number; xMax: number };
  yDomainOverride?: [number, number];
}) {
  return useMemo(() => {
    const innerW = Math.max(0, width - margin.left - margin.right);
    const innerH = Math.max(0, height - margin.top - margin.bottom);

    const times = timeline.map((d) => new Date(d.time).getTime());
    const xMin = domainOverride?.xMin ?? (times.length ? Math.min(...times) : 0);
    const xMax = domainOverride?.xMax ?? (times.length ? Math.max(...times) : 1);

    const xScale = scaleTime<number>({
      domain: [xMin, xMax],
      range: [0, innerW],
    });

    let yDomain: [number, number];
    if (yDomainOverride) {
      yDomain = yDomainOverride;
    } else {
      const levels = [...timeline.map((d) => d.level), ...(extremes?.map((e) => e.level) ?? [])];
      const yMin = levels.length ? Math.min(0, ...levels) : 0;
      const yMax = levels.length ? Math.max(...levels) : 1;
      const yPad = (yMax - yMin) * 0.2 || 0.5;
      yDomain = [yMin - yPad, yMax + yPad];
    }

    const yScale = scaleLinear<number>({
      domain: yDomain,
      range: [innerH, 0],
      nice: true,
    });

    return { xScale, yScale, innerW, innerH };
  }, [timeline, extremes, width, height, margin, domainOverride, yDomainOverride]);
}
