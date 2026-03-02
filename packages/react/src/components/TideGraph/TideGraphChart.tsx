import { useCallback, useId, useMemo } from "react";
import { AreaClosed, LinePath } from "@visx/shape";
import { AxisTop } from "@visx/axis";
import { Group } from "@visx/group";
import { curveNatural } from "@visx/curve";
import { localPoint } from "@visx/event";
import { bisector } from "d3-array";

import { formatLevel, formatTime } from "../../utils/format.js";
import { useTideScales } from "../../hooks/use-tide-scales.js";
import { NightBands } from "./NightBands.js";
import { HEIGHT, MARGIN } from "./constants.js";
import type { TimelineEntry, Extreme, Units } from "../../types.js";

const timelineBisector = bisector<TimelineEntry, number>((d) => new Date(d.time).getTime()).left;

export function TideGraphChart({
  timeline,
  extremes,
  timezone,
  units,
  locale,
  svgWidth,
  yDomainOverride,
  latitude,
  longitude,
  className,
  activeEntry,
  onSelect,
}: {
  timeline: TimelineEntry[];
  extremes: Extreme[];
  timezone: string;
  units: Units;
  locale: string;
  svgWidth: number;
  yDomainOverride?: [number, number];
  latitude?: number;
  longitude?: number;
  className?: string;
  activeEntry?: TimelineEntry | null;
  onSelect: (entry: TimelineEntry | null, sticky?: boolean) => void;
}) {
  const gradientId = useId();

  const { xScale, yScale, innerW, innerH } = useTideScales({
    timeline,
    extremes,
    width: svgWidth,
    height: HEIGHT,
    margin: MARGIN,
    yDomainOverride,
  });

  const findNearestEntry = useCallback(
    (event: React.PointerEvent<SVGRectElement>): TimelineEntry | null => {
      const point = localPoint(event);
      if (!point) return null;
      const x0 = xScale.invert(point.x - MARGIN.left).getTime();
      const idx = timelineBisector(timeline, x0, 1);
      const d0 = timeline[idx - 1];
      const d1 = timeline[idx];
      if (!d0) return null;
      return d1 && x0 - new Date(d0.time).getTime() > new Date(d1.time).getTime() - x0 ? d1 : d0;
    },
    [xScale, timeline],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<SVGRectElement>) => {
      if (event.pointerType === "touch") return;
      const d = findNearestEntry(event);
      if (d) onSelect(d);
    },
    [findNearestEntry, onSelect],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<SVGRectElement>) => {
      if (event.pointerType !== "touch") return;
      const d = findNearestEntry(event);
      if (d) onSelect?.(d, true);
    },
    [findNearestEntry, onSelect],
  );

  const zeroY = yScale(0);
  // A scale whose range()[0] is the zero line — used as AreaClosed baseline
  const zeroBaseScale = useMemo(() => ({ range: () => [zeroY, 0] }) as typeof yScale, [zeroY]);

  if (innerW <= 0 || svgWidth <= 0) return null;

  return (
    <svg width={svgWidth} height={HEIGHT} className={className} aria-label="Tide level graph">
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1="0"
          x2="0"
          y1={0}
          y2={zeroY}
        >
          <stop offset="0%" stopColor="var(--neaps-primary)" stopOpacity={0.5} />
          <stop offset="100%" stopColor="var(--neaps-primary)" stopOpacity={0.05} />
        </linearGradient>
        <linearGradient
          id={`${gradientId}-neg`}
          gradientUnits="userSpaceOnUse"
          x1="0"
          x2="0"
          y1={zeroY}
          y2={innerH}
        >
          <stop offset="0%" stopColor="var(--neaps-danger)" stopOpacity={0.1} />
          <stop offset="100%" stopColor="var(--neaps-danger)" stopOpacity={0.5} />
        </linearGradient>
        <clipPath id={`${gradientId}-clip-pos`}>
          <rect x={0} y={0} width={innerW} height={Math.max(0, zeroY)} />
        </clipPath>
        <clipPath id={`${gradientId}-clip-neg`}>
          <rect
            x={0}
            y={Math.min(zeroY, innerH)}
            width={innerW}
            height={Math.max(0, innerH - zeroY)}
          />
        </clipPath>
      </defs>

      <Group left={MARGIN.left} top={MARGIN.top}>
        <NightBands xScale={xScale} latitude={latitude} longitude={longitude} />

        {/* Zero reference line */}
        <line
          x1={0}
          x2={innerW}
          y1={yScale(0)}
          y2={yScale(0)}
          stroke="var(--neaps-primary)"
          strokeWidth={1.5}
          strokeDasharray="1, 3"
          strokeOpacity={0.75}
        />

        {/* Area fill: positive (above zero) */}
        <AreaClosed
          data={timeline}
          x={(d) => xScale(new Date(d.time).getTime())}
          y={(d) => yScale(d.level)}
          yScale={zeroBaseScale}
          curve={curveNatural}
          fill={`url(#${gradientId})`}
          clipPath={`url(#${gradientId}-clip-pos)`}
        />
        {/* Area fill: negative (below zero) */}
        <AreaClosed
          data={timeline}
          x={(d) => xScale(new Date(d.time).getTime())}
          y={(d) => yScale(d.level)}
          yScale={zeroBaseScale}
          curve={curveNatural}
          fill={`url(#${gradientId}-neg)`}
          clipPath={`url(#${gradientId}-clip-neg)`}
        />
        <LinePath
          data={timeline}
          x={(d) => xScale(new Date(d.time).getTime())}
          y={(d) => yScale(d.level)}
          curve={curveNatural}
          stroke="var(--neaps-primary)"
          strokeWidth={2}
        />

        {/* Extreme points + labels */}
        {extremes.map((e) => {
          const cx = xScale(new Date(e.time).getTime());
          const cy = yScale(e.level);
          return (
            <g key={e.time}>
              <circle
                cx={cx}
                cy={cy}
                r={4}
                fill={e.high ? "var(--neaps-high)" : "var(--neaps-low)"}
                stroke="var(--neaps-bg)"
                strokeWidth={2}
              />
              <text x={cx} y={e.high ? "-1.2em" : innerH - 5} textAnchor="middle">
                {e.high ? (
                  <>
                    <tspan x={cx} fontSize={14} fill="var(--neaps-text-muted)">
                      {formatTime(e.time, timezone, locale)}
                    </tspan>
                    <tspan
                      x={cx}
                      dy="1.2em"
                      fontSize={16}
                      fontWeight={600}
                      fill="var(--neaps-high)"
                      className="tabular-nums"
                    >
                      {formatLevel(e.level, units)}
                    </tspan>
                    <tspan
                      x={cx}
                      dy="1.2em"
                      fontSize={16}
                      fontWeight={600}
                      fill="var(--neaps-high)"
                    >
                      ⤒
                    </tspan>
                  </>
                ) : (
                  <>
                    <tspan x={cx} fontSize={16} fontWeight={600} fill="var(--neaps-low)">
                      ⤓
                    </tspan>
                    <tspan
                      x={cx}
                      dy="1.2em"
                      fontSize={16}
                      fontWeight={600}
                      fill="var(--neaps-low)"
                      className="tabular-nums"
                    >
                      {formatLevel(e.level, units)}
                    </tspan>
                    <tspan x={cx} dy="1.2em" fontSize={14} fill="var(--neaps-text-muted)">
                      {formatTime(e.time, timezone, locale)}
                    </tspan>
                  </>
                )}
              </text>
            </g>
          );
        })}

        {/* Top axis — date ticks */}
        {(() => {
          const [start, end] = xScale.domain();
          const dates: Date[] = [];
          const d = new Date(start);
          d.setHours(12, 0, 0, 0);
          if (d.getTime() < start.getTime()) d.setDate(d.getDate() + 1);
          while (d <= end) {
            dates.push(new Date(d));
            d.setDate(d.getDate() + 1);
          }
          const fmt = new Intl.DateTimeFormat(locale, { timeZone: timezone, month: "short" });
          const months = dates.map((dt) => fmt.format(dt));

          return (
            <AxisTop
              scale={xScale}
              top={-40}
              tickLength={0}
              tickValues={dates}
              tickFormat={(v, i) => {
                const dt = new Date(v as Date);
                const showMonth = i === 0 || months[i] !== months[i - 1];
                return dt.toLocaleDateString(locale, {
                  weekday: "short",
                  day: "numeric",
                  month: showMonth ? "short" : undefined,
                  timeZone: timezone,
                });
              }}
              stroke="var(--neaps-border)"
              tickStroke="none"
              tickLabelProps={{
                fill: "var(--neaps-text-muted)",
                fontSize: 12,
                fontWeight: 600,
                textAnchor: "middle",
              }}
            />
          );
        })()}

        {/* Tooltip hit area */}
        <rect
          width={innerW}
          height={innerH}
          fill="transparent"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => onSelect(null)}
        />

        {/* Active entry annotation */}
        {activeEntry &&
          (() => {
            const cx = xScale(new Date(activeEntry.time).getTime());
            const labelY = innerH / 2;
            return (
              <g pointerEvents="none">
                <line
                  x1={cx}
                  x2={cx}
                  y1={-MARGIN.top}
                  y2={innerH + MARGIN.bottom}
                  stroke="var(--neaps-secondary)"
                  strokeWidth={1.5}
                  opacity={0.75}
                />
                <rect
                  x={cx - 40}
                  y={labelY - 18}
                  width={80}
                  height={36}
                  rx={6}
                  fill="var(--neaps-bg)"
                  stroke="var(--neaps-border)"
                  opacity={0.9}
                />
                <text
                  x={cx}
                  y={labelY - 4}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--neaps-text-muted)"
                >
                  {formatTime(activeEntry.time, timezone, locale)}
                </text>
                <text
                  x={cx}
                  y={labelY + 12}
                  textAnchor="middle"
                  fontSize={14}
                  fontWeight={600}
                  fill="var(--neaps-text)"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {formatLevel(activeEntry.level, units)}
                </text>
              </g>
            );
          })()}
      </Group>
    </svg>
  );
}
