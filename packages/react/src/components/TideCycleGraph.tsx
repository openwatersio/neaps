import { useEffect, useMemo, useRef, useState } from "react";
import { AreaClosed, LinePath } from "@visx/shape";
import { Group } from "@visx/group";
import { curveNatural } from "@visx/curve";

import { interpolateLevel } from "../hooks/use-current-level.js";
import { useTideScales, type Margin } from "../utils/scales.js";
import type { Extreme, TimelineEntry } from "../types.js";

const HALF_WINDOW_MS = 6.417 * 60 * 60 * 1000;
const MARGIN: Margin = { top: 0, right: 0, bottom: 0, left: 0 };

export interface TideCycleGraphProps {
  timeline: TimelineEntry[];
  extremes: Extreme[];
  className?: string;
}

const getX = (d: TimelineEntry) => new Date(d.time).getTime();
const getY = (d: TimelineEntry) => d.level;

function TideCycleGraphChart({
  timeline,
  extremes,
  currentLevel,
  width,
  height,
}: {
  timeline: TimelineEntry[];
  extremes: Extreme[];
  currentLevel: TimelineEntry | null;
  width: number;
  height: number;
}) {
  const { xScale, yScale, innerW, innerH } = useTideScales({
    timeline,
    extremes,
    width,
    height,
    margin: MARGIN,
  });

  if (innerW <= 0 || innerH <= 0) return null;

  return (
    <svg width={width} height={height} aria-label="Tide cycle graph">
      <defs>
        <linearGradient id="cycle-gradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--neaps-primary)" stopOpacity={0.5} />
          <stop offset="100%" stopColor="var(--neaps-primary)" stopOpacity={0.05} />
        </linearGradient>
      </defs>

      <Group left={MARGIN.left} top={MARGIN.top}>
        <line
          x1={0}
          x2={innerW}
          y1={yScale(0)}
          y2={yScale(0)}
          stroke="var(--neaps-text-muted)"
          strokeWidth={1}
          strokeOpacity={0.3}
        />
        <AreaClosed
          data={timeline}
          x={(d) => xScale(getX(d))}
          y={(d) => yScale(getY(d))}
          yScale={yScale}
          curve={curveNatural}
          fill="url(#cycle-gradient)"
          opacity={0.3}
        />
        <LinePath
          data={timeline}
          x={(d) => xScale(getX(d))}
          y={(d) => yScale(getY(d))}
          curve={curveNatural}
          stroke="var(--neaps-primary)"
          strokeWidth={2}
          strokeOpacity={0.5}
        />

        {extremes.map((e, i) => (
          <circle
            key={i}
            cx={xScale(new Date(e.time).getTime())}
            cy={yScale(e.level)}
            r={3}
            fill="var(--neaps-primary)"
            stroke="var(--neaps-bg)"
            strokeWidth={1}
          />
        ))}

        {currentLevel && (
          <line
            x1={xScale(new Date(currentLevel.time).getTime())}
            x2={xScale(new Date(currentLevel.time).getTime())}
            y1={0}
            y2={innerH}
            stroke="var(--neaps-secondary)"
            strokeWidth={1.5}
            opacity={0.75}
          />
        )}
      </Group>
    </svg>
  );
}

export function TideCycleGraph({ timeline, extremes, className }: TideCycleGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
        setHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const windowStart = now - HALF_WINDOW_MS;
  const windowEnd = now + HALF_WINDOW_MS;

  const windowTimeline = useMemo(
    () =>
      timeline.filter((e) => {
        const t = new Date(e.time).getTime();
        return t >= windowStart && t <= windowEnd;
      }),
    [timeline, windowStart, windowEnd],
  );

  const windowExtremes = useMemo(
    () =>
      extremes.filter((e) => {
        const t = new Date(e.time).getTime();
        return t >= windowStart && t <= windowEnd;
      }),
    [extremes, windowStart, windowEnd],
  );

  const currentLevel = useMemo(() => interpolateLevel(windowTimeline, now), [windowTimeline, now]);

  if (!windowTimeline.length) return null;

  return (
    <div ref={containerRef} className={className}>
      {width > 0 && height > 0 && (
        <TideCycleGraphChart
          timeline={windowTimeline}
          extremes={windowExtremes}
          currentLevel={currentLevel}
          width={width}
          height={height}
        />
      )}
    </div>
  );
}
